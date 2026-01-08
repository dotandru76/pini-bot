/** engine/planner.js V23.1 - Hybrid Execution with Navigation */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');

// טעינת מסד הנתונים של המוצרים
let productsDB = {};
try { 
    productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); 
} catch (e) {
    console.error("⚠️ Error loading productsDB:", e.message);
}

function planActions(intentData, session) {
    const actions = [];

    // --- 1. טיפול בתשובות AI (FAQ, Chat, Consult) ---
    // אם ה-LLM החליט שזו שאלה כללית או שיחת חולין, הוא כבר ניסח תשובה.
    // אנחנו מציגים אותה ומוסיפים כפתורי ניווט כדי שהלקוח לא ילך לאיבוד.
    if (['faq', 'chat', 'consult'].includes(intentData.intent) && intentData.aiResponse) {
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: intentData.aiResponse,
                    // הוספת כפתורי ניווט קבועים
                    quickReplies: [
                        { label: 'תפריט ראשי 🏠', value: 'reset' },
                        { label: 'מה בעגלה? 🛒', value: 'show_cart' }
                    ]
                } 
            }] 
        };
    }

    // --- 2. טיפול בפעולות מערכת ---
    if (intentData.intent === 'reset') {
        return { 
            actions: [
                { type: 'CLEAR_SESSION_CONTEXT' }, 
                { type: 'GENERATE_RESPONSE', payload: { text: "איפסתי הכל. מה נדפיס? 🖨️" } }
            ] 
        };
    }
    
    if (intentData.intent === 'show_cart') {
        const cartText = session.cart.length > 0 
            ? `יש לך ${session.cart.length} פריטים בעגלה.` 
            : "העגלה ריקה כרגע.";
            
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { text: cartText } 
            }] 
        };
    }
    
    if (intentData.intent === 'remove') {
         // כאן אפשר להוסיף לוגיקה מורכבת יותר למחיקה ספציפית
         // כרגע נשתמש במחיקה כללית כדוגמה, או נפנה ללוגיקת המחיקה ב-server.js
         return { 
             actions: [{ 
                 type: 'REMOVE_FROM_CART', 
                 payload: { index: null } // null מסמן מחיקה כללית או אחרונה, תלוי במימוש בשרת
             }] 
         }; 
    }

    // --- 3. טיפול בהזמנות (Quote) - הליבה העסקית ---
    
    // זיהוי המוצר (מה-LLM או מהזיכרון)
    let currentProductKey = intentData.product || session.currentProduct;
    
    if (!currentProductKey) {
        // אם ה-LLM לא זיהה מוצר ואין בזיכרון -> שאל את המשתמש
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { text: "מה תרצה להדפיס? (פליירים, ספרים, רולאפ...)" } 
            }] 
        };
    }

    const productConfig = productsDB[currentProductKey];
    if (!productConfig) {
        // ה-LLM זיהה מוצר, אבל אין לנו אותו ב-DB (למשל "סימניה")
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { text: `מצטער, המוצר '${currentProductKey}' עדיין לא קיים במחירון האוטומטי. אעביר אותך לנציג אנושי. 👨‍💼` } 
            }] 
        };
    }

    // מיזוג פרמטרים: מה שיש בזיכרון + מה שה-LLM חילץ עכשיו
    // ה-LLM כבר עשה את העבודה הקשה של מיפוי טקסט חופשי (כמו "כריכה קשה") למפתח טכני ("perfect_bind")
    let newParams = intentData.extractedParams || {};
    
    const validNewParams = {};
    Object.keys(newParams).forEach(key => {
        if (newParams[key] !== null && newParams[key] !== undefined) {
            validNewParams[key] = newParams[key];
        }
    });

    // עדכון הטיוטה (Draft) בסשן
    // אם זו הזמנה חדשה (new_order), דורסים את הטיוטה. אחרת, ממזגים.
    const newDraft = (intentData.intent === 'new_order') 
        ? validNewParams 
        : { ...session.draftAttributes, ...validNewParams };
    
    // הגדרת ברירות מחדל טכניות (למשל למדבקות)
    if (currentProductKey === 'sticker' && !newDraft.material) {
        newDraft.material = 'vinyl_white';
    }

    // בדיקה: מה חסר להשלמת ההזמנה?
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
        // שולחים את השאלה הבאה למשתמש (עם כפתורים אם יש)
        actions.push({
            type: 'PRESENT_OPTIONS',
            question: questionToAsk.question_he,
            options: questionToAsk.options || [],
            product: currentProductKey,
            saveDraft: newDraft
        });
    } else {
        // הכל מלא -> חישוב מחיר (דטרמיניסטי בקוד!)
        try {
            const calculationParams = { ...newDraft, product: currentProductKey };
            const calcResult = calculate_custom_job(session.cart, calculationParams);
            
            // הוספה לעגלה + הודעת הצלחה
            actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
            actions.push({ 
                type: 'GENERATE_RESPONSE', 
                template: 'quote_success', 
                payload: { item: calcResult.lastAdded } 
            });
            
            // בדיקה אם יש עוד פריטים בתור (אופציונלי)
            actions.push({ type: 'CHECK_QUEUE' }); 

        } catch (err) {
            console.error("Calc Error:", err);
            actions.push({ 
                type: 'GENERATE_RESPONSE', 
                payload: { text: "נתקלתי בבעיה בחישוב המחיר. נסה לשנות פרמטרים או להתחיל מחדש." } 
            });
        }
    }

    return { actions };
}

module.exports = { planActions };