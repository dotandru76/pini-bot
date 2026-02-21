/** engine/classifier.js V98.0 - Data Integrity Fix */
const { validateLLMResult } = require('./validator');
const { routeWithLLM } = require('../services/llmService');

const KEYWORDS = {
    reset: ['reset', 'התחל', 'איפוס', 'ריסט', 'תפריט'],
    cart: ['עגלה', 'סיכום', 'מה יש', 'בסל', 'כמה זה יוצא', 'כמה יצא'],
    checkout: ['תארוז', 'הצעת מחיר', 'לשלם', 'חשבון', 'צ\'ק אאוט', 'checkout'],
    greeting: ['היי', 'שלום', 'הי', 'אהלן', 'בוקר טוב', 'ערב טוב'],
    bye: ['ביי', 'להתראות', 'תודה', 'יום טוב'],
    remove: ['מחק', 'תסיר', 'להוריד', 'remove']
};

async function classify(text, session) {
    // 1. Crash Proofing: המרה בטוחה לטקסט
    const safeText = String(text || "");
    const t = safeText.toLowerCase().trim();

    // 2. SUPER FAST PATH: Technical Codes (Buttons & System Actions)
    if (/^[a-z]+_[a-z0-9_]+$/.test(t)) {
        console.log(`🚀 [CLASSIFIER] Fast Path (Button Click): ${t}`);
        return {
            intent: 'update',
            raw_text: safeText, // ✅ יש פה raw_text
            mapped_params: {}
        };
    }

    if (t.startsWith('system_remove_item_')) {
        const index = parseInt(t.replace('system_remove_item_', ''));
        console.log(`🚀 [CLASSIFIER] Fast Path: Remove Item ${index}`);
        return { intent: 'remove_specific', payload: { index } };
    }

    if (t.startsWith('system_update_qty_')) {
        const parts = t.replace('system_update_qty_', '').split('_');
        const index = parseInt(parts[0]);
        const qty = parseInt(parts[1]);
        console.log(`🚀 [CLASSIFIER] Fast Path: Update Qty Item ${index} to ${qty}`);
        return { intent: 'update_qty', payload: { index, qty } };
    }

    // 3. Fast Path - מילות מפתח
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

    // 4. LLM Pipeline (למלל חופשי כמו "500")
    try {
        const llmResult = await routeWithLLM(safeText, session);
        console.log(`🤖 [LLM RAW RESULT]:`, JSON.stringify(llmResult));
        const validated = validateLLMResult(llmResult, safeText, session);

        // --- FIX V98.0: הצמדת הטקסט המקורי ---
        // זה מבטיח שה-Planner יקבל את המספר "500" גם אם ה-LLM פספס אותו
        validated.raw_text = safeText;

        return validated;
    } catch (e) {
        console.error("Classifier Error:", e);
        return { intent: 'chat', aiResponse: 'סליחה, הייתה תקלה רגעית. נסה שוב?' };
    }
}

module.exports = { classifyMessage: classify };