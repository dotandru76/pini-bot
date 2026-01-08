/** engine/planner.js V23.0 - Hybrid Execution */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

function planActions(intentData, session) {
    const actions = [];

    // --- 1. טיפול בתשובות AI (FAQ, Chat, Consult) ---
    // אם ה-LLM החליט שזו שאלה כללית או שיחת חולין, הוא כבר ניסח תשובה.
    // אנחנו רק צריכים להציג אותה ולאפס/לשמור הקשר לפי הצורך.
    if (['faq', 'chat', 'consult'].includes(intentData.intent) && intentData.aiResponse) {
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { text: intentData.aiResponse } 
            }] 
        };
    }

    // --- 2. טיפול בפעולות מערכת ---
    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "איפסתי הכל. מה נדפיס?" } }] };
    }
    if (intentData.intent === 'show_cart') {
        const cartText = session.cart.length > 0 ? `יש לך ${session.cart.length} פריטים בעגלה.` : "העגלה ריקה כרגע.";
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: cartText } }] };
    }
    if (intentData.intent === 'remove') {
         // לוגיקת מחיקה... (כמו מקודם)
         return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: null } }] }; // הפשטה לדוגמה
    }

    // --- 3. טיפול בהזמנות (Quote) - הליבה העסקית ---
    
    // זיהוי המוצר (מה-LLM או מהזיכרון)
    let currentProductKey = intentData.product || session.currentProduct;
    
    if (!currentProductKey) {
        // אם ה-LLM לא זיהה מוצר ואין בזיכרון -> שאל את המשתמש
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה תרצה להדפיס? (פליירים, ספרים, רולאפ...)" } }] };
    }

    const productConfig = productsDB[currentProductKey];
    if (!productConfig) {
        // ה-LLM זיהה מוצר, אבל אין לנו אותו ב-DB (למשל "סימניה")
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: `מצטער, המוצר '${currentProductKey}' עדיין לא קיים במחירון האוטומטי. אעביר אותך לנציג.` } }] };
    }

    // מיזוג פרמטרים: מה שיש בזיכרון + מה שה-LLM חילץ עכשיו
    // ה-LLM כבר עשה את העבודה הקשה של מיפוי "קשה" -> "perfect_bind"
    let newParams = intentData.extractedParams || {};
    
    const validNewParams = {};
    Object.keys(newParams).forEach(key => {
        if (newParams[key] !== null && newParams[key] !== undefined) validNewParams[key] = newParams[key];
    });

    // עדכון הטיוטה
    const newDraft = (intentData.intent === 'new_order') 
        ? validNewParams 
        : { ...session.draftAttributes, ...validNewParams };
    
    // ברירות מחדל טכניות
    if (currentProductKey === 'sticker' && !newDraft.material) newDraft.material = 'vinyl_white';

    // בדיקה: מה חסר?
    let missingParam = null;
    let questionToAsk = null;

    if (productConfig.questions) {
        for (const q of productConfig.questions) {
            // אם הפרמטר חסר בטיוטה
            if (!newDraft[q.key]) { 
                missingParam = q.key; 
                questionToAsk = q; 
                break; 
            }
        }
    }

    if (missingParam) {
        // שואלים את השאלה הבאה
        actions.push({
            type: 'PRESENT_OPTIONS',
            question: questionToAsk.question_he,
            options: questionToAsk.options || [],
            product: currentProductKey,
            saveDraft: newDraft
        });
    } else {
        // הכל מלא -> חישוב מחיר (דטרמיניסטי!)
        try {
            const calculationParams = { ...newDraft, product: currentProductKey };
            const calcResult = calculate_custom_job(session.cart, calculationParams);
            
            actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
            actions.push({ type: 'GENERATE_RESPONSE', template: 'quote_success', payload: { item: calcResult.lastAdded } });
            actions.push({ type: 'CHECK_QUEUE' }); 
        } catch (err) {
            console.error("Calc Error:", err);
            actions.push({ type: 'GENERATE_RESPONSE', payload: { text: "נתקלתי בבעיה בחישוב. נסה לשנות פרמטרים." } });
        }
    }

    return { actions };
}

module.exports = { planActions };