require('dotenv').config({ path: '../.env' });
const { classifyMessage } = require('../engine/classifier');
const { compileOrder } = require('../engine/planner');
const fs = require('fs');

async function runSanityTests() {
    let report = {};

    let session1 = { cart: [], currentProduct: null };
    let text1 = "צריך 1000 כרטיסי ביקור";
    let intent1 = await classifyMessage(text1, session1);
    report.test1 = { input: text1, classification: intent1 };

    let session2 = { cart: [], currentProduct: null, active_products: [] };
    let text2 = "אהלן פיני, מה העניינים? אני רוצה להדפיס חוברת שירים לסבתא שלי.";
    let intent2 = await classifyMessage(text2, session2);
    let plan2 = compileOrder(intent2, session2);
    report.test2 = { input: text2, classification: intent2, planner_status: plan2.status, planner_guidance: plan2.fallback_guidance };

    let session3 = { cart: [], currentProduct: 'rollup', active_products: [{ type: 'rollup', status: 'draft', attributes: { qty: 1 }, history: { qty: [1] } }] };
    let text3 = "אני רוצה רולאפ קטן, מטר על מטר.";
    let intent3 = await classifyMessage(text3, session3);
    let plan3 = compileOrder(intent3, session3);
    report.test3 = { input: text3, classification: intent3, planner_status: plan3.status, planner_validation: plan3.items };

    fs.writeFileSync('sanity_results.json', JSON.stringify(report, null, 2), 'utf8');
    console.log("DONE");
}

runSanityTests().catch(console.error);
