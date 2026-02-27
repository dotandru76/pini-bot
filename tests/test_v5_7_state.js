require('dotenv').config({ path: '../.env' });
const { classifyMessage } = require('../engine/classifier');
const { compileOrder, buildSessionStateContext } = require('../engine/planner');
const { calculate_custom_job } = require('../engine/calculation');

async function runTest() {
    console.log("🚀 Starting Spec v5.7.1 State Persistence Test...\n");

    let session = {
        cart: [],
        currentProduct: null,
        active_products: [],
        history: [],
        processedRequests: new Map()
    };

    // --- TURN 1: Initial Request (Draft State) ---
    console.log("🗣️ User: אני רוצה להדפיס חוברות כרומו מאט A4, כמות 300, סגירת סיכות");
    let text1 = "אני רוצה להדפיס חוברות כרומו מאט A4, כמות 300, סגירת סיכות";
    let intent1 = await classifyMessage(text1, session);
    let comp1 = compileOrder(intent1, session);

    console.log("📦 State after Turn 1:");
    console.log(JSON.stringify(session.active_products, null, 2));
    console.log("🤖 System Status:", comp1.status);
    console.log("🤖 System Fallback Guidance:", comp1.fallback_guidance);
    // Should be MISSING pages.

    console.log("\n------------------------------------------------\n");

    // --- TURN 2: Provide Missing Parameter (Priced State) ---
    console.log("🗣️ User: 120 עמודים");
    let text2 = "120 עמודים";
    let intent2 = await classifyMessage(text2, session);
    let comp2 = compileOrder(intent2, session);

    // Simulate ChatController transition to cart
    if (comp2.items && comp2.items.length > 0) {
        comp2.items.forEach(item => {
            if (calculate_custom_job) {
                // mock pricing since it might require other deps
                session.cart.push({ product: item.product, ...item.params, price: 500 });
            }
            const activeItem = session.active_products.find(p => p.type === item.product && p.status !== 'confirmed');
            if (activeItem) activeItem.status = 'priced';
        });
    }

    console.log("🛒 Cart:", session.cart.length, "items.");
    console.log("📦 State after Turn 2 (Should be 'priced' but NOT deleted):");
    console.log(JSON.stringify(session.active_products, null, 2));

    console.log("\n------------------------------------------------\n");

    // --- TURN 3: Up-sell / Modification on Priced Item ---
    console.log("🗣️ User: בעצם תשנה את הכמות ל-500");
    let text3 = "בעצם תשנה את הכמות ל-500";
    let intent3 = await classifyMessage(text3, session);
    let comp3 = compileOrder(intent3, session);

    console.log("📦 State after Turn 3 (Checking Amnesia Resistance):");
    console.log(JSON.stringify(session.active_products, null, 2));

    // If it remembered all attributes, missing should be empty or strictly related to stability, not missing mandatory fields like paper_type.
    let activeBooklet = session.active_products.find(p => p.type === 'booklet');

    console.log("\n🧪 TEST RESULT:");
    if (activeBooklet && activeBooklet.attributes.paper_type && activeBooklet.attributes.qty == 500 && activeBooklet.attributes.pages) {
        console.log("✅ SUCCESS - LLM retained full context without parsing from UI.");
    } else {
        console.log("❌ FAILED - LLM suffered from amnesia.");
    }
}

runTest().catch(console.error);
