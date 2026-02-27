require('dotenv').config({ path: '../.env' });
const { classifyMessage } = require('../engine/classifier');
const { handleChat } = require('../controllers/chatController');
const { getSession } = require('../services/sessionManager');

async function runQATests() {
    console.log("🚀 Starting Final QA Live Testing Protocol...");

    // Helper for requests
    const makeReq = async (sessionID, text, reqId) => {
        let req = { body: { message: text, userId: sessionID, requestId: reqId } };
        let resData = null;
        let res = {
            status: () => res,
            json: (data) => { resData = data; }
        };
        await handleChat(req, res);
        return resData;
    };

    // 🧪 SCENARIO 1: Amnesia & v5.7.1
    console.log("\n🧪 --- SCENARIO 1: Amnesia & v5.7.1 ---");
    const s1Id = "qa_user_1";
    let s1 = getSession(s1Id);
    s1.cart = []; s1.active_products = []; s1.blockState = { reason: null, ttl: 0 }; s1.history = [];

    console.log("🗣️ User: 300 חוברות, 120 עמודים, כרומו מט");
    let res1_1 = await makeReq(s1Id, "300 חוברות, 120 עמודים, כרומו מט", "11111111-1111-1111-1111-111111111111");
    console.log("🤖 Response:", res1_1.text);
    console.log("🛒 Cart length:", res1_1.cart ? res1_1.cart.length : 0);

    console.log("\n🗣️ User: שנה את הכמות ל-500");
    let res1_2 = await makeReq(s1Id, "שנה את הכמות ל-500", "22222222-2222-2222-2222-222222222222");
    console.log("🤖 Response:", res1_2.text);
    console.log("🛒 Cart length:", res1_2.cart ? res1_2.cart.length : 0);
    console.log("📋 Active Products State:");
    console.log(JSON.stringify(s1.active_products, null, 2));


    // 🧪 SCENARIO 2: Reset Protection & v5.7.2
    console.log("\n🧪 --- SCENARIO 2: Reset Protection & v5.7.2 ---");
    const s2Id = "qa_user_2";
    let s2 = getSession(s2Id);
    s2.cart = []; s2.active_products = []; s2.blockState = { reason: null, ttl: 0 }; s2.history = [];

    console.log("🗣️ User: אני רוצה להתחיל פרויקט חדש מאפס, תעשה לי 1000 פליירים בגודל A5 על נייר כרומו");
    let res2_1 = await makeReq(s2Id, "אני רוצה להתחיל פרויקט חדש מאפס, תעשה לי 1000 פליירים בגודל A5 על נייר כרומו", "33333333-3333-3333-3333-333333333333");
    console.log("🤖 Response:", res2_1.text);
    console.log("🛒 Cart length:", res2_1.cart ? res2_1.cart.length : 0);
    console.log("📋 Active Products State:");
    console.log(JSON.stringify(s2.active_products, null, 2));


    // 🧪 SCENARIO 3: Terminology & Deadlock (v5.7.3)
    console.log("\n🧪 --- SCENARIO 3: Terminology & Deadlock (v5.7.3) ---");
    const s3Id = "qa_user_3";
    let s3 = getSession(s3Id);
    s3.cart = []; s3.active_products = []; s3.blockState = { reason: null, ttl: 0 }; s3.history = [];

    console.log("🗣️ User: אני רוצה חוברות, כמות 100, 50 עמודים גודל A4 כרומו");
    let res3_1 = await makeReq(s3Id, "אני רוצה חוברות, כמות 100, 50 עמודים גודל A4 כרומו", "44444444-4444-4444-4444-444444444444");
    console.log("🤖 Response:", res3_1.text);

    console.log("\n🗣️ User: אני רוצה כריכה עם דבק חם");
    let res3_2 = await makeReq(s3Id, "אני רוצה כריכה עם דבק חם", "55555555-5555-5555-5555-555555555555");
    console.log("🤖 Response:", res3_2.text);
    console.log("🔒 BlockState:", s3.blockState);
    console.log("📋 Active Products State:");
    console.log(JSON.stringify(s3.active_products, null, 2));

    console.log("\n✅ QA Tests Completed!");
    process.exit(0);
}

runQATests().catch(e => {
    console.error("💥 QA Error:", e);
    process.exit(1);
});
