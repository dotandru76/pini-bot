/** engine/planner.js - Checklist Logic */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

function planActions(intent, session, userMessage) {
    const actions = [];

    // 1. טיפול באיפוס/מחיקה
    if (intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "התחלנו מחדש. מה נדפיס?", quickReplies: [{label: "כרטיסי ביקור", value: "bc"}, {label: "פליירים", value: "flyer"}] } }] };
    }

    // 2. זיהוי אם אנחנו בתוך תהליך הזמנה (Wizard Mode)
    if (session.currentProduct && productsDB[session.currentProduct]) {
        const productConfig = productsDB[session.currentProduct];
        const currentAttributes = { ...session.draftAttributes };

        // אם המשתמש ענה תשובה (מספר או בחירה מכפתור)
        // ננסה לשייך את התשובה לשאלה הפתוחה
        if (intent === 'answer' || intent === 'new_order') {
            
            // מציאת השאלה הראשונה שעדיין אין לה תשובה
            let missingKey = null;
            for (const q of productConfig.questions) {
                if (!currentAttributes[q.key]) {
                    missingKey = q.key;
                    
                    // בדיקה אם ההודעה הנוכחית היא תשובה לשאלה זו
                    // אם זה מספר והשאלה היא כמות/גודל
                    if (q.type === 'number' && /^\d+$/.test(userMessage)) {
                        currentAttributes[q.key] = parseInt(userMessage);
                    }
                    // אם זו בחירה מתוך אופציות (הערך נמצא בהודעה)
                    else if (q.options && q.options.some(o => o.value === userMessage)) {
                        currentAttributes[q.key] = userMessage;
                    }
                    // ניסיון התאמה חלקי (למשל "A5" בתוך "אני רוצה A5")
                    else if (q.options) {
                         const match = q.options.find(o => userMessage.includes(o.value) || userMessage.includes(o.label));
                         if (match) currentAttributes[q.key] = match.value;
                    }
                    break;
                }
            }
        }

        // 3. בדיקה מחדש: מה חסר עכשיו?
        let nextQuestion = null;
        for (const q of productConfig.questions) {
            if (!currentAttributes[q.key]) {
                nextQuestion = q;
                break;
            }
        }

        if (nextQuestion) {
            // חסר מידע -> שואלים את השאלה הבאה
            actions.push({
                type: 'PRESENT_OPTIONS',
                question: nextQuestion.question_he,
                options: nextQuestion.options || [], // אם זה מספר, זה יהיה ריק והלקוח יקליד
                saveDraft: currentAttributes
            });
        } else {
            // יש את כל המידע! -> מחשבים ומוסיפים לעגלה
            const finalPayload = { 
                product: session.currentProduct, 
                qty: currentAttributes.qty, 
                ...currentAttributes 
            };
            
            // מנסים לחשב מחיר
            try {
                const calcResult = calculate_custom_job(session.cart, finalPayload);
                finalPayload.client_price = calcResult.lastAdded.client_price;
                finalPayload.description = calcResult.lastAdded.description;
            } catch (e) {
                finalPayload.client_price = 0; // Fallback
            }

            actions.push({ type: 'CALCULATE_AND_ADD', payload: finalPayload });
            
            // המהלך הקריטי: בדיקה אם יש עוד מוצרים בתור
            actions.push({ type: 'CHECK_QUEUE' });
        }

        return { actions };
    }

    // 3. אם אין מוצר ואין כוונה ברורה -> תפריט ראשי
    return { 
        actions: [{ 
            type: 'GENERATE_RESPONSE', 
            payload: { 
                text: "ברוך הבא לפיני! 🤖\nאני יכול לתת הצעות מחיר לכל מוצרי הדפוס.\nפשוט כתוב לי מה אתה צריך (למשל: '1000 פליירים ורולאפ').",
                quickReplies: [
                    { label: 'כרטיסי ביקור', value: 'bc' },
                    { label: 'פליירים', value: 'flyer' },
                    { label: 'הזמנות', value: 'invitation' }
                ]
            } 
        }] 
    };
}

module.exports = { planActions };