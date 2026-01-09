/** tests/test_qa_master.js V45.0 */
const { planActions } = require('../engine/planner');
const { extractParameters } = require('../engine/extractor');
const { getSession, clearSession } = require('../services/sessionManager');
require('dotenv').config();

const c = { reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", bold: "\x1b[1m", cyan: "\x1b[36m" };

const SCENARIOS = [
    {
        name: "📚 זרימת ספרים (סדר מעודכן)",
        steps: [
            { user: "אני רוצה להדפיס ספר", expectType: "question", expectText: "סוג" }, 
            { user: "כריכה רכה", expectType: "question", expectText: "עותקים" }, // עודכן: "עותקים" במקום "כמות"
            { user: "100", expectType: "question", expectText: "עמודים" }, 
            { user: "300", expectType: "question", expectText: "גודל" },
            { user: "A5", expectType: "question", expectText: "נייר" },
            { user: "כרומו 300", expectType: "calculate" } 
        ]
    },
    {
        name: "🔄 החלפת נושא (רולאפ)",
        steps: [
            { user: "פליירים", expectType: "question", expectText: "כמה" }, 
            { user: "בעצם לא, תביא לי רולאפ", expectType: "question", expectText: "כמה" }, 
            { user: "1", expectType: "question", expectText: "גודל" },
            { user: "85x200", expectType: "calculate" }
        ]
    },
    {
        name: "🗑️ בדיקת מחיקת פריט",
        steps: [
            { user: "רולאפ", expectType: "question", expectText: "כמה" },
            { user: "1", expectType: "question", expectText: "גודל" },
            { user: "85x200", expectType: "calculate" }, 
            { user: "תמחק את פריט 1", expectType: "remove" }, 
            { user: "היי", expectType: "response", expectText: "מה נדפיס" } // מצפה לתפריט ראשי
        ]
    }
];

async function runTests() {
    console.log(`${c.bold}${c.cyan}🤖 PINI BOT MASTER QA TEST (V45)${c.reset}\n`);
    const sessionId = 'qa_tester';
    let totalErrors = 0;

    for (const scenario of SCENARIOS) {
        console.log(`${c.yellow}📂 ${scenario.name}${c.reset}`);
        clearSession(sessionId); 
        const session = getSession(sessionId);

        for (const step of scenario.steps) {
            try {
                const extraction = extractParameters(step.user);
                let intent = 'chat';
                
                if (extraction.isReset) intent = 'reset';
                else if (extraction.isRemove) intent = 'remove';
                else if (session.currentProduct) {
                     if (extraction.products.length > 0 && !extraction.products.includes(session.currentProduct)) {
                         intent = 'new_order';
                         session.currentProduct = extraction.products[0];
                         session.draftAttributes = {}; 
                     } else {
                         intent = 'update';
                     }
                }
                else if (extraction.products.length > 0) {
                    intent = 'new_order';
                    session.currentProduct = extraction.products[0];
                }

                const plan = planActions({ 
                    intent, 
                    extractedParams: extraction, 
                    product: session.currentProduct,
                    raw_text: step.user 
                }, session);
                
                const action = plan.actions[0]; 
                let type = 'unknown';
                let responseText = '';

                if (action.type === 'PRESENT_OPTIONS') {
                    type = 'question';
                    responseText = action.question;
                    session.currentProduct = action.product;
                    session.draftAttributes = action.saveDraft;
                } else if (action.type === 'CALCULATE_AND_ADD') {
                    type = 'calculate';
                    session.cart.push(action.payload);
                    session.currentProduct = null;
                    session.draftAttributes = {};
                } else if (action.type === 'REMOVE_FROM_CART') {
                    type = 'remove';
                    if (session.cart.length > 0) session.cart.pop();
                } else if (action.type === 'GENERATE_RESPONSE') {
                    type = 'response';
                    responseText = action.payload.text;
                }

                const textMatch = !step.expectText || (responseText && responseText.includes(step.expectText));
                const typeMatch = type === step.expectType;

                if (typeMatch && textMatch) {
                    console.log(`   ✅ "${step.user}" -> ${type}`);
                } else {
                    console.log(`   ❌ "${step.user}"`);
                    console.log(`      Received: [${type}] "${responseText || ''}"`);
                    console.log(`      Expected: [${step.expectType}] "${step.expectText || ''}"`);
                    totalErrors++;
                }
            } catch (e) { console.log(`   💥 Error: ${e.message}`); totalErrors++; }
        }
        console.log("");
    }
}

runTests();