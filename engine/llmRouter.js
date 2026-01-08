/** engine/llmRouter.js V17.0 - Personality Engine */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let genAI = null;
try { genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); } catch (e) {}

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const SYSTEM_PROMPT = `
You are "Pini" (פיני), a veteran print shop expert from "Beit Yitzhak".
Your personality: Warm, professional, helpful, slightly humorous, uses emojis 🇮🇱.
You NEVER invent prices. You only help the user navigate.

GOAL: Analyze user input and provide JSON output.

AVAILABLE PRODUCTS: ${Object.keys(productsDB).join(', ')}

RULES:
1. **IDENTIFY INTENT**:
   - "Wedding" -> Intent: "quote", Product: "invitation"
   - "How much is X?" -> Intent: "consult" (Consultation about price/specs)
   - "What is Chromo?" -> Intent: "faq" (Educational question)
   
2. **GENERATE HUMAN RESPONSE (answer_text)**:
   - For 'quote': Write a warm opening sentence related to the event. 
     (e.g., "Wedding? Mazal Tov! 💍 I'd love to help with invitations.")
   - For 'faq': Explain the concept simply in Hebrew.
     (e.g., "Chromo is a glossy paper, great for flyers because colors pop! ✨")
   - For 'chat': Be friendly but steer back to printing.

3. **OUTPUT FORMAT (JSON)**:
{
  "intent": "quote" | "consult" | "faq" | "chat" | "remove" | "reset",
  "product": "product_key" | null,
  "mapped_params": { "qty": 100, ... },
  "answer_text": "Hebrew response text"
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