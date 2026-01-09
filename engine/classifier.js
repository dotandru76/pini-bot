/** engine/classifier.js V37.1 */
const { routeWithLLM } = require('./llmRouter');
const { validateLLMResult } = require('./validator');

const KEYWORDS = {
    reset: ['reset', 'התחל', 'איפוס', 'ריסט', 'תפריט', 'ראשי'],
    cart: ['עגלה', 'סיכום', 'מה יש', 'status'],
    remove_all: ['מחק הכל', 'רוקן עגלה']
};

async function classifyMessage(message, session) {
    const text = message.toLowerCase().trim();
    
    // Fast Path
    if (KEYWORDS.reset.some(k => text.includes(k))) return { intent: 'reset', raw_text: message };
    if (KEYWORDS.cart.some(k => text.includes(k))) return { intent: 'show_cart', raw_text: message };
    if (KEYWORDS.remove_all.some(k => text === k)) return { intent: 'remove_all', raw_text: message };

    // Pipeline
    console.log("🧠 Consulting Gemini...");
    let result = await routeWithLLM(message, session);
    result = validateLLMResult(result, message, session);

    return {
        intent: result.intent || 'chat',
        product: result.product,
        extractedParams: result.mapped_params || {}, 
        aiResponse: result.answer_text, 
        raw_text: message 
    };
}

module.exports = { classifyMessage };