/** engine/planner.js V25.0 - The Merger */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

function planActions(intentData, session) {
    const actions = [];

    // 1. קביעת המוצר (השרת מקשיב ל-LLM)
    let currentProductKey = intentData.product || session.currentProduct;
    
    // אם ה-LLM זיהה מוצר חדש, נועלים עליו
    if (intentData.product && intentData.product !== session.currentProduct) {
        session.currentProduct = intentData.product;
        currentProductKey = intentData.product;
        // לא מאפסים את ה-Draft אם זה אותו מוצר, אבל אם זה מוצר חדש כן
        if (intentData.product !== session.currentProduct) {
             session.draftAttributes = {}; 
        }
    }

    // 2. בדיקות מערכת (איפוס/מחיקה)
    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "התחלנו מחדש. מה נדפיס?" } }] };
    }

    // 3. מסלול הזמנה (השילוב!)
    if (currentProductKey && productsDB[currentProductKey]) {
        const productConfig = productsDB[currentProductKey];
        
        // מיזוג פרמטרים טכניים
        const newParams = intentData.extractedParams || {};
        const newDraft = { ...session.draftAttributes, ...newParams };
        
        // בדיקה: מה חסר?
        let missingParam = null;
        let questionToAsk = null;

        for (const q of productConfig.questions) {
            if (!newDraft[q.key]) { 
                missingParam = q.key; 
                questionToAsk = q; 
                break; 
            }
        }

        // --- נקודת המיזוג (The Merge Point) ---
        // הטקסט מה-LLM ("מזל טוב!") + השאלה מהשרת ("כמה הזמנות?")
        let finalQuestionText = "";
        
        if (intentData.aiResponse) {
            finalQuestionText += intentData.aiResponse + "\n\n"; // הברכה
        }
        
        if (missingParam) {
            finalQuestionText += questionToAsk.question_he; // השאלה הטכנית
            
            actions.push({
                type: 'PRESENT_OPTIONS',
                question: finalQuestionText, // הטקסט המשולב
                options: questionToAsk.options || [], // הכפתורים מהשרת
                product: currentProductKey,
                saveDraft: newDraft
            });
        } else {
            // הכל מלא - חישוב
            try {
                const calcParams = { ...newDraft, product: currentProductKey };
                const calcResult = calculate_custom_job(session.cart, calcParams);
                actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
                actions.push({ 
                    type: 'GENERATE_RESPONSE', 
                    template: 'quote_success', 
                    payload: { item: calcResult.lastAdded, textPrefix: intentData.aiResponse } 
                });
            } catch (e) {
                actions.push({ type: 'GENERATE_RESPONSE', payload: { text: "שגיאה בחישוב." } });
            }
        }
        return { actions };
    }

    // 4. אם אין מוצר, וה-LLM נתן תשובה (סתם שיחה)
    if (intentData.aiResponse) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: intentData.aiResponse } }] };
    }

    // 5. Fallback
    return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה תרצה להדפיס?" } }] };
}

module.exports = { planActions };