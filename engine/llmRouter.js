/** engine/llmRouter.js V_DEBUG - Verbose Logging & Smart Inference */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// לוג צבעוני לזיהוי קל
const logAI = (msg, data) => console.log(`\x1b[35m[🧠 AI-BRAIN]\x1b[0m ${msg}`, data ? JSON.stringify(data, null, 2) : '');

let genAI = null;
try { genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); } catch (e) { logAI("⚠️ Error: No API Key"); }

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const SYSTEM_PROMPT = `
You are "Pini", a smart print shop assistant.
Your goal is to UNDERSTAND the user, even if they speak in slang or hints.

AVAILABLE PRODUCTS (DB KEYS):
${Object.keys(productsDB).join(', ')}

*** INFERENCE RULES (USE YOUR BRAIN!) ***
1. **Implied Products**:
   - User: "I'm getting married" -> Product: "invitation" (Intent: quote)
   - User: "New business" -> Product: "bc" or "flyer" (Intent: quote)
   - User: "Something for the wall" -> Product: "canvas" or "poster"
   
2. **Conversation & Personality**:
   - If user asks a question ("What is X?"), Intent is "faq".
   - If user just says "Hi", Intent is "chat".
   - ALWAYS generate a "answer_text" in Hebrew that fits the persona (Warm, Israeli).

3. **OUTPUT JSON ONLY**:
{
  "intent": "quote" | "consult" | "chat" | "remove" | "reset",
  "product": "product_key" | null,
  "answer_text": "Hebrew text here",
  "mapped_params": { "qty": 100, ... },
  "confidence": "high" | "low",
  "reasoning": "Why you chose this product/intent"
}
`;

async function routeWithLLM(message, session) {
    logAI(`Analyzing Input: "${message}"`);
    logAI(`Current Context Product: ${session.currentProduct || 'None'}`);

    if (!genAI) return { intent: 'chat', answer_text: "שגיאת חיבור ל-AI" };

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const finalPrompt = SYSTEM_PROMPT 
            + `\n[CONTEXT]: Active Product: ${session.currentProduct || "None"}`
            + `\n[USER SAYS]: "${message}"\nJSON Output:`;

        const result = await model.generateContent(finalPrompt);
        let text = result.response.text().replace(/```json|```/g, '').trim();
        
        logAI("Raw Response from Gemini:", text); // <--- כאן נראה אם ה-AI הבין!

        const parsed = JSON.parse(text);
        logAI("Parsed JSON:", parsed);

        return parsed;

    } catch (error) {
        console.error("\x1b[31m[🧠 AI ERROR]\x1b[0m", error);
        return { intent: "chat", answer_text: null };
    }
}

module.exports = { routeWithLLM };