require('dotenv').config({ path: '../.env' });
const { classifyMessage } = require('../engine/classifier');
const { planActions } = require('../engine/planner');
const fs = require('fs');

async function runSanityTests() {
    let report = {};

    let session1 = { cart: [], currentProduct: null };
    let text1 = "צריך 1000 כרטיסי ביקור";
    let intent1 = await classifyMessage(text1, session1);
    report.test1 = { input: text1, classification: intent1 };

    let session2 = { cart: [], currentProduct: null };
    let text2 = "אהלן פיני, מה העניינים? אני רוצה להדפיס חוברת שירים לסבתא שלי.";
    let intent2 = await classifyMessage(text2, session2);
    let plan2 = planActions(intent2, session2);
    report.test2 = { input: text2, classification: intent2, planner_question: plan2.actions[0].question };

    let session3 = { cart: [], currentProduct: 'alucobond', draftAttributes: { qty: 1 } };
    let text3 = "אני רוצה שלט אלוקובונד קטן, 10 על 10 ס\"מ.";
    let intent3 = await classifyMessage(text3, session3);
    let plan3 = planActions(intent3, session3);
    report.test3 = { input: text3, classification: intent3, planner_actions: plan3.actions };

    fs.writeFileSync('sanity_results.json', JSON.stringify(report, null, 2), 'utf8');
    console.log("DONE");
}

runSanityTests().catch(console.error);
