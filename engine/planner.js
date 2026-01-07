/**
 * Pini Planner V4 (DB Driven)
 * ===========================
 * המוח של המערכת.
 * תוקן: עובד מול קבצי ה-DB הקיימים בתיקיית db/
 * מזהה חוסרים במידע ומייצר כפתורים דינמיים.
 */

const fs = require('fs');
const path = require('path');

// טעינה בטוחה של ה-DB (עם Fallback למקרה של שגיאה)
let productsDB = {};
let materialsDB = {};

try {
    // מניחים שהקבצים נמצאים תיקייה אחת למעלה ב-db
    productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'));
    materialsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/materials.json'), 'utf8'));
} catch (e) {
    console.error("⚠️ Error loading DB files in Planner:", e.message);
}

function planActions(intent, params, session) {
    const plan = {
        actions: [],
        nextState: 'idle'
    };

    // 1. זיהוי המוצר עליו אנחנו מדברים (מההודעה הנוכחית או מההקשר בסשן)
    // session.currentProduct נשמר בשרת כדי לזכור על מה דיברנו בסיבוב הקודם
    let productKey = params.product || session.currentProduct;
    
    // מיפוי שמות נפוצים למפתחות ב-DB (במידה וה-Extractor החזיר שם כללי)
    // (הערה: ה-Extractor כבר אמור לעשות את זה, אבל ליתר ביטחון)
    if (productKey === 'business_card') productKey = 'bc';
    if (productKey === 'flyers') productKey = 'flyer';

    // === טיפול בכפתור "תפריט ראשי" או התחלה ===
    if (!productKey && (intent === 'greeting' || intent === 'quote')) {
        const mainMenuOptions = Object.entries(productsDB).map(([key, val]) => ({
            text: val.title, // "כרטיסי ביקור"
            value: key       // "bc"
        }));

        plan.actions.push({ 
            type: 'PRESENT_OPTIONS', 
            question: 'מה נדפיס היום? בחר מוצר כדי להתחיל:',
            options: mainMenuOptions
        });
        return plan;
    }

    // === לוגיקת המשפך (Funnel) ===
    if (intent === 'quote' || intent === 'update' || (intent === 'consult' && productKey)) {
        
        // בדיקה שהמוצר קיים ב-DB
        const productConfig = productsDB[productKey];
        
        if (!productConfig) {
            // מוצר לא מוכר -> מעביר ל-LLM
            plan.actions.push({ type: 'CALL_LLM_CONSULTANT', input: params });
            return plan;
        }

        // שמירת המוצר בסשן (פעולה שתבוצע בשרת)
        plan.actions.push({ type: 'SET_SESSION_CONTEXT', product: productKey });

        // איסוף כל המידע שיש לנו עד כה (מההודעה הנוכחית + מהסשן)
        // אנחנו בודקים אם הערך ב-params הוא תשובה לשאלה כלשהי
        const currentAttributes = { ...session.draftAttributes }; // מתחילים ממה שזכרנו

        // ניסיון למפות את הקלט הנוכחי (params) לשדות ב-Config
        // למשל: אם המשתמש שלח "1000", וזה תואם לאופציה בשאלת qty, נשמור את זה.
        if (params.raw_text) {
            matchInputToAttributes(params.raw_text, productConfig, currentAttributes);
        }
        // גם שומרים פרמטרים מפורשים מה-Extractor
        if (params.qty) currentAttributes.qty = params.qty;
        if (params.attributes) Object.assign(currentAttributes, params.attributes);

        // --- לולאת השאלות הדינמית ---
        for (const question of productConfig.questions) {
            const key = question.key; // למשל 'qty', 'paper', 'size'
            
            // האם יש לנו כבר תשובה לשאלה הזו?
            if (!currentAttributes[key]) {
                
                // חסר מידע! מכינים את הכפתורים
                const dynamicOptions = question.options.map(opt => ({
                    text: getHumanReadableName(opt.value, key), // המרה לעברית יפה
                    value: opt.value // הערך הטכני שישלח בחזרה
                }));

                plan.actions.push({
                    type: 'PRESENT_OPTIONS',
                    question: question.text ? `בוא נבחר ${question.text}:` : `בחר אפשרות עבור ${key}:`,
                    options: dynamicOptions,
                    saveDraft: currentAttributes // שומרים את מה שאספנו עד כה
                });
                
                return plan; // עוצרים ושולחים ללקוח
            }
        }

        // --- יש את כל המידע! ---
        // אם הגענו לפה, כל השאלות נענו.
        
        // המרה למבנה שהמחשבון מצפה לו
        const finalPayload = {
            product_name: productKey,
            qty: parseInt(currentAttributes.qty) || 1, // ברירת מחדל אם נפל
            ...currentAttributes // שאר המאפיינים (paper, size...)
        };

        plan.actions.push({ 
            type: 'CALCULATE_AND_ADD', 
            payload: finalPayload 
        });
        
        // מנקים את הטיוטה כי סיימנו
        plan.actions.push({ type: 'CLEAR_SESSION_CONTEXT' }); 

        plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'quote_added' });
        plan.actions.push({ type: 'UPDATE_DASHBOARD' });
        
        return plan;
    }

    // === שאר הפעולות (ללא שינוי מהותי) ===
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
        case 'remove':
            plan.actions.push({ type: 'REMOVE_FROM_CART' });
            plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'item_removed' });
            plan.actions.push({ type: 'UPDATE_DASHBOARD' });
            break;
        case 'status':
            plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'cart_status' });
            break;
        default:
            plan.actions.push({ type: 'CALL_LLM_CONSULTANT', input: params });
            break;
    }

    return plan;
}

