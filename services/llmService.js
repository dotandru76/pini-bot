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

    // PHASE 1.3 Anti-Hallucination: Prompt Jail (Temp 0, TopP 0.05)
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
            temperature: 0,
            topP: 0.05
        }
    });

    const finalPrompt = SYSTEM_PROMPT
        + `\n[CURRENT STATE]: Active Product: ${session.currentProduct || "None"}`
        + `\n[USER SAYS]: "${message}"\nJSON Output:`;

    console.log(`\n=================== AI REQUEST ===================`);
    console.log(`📝 [LLM] Payload length: ${finalPrompt.length} chars (~${Math.round(finalPrompt.length / 4)} tokens)`);

    // PHASE 1.3 Anti-Hallucination: Retry Strategy & Token-Level Parsing
    let attempts = 0;
    while (attempts < 2) {
        try {
            console.time(`⏱️ [LLM] Response Time (Attempt ${attempts + 1})`);
            const result = await model.generateContent(finalPrompt);
            console.timeEnd(`⏱️ [LLM] Response Time (Attempt ${attempts + 1})`);

            const usage = result.response.usageMetadata;
            let tokenData = null;
            if (usage) {
                tokenData = {
                    in: usage.promptTokenCount,
                    out: usage.candidatesTokenCount,
                    total: usage.totalTokenCount
                };
                console.log(`📊 [LLM] Tokens Used: In=${usage.promptTokenCount}, Out=${usage.candidatesTokenCount}, Total=${usage.totalTokenCount}`);
            }

            const rawText = result.response.text();

            // Extract pure JSON object using Regex (ignoring markdown wrappers or pre/post text)
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error("No JSON structure found in LLM response.");
            }

            const parsedObj = JSON.parse(jsonMatch[0]);

            // --- PHASE 1.3: Injecting Debug Metadata ---
            parsedObj._debug = {
                source: "LLM",
                tokens: tokenData,
                apiCost: tokenData ? `$${((tokenData.in * 0.15 / 1000000) + (tokenData.out * 0.60 / 1000000)).toFixed(5)}` : "Unknown" // Assuming $0.15/1M in, $0.6/1M out
            };

            console.log(`==================================================\n`);
            return parsedObj;

        } catch (error) {
            console.error(`[AI ERROR] Attempt ${attempts + 1} Failed:`, error.message);
            attempts++;
            if (attempts >= 2) {
                console.error("💥 [AI FATAL] Parsing failed completely after 2 attempts. Returning Fallback.");
                console.log(`==================================================\n`);
                return { intent: "chat", answer_text: "סליחה, לא הבנתי את הבקשה האחרונה. אפשר לנסח אחרת?", confidence: 0 };
            }
        }
    }
}

module.exports = { routeWithLLM };
