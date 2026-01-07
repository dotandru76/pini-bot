/**
 * Pini Planner V6 (Strict DB Mode)
 * ================================
 * עובד אך ורק מול products.json ו-materials.json.
 * לא ממציא שאלות ולא מנחש.
 */

const fs = require('fs');
const path = require('path');

// טעינת הקבצים שהעלית
let productsDB = {};
let materialsDB = {};

try {
    // נתיב יחסי לתיקיית db
    productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'));
    materialsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/materials.json'), 'utf8'));
} catch (e) {
    console.error("❌ Critical Error: Could not load DB files.", e.message);
}

function planActions(intent, params, session) {
    const plan = { actions: [], nextState: 'idle' };

    // 1. זיהוי מוצר (מההודעה או מהזיכרון)
    let productKey = params.product || session.currentProduct;

    // מיפוי שמות נפוצים למפתחות המדויקים ב-products.json
    const aliasMap = {
        'business_card': 'bc',
        'flyers': 'flyer',
        'invitations': 'invitation',
        'roll_up': 'rollup',
        'envelopes': 'envelope',
        'stickers': 'sticker',
        'folders': 'folder'
    };
    if (aliasMap[productKey]) productKey = aliasMap[productKey];

    // === תפריט ראשי ===
    if (!productKey && (intent === 'greeting' || intent === 'quote')) {
        const menuOptions = Object.entries(productsDB).map(([key, data]) => ({
            text: data.title, // למשל: "כרטיסי ביקור"
            value: key        // למשל: "bc"
        }));
        
        plan.actions.push({ 
            type: 'PRESENT_OPTIONS', 
            question: 'מה נדפיס היום? בחר מוצר:', 
            options: menuOptions 
        });
        return plan;
    }

    // === מנוע השאלות (The Funnel) ===
    if (intent === 'quote' || intent === 'update' || (intent === 'consult' && productKey)) {
        
        const productConfig = productsDB[productKey];
        if (!productConfig) {
            // אם המוצר לא ב-JSON, ה-LLM יטפל בזה
            plan.actions.push({ type: 'CALL_LLM_CONSULTANT', input: params });
            return plan;
        }

        // נועלים הקשר
        plan.actions.push({ type: 'SET_SESSION_CONTEXT', product: productKey });

        // טוענים טיוטה מהסשן
        const currentAttributes = { ...session.draftAttributes };

        // אם המשתמש ענה תשובה בטקסט חופשי, מנסים להתאים אותה
        if (params.raw_text) {
            matchInputToConfig(params.raw_text, productConfig, currentAttributes);
        }
        // דריסה עם פרמטרים מפורשים אם יש
        if (params.qty) currentAttributes.qty = params.qty.toString();
        if (params.attributes) Object.assign(currentAttributes, params.attributes);

        // --- המעבר על השאלות ב-products.json ---
        for (const question of productConfig.questions) {
            const key = question.key; // qty, paper, size...
            
            // אם אין תשובה לשאלה הזו
            if (!currentAttributes[key]) {
                
                // יצירת כפתורים מתוך ה-options ב-JSON
                const dynamicOptions = question.options.map(opt => ({
                    text: getHumanName(opt.value, key), // המרה לעברית דרך materials.json
                    value: opt.value
                }));

                plan.actions.push({
                    type: 'PRESENT_OPTIONS',
                    question: `בחר ${question.text}:`,
                    options: dynamicOptions,
                    saveDraft: currentAttributes // שומרים התקדמות
                });
                return plan;
            }
        }

        // === סיימנו את כל השאלות ===
        const finalPayload = {
            product_name: productKey,
            qty: parseInt(currentAttributes.qty),
            attributes: currentAttributes // מכיל paper, size, extras וכו'
        };

        plan.actions.push({ type: 'CALCULATE_AND_ADD', payload: finalPayload });
        plan.actions.push({ type: 'CLEAR_SESSION_CONTEXT' });
        plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'quote_added' });
        plan.actions.push({ type: 'UPDATE_DASHBOARD' });
        
        return plan;
    }

    // פעולות כלליות
    switch (intent) {
        case 'checkout':
            plan.actions.push({ type: 'SUMMARIZE_CART' });
            plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'send_quote' });
            break;
        case 'clear':
            plan.actions.push({ type: 'CLEAR_CART' });
            plan.actions.push({ type: 'CLEAR_SESSION_CONTEXT' });
            plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'cart_cleared' });
            plan.actions.push({ type: 'UPDATE_DASHBOARD' });
            break;
        default:
            plan.actions.push({ type: 'CALL_LLM_CONSULTANT', input: params });
    }

    return plan;
}

// --- עזרים ---

function matchInputToConfig(text, config, attributes) {
    if (!text) return;
    const clean = text.toString().toLowerCase();
    
    for (const q of config.questions) {
        if (attributes[q.key]) continue;
        for (const opt of q.options) {
            const human = getHumanName(opt.value, q.key).toLowerCase();
            const val = opt.value.toLowerCase();
            // התאמה מדויקת או חלקית חזקה
            if (clean === val || clean === human || (human.length > 3 && clean.includes(human))) {
                attributes[q.key] = opt.value;
                return;
            }
        }
    }
}

// פונקציה חכמה שמוצאת את השם ב-materials.json
function getHumanName(val, key) {
    if (!isNaN(val)) return Number(val).toLocaleString(); // כמויות

    // חיפוש בכל הקטגוריות ב-materials.json
    const cats = ['papers', 'finishing', 'wide_media'];
    for (const cat of cats) {
        if (materialsDB[cat] && materialsDB[cat][val]) {
            return materialsDB[cat][val].name;
        }
    }

    // מיפויים ידניים שחסרים ב-JSON (כמו גדלים)
    const manual = {
        '1': 'צד אחד', '2': 'דו צדדי',
        'A4': 'A4', 'A5': 'A5', 'A6': 'A6',
        'none': 'ללא', 'yes': 'כן', 'no': 'לא',
        'fold_simple': 'קיפול אמצע', 'fold_tri': 'קיפול פרוספקט',
        'wood_frame': 'מתיחה על עץ',
        'env_standard': 'סטנדרט', 'env_fancy': 'מהודרת'
    };
    
    return manual[val] || val;
}

module.exports = { planActions };