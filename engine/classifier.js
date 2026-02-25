/** engine/classifier.js V100.0 - Compiler Integration */
const { routeWithLLM } = require('../services/llmService');
const { downloadFile } = require('../services/storageService');

const KEYWORDS = {
    reset: ['reset', 'התחל', 'איפוס', 'ריסט', 'תפריט'],
    cart: ['עגלה', 'סיכום', 'כמה זה יוצא', 'כמה יצא'],
    checkout: ['תארוז', 'הצעת מחיר', 'לשלם', 'חשבון', 'צ\'ק אאוט', 'checkout']
};

async function classify(text, session) {
    const safeText = String(text || "");
    const t = safeText.toLowerCase().trim();

    // 1. Technical Fast Paths (Bypass Compiler)
    if (t.startsWith('system_')) {
        return { intent: 'system_action', action: t, raw_text: safeText };
    }

    if (KEYWORDS.reset.some(k => t.includes(k))) return { intent: 'reset' };
    if (KEYWORDS.cart.some(k => t.includes(k))) return { intent: 'show_cart' };

    // 2. LLM / Compiler Pipeline
    try {
        let imageBuffer = null;
        if (safeText.includes('[IMAGE_UPLOADED:')) {
            const match = safeText.match(/\[IMAGE_UPLOADED:\s*([^\]]+)\]/);
            if (match) {
                try {
                    imageBuffer = await downloadFile(match[1].trim());
                } catch (e) {
                    console.error("Failed to fetch vision buffer:", e);
                }
            }
        }

        // The LLM now returns the structured "Extracted Data" for the compiler
        const extraction = await routeWithLLM(safeText, session, imageBuffer);
        extraction.raw_text = safeText;

        return extraction;
    } catch (e) {
        console.error("Classifier Error:", e);
        return {
            intent: "chat",
            answer_text: "סליחה, אני חווה קושי קטן בעיבוד. נסה שוב?",
            products_detected: [],
            parameters_detected: []
        };
    }
}

module.exports = { classifyMessage: classify };

module.exports = { classifyMessage: classify };