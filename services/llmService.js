/** services/llmService.js V38.0 - MVC Refactoring */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const logAI = (msg, data) => console.log(`\x1b[35m[🧠 AI]\x1b[0m ${msg}`, data ? JSON.stringify(data) : '');

let genAI = null;
try {
    if (process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
} catch (e) { logAI("⚠️ Error: No API Key"); }

// Read Prompt configuration
let SYSTEM_PROMPT = "";
try {
    SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, '../config/prompts/wizardPrompt.txt'), 'utf8');
} catch (e) {
    console.error("❌ Failed loading wizardPrompt.txt");
}

async function routeWithLLM(message, session) {
    if (!genAI) return { intent: 'chat', answer_text: "שגיאת חיבור ל-AI (חסר מפתח API)" };

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
