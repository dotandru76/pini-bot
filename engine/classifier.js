/** engine/classifier.js V13.0 - Intelligent Routing */
const { routeWithLLM } = require('./llmRouter');

async function classifyMessage(message, session) {
    const text = message.toLowerCase().trim();

    // 1. FAST PATH: בדיקות מהירות (0ms latency)
    // זיהוי איפוס מוחלט
    if (['reset', 'התחל', 'איפוס', 'ריסט', 'תפריט'].includes(text)) {
        return { intent: 'reset' };
    }
    
    // זיהוי עגלה
    if (text.includes('עגלה') || text.includes('סיכום') || text === 'מה יש') {
        return { intent: 'show_cart' };
    }
    
    // זיהוי מחיקה (רק אם זה מפורש ומדויק)
    if (text === 'מחק' || text === 'מחק אחרון' || text === 'הסר') {
        return { intent: 'remove' };
    }

    // 2. SMART PATH: שימוש במוח (LLM)
    // ה-LLM יבין: "אני צריך פליירים לחתונה", "נייר עבה", "בעצם לא"
    console.log("🧠 Consulting Gemini...");
    
    // קריאה ל-LLM Router (הקובץ שכבר קיים אצלך)
    const llmResult = await routeWithLLM(message, session);
    
    console.log("🧠 LLM Decision:", llmResult.intent, llmResult.product);

    // המרת תשובת ה-LLM לפורמט שה-Planner מכיר
    return {
        intent: llmResult.intent || 'chat', // ברירת מחדל
        product: llmResult.product,         // המוצר שזוהה (flyer, bc...)
        extractedParams: llmResult.mapped_params || {}, // פרמטרים שחולצו (qty: 500)
        aiResponse: llmResult.answer_text,  // התשובה המילולית של ה-AI ("בטח, מזל טוב!")
        raw_text: message
    };
}

module.exports = { classifyMessage };