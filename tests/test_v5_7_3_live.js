require('dotenv').config({ path: '../.env' });
const { classifyMessage } = require('../engine/classifier');
const { handleChat } = require('../controllers/chatController');

async function testScenario1() {
    // This was an empty function that was not correctly implemented
}

async function runTests() {
    console.log("🚀 Starting Spec v5.7.3 Live Tests...");

    // We will just mock the req/res and rely on the real session Manager
    const { getSession, pushToSessionCart } = require('../services/sessionManager');

    // SCENARIO 1
    console.log("\n🧪 --- SCENARIO 1: Auto-Commit Live (Quantity Multiplication) --- 🧪");
    const session1 = getSession("user1");
    // Clear session for clean slate
    session1.cart = [];
    session1.active_products = [];
    session1.blockState = { reason: null, ttl: 0 };
    session1.history = [];

    let req1 = { body: { message: "1000 פליירים כרומו A4", userId: "user1", requestId: "11111111-1111-1111-1111-111111111111" } };
    let res1 = { status: () => res1, json: (data) => { console.log("🤖 Response 1:", data.text); console.log("🛒 Cart:", data.cart ? data.cart.map(c => `${c.product}: ${c.qty}`) : "No cart"); } };
    await handleChat(req1, res1);

    let req2 = { body: { message: "תכפיל בעצם ל-2000 בנייר נטול עץ", userId: "user1", requestId: "22222222-2222-2222-2222-222222222222" } };
    let res2 = { status: () => res2, json: (data) => { console.log("\n🤖 Response 2:", data.text); console.log("🛒 Cart:", data.cart ? data.cart.map(c => `${c.product}: ${c.qty}`) : "No cart"); } };
    await handleChat(req2, res2);


    // SCENARIO 2
    console.log("\n🧪 --- SCENARIO 2: Decoupling Test (Block Evasion) --- 🧪");
    const session2 = getSession("user2");
    session2.cart = [];
    session2.active_products = [];
    session2.blockState = { reason: null, ttl: 0 };
    session2.history = [];

    // Force instability block
    let req2_1 = { body: { message: "אני רוצה רולאפ באורך 2 מטר או אולי 3", userId: "user2", requestId: "33333333-3333-3333-3333-333333333333" } };
    let res2_1 = { status: () => res2_1, json: (data) => { console.log("🤖 Response 2_1:", data.text); console.log("🔒 BlockState:", session2.blockState); } };
    await handleChat(req2_1, res2_1);

    let req2_2 = { body: { message: "בסדר אבל מה עם חוברות 200 דף גודל A5", userId: "user2", requestId: "44444444-4444-4444-4444-444444444444" } };
    let res2_2 = { status: () => res2_2, json: (data) => { console.log("\n🤖 Response 2_2 (Decoupled!):", data.text); console.log("🔒 BlockState:", session2.blockState); } };
    await handleChat(req2_2, res2_2);


    // SCENARIO 3
    console.log("\n🧪 --- SCENARIO 3: Hebrew Mapping Stress --- 🧪");
    const session3 = getSession("user3");
    session3.cart = [];
    session3.active_products = [];
    session3.blockState = { reason: null, ttl: 0 };
    session3.history = [];

    let req3_1 = { body: { message: "תביא לי מחיר לחוברות 500 כמות עמודים 30 10x15 כריכה בחום סוג כרומו", userId: "user3", requestId: "55555555-5555-5555-5555-555555555555" } };
    let res3_1 = {
        status: () => res3_1, json: (data) => {
            console.log("🤖 Response 3_1:", data.text);
            console.log("🔄 Active Products Binding Types:");
            session3.active_products.forEach(p => {
                console.log(`${p.type} -> Binding = ${p.attributes.binding}`);
            });
        }
    };
    await handleChat(req3_1, res3_1);
}

runTests().catch(console.error);
