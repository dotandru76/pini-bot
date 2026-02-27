require('dotenv').config({ path: '../.env' });
const { classifyMessage } = require('../engine/classifier');
const { handleChat } = require('../controllers/chatController');

async function runTest() {
    console.log("🚀 Starting Spec v5.7.2 Reset Guardrail Test...\n");

    let session = {
        cart: [],
        currentProduct: null,
        active_products: [],
        history: [],
        processedRequests: new Map()
    };

    // --- TURN 1: The Big Boss Test (Complex query that often triggers reset false positive) ---
    console.log("🗣️ User: תתחיל מאפס, אני רוצה עכשיו פליירים 1000 יחידות, ובנוסף תעשה לי גם תפריטים עם למינציה מט 200 יחידות");
    let text1 = "תתחיל מאפס, אני רוצה עכשיו פליירים 1000 יחידות, ובנוסף תעשה לי גם תפריטים עם למינציה מט 200 יחידות";

    // We can test the classifier directly and see what happens with the controller guardrail.
    const extraction = await classifyMessage(text1, session);

    console.log("🤖 Classifier Initial Intent:", extraction.intent);
    console.log("🤖 Products Detected:", extraction.products_detected);

    // Mock Express Req/Res to test controller logic independently
    let mockReq = {
        body: { message: text1, userId: "testUserGuardrail", requestId: "11111111-2222-3333-4444-555555555555" }
    };
    let mockRes = {
        status: function (s) { return this; },
        json: function (data) {
            console.log("\n📦 Final Response Intent from Controller:", data.text);
            console.log("🛒 Cart length:", data.cart ? data.cart.length : 0);
            return data;
        }
    };

    // Controller run
    await handleChat(mockReq, mockRes);
}

runTest().catch(console.error);
