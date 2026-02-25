/**
 * Smart LLM Handler V4 (Fixed Export)
 * ===================================
 * מטפל בשיחה חופשית ומונע קריסות שרת.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

let model = null;
try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
} catch (e) {
    console.error("⚠️ Gemini Init Error:", e.message);
}

const TASK_PROMPTS = {
    greeting: "אתה פיני מדפוס בית יצחק. ענה קצר וידידותי.",
    explain: "הסבר בקצרה על מושג הדפוס שנשאל.",
    freestyle: "ענה בקצרה ובידידותיות. אם שואלים על מחיר, בקש פרטים."
};

/**
 * הפונקציה הראשית שהשרת מנסה להפעיל
 */
async function handleWithSmartLLM(message, session, customer) {
    if (!model) {
        return {
            content: "סליחה, המוח שלי קצת עמוס. בוא ננסה לבחור מהתפריט.",
            quickReplies: []
        };
    }

    try {
        const context = `
        לקוח: ${customer ? customer.name : 'אורח'}
        הודעה: "${message}"
        הנחיה: ענה בעברית, קצר (עד 20 מילים). אל תמציא מחירים.
        `;

        const result = await model.generateContent(context);
        const response = result.response.text();

        return {
            content: response,
            quickReplies: [] // אפשר להוסיף לוגיקה כאן אם רוצים
        };

    } catch (error) {
        console.error("LLM Error:", error);
        return {
            content: "לא הצלחתי להבין לגמרי. אולי תנסה לנסח אחרת?",
            quickReplies: []
        };
    }
}

module.exports = { handleWithSmartLLM };