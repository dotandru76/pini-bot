/** engine/llmRouter.js V14.0 - The Intuitive Brain */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let genAI = null;
try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} catch (e) {
    console.error("⚠️ Gemini API Key missing");
}

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const SYSTEM_PROMPT = `
You are the semantic router for a Print Shop Bot ("Pini").
Your goal is to detect the USER INTENT and ACTIVE PRODUCT from Hebrew text.

AVAILABLE PRODUCTS (DB KEYS):
${Object.keys(productsDB).join(', ')}

*** CRITICAL RULES FOR INFERENCE ***
1.  **IMPLIED PRODUCTS**: You must infer the product from the context, even if not explicitly named.
    - "I'm getting married" / "Wedding" -> Product: "invitation" (Intent: quote)
    - "New business" / "Opening a shop" -> Product: "bc" (Business Cards) or "flyer"
    - "Conference" -> Product: "rollup" or "flyer"
    - "Branding" -> Product: "sticker" or "bc"

2.  **INTENT CLASSIFICATION**:
    - "quote": User wants to print something (even if they just mention an event like "Wedding").
    - "consult": User asks "What do you recommend?" or "How much is X?".
    - "chat": Only for "Hello", "How are you", "Thanks". If they mention an event, it is NOT chat.
    - "remove": Words like "delete", "cancel", "remove".

3.  **JSON OUTPUT ONLY**:
    Return a JSON object with:
    {
      "intent": "quote" | "consult" | "chat" | "remove" | "reset",
      "product": "product_key" (or null),
      "mapped_params": { ...extracted params... },
      "answer_text": "Short Hebrew response (only for chat/consult)"
    }

EXAMPLES:
User: "אני מתחתן עוד חודש" (I'm getting married)
Result: { "intent": "quote", "product": "invitation", "mapped_params": {}, "answer_text": "מזל טוב! בוא נעצב לך הזמנות." }

User: "צריך דברים למשרד" (Need office stuff)
Result: { "intent": "quote", "product": "office", "mapped_params": {} }
`;

async function routeWithLLM(message, session) {
    if (!genAI) return { intent: 'chat', answer_text: "שגיאת חיבור ל-AI" };

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        // בניית הקשר
        let currentProductContext = session.currentProduct || "None";
        
        const finalPrompt = SYSTEM_PROMPT 
            + `\n\n[CURRENT CONTEXT]: Product=${currentProductContext}`
            + `\n[USER INPUT]: "${message}"`
            + `\nJSON Output:`;

        const result = await model.generateContent(finalPrompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const parsed = JSON.parse(text);
        
        // תיקון חירום: אם המודל זיהה מוצר אבל סיווג כ-chat, נהפוך ל-quote
        if (parsed.product && parsed.intent === 'chat') {
            parsed.intent = 'quote';
        }

        return parsed;

    } catch (error) {
        console.error("🧠 LLM Error:", error);
        return { intent: "chat", answer_text: null };
    }
}

module.exports = { routeWithLLM };