/** engine/classifier.js V13.0 - Intelligent Routing */
const { routeWithLLM } = require('./llmRouter');
const { extractParameters } = require('./extractor'); // עדיין משתמשים בזה לגיבוי

async function classifyMessage(message, session) {
    const text = message.toLowerCase().trim();

    // 1. FAST PATH: בדיקות מהירות שלא עולות כסף/זמן
    // זיהוי איפוס מוחלט
    if (['reset', 'התחל', 'איפוס', 'ריסט'].includes(text)) {
        return { intent: 'reset' };
    }
    
    // זיהוי עגלה
    if (text.includes('עגלה') || text.includes('סיכום')) {
        return { intent: 'show_cart' };
    }

    // 2. SMART PATH: שימוש במוח (LLM)
    // זה פותר את הבעיות: "מה זה גודל סגור?", "כריכה קשה", "סימניה"
    console.log("🧠 Consulting Gemini...");
    const llmResult = await routeWithLLM(message, session);
    
    console.log("🧠 LLM Result:", JSON.stringify(llmResult));

    // המרת תשובת ה-LLM לפורמט שה-Planner מכיר
    return {
        intent: llmResult.intent, // quote, faq, chat...
        product: llmResult.product,
        extractedParams: llmResult.mapped_params || {}, // הפרמטרים שנוקו ע"י ה-AI
        aiResponse: llmResult.answer_text, // התשובה המילולית (ל-FAQ/Chat)
        raw_text: message
    };
}

module.exports = { classifyMessage };