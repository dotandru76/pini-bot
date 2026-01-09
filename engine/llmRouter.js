/** engine/llmRouter.js V37.1 */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const logAI = (msg, data) => console.log(`\x1b[35m[🧠 AI]\x1b[0m ${msg}`, data ? JSON.stringify(data) : '');

let genAI = null;
try { genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); } catch (e) { logAI("⚠️ Error: No API Key"); }

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const SYSTEM_PROMPT = `
You are "Pini", a print shop expert.
Your job: Extract structured data (JSON) for the Wizard.

AVAILABLE PRODUCTS: ${Object.keys(productsDB).join(', ')}

*** IRON RULES ***
1. **Product Mapping**:
   - "Sefer", "Book", "Hoveret" -> Product: "booklet".
   - "Card" -> Product: "bc".

2. **Negation Handling**:
   - "No need for X", "Without X" -> UPDATE param to "none". 
   - DO NOT output "remove" intent unless user says "DELETE ITEM".

3. **Output JSON**:
{
  "intent": "quote" | "consult" | "chat" | "remove" | "reset" | "update",
  "product": "product_key" | null,
  "answer_text": "Hebrew text",
  "mapped_params": { "qty": 100, "paper": "matte", ... }
}
`;

async function routeWithLLM(message, session) {
    if (!genAI) return { intent: 'chat', answer_text: "שגיאת חיבור ל-AI" };

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const finalPrompt = SYSTEM_PROMPT 
            + `\n[CURRENT STATE]: Active Product: ${session.currentProduct || "None"}`
            + `\n[USER SAYS]: "${message}"\nJSON Output:`;

        const result = await model.generateContent(finalPrompt);
        let text = result.response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(text);

    } catch (error) {
        console.error("[AI ERROR]", error);
        return { intent: "chat", answer_text: null };
    }
}

module.exports = { routeWithLLM };