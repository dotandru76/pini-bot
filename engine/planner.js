/** engine/planner.js V28.0 - Server-Side Normalization */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

// === מילון מונחים לשרת (The Translator) ===
// ממפה מונחים שה-LLM עשוי להחזיר למפתחות האמיתיים ב-DB
const PARAM_ALIASES = {
    'paper': 'paper_type',
    'stock': 'paper_type',
    'media': 'paper_type',
    'material': 'paper_type', // לפעמים בפורמט רחב
    'coating': 'lamination',
    'finish': 'finishing',
    'width': 'size', // אם ה-LLM פירק גודל
    'height': 'size'
};

function planActions(intentData, session) {
    const actions = [];

    // --- 1. פעולות מערכת ---
    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "דף חלק! 📄 מה נדפיס?" } }] };
    }
    if (intentData.intent === 'show_cart') {
        const cartText = session.cart.length > 0 ? `יש לך ${session.cart.length} פריטים.` : "העגלה ריקה.";
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: cartText } }] };
    }
    if (intentData.intent === 'remove') {
         return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: null } }] }; 
    }

    // --- 2. טיפול בשיחה ללא מוצר ---
    let currentProductKey = intentData.product || session.currentProduct;
    
    // ניהול שינוי מוצר
    if (intentData.product && intentData.product !== session.currentProduct) {
        session.currentProduct = intentData.product;
        currentProductKey = intentData.product;
        if (intentData.product !== session.currentProduct) session.draftAttributes = {}; 
    }

    if (!currentProductKey) {
        // אם אין מוצר וזו סתם שיחה
        if (['chat', 'consult', 'faq'].includes(intentData.intent)) {
            return { 
                actions: [{ 
                    type: 'GENERATE_RESPONSE', 
                    payload: { 
                        text: intentData.aiResponse || "אני כאן לכל שאלה על דפוס! 😊",
                        quickReplies: [{ label: 'תפריט ראשי', value: 'reset' }]
                    } 
                }] 
            };
        }
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה תרצה להדפיס? (פליירים, כרטיסים...)" } }] };
    }

    const productConfig = productsDB[currentProductKey];
    if (!productConfig) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מוצר זה לא קיים במערכת." } }] };
    }

    // --- 3. נרמול הנתונים (הקסם של השרת) ---
    // כאן השרת לוקח פיקוד ומתקן את מה שה-LLM שלח
    
    let rawParams = intentData.extractedParams || {};
    
    // א. מיפוי שמות (Aliases)
    let normalizedParams = {};
    Object.keys(rawParams).forEach(key => {
        const dbKey = PARAM_ALIASES[key] || key; // תרגום: paper -> paper_type
        normalizedParams[dbKey] = rawParams[key];
    });

    // ב. התאמת ערכים (Value Matching)
    // אם ה-LLM שלח "מט" אבל ב-DB כתוב "matte_350", השרת ימצא את זה
    if (productConfig.questions) {
        productConfig.questions.forEach(q => {
            const val = normalizedParams[q.key];
            if (val && q.options) {
                // נסה למצוא התאמה בתוך האופציות
                const match = q.options.find(opt => 
                    opt.value.toLowerCase() === val.toString().toLowerCase() || 
                    opt.label.includes(val) ||
                    val.toString().includes(opt.value) // אם ה-LLM החזיר "matte_350" והערך הוא "matte"
                );
                
                if (match) {
                    normalizedParams[q.key] = match.value; // נעלנו על הערך התקין מה-DB
                }
            }
        });
    }

    // מיזוג לתוך הזיכרון
    const newDraft = { ...session.draftAttributes, ...normalizedParams };
    
    // ברירות מחדל טכניות
    if (currentProductKey === 'sticker' && !newDraft.material) newDraft.material = 'vinyl_white';

    // --- 4. מה חסר? ---
    let missingParam = null;
    let questionToAsk = null;

    if (productConfig.questions) {
        for (const q of productConfig.questions) {
            if (!newDraft[q.key]) { 
                missingParam = q.key; 
                questionToAsk = q; 
                break; 
            }
        }
    }

    // --- 5. בניית התשובה ---
    if (missingParam) {
        let finalResponse = "";
        
        // טקסט מה-LLM (אם יש)
        if (intentData.aiResponse) {
            finalResponse += intentData.aiResponse + "\n\n";
        } else if (Object.keys(newDraft).length === 0) {
            finalResponse += `בכיף, בוא נגדיר את ה${productConfig.name}. 👌\n`;
        }

        // השאלה הטכנית (מהכפתורים)
        finalResponse += questionToAsk.question_he;

        actions.push({
            type: 'PRESENT_OPTIONS',
            question: finalResponse,
            options: questionToAsk.options || [],
            product: currentProductKey,
            saveDraft: newDraft
        });
    } else {
        // חישוב
        try {
            const calcParams = { ...newDraft, product: currentProductKey };
            const calcResult = calculate_custom_job(session.cart, calcParams);
            
            actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
            actions.push({ 
                type: 'GENERATE_RESPONSE', 
                template: 'quote_success', 
                payload: { item: calcResult.lastAdded, textPrefix: intentData.aiResponse } 
            });
            actions.push({ type: 'CHECK_QUEUE' }); 
        } catch (e) {
            actions.push({ type: 'GENERATE_RESPONSE', payload: { text: "נתקלתי בבעיה בחישוב. נסה לשנות פרמטרים." } });
        }
    }

    return { actions };
}

module.exports = { planActions };