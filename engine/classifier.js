/** engine/classifier.js V101.0 - Hybrid Vision Integration */
const { routeWithLLM } = require('../services/llmService');
const { downloadFile } = require('../services/storageService');
const { processImageUpload } = require('./imageProcessor');

const KEYWORDS = {
    reset: ['reset', 'התחל', 'איפוס', 'ריסט', 'תפריט'],
    cart: ['עגלה', 'סיכום', 'כמה זה יוצא', 'כמה יצא'],
    checkout: ['תארוז', 'הצעת מחיר', 'לשלם', 'חשבון', 'צ\'ק אאוט', 'checkout']
};

async function classify(text, session) {
    const safeText = String(text || "");
    const t = safeText.toLowerCase().trim();

    // 1. Technical Fast Paths
    if (t.startsWith('system_')) return { intent: 'system_action', action: t, raw_text: safeText };
    if (KEYWORDS.reset.some(k => t.includes(k)) && t.split(' ').length <= 4) return { intent: 'reset' };
    if (KEYWORDS.cart.some(k => t.includes(k))) return { intent: 'show_cart' };

    // 2. LLM / Compiler Pipeline
    try {
        let imageBuffer = null;
        let technicalMetadata = null;

        if (safeText.includes('[IMAGE_UPLOADED:')) {
            const match = safeText.match(/\[IMAGE_UPLOADED:\s*([^\]]+)\]/);
            if (match) {
                try {
                    imageBuffer = await downloadFile(match[1].trim());
                    // LAYER 1: The Code is Judge (Deterministic physical measurement)
                    technicalMetadata = await processImageUpload(imageBuffer);
                    session.lastImageMetadata = technicalMetadata; // Persist for context
                } catch (e) {
                    console.error("❌ [VISION ERROR]:", e.message);
                }
            }
        }

        const extraction = await routeWithLLM(safeText, session, imageBuffer);

        extraction.raw_text = safeText;
        extraction.technicalMetadata = technicalMetadata;

        // --- Spec v5.7.4: Deterministic Semantic Closure Gate ---
        // Calculate closure intent and confirmation flag heuristically
        let closureScore = 0;
        let isConfirmed = false;

        const positiveClosureSignals = ["השאר", "הכל מושלם", "סגור", "תן הצעה", "מעולה", "בדיוק", "זהו", "תתקדם", "שלח בהקדם", "המשך", "בסדר", "מוכן"];
        const conditionSignals = ["אבל", "חוץ מ", "אולי", "לשנות", "רגע", "שנה", "תחליף", "במקום"];

        const hasPositiveSignal = positiveClosureSignals.some(s => t.includes(s));
        const hasCondition = conditionSignals.some(s => t.includes(s));

        if (hasPositiveSignal && !hasCondition && extraction.intent !== 'update' && extraction.intent !== 'reset') {
            closureScore = 0.9;
            isConfirmed = true;
        } else if (hasCondition || extraction.intent === 'update') {
            closureScore = 0.0;
            isConfirmed = false;
        }

        extraction.closure_intent_score = closureScore;
        extraction.confirmation_flag = isConfirmed;

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