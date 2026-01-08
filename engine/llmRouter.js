/** engine/llmRouter.js V12.0 - The Hybrid Brain */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// אתחול המודל
let genAI = null;
try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} catch (e) {
    console.error("⚠️ Gemini API Key missing or invalid");
}

// טעינת הקטלוג כדי שהמוח ידע מה קיים
let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const SYSTEM_PROMPT = `
You are the brain of "Pini Print Bot".
Your job is to translate Hebrew user input into structured JSON commands.

CONTEXT:
- You are strictly a translator/classifier. DO NOT calculate prices.
- Current Product Context: {{CURRENT_PRODUCT}}
- Valid Options for this product: {{VALID_OPTIONS}}

INTENTS:
1. "quote" - User wants to order/update parameters (e.g., "100 copies", "A5", "hard cover").
2. "faq" - User asks a general question (e.g., "What is closed size?", "Where are you located?").
3. "remove" - User wants to delete item/reset.
4. "consult" - User needs help choosing a product.
5. "chat" - Small talk.

RULES for "quote":
- Map user terms to VALID option keys provided in context.
- Example: If user says "Hard cover" (כריכה קשה) and valid options are ['staple', 'perfect_bind'], map to 'perfect_bind' (closest match) or null if no match.
- Extract: qty, product_type, and any product-specific attributes.

RESPONSE FORMAT (JSON ONLY):
{
  "intent": "quote" | "faq" | "remove" | "consult" | "chat",
  "product": "product_key" | null,
  "mapped_params": { "qty": 100, "cover_type": "perfect_bind", ... },
  "answer_text": "Only for FAQ/Chat/Consult - write a helpful Hebrew response here"
}
`;

async function routeWithLLM(message, session) {
    if (!genAI) return { intent: 'chat', answer_text: "שגיאת חיבור ל-AI" };

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // מודל מהיר וזול
        
        // 1. בניית הקשר דינמי (מה מותר לבחור עכשיו?)
        let currentProductContext = "None";
        let validOptions = "None";
        
        if (session.currentProduct && productsDB[session.currentProduct]) {
            currentProductContext = session.currentProduct;
            const prod = productsDB[session.currentProduct];
            // מכינים רשימה של שאלות ואופציות חוקיות
            validOptions = prod.questions.map(q => {
                const opts = q.options ? q.options.map(o => `${o.label} (${o.value})`).join(', ') : "Open Number";
                return `${q.key}: [${opts}]`;
            }).join('\n');
        }

        // 2. הזרקת ההקשר לפרומפט
        const finalPrompt = SYSTEM_PROMPT
            .replace('{{CURRENT_PRODUCT}}', currentProductContext)
            .replace('{{VALID_OPTIONS}}', validOptions)
            + `\nUser Input: "${message}"\nJSON Output:`;

        // 3. שליחה ל-Gemini
        const result = await model.generateContent(finalPrompt);
        let text = result.response.text();
        
        // ניקוי ה-JSON (לפעמים המודל מוסיף ```json)
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(text);

    } catch (error) {
        console.error("🧠 Brain Freeze (LLM Error):", error);
        // Fallback למקרה של תקלה
        return { intent: "chat", answer_text: "סליחה, נתקעתי לרגע. תוכל לחזור על זה?" };
    }
}

module.exports = { routeWithLLM };