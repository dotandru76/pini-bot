/** engine/llmRouter.js V16.0 - Parallel Brain */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let genAI = null;
try { genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); } catch (e) {}

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const SYSTEM_PROMPT = `
You are "Pini", a warm and professional Print Shop expert.
Your goal: Analyze the user's input and provide BOTH technical classification AND a warm human response.

AVAILABLE PRODUCTS: ${Object.keys(productsDB).join(', ')}

RULES:
1. **DETECT PRODUCT & INTENT**:
   - "Wedding" -> Product: "invitation", Intent: "quote"
   - "Business cards" -> Product: "bc", Intent: "quote"
   - "How much is X?" -> Product: "X", Intent: "consult"

2. **GENERATE WARM RESPONSE (answer_text)**:
   - If user says "I'm getting married", say: "Mazal Tov! How exciting! 💍 Let's make perfect invitations."
   - If user says "Opening a business", say: "Good luck! Let's get you branded properly."
   - KEEP IT SHORT (1 sentence).

3. **OUTPUT FORMAT (JSON)**:
{
  "intent": "quote" | "consult" | "chat" | "remove" | "reset",
  "product": "product_key" | null,
  "answer_text": "The warm human response text (Hebrew)",
  "mapped_params": { ... }
}
`;

async function routeWithLLM(message, session) {
    if (!genAI) return { intent: 'chat', answer_text: null };

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const finalPrompt = SYSTEM_PROMPT 
            + `\n[CURRENT CONTEXT]: Product=${session.currentProduct || "None"}`
            + `\n[USER INPUT]: "${message}"\nJSON Output:`;

        const result = await model.generateContent(finalPrompt);
        let text = result.response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(text);

    } catch (error) {
        console.error("🧠 LLM Error:", error);
        return { intent: "chat", answer_text: null };
    }
}

module.exports = { routeWithLLM };