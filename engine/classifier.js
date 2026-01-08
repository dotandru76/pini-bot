/** engine/classifier.js V31.0 - Hybrid Intelligence */
const { routeWithLLM } = require('./llmRouter');

const KEYWORDS = {
    // מילים שמפעילות פעולה מידית ללא AI
    reset: ['reset', 'התחל', 'איפוס', 'ריסט', 'תפריט', 'ראשי'],
    cart: ['עגלה', 'סיכום', 'מה יש', 'status'],
    remove: ['מחק', 'הסר']
};

async function classifyMessage(message, session) {
    const text = message.toLowerCase().trim();

    // 1. FAST PATH (בדיקות מהירות)
    if (KEYWORDS.reset.some(k => text.includes(k))) return { intent: 'reset' };
    if (KEYWORDS.cart.some(k => text.includes(k))) return { intent: 'show_cart' };
    if (KEYWORDS.remove.some(k => text === k)) return { intent: 'remove' };

    // 2. SMART PATH (שימוש ב-Gemini)
    console.log("🧠 Consulting Gemini...");
    try {
        const llmResult = await routeWithLLM(message, session);
        
        console.log("🧠 LLM Decision:", llmResult.intent, llmResult.product);

        return {
            intent: llmResult.intent || 'chat',
            product: llmResult.product,
            extractedParams: llmResult.mapped_params || {}, 
            aiResponse: llmResult.answer_text, 
            raw_text: message
        };
    } catch (e) {
        console.error("Classifier Fallback:", e);
        return { intent: 'chat', aiResponse: "סליחה, אני קצת עמוס. נסה שוב." };
    }
}

module.exports = { classifyMessage };