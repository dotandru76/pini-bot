const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const { isBudgetExceeded, recordInferenceCost } = require('./budgetManager');
require('dotenv').config();

const logAI = (msg, data) => console.log(`\x1b[35m[🧠 AI]\x1b[0m ${msg}`, data ? JSON.stringify(data) : '');

let genAI = null;
try {
    if (process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
} catch (e) { logAI("⚠️ Error: No API Key"); }

/**
 * Robust JSON Extraction & Schema Validation (CTO Mandate Spec v5.7)
 * Implements mandatory Regex Parsing Guardrail.
 */
function extractAndValidateLLMResponse(rawText) {
    // 🛡️ [PARSING GUARDRAIL] Mandatory Regex Extraction
    // re.search(r'\{.*\}', text, re.DOTALL) equivalent in JS
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error("❌ [PARSING] No JSON found in raw text:", rawText);
        throw new Error("HARD_FAIL: No JSON object found in LLM response.");
    }

    // Capture the potential text before JSON for logging if needed
    const preJsonText = rawText.substring(0, jsonMatch.index).trim();
    if (preJsonText) {
        console.log(`ℹ️ [AI CHATTER DETECTED]: "${preJsonText}"`);
    }

    // 2. Cleanup: Strip code fences and trailing commas
    let cleanJson = jsonMatch[0]
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/,\s*([\]}])/g, '$1'); // Remove trailing commas

    let parsedData;
    try {
        parsedData = JSON.parse(cleanJson);
    } catch (e) {
        throw new Error(`HARD_FAIL: JSON Parsing failed after cleanup. Error: ${e.message}`);
    }

    // 3. Schema Validation Layer
    if (!parsedData.products_detected || !Array.isArray(parsedData.products_detected)) {
        throw new Error("HARD_FAIL: Missing or invalid 'products_detected' array.");
    }
    if (!parsedData.parameters_detected || !Array.isArray(parsedData.parameters_detected)) {
        throw new Error("HARD_FAIL: Missing or invalid 'parameters_detected' array.");
    }

    return parsedData;
}

// Definition of the Response Schema
const schema = {
    description: "Pini Advisor Schema v5.7",
    type: SchemaType.OBJECT,
    properties: {
        intent: {
            type: SchemaType.STRING,
            enum: ["quote", "consult", "chat", "remove", "reset", "update"],
            description: "The primary intention of the user."
        },
        answer_text: {
            type: SchemaType.STRING,
            description: "Friendly Hebrew response."
        },
        products_detected: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    product: { type: SchemaType.STRING },
                    confidence: { type: SchemaType.NUMBER }
                },
                required: ["product", "confidence"]
            }
        },
        parameters_detected: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    key: { type: SchemaType.STRING },
                    value: { type: SchemaType.STRING },
                    context: { type: SchemaType.STRING, description: "Product key or 'global'." },
                    confidence: { type: SchemaType.NUMBER }
                },
                required: ["key", "value", "context", "confidence"]
            }
        }
    },
    required: ["intent", "answer_text", "products_detected", "parameters_detected"]
};

// Read Prompt configuration
let SYSTEM_PROMPT = "";
try {
    SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, '../config/prompts/wizardPrompt.txt'), 'utf8');
} catch (e) {
    console.error("❌ Failed loading wizardPrompt.txt");
}

/**
 * Spec v5.7: Multi-turn Stateful Route
 */
async function routeWithLLM(message, session, imageBuffer = null) {
    if (isBudgetExceeded()) {
        console.warn("🛑 [BUDGET] Daily limit reached. Blocking LLM request.");
        return { intent: 'chat', answer_text: "המערכת בתחזוקה רגעית (נחזור לפעילות מלאה מחר בבוקר)", confidence: 1.0 };
    }

    if (!genAI) return { intent: 'chat', answer_text: "שגיאת חיבור ל-AI (חסר מפתח API)" };

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
            temperature: 0,
            topP: 0.1,
            responseMimeType: "application/json",
            responseSchema: schema,
        }
    });

    const technicalContext = session.lastImageMetadata ?
        `\n[DETERMINISTIC METADATA]: ${JSON.stringify(session.lastImageMetadata)}` : "";

    // Build History Context (Turns)
    let historyContext = "";
    if (session.history && session.history.length > 0) {
        historyContext = "\n[RECENT HISTORY]:\n" + session.history.map(h => `${h.role === 'user' ? 'Customer' : 'Bot'}: ${h.text}`).join("\n");
    }

    // Build Stateful Payload (Phase 5.7 - Building the payload)
    const statefulPayload = session.statefulContext ? `\n[BUSINESS STATE]: ${JSON.stringify(session.statefulContext)}` : "";
    const jitKnowledge = session.jitKnowledge ? `\n[JIT KNOWLEDGE]: ${session.jitKnowledge}` : "";

    const promptParts = [
        { text: SYSTEM_PROMPT },
        { text: historyContext },
        { text: statefulPayload },
        { text: jitKnowledge },
        { text: `\n[CURRENT PRODUCT]: ${session.currentProduct || "None"}${technicalContext}` },
        { text: `\n[USER INPUT]: "${message}"` }
    ];

    if (imageBuffer) {
        logAI("📷 Image detected.");
        promptParts.push({
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: "image/jpeg"
            }
        });
    }

    try {
        console.time(`⏱️ [LLM] Phase 5.7 Request`);
        const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
        console.timeEnd(`⏱️ [LLM] Phase 5.7 Request`);

        const response = result.response;
        const rawText = response.text();

        // 🛡️ [PARSING GUARDRAIL]
        const parsedObj = extractAndValidateLLMResponse(rawText);

        const usage = result.response.usageMetadata;
        let tokenData = usage ? { in: usage.promptTokenCount, out: usage.candidatesTokenCount, total: usage.totalTokenCount } : null;

        const apiCostRaw = tokenData ? ((tokenData.in * 0.075 / 1000000) + (tokenData.out * 0.30 / 1000000)) : 0;
        recordInferenceCost(apiCostRaw);

        parsedObj._debug = {
            tokens: tokenData,
            governance: "v5.7-StatefulAdvisor"
        };

        return parsedObj;

    } catch (error) {
        console.error(`[AI ERROR]:`, error.message);
        return {
            intent: "chat",
            answer_text: "סליחה, אני חווה קושי קטן בעיבוד הבקשה. נסה שוב?",
            products_detected: [],
            parameters_detected: []
        };
    }
}

module.exports = { routeWithLLM };
