/** engine/planner.js V_DEBUG - Decision Tracing */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');

// לוג צבעוני למנהל
const logPlan = (msg, data) => console.log(`\x1b[36m[📋 PLANNER]\x1b[0m ${msg}`, data ? JSON.stringify(data) : '');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

function planActions(intentData, session) {
    logPlan("Received Intent Data:", intentData);
    logPlan("Current Session State:", { currentProduct: session.currentProduct, draft: session.draftAttributes });

    const actions = [];

    // --- 1. איפוס ומחיקה ---
    if (intentData.intent === 'reset') {
        logPlan("Action: RESET");
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "דף חלק! מה נדפיס?" } }] };
    }

    // --- 2. טיפול ב-AI Chat/Consult ---
    // אם ה-AI נתן תשובה טקסטואלית, אבל אין מוצר - נחזיר את התשובה
    if (['chat', 'consult', 'faq'].includes(intentData.intent) && !intentData.product && !session.currentProduct) {
        logPlan("Action: AI CHAT (No product)");
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: intentData.aiResponse || "אני כאן.",
                    quickReplies: [{ label: 'תפריט', value: 'reset' }]
                } 
            }] 
        };
    }

    // --- 3. ניהול הזמנה (Quote) ---
    // קריטי: האם ה-AI זיהה מוצר חדש?
    let currentProductKey = intentData.product || session.currentProduct;
    
    if (intentData.product && intentData.product !== session.currentProduct) {
        logPlan(`Context Switch: ${session.currentProduct} -> ${intentData.product}`);
        session.currentProduct = intentData.product;
        currentProductKey = intentData.product;
        
        // אם זה מוצר חדש לגמרי, מאפסים טיוטה
        if (intentData.product !== session.currentProduct) {
             session.draftAttributes = {}; 
        }
    }

    // אם עדיין אין מוצר - ה-AI נכשל בזיהוי או שהמשתמש לא היה ברור
    if (!currentProductKey) {
        logPlan("Action: FALLBACK (No product context)");
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: intentData.aiResponse || "מה תרצה להדפיס?" } }] };
    }

    const productConfig = productsDB[currentProductKey];
    if (!productConfig) {
        logPlan("Error: Product not in DB", currentProductKey);
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מוצר זה לא קיים במערכת." } }] };
    }

    // מיזוג פרמטרים
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

    logPlan("Missing Param identified:", missingParam);

    if (missingParam) {
        // בונים את התשובה: קודם ה-AI (הברכה), ואז השאלה הטכנית
        let finalResponse = "";
        
        if (intentData.aiResponse) {
            finalResponse += intentData.aiResponse + "\n\n";
        } else if (Object.keys(newDraft).length === 0) {
            // אם זו תחילת הזמנה ואין ברכה מה-AI -> נוסיף משהו גנרי
            finalResponse += `בכיף, בוא נגדיר ${productConfig.name}. 👍\n`;
        }

        finalResponse += questionToAsk.question_he;

        logPlan("Action: ASK QUESTION", { q: finalResponse });

        actions.push({
            type: 'PRESENT_OPTIONS',
            question: finalResponse,
            options: questionToAsk.options || [],
            product: currentProductKey,
            saveDraft: newDraft
        });
    } else {
        // חישוב
        logPlan("Action: CALCULATE");
        try {
            const calculationParams = { ...newDraft, product: currentProductKey };
            const calcResult = calculate_custom_job(session.cart, calculationParams);
            
            actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
            actions.push({ 
                type: 'GENERATE_RESPONSE', 
                template: 'quote_success', 
                payload: { item: calcResult.lastAdded, textPrefix: intentData.aiResponse } 
            });
        } catch (e) {
            logPlan("Calculation Error", e.message);
            actions.push({ type: 'GENERATE_RESPONSE', payload: { text: "שגיאה בחישוב." } });
        }
    }

    return { actions };
}

module.exports = { planActions };