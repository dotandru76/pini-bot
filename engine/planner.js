/** engine/planner.js V30.0 - The Bridge (LLM to Server) */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

// === המילון: תרגום מונחי LLM למונחי מערכת ===
// ה-LLM לפעמים יצירתי בשמות הפרמטרים, אנחנו מיישרים אותו כאן
const PARAM_ALIASES = {
    'paper': 'paper_type',
    'stock': 'paper_type',
    'media': 'paper_type',
    'material': 'paper_type',
    'coating': 'lamination',
    'finish': 'finishing',
    'width': 'size', 
    'height': 'size',
    'amount': 'qty',
    'quantity': 'qty'
};

function planActions(intentData, session) {
    const actions = [];

    // --- 1. פעולות מערכת (עוקף LLM) ---
    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "דף חלק! 📄 מה נדפיס?" } }] };
    }
    if (intentData.intent === 'show_cart') {
        const total = session.cart.reduce((sum, item) => sum + item.client_price, 0);
        const cartText = session.cart.length > 0 
            ? `🛒 **סיכום ביניים:**\nיש לך ${session.cart.length} פריטים.\nסה"כ: ₪${total}\n\nתרצה לסיים הזמנה?` 
            : "העגלה ריקה. בוא נתחיל משהו חדש!";
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: cartText } }] };
    }
    if (intentData.intent === 'remove') {
         // אם ה-LLM זיהה מוצר למחיקה, אפשר לשכלל כאן. כרגע מחיקה כללית/אחרונה
         return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: null } }, { type: 'GENERATE_RESPONSE', payload: { text: "מחקתי את הפריט האחרון." } }] }; 
    }

    // --- 2. ניהול הקשר (Context Management) ---
    let currentProductKey = intentData.product || session.currentProduct;
    
    // אם ה-LLM זיהה מוצר שונה ממה שיש בזיכרון -> החלפת נושא
    if (intentData.product && intentData.product !== session.currentProduct) {
        session.currentProduct = intentData.product;
        currentProductKey = intentData.product;
        // אם החלפנו מוצר, מאפסים את הטיוטה של המוצר הקודם
        if (intentData.product !== session.currentProduct) session.draftAttributes = {}; 
    }

    // אם עדיין אין מוצר, זו שיחת חולין או התייעצות
    if (!currentProductKey) {
        // ברירת מחדל: שיחת צ'אט
        const aiText = intentData.aiResponse || "אני כאן לכל שאלה על דפוס! מה תרצה להדפיס? (כרטיסים, פליירים...)";
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: aiText,
                    quickReplies: [{ label: 'פליירים', value: 'flyer' }, { label: 'כרטיסי ביקור', value: 'bc' }]
                } 
            }] 
        };
    }

    const productConfig = productsDB[currentProductKey];
    if (!productConfig) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מוצר זה לא קיים במערכת כרגע." } }] };
    }

    // --- 3. נרמול הנתונים (Data Normalization) ---
    // כאן השרת לוקח את מה שה-LLM הבין וממיר אותו לנתונים טכניים
    
    let rawParams = intentData.extractedParams || {};
    let normalizedParams = {};
    
    // תרגום מפתחות (paper -> paper_type)
    Object.keys(rawParams).forEach(key => {
        const dbKey = PARAM_ALIASES[key] || key; 
        normalizedParams[dbKey] = rawParams[key];
    });

    // תרגום ערכים (Matching Values)
    // אם ה-LLM שלח "מט" וה-DB צריך "matte_350"
    if (productConfig.questions) {
        productConfig.questions.forEach(q => {
            const val = normalizedParams[q.key];
            if (val && q.options) {
                // חיפוש חכם בתוך האופציות
                const match = q.options.find(opt => 
                    opt.value.toLowerCase() === val.toString().toLowerCase() || 
                    opt.label.includes(val) ||
                    (typeof val === 'string' && val.includes(opt.value))
                );
                
                if (match) {
                    normalizedParams[q.key] = match.value;
                }
            }
        });
    }

    // מיזוג עם מה שכבר ידוע לנו בשיחה הזו
    const newDraft = { ...session.draftAttributes, ...normalizedParams };
    
    // תיקונים ספציפיים למוצרים (Hardcoded Logic)
    if (currentProductKey === 'sticker' && !newDraft.material) newDraft.material = 'vinyl_white'; // ברירת מחדל למדבקות

    // --- 4. מנוע השאלות (The Funnel) ---
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

    // --- 5. יצירת התשובה ---
    if (missingParam) {
        // שלב א': חסר מידע -> שואלים שאלה
        let finalResponse = "";
        
        // אם ה-LLM נתן תשובה מילולית ("בטח, פליירים זה מעולה"), נשתמש בה כפתיח
        if (intentData.aiResponse && intentData.intent !== 'quote') {
            finalResponse += intentData.aiResponse + "\n\n";
        } else if (Object.keys(session.draftAttributes).length === 0) {
            // פתיח גנרי להתחלת מוצר
            finalResponse += `בכיף! בוא נתקתק את ה${productConfig.name}. 👌\n`;
        }

        finalResponse += questionToAsk.question_he;

        actions.push({
            type: 'PRESENT_OPTIONS',
            question: finalResponse,
            options: questionToAsk.options || [], // כפתורים מה-DB
            product: currentProductKey,
            saveDraft: newDraft
        });
    } else {
        // שלב ב': יש את כל המידע -> מחשבים מחיר!
        try {
            const calcParams = { ...newDraft, product: currentProductKey };
            const calcResult = calculate_custom_job(session.cart, calcParams);
            const item = calcResult.lastAdded;
            
            // === התיקון הגדול: יצירת טקסט מלא ל-Payload ===
            const successText = `✅ הוספתי לעגלה:\n**${item.description}**\nכמות: ${item.qty.toLocaleString()}\nסה"כ: ₪${item.client_price.toLocaleString()}\n\nתרצה להוסיף עוד משהו או לסיים?`;

            actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
            actions.push({ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: successText, // כאן השרת ייקח את הטקסט הזה!
                    quickReplies: [{ label: 'סיום והזמנה 💳', value: 'checkout' }, { label: 'עוד מוצר ➕', value: 'menu' }]
                } 
            });
            actions.push({ type: 'CHECK_QUEUE' }); 
        } catch (e) {
            console.error("Calculation Error:", e);
            actions.push({ type: 'GENERATE_RESPONSE', payload: { text: "אופס, נתקלתי בבעיה בחישוב. נסה לשנות כמות או גודל." } });
        }
    }

    return { actions };
}

module.exports = { planActions };