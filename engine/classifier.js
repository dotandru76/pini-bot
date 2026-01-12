/** engine/classifier.js V97.1 - Crash Proof & Button Bypass */
const { validateLLMResult } = require('./validator');
const { routeWithLLM } = require('./llmRouter');

const KEYWORDS = {
    reset: ['reset', 'התחל', 'איפוס', 'ריסט', 'תפריט'],
    cart: ['עגלה', 'סיכום', 'מה יש', 'בסל', 'כמה זה יוצא', 'כמה יצא'],
    checkout: ['תארוז', 'הצעת מחיר', 'לשלם', 'חשבון', 'צ\'ק אאוט', 'checkout'],
    greeting: ['היי', 'שלום', 'הי', 'אהלן', 'בוקר טוב', 'ערב טוב'],
    bye: ['ביי', 'להתראות', 'תודה', 'יום טוב'],
    remove: ['מחק', 'תסיר', 'להוריד', 'remove']
};

async function classify(text, session) {
    // --- CRASH FIX: Ensure input is always a string ---
    const safeText = String(text || ""); 
    const t = safeText.toLowerCase().trim();

    // --- 0. SUPER FAST PATH: Technical Codes (Buttons) ---
    // אם זה נראה כמו קוד טכני (matte_350), ה-LLM לא צריך לגעת בזה!
    if (/^[a-z]+_[a-z0-9_]+$/.test(t)) {
        console.log(`🚀 [CLASSIFIER] Fast Path (Button Click): ${t}`);
        return { 
            intent: 'update', // זה תמיד עדכון פרמטר
            raw_text: safeText, // מעבירים את הטקסט כמו שהוא
            mapped_params: {} 
        };
    }

    // 1. Fast Path - בדיקות מיידיות רגילות
    if (KEYWORDS.reset.some(k => t.includes(k))) return { intent: 'reset' };
    if (KEYWORDS.cart.some(k => t.includes(k))) return { intent: 'show_cart' };
    
    if (session.cart && session.cart.length > 0) {
        if (KEYWORDS.checkout.some(k => t.includes(k))) return { intent: 'show_cart' };
    }

    if (KEYWORDS.greeting.some(k => t.startsWith(k)) && t.length < 20) {
        return { intent: 'chat', aiResponse: 'היי! אני פיני 👨‍🎨, מה נדפיס היום?' };
    }

    if (KEYWORDS.bye.some(k => t.includes(k))) {
        return { intent: 'chat', aiResponse: 'בשמחה! מוזמן לחזור מתי שתרצה.' };
    }

    if (KEYWORDS.remove.some(k => t.includes(k))) return { intent: 'remove' };

    // 2. LLM Pipeline (רק למלל חופשי אמיתי)
    try {
        const llmResult = await routeWithLLM(safeText, session);
        const validated = validateLLMResult(llmResult, safeText, session);
        return validated;
    } catch (e) {
        console.error("Classifier Error:", e);
        return { intent: 'chat', aiResponse: 'סליחה, הייתה תקלה רגעית. נסה שוב?' };
    }
}

module.exports = { classifyMessage: classify };