/** tests/test_full_qa.js V44.0 */
// ... (אותו קוד ייבוא)
const { planActions } = require('../engine/planner');
const { extractParameters } = require('../engine/extractor');
const { getSession, clearSession } = require('../services/sessionManager');
const { validateLLMResult } = require('../engine/validator');
require('dotenv').config();

const c = { reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", bold: "\x1b[1m", cyan: "\x1b[36m" };

const SCENARIOS = [
    {
        name: "📂 DIGITAL_FLOW",
        steps: [
            { user: "היי", expectType: "response" }, // Chat returns response
            { user: "אני צריך 1000 כרטיסי ביקור", expectType: "question" },
            { user: "נייר מט רגיל", expectType: "question" },
            { user: "בלי למינציה", expectType: "question" }, // Scodix question
            { user: "ללא", expectType: "calculate" } 
        ]
    },
    {
        name: "📂 CHECKOUT_FLOW",
        steps: [
            { user: "תפריט", expectType: "response" }, // Reset returns response
            { user: "1000 פליירים A5 נייר כרומו 130", expectType: "calculate" },
            { user: "מה יש בעגלה?", expectType: "response" }, // Show cart returns response
            { user: "תשלח לי הצעת מחיר", expectType: "response" }, // Checkout returns response (cart summary)
            { user: "תודה ביי", expectType: "response" } // Chat returns response
        ]
    }
    // ... אפשר להוסיף עוד
];

// ... (שאר הקוד של הריצה נשאר דומה, רק לוודא שמריצים את validateLLMResult)
// בתוך הלולאה הראשית של הטסט:
// let intent = 'chat';
// let validated = validateLLMResult({ intent, product: null, mapped_params: extraction }, step.user, session);
// const plan = planActions({ 
//    intent: validated.intent, 
//    extractedParams: validated.mapped_params, 
//    product: validated.product,
//    aiResponse: "Mock AI Response", // חובה לטסט כדי ש-Chat יעבוד
//    raw_text: step.user 
// }, session);