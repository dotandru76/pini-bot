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

// Definition of the Response Schema (AI Governance Law v1.0)
const schema = {
    description: "Pini Engine Response Schema",
    type: SchemaType.OBJECT,
    properties: {
        intent: {
            type: SchemaType.STRING,
            enum: ["quote", "consult", "chat", "remove", "reset", "update"],
            description: "The primary intention of the user."
        },
        product: {
            type: SchemaType.STRING,
            nullable: true,
            description: "The product key identified (e.g., 'flyer', 'sticker')."
        },
        event_context: {
            type: SchemaType.STRING,
            nullable: true,
            enum: ["wedding", "exhibition", "business", "other"],
            description: "The semantic context of the event."
        },
        answer_text: {
            type: SchemaType.STRING,
            description: "The Hebrew response to the user."
        },
        recommended_products: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Strictly empty array per governance rules."
        },
        mapped_params: {
            type: SchemaType.OBJECT,
            properties: {
                qty: { type: SchemaType.NUMBER, nullable: true },
                paper: { type: SchemaType.STRING, nullable: true },
                size: { type: SchemaType.STRING, nullable: true }
            },
            description: "Extracted non-technical parameters."
        },
        semantic_analysis: {
            type: SchemaType.OBJECT,
            properties: {
                has_logo: { type: SchemaType.BOOLEAN, description: "Whether a logo is visible." },
                is_legible: { type: SchemaType.BOOLEAN, description: "Whether the text is readable." },
                style: { type: SchemaType.STRING, description: "Elegant, Modern, etc." }
            },
            description: "Semantic vision interpretation for Layer 2."
        }
    },
    required: ["intent", "answer_text", "recommended_products"]
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

    // AI Governance: Deterministic structured output
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
            temperature: 0,
            topP: 0.1,
            responseMimeType: "application/json",
            responseSchema: schema,
        }
    });

    // Inject Deterministic Layer 1 metadata into context if available
    const technicalContext = session.lastImageMetadata ?
        `\n[DETERMINISTIC METADATA (CODE-FIXED)]: ${JSON.stringify(session.lastImageMetadata)}` : "";

    const promptParts = [
        { text: SYSTEM_PROMPT },
        { text: `\n[CURRENT STATE]: Active Product: ${session.currentProduct || "None"}${technicalContext}` },
        { text: `\n[USER SAYS]: "${message}"` }
    ];

    if (imageBuffer) {
        logAI("📷 Image detected. Activating Layer 2 Semantic Vision.");
        promptParts.push({
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: "image/jpeg"
            }
        });
    }

    try {
        console.time(`⏱️ [LLM] Governance Response`);
        const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
        console.timeEnd(`⏱️ [LLM] Governance Response`);

        const usage = result.response.usageMetadata;
        let tokenData = usage ? { in: usage.promptTokenCount, out: usage.candidatesTokenCount, total: usage.totalTokenCount } : null;

        const response = result.response;
        const parsedObj = JSON.parse(response.text());

        const apiCostRaw = tokenData ? ((tokenData.in * 0.075 / 1000000) + (tokenData.out * 0.30 / 1000000)) : 0;
        recordInferenceCost(apiCostRaw);

        parsedObj._debug = {
            source: imageBuffer ? "Vision-Layer2" : "LLM-Structured",
            tokens: tokenData,
            governance: "v1.0-Structured"
        };

        return parsedObj;

    } catch (error) {
        console.error(`[GOVERNANCE AI ERROR]:`, error.message);
        return { intent: "chat", answer_text: "סליחה, אני חווה קושי קטן בניתוח הסמנטי. ננסה שוב?", recommended_products: [] };
    }
}

module.exports = { routeWithLLM };
