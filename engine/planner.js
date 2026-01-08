/** engine/planner.js V11.7 - Memory Fix */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { buildResponse } = require('./responseBuilder');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

function planActions(intentData, session) {
    const actions = [];

    // ניהול איפוסים
    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "איפסתי הכל. מה נדפיס?" } }] };
    }

    if (intentData.intent === 'show_cart') {
        const cartText = session.cart.length > 0 ? `יש לך ${session.cart.length} פריטים בעגלה.` : "העגלה ריקה כרגע.";
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: cartText } }] };
    }

    if (intentData.intent === 'chat') {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "נשמע טוב! אני רק בוט דפוס 🤖, בוא נחזור לעניינים. תרצה להוסיף משהו לעגלה?" } }] };
    }

    // --- לוגיקת מוצר ---
    
    // שחזור הקשר אם צריך
    let currentProductKey = intentData.product || session.currentProduct;
    
    // אם זו הוספה חדשה, נוודא שהמוצר קיים
    if (!currentProductKey) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה תרצה להדפיס? (פליירים, כרטיסים, רולאפ...)" } }] };
    }

    const productConfig = productsDB[currentProductKey];
    if (!productConfig) return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "המוצר הזה לא קיים במערכת כרגע." } }] };

    // עדכון פרמטרים
    const newParams = intentData.extractedParams || {};
    const validNewParams = {};
    Object.keys(newParams).forEach(key => {
        if (newParams[key] !== null && newParams[key] !== undefined) validNewParams[key] = newParams[key];
    });

    // מיזוג עם הטיוטה הקיימת
    const newDraft = (intentData.intent === 'new_order') 
        ? validNewParams 
        : { ...session.draftAttributes, ...validNewParams };
    
    // ברירות מחדל
    if (currentProductKey === 'sticker' && !newDraft.material) newDraft.material = 'vinyl_white';

    // בדיקה: מה חסר?
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

    if (missingParam) {
        // --- התיקון הקריטי כאן למטה: product: currentProductKey ---
        actions.push({
            type: 'PRESENT_OPTIONS',
            question: questionToAsk.question_he,
            options: questionToAsk.options || [],
            product: currentProductKey, // <--- זה היה חסר!
            saveDraft: newDraft
        });
    } else {
        // הכל מלא - חישוב
        try {
            const calculationParams = { ...newDraft, product: currentProductKey };
            const calcResult = calculate_custom_job(session.cart, calculationParams);
            
            actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
            actions.push({ type: 'GENERATE_RESPONSE', template: 'quote_success', payload: { item: calcResult.lastAdded } });
            // בדיקת תור תתבצע בשרת
            actions.push({ type: 'CHECK_QUEUE' }); 
        } catch (err) {
            actions.push({ type: 'GENERATE_RESPONSE', payload: { text: `שגיאה בחישוב: ${err.message}` } });
        }
    }

    return { actions };
}

module.exports = { planActions };