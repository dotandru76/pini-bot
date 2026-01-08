/** engine/planner.js V26.0 - Human Touch */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

function planActions(intentData, session) {
    const actions = [];

    // --- 1. מחיקה ואיפוס ---
    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "בכיף, דף חלק! 📄 מה נדפיס עכשיו?" } }] };
    }
    if (intentData.intent === 'remove') {
         return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: null } }] }; 
    }

    // --- 2. טיפול בשיחה חופשית / שאלות ידע (FAQ) ---
    // אם ה-LLM זיהה שזו שאלה ("מה זה כרומו?") הוא כבר ניסח תשובה.
    // אנחנו נציג אותה ונציע חזרה לעניינים.
    if (['faq', 'chat', 'consult'].includes(intentData.intent) && intentData.aiResponse) {
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: intentData.aiResponse,
                    quickReplies: session.currentProduct ? 
                        [{ label: 'המשך בהזמנה', value: 'continue' }] : 
                        [{ label: 'תפריט ראשי', value: 'reset' }]
                } 
            }] 
        };
    }

    // --- 3. מסלול הזמנה (Quote) ---
    let currentProductKey = intentData.product || session.currentProduct;
    
    // זיהוי מוצר חדש מה-LLM
    if (intentData.product && intentData.product !== session.currentProduct) {
        session.currentProduct = intentData.product;
        currentProductKey = intentData.product;
        // לא מאפסים את ה-Draft אם זה רק עדכון, אבל אם זה מוצר חדש כן
        if (intentData.product !== session.currentProduct) {
             session.draftAttributes = {}; 
        }
    }

    if (currentProductKey && productsDB[currentProductKey]) {
        const productConfig = productsDB[currentProductKey];
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

        // --- השילוב האנושי ---
        let finalQuestionText = "";
        
        // אם יש טקסט מה-AI ("מזל טוב!"), הוא יבוא קודם
        if (intentData.aiResponse) {
            finalQuestionText += intentData.aiResponse + "\n\n";
        }
        
        if (missingParam) {
            // אם אין טקסט מה-AI, וזו תחילת השיחה, נוסיף פתיח קטן
            if (!intentData.aiResponse && Object.keys(newDraft).length === 0) {
                finalQuestionText += `בשמחה, בוא נתקתק את זה. 👌\n`;
            }
            
            finalQuestionText += questionToAsk.question_he;
            
            actions.push({
                type: 'PRESENT_OPTIONS',
                question: finalQuestionText, 
                options: questionToAsk.options || [],
                product: currentProductKey,
                saveDraft: newDraft
            });
        } else {
            // חישוב
            try {
                const calcParams = { ...newDraft, product: currentProductKey };
                const calcResult = calculate_custom_job(session.cart, calcParams);
                
                // הודעת סיום אנושית יותר (תבנית quote_success תטפל בזה)
                actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
                actions.push({ 
                    type: 'GENERATE_RESPONSE', 
                    template: 'quote_success', 
                    payload: { item: calcResult.lastAdded, textPrefix: intentData.aiResponse } 
                });
                actions.push({ type: 'CHECK_QUEUE' }); 
            } catch (e) {
                actions.push({ type: 'GENERATE_RESPONSE', payload: { text: "אופס, משהו בחישוב הסתבך לי. בוא ננסה שוב." } });
            }
        }
        return { actions };
    }

    // Fallback
    return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה תרצה להדפיס? (כרטיסים, פליירים...)" } }] };
}

module.exports = { planActions };