// --- פונקציות עזר ---

// מנסה להבין אם הטקסט החופשי של המשתמש הוא תשובה לאחת השאלות
function matchInputToAttributes(text, config, attributes) {
    if (!text) return;
    const cleanText = text.toString().toLowerCase();

    // עוברים על כל השאלות והאופציות שלהן
    for (const q of config.questions) {
        if (attributes[q.key]) continue; // כבר יש תשובה

        for (const opt of q.options) {
            // בדיקה האם הערך נמצא בטקסט (למשל "300" או "chromo")
            // או אם השם היפה שלו נמצא בטקסט
            const humanName = getHumanReadableName(opt.value, q.key);
            
            if (cleanText === opt.value.toLowerCase() || 
                cleanText === humanName.toLowerCase() ||
                cleanText.includes(opt.value) // התאמה גסה יותר
               ) {
                attributes[q.key] = opt.value;
                return; // מצאנו התאמה אחת, זה מספיק לסיבוב הזה
            }
        }
    }
}

// המרה מקוד טכני לשם יפה (מתוך materials.json)
function getHumanReadableName(value, key) {
    if (!isNaN(value)) return Number(value).toLocaleString(); // מספרים

    // חיפוש בטבלאות השונות
    const tables = [materialsDB.papers, materialsDB.finishing, materialsDB.wide_media];
    for (const table of tables) {
        if (table && table[value] && table[value].name) {
            return table[value].name;
        }
    }

    // מיפויים ידניים לדברים שאין להם "שם" ב-JSON
    const manualMap = {
        '1': 'צד אחד', '2': 'דו צדדי (4/4)',
        'yes': 'כן', 'no': 'לא',
        'A4': 'A4 (דף סטנדרטי)', 'A5': 'A5 (חצי דף)', 'A6': 'A6 (גלויה)',
        'none': 'ללא תוספות',
        'wood_frame': 'מתיחה על עץ',
        'pocket_glue': 'כיס מודבק',
        'env_standard': 'מעטפה רגילה', 'env_fancy': 'מעטפה מהודרת'
    };
    
    return manualMap[value] || value;
}

module.exports = { planActions };