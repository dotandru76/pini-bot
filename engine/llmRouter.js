/** engine/llmRouter.js V11.5 - Context Keeper */
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

RULES:
1. OUTPUT JSON ONLY.
2. CONTEXT RETENTION (CRITICAL):
   - If the user answers a question (e.g., "Standard", "500", "Matte"), keep the [CURRENT STATE] product.
   - ONLY change "product" if the user explicitly names a new product (e.g., "Actually, I want a Rollup").
   - "Standard" (סטנדרטי) applies to many products. Do NOT assume it means "Rollup" if context is "Invitation".
   
3. INTENT MAPPING:
   - "Change", "Replace" -> "update"
   - "Add", "Also" -> "quote" (New Item)
   - "Recommend", "What do you have for wedding?" -> "consult" (Set product: null)
   
4. ENTITIES: 
   - Extract qty, size, paper_type, lamination.
   - "Standard" size for Invitation -> "12x17" or "A5".

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
            contextMsg += `NOTE: User is likely refining this product. Do not switch unless explicit.\n`;
        }

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: "System Config: " + SYSTEM_PROMPT }] },
                { role: "model", parts: [{ text: "Understood. I will prioritize context retention." }] }
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