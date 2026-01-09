/** engine/llmRouter.js V32.0 - The Precision Brain */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const logAI = (msg, data) => console.log(`\x1b[35m[🧠 AI-BRAIN]\x1b[0m ${msg}`, data ? JSON.stringify(data, null, 2) : '');

let genAI = null;
try { genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); } catch (e) { logAI("⚠️ Error: No API Key"); }

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const SYSTEM_PROMPT = `
You are "Pini", a print shop expert.
Your job: Extract structured data (JSON) for the "Wizard".

AVAILABLE PRODUCTS: ${Object.keys(productsDB).join(', ')}

*** IRON RULES (DO NOT BREAK) ***
1. **Negation Handling (CRITICAL)**:
   - If user says "No need for printing", "Without lamination", "No frame" -> Map parameter to "none".
   - DO NOT output intent "remove" unless the user explicitly says "Delete the item", "Remove product", "Cancel order".
   - Example: "I don't need printing" -> intent: "update", mapped_params: { "print": "none" }

2. **Context Awareness**:
   - Always prefer modifying the [ACTIVE PRODUCT] over switching topics.
   - If user gives a number (e.g. "500"), map it to "qty".

3. **Output Format (JSON ONLY)**:
{
  "intent": "quote" | "consult" | "chat" | "remove" | "reset" | "update",
  "product": "product_key" | null,
  "answer_text": "Hebrew text here (keep it short)",
  "mapped_params": { "qty": 100, "paper": "matte", ... },
  "confidence": "high" | "low"
}
`;

async function routeWithLLM(message, session) {
    logAI(`Analyzing Input: "${message}"`);
    
    if (!genAI) return { intent: 'chat', answer_text: "שגיאת חיבור ל-AI" };

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const finalPrompt = SYSTEM_PROMPT 
            + `\n[CURRENT STATE]: Active Product: ${session.currentProduct || "None"}`
            + `\n[USER SAYS]: "${message}"\nJSON Output:`;

        const result = await model.generateContent(finalPrompt);
        let text = result.response.text().replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(text);
        
        logAI("Parsed JSON:", parsed);
        return parsed;

    } catch (error) {
        console.error("\x1b[31m[🧠 AI ERROR]\x1b[0m", error);
        return { intent: "chat", answer_text: null };
    }
}

module.exports = { routeWithLLM };