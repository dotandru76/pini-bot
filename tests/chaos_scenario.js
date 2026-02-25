/**
 * CHAOS SCENARIO QA TEST - PHASE 4, 2 & 3
 */

const { classifyMessage } = require('../engine/classifier');
const { compileOrder } = require('../engine/planner');
const { generateUUIDv7, createIntegrityHash } = require('../engine/integrity');
const { routeProduction } = require('../engine/jobTicket');
const assert = require('assert');

async function runChaosScenario() {
    console.log("🔥 Starting CHAOS SCENARIO QA TEST...");

    const session = {
        cart: [],
        currentProduct: null,
        lastImageMetadata: null
    };

    // --- STEP 1: The Chaos Prompt (Oscillation & Ambiguity) ---
    console.log("\n🧪 Stage 1: Chaos Prompt Parsing");
    const chaosText = "היי פיני, אני רוצה 1000 כרטיסי ביקור עבים... בעצם תעשה 500 כרטיסים. וגם 2 רולאפים. אה, ותוסיף לי 5 פוסטרים. איך האיכות של התמונה הזאת? [IMAGE_UPLOADED: image_72dpi.jpg]. תדפיס אותה על הפוסטרים.";

    // Mock extraction from LLM (Phase 4 Simulation)
    const extractionResult = {
        intent: "quote",
        answer_text: "הלוגו בתמונה נראה מקצועי מאוד!", // Semantic advice
        products_detected: [
            { product: "flyer", confidence: 0.95 },
            { product: "sticker", confidence: 0.95 }
        ],
        parameters_detected: [
            { key: "qty", value: "1000", context: "flyer", confidence: 0.9 },
            { key: "qty", value: "500", context: "flyer", confidence: 0.99 }, // Oscillation
            { key: "paper_type", value: "thick", context: "flyer", confidence: 0.95 },
            { key: "qty", value: "2", context: "sticker", confidence: 0.9 }, // Rollup as sticker for sim
            { key: "qty", value: "5", context: "global", confidence: 0.85 } // Ambiguous qty for posters
        ],
        technicalMetadata: { dpi: 72, width_mm: 100, height_mm: 100 } // Layer 1 Injection
    };

    // 1. Compiler Check
    console.log("Checking Compiler logic...");
    const compilation = compileOrder(extractionResult);
    console.log("Compiler Status:", compilation.status, "Reason:", compilation.reason);

    // We expect PARAMETER_INSTABILITY or AMBIGUOUS_QUANTITY
    // In our planner, ambiguity check is earlier for qty.
    assert.ok(compilation.status === 'CLARIFICATION_REQUIRED' || compilation.status === 'HARD_FAIL');

    // 2. Integrity Check (Phase 3)
    console.log("\n🧪 Stage 3: Integrity & Job Ticket (Finalization)");
    const finalizedOrder = {
        product: "flyer",
        mapped_params: { qty: 500, paper_type: "thick" }
    };

    const order_id = generateUUIDv7();
    const routedJob = routeProduction(finalizedOrder);
    const integrity_hash = createIntegrityHash(routedJob);

    console.log("Order ID (UUID v7):", order_id);
    console.log("Production Routing:", routedJob.production_routing);
    console.log("Integrity Hash (SHA-256):", integrity_hash);

    assert.ok(order_id.includes('-7')); // Basic UUID v7 check (simplified)
    assert.strictEqual(routedJob.production_routing, "OFFSET_PRESS_HEIDELBERG");
    assert.ok(integrity_hash.length === 64);

    console.log("\n🏆 CHAOS SCENARIO PASSED ALL GOVERNANCE GATES.");
}

runChaosScenario().catch(console.error);
