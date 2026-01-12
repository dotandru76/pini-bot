/** engine/classifier.js V91.0 - Syntax & Fast Path Fixed */
const { validateLLMResult } = require('./validator');
const { routeWithLLM } = require('./llmRouter'); // תוקן לפי בקשתך

// מילות מפתח לטיפול מהיר ללא LLM
const KEYWORDS = {
    reset: ['reset', 'התחל', 'איפוס', 'ריסט', 'תפריט'],
    cart: ['עגלה', 'סיכום', 'מה יש', 'בסל', 'כמה זה יוצא', 'כמה יצא'],
    checkout: ['תארוז', 'הצעת מחיר', 'לשלם', 'חשבון', 'צ\'ק אאוט', 'checkout'],
    greeting: ['היי', 'שלום', 'הי', 'אהלן', 'בוקר טוב', 'ערב טוב'],
    bye: ['ביי', 'להתראות', 'תודה', 'יום טוב'],
    remove: ['מחק', 'תסיר', 'להוריד', 'remove']
};

async function classify(text, session) {
    const t = text.toLowerCase().trim();

    // 1. Fast Path - בדיקות מיידיות
    if (KEYWORDS.reset.some(k => t.includes(k))) return { intent: 'reset' };
    if (KEYWORDS.cart.some(k => t.includes(k))) return { intent: 'show_cart' };
    
    // זיהוי בקשת תשלום/הצעה (רק אם יש משהו בעגלה)
    if (session.cart && session.cart.length > 0) {
        if (KEYWORDS.checkout.some(k => t.includes(k))) return { intent: 'show_cart' };
    }

    // זיהוי ברכה
    if (KEYWORDS.greeting.some(k => t.startsWith(k)) && t.length < 20) {
        return { intent: 'chat', aiResponse: 'היי! אני פיני 👨‍🎨, מה נדפיס היום?' };
    }

    // זיהוי פרידה
    if (KEYWORDS.bye.some(k => t.includes(k))) {
        return { intent: 'chat', aiResponse: 'בשמחה! מוזמן לחזור מתי שתרצה.' };
    }

    if (KEYWORDS.remove.some(k => t.includes(k))) return { intent: 'remove' };

    // 2. LLM Pipeline
    try {
        const llmResult = await routeWithLLM(text, session); // תוקן השם
        
        // 3. Validation Layer
        const validated = validateLLMResult(llmResult, text, session);
        
        return validated;

    } catch (e) {
        console.error("Classifier Error:", e);
        return { intent: 'chat', aiResponse: 'סליחה, הייתה תקלה רגעית. נסה שוב?' };
    }
}

// תוקן ה-Export כדי להתאים לקריאה ב-server.js
module.exports = { classifyMessage: classify };