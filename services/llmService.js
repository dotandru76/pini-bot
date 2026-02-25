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
 * Robust JSON Extraction & Schema Validation (CTO Mandate Phase 4)
 */
function extractAndValidateLLMResponse(rawText) {
    // 1. Regex Extraction (Mandatory Layer)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("HARD_FAIL: No JSON object found in LLM response.");
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

// Definition of the Response Schema (Phase 4 - Conversational Compiler)
const schema = {
    description: "Pini Compiler Schema v4.0",
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
                required: ["product", "confidence"],
                additionalProperties: false
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
                required: ["key", "value", "context", "confidence"],
                additionalProperties: false
            }
        }
    },
    required: ["intent", "answer_text", "products_detected", "parameters_detected"],
    additionalProperties: false
};

// Read Prompt configuration
let SYSTEM_PROMPT = "";
try {
    SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, '../config/prompts/wizardPrompt.txt'), 'utf8');
} catch (e) {
    console.error("❌ Failed loading wizardPrompt.txt");
}

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
        `\n[DETERMINISTIC METADATA (CODE-FIXED)]: ${JSON.stringify(session.lastImageMetadata)}` : "";

    const promptParts = [
        { text: SYSTEM_PROMPT },
        { text: `\n[CURRENT STATE]: Active Product: ${session.currentProduct || "None"}${technicalContext}` },
        { text: `\n[USER SAYS]: "${message}"` }
    ];

    if (imageBuffer) {
        logAI("📷 Image detected. Activating Multimodal context.");
        promptParts.push({
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: "image/jpeg"
            }
        });
    }

    try {
        console.time(`⏱️ [LLM] Phase 4 Request`);
        const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
        console.timeEnd(`⏱️ [LLM] Phase 4 Request`);

        const response = result.response;
        const rawText = response.text();

        // 1. New Extraction & Validation Logic
        const parsedObj = extractAndValidateLLMResponse(rawText);

        const usage = result.response.usageMetadata;
        let tokenData = usage ? { in: usage.promptTokenCount, out: usage.candidatesTokenCount, total: usage.totalTokenCount } : null;

        const apiCostRaw = tokenData ? ((tokenData.in * 0.075 / 1000000) + (tokenData.out * 0.30 / 1000000)) : 0;
        recordInferenceCost(apiCostRaw);

        parsedObj._debug = {
            tokens: tokenData,
            governance: "v4.0-Compiler"
        };

        return parsedObj;

    } catch (error) {
        console.error(`[COMPILER AI ERROR]:`, error.message);
        // Soft fail to a consistent structure
        return {
            intent: "chat",
            answer_text: "סליחה, אני חווה קושי קטן בעיבוד הבקשה. נסה שוב?",
            products_detected: [],
            parameters_detected: []
        };
    }
}

module.exports = { routeWithLLM };
