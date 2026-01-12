/** tests/test_ultimate_saga.js V14.0 */
const { classifyMessage } = require('../engine/classifier');
const { planActions } = require('../engine/planner');
const { getSession, clearSession } = require('../services/sessionManager');
require('dotenv').config();

const c = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", bold: "\x1b[1m", cyan: "\x1b[36m" };

const SAGA_STEPS = [
    { id: 1, text: "היי פיני, מה העניינים?", expect: "greeting" },
    { id: 2, text: "תגיד מה אתה יודע להדפיס?", expect: "chat_or_consult" },
    { id: 3, text: "אני צריך עזרה עם אירוע חברה", expect: "chat_or_consult" },
    { id: 4, text: "טוב תתחיל עם כרטיסי ביקור", expect: "ask_qty" },
    { id: 5, text: "500 יחידות", expect: "ask_paper" },
    { id: 6, text: "נייר מט רגיל", expect: "ask_lami" },
    { id: 7, text: "בלי למינציה", expect: "calculate" },
    { id: 8, text: "סבבה. תוסיף לי גם רולאפ", expect: "ask_size" },
    { id: 9, text: "גודל סטנדרטי 85", expect: "ask_qty" },
    { id: 10, text: "שניים כאלה", expect: "calculate" },
    { id: 11, text: "כמה זה יוצא בינתיים?", expect: "show_cart" },
    { id: 12, text: "תגיד אתה עושה גם חולצות?", expect: "out_of_scope" },
    { id: 13, text: "באסה. טוב לא משנה", expect: "chat_or_consult" },
    { id: 14, text: "אני צריך גם פליירם לחלק", expect: "ask_size" },
    { id: 15, text: "דף שלם A4", expect: "ask_paper" },
    { id: 16, text: "כרומו דק", expect: "ask_qty" },
    { id: 17, text: "10000 עותקים", expect: "calculate" },
    { id: 18, text: "רגע, לגבי הכרטיסי ביקור ממקודם", expect: "update_intent" },
    { id: 19, text: "תשנה לי את הכמות ל-1000", expect: "calculate_update" },
    { id: 20, text: "וגם תחליף את הנייר ליוקרתי כזה, פנינה", expect: "calculate_update" },
    { id: 21, text: "מה עוד כדאי לאירוע?", expect: "chat_or_consult" },
    { id: 22, text: "אולי מדבקות לוגו?", expect: "ask_qty_sqm" },
    { id: 23, text: "כן! תביא לי 5 מטר", expect: "ask_cut" },
    { id: 24, text: "חיתוך צורני ברור", expect: "calculate" },
    { id: 25, text: "תמחק את הרולאפים, זה יקר לי", expect: "remove" },
    { id: 26, text: "אוי מחקת הכל?", expect: "chat_or_consult" },
    { id: 27, text: "לא נורא, נתחיל מהר", expect: "chat_or_consult" },
    { id: 28, text: "1000 פליירים A5", expect: "ask_paper" },
    { id: 29, text: "כרומו 300", expect: "calculate" },
    { id: 30, text: "500 כרטיסי ביקור מט", expect: "ask_lami" },
    { id: 31, text: "למינציה מט", expect: "calculate" },
    { id: 32, text: "תדפיס לי כסף", expect: "impossible" },
    { id: 33, text: "חחח סתם", expect: "chat" },
    { id: 34, text: "מה יש בסל?", expect: "show_cart" },
    { id: 35, text: "נראה טוב", expect: "chat" },
    { id: 36, text: "תארוז לי", expect: "checkout" },
    { id: 37, text: "איך משלמים?", expect: "checkout" },
    { id: 38, text: "תודה יא מלך", expect: "greeting" },
    { id: 39, text: "יאללה ביי", expect: "greeting" },
    { id: 40, text: "ריסט", expect: "reset" }
];

async function runUltimateSaga() {
    console.log(`${c.bold}${c.cyan}🔥 STARTING THE ULTIMATE REAL-LIFE SAGA (V14.0) 🔥${c.reset}\n`);
    const sessionId = 'saga_user_vip_v2';
    clearSession(sessionId);
    const session = getSession(sessionId);
    let passCount = 0;

    for (const step of SAGA_STEPS) {
        process.stdout.write(`${c.yellow}Step ${step.id}:${c.reset} "${step.text}" ... `);
        try {
            const classification = await classifyMessage(step.text, session);
            const plan = planActions(classification, session);
            
            let responseType = "unknown";
            let botText = "";
            const actionTypes = plan.actions.map(a => a.type);

            if (actionTypes.includes('CLEAR_SESSION_CONTEXT')) responseType = classification.intent === 'reset' ? "reset" : "chat";
            if (actionTypes.includes('REMOVE_FROM_CART')) responseType = "remove";
            if (actionTypes.includes('CALCULATE_AND_ADD')) responseType = "calculate";
            if (actionTypes.includes('PRESENT_OPTIONS')) responseType = "question";
            
            if (actionTypes.includes('GENERATE_RESPONSE')) {
                const resAction = plan.actions.find(a => a.type === 'GENERATE_RESPONSE');
                botText = resAction.payload.text || "";
                if (responseType === "unknown") {
                    if (botText.includes("🛒") || botText.includes("עגלה") || botText.includes("סה\"כ")) responseType = "show_cart";
                    else if (classification.intent === 'chat' || classification.intent === 'consult') responseType = "chat";
                }
            }

            for (const action of plan.actions) {
                if (action.type === 'PRESENT_OPTIONS') { session.currentProduct = action.product; session.draftAttributes = action.saveDraft; }
                if (action.type === 'CALCULATE_AND_ADD') { session.cart.push(action.payload); session.currentProduct = null; session.draftAttributes = {}; }
                if (action.type === 'REMOVE_FROM_CART') { if (session.cart.length > 0) session.cart.splice(action.payload.index, 1); }
            }

            const isPass = checkExpectation(step.expect, responseType, classification, botText);
            if (isPass) { console.log(`${c.green}✅ PASS${c.reset}`); passCount++; }
            else { 
                console.log(`${c.red}❌ FAIL${c.reset}`); 
                console.log(`   Expected: ${step.expect}, Got: ${responseType}, Bot: "${botText.split('\n')[0]}..."`); 
            }
        } catch (e) { console.log(`${c.red}💥 CRASH: ${e.message}${c.reset}`); }
    }
    const score = Math.round((passCount / SAGA_STEPS.length) * 100);
    console.log(`\n${c.bold}📊 FINAL SAGA SCORE: ${score}%${c.reset}`);
}

function checkExpectation(expected, actual, classification, botText) {
    if (expected === actual) return true;
    if (expected === "chat_or_consult" && (actual === "chat" || actual === "question")) return true;
    if (expected === "checkout" && (actual === "show_cart" || actual === "chat")) return true;
    if (expected === "greeting" && actual === "chat") return true;
    if (expected === "out_of_scope" && (botText.includes("גדול עלינו") || botText.includes("רק מוצרי נייר"))) return true;
    if (expected === "impossible" && (botText.includes("הלוואי") || botText.includes("בלתי אפשרי"))) return true;
    if (expected.startsWith("ask_") && actual === "question") return true;
    if (expected === "calculate_update" && actual === "calculate") return true;
    if (expected === "update_intent" && (actual === "question" || actual === "calculate" || actual === "chat")) return true;
    return false;
}

runUltimateSaga();