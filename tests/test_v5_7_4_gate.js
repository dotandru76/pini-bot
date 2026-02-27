require('dotenv').config({ path: '../.env' });
const { handleChat } = require('../controllers/chatController');
const { getSession } = require('../services/sessionManager');

async function runTests() {
    console.log("\n🧪 --- SCENARIO: The 'But...' Test (Anti-Regression) --- 🧪");
    const sessionID = "user_gate_1";
    let req1 = { body: { message: "1000 פליירים כרומו A4", userId: sessionID, requestId: "11111111-1111-1111-1111-111111111111" } };
    let res1 = { status: () => res1, json: () => { } };
    await handleChat(req1, res1);

    // Validate session properties for the priced active item to be ready for the gate
    let session = getSession(sessionID);
    console.log("🛒 Items priced:", session.active_products.filter(p => p.status === 'priced').length);

    console.log("\n🗣️ User: יאללה תן הצעה, אבל בעצם תשנה את הכמות ל-500");
    let req2 = { body: { message: "יאללה תן הצעה, אבל בעצם תשנה את הכמות ל-500", userId: sessionID, requestId: "22222222-2222-2222-2222-222222222222" } };
    let res2 = {
        status: () => res2, json: (data) => {
            console.log("🤖 Response 2:", data.text);
        }
    };
    await handleChat(req2, res2);

    session = getSession(sessionID);
    console.log("🔒 Session Locked?", session.state === 'locked');
    if (session.state === 'locked') {
        console.error("❌ FAILED: The session locked when the user used a condition word ('אבל').");
    } else {
        console.log("✅ PASSED: Session remained open appropriately.");
    }

    console.log("\n🧪 --- SCENARIO: The Disconnect Test (Hard Gate) --- 🧪");
    const sessionID2 = "user_gate_2";
    let req3 = { body: { message: "100 קטלוגים משודכים בכריכת סיכות על נייר נטול עץ A5, 20 עמודים", userId: sessionID2, requestId: "33333333-3333-3333-3333-333333333333" } };
    let res3 = { status: () => res3, json: () => { } };
    await handleChat(req3, res3);

    console.log("\n🗣️ User: הכל מושלם תן הצעה");
    let req4 = { body: { message: "הכל מושלם תן הצעה", userId: sessionID2, requestId: "44444444-4444-4444-4444-444444444444" } };
    let res4 = {
        status: () => res4, json: (data) => {
            console.log("🤖 Response 4:", data.text);
        }
    };
    await handleChat(req4, res4);

    let session2 = getSession(sessionID2);
    console.log("🔒 Session Locked?", session2.state === 'locked');

    console.log("\n🗣️ User: איפה הכפתור?");
    let req5 = { body: { message: "איפה הכפתור?", userId: sessionID2, requestId: "55555555-5555-5555-5555-555555555555" } };
    let res5 = {
        status: () => res5, json: (data) => {
            console.log("🤖 Response 5:", data.text);
        }
    };
    await handleChat(req5, res5);

    if (session2.state === 'locked') {
        console.log("✅ PASSED: Session logic processed strictly bypassing LLM.");
    } else {
        console.error("❌ FAILED: Session did not lock upon explicit closure request.");
    }
}

runTests().catch(e => console.error(e));
