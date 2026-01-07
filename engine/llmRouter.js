/** engine/llmRouter.js V10.8 - Logic Hardening */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let productsRaw = "{}";
try { productsRaw = fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'); } catch (err) {}

const SYSTEM_PROMPT = `
You are the Router for "Pini Print Bot".
Your goal: Extract structured data (JSON) from Hebrew user messages.

KNOWN PRODUCTS:
${productsRaw}

OUT OF SCOPE:
- Billboards, 3D Printing, T-Shirts, Mugs, Car wraps, Offset huge runs, Money printing.

RULES:
1. OUTPUT JSON ONLY.
2. "product": "key_from_db" (if known), "out_of_scope", "impossible" (e.g. print on water/money), or null.
3. INTENT RULES:
   - "Change", "Replace", "Instead" -> "update"
   - "Add", "Also", "I want" (new item) -> "quote"
   - "Delete", "Remove" -> "remove"
   - General questions -> "consult" or "chat"
4. ENTITIES: Extract qty, size, paper_type, lamination, etc.
   - For Rollups: "standard" or "85" implies "85x200".

OUTPUT FORMAT:
{
  "intent": "quote" | "consult" | "chat" | "remove" | "reset" | "update",
  "product": "product_key" | "out_of_scope" | "impossible" | null,
  "confidence": 0.0-1.0,
  "entities": {
    "qty": number,
    "paper_type": string,
    "size": string,
    "text_summary": "Description"
  }
}
`;

async function routeWithLLM(message, currentContext = {}) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        let contextMsg = `User Message: "${message}"\n`;
        
        // Context Injection
        if (currentContext.currentProduct) {
            contextMsg += `\n[CURRENT STATE]: Active Product: ${currentContext.currentProduct}\n`;
            contextMsg += `Attributes: ${JSON.stringify(currentContext.draftAttributes || {})}\n`;
        } else if (currentContext.cart && currentContext.cart.length > 0) {
             const lastItem = currentContext.cart[currentContext.cart.length - 1];
             contextMsg += `\n[LAST CART ITEM]: ${lastItem.product} (${lastItem.description})\n`;
        }

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: "System Config: " + SYSTEM_PROMPT }] },
                { role: "model", parts: [{ text: "Understood." }] }
            ],
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await chat.sendMessage(contextMsg);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);

    } catch (error) {
        console.error("Router Error:", error);
        return { intent: "consult", product: null, entities: {} };
    }
}

module.exports = { routeWithLLM };