/**
 * Phase 4 Verification Suite: Conversational Compiler (v4.0)
 * Tests strict logic for Mixed Confidence, Oscillation, and Ambiguity.
 */

const { compileOrder } = require('../engine/planner');
const assert = require('assert');

async function runQASuite() {
    console.log("🛠️ Starting Phase 4 QA Suite...");

    // --- QA TEST 1: Mixed Confidence Rule ---
    console.log("\n🧪 QA-1: Mixed Confidence Rule (0.95 and 0.76)");
    const mixedConfidenceData = {
        products_detected: [
            { product: "flyer", confidence: 0.95 },
            { product: "sticker", confidence: 0.76 }
        ],
        parameters_detected: [
            { key: "qty", value: 500, context: "flyer", confidence: 0.9 },
            { key: "qty", value: 1000, context: "sticker", confidence: 0.8 }
        ]
    };
    const res1 = compileOrder(mixedConfidenceData);
    console.log("Status:", res1.status, "Reason:", res1.reason);
    assert.strictEqual(res1.status, "CLARIFICATION_REQUIRED");
    assert.strictEqual(res1.reason, "MIXED_CONFIDENCE_REJECTION");
    console.log("✅ QA-1 Passed.");

    // --- QA TEST 2: Formal Oscillation Rule ---
    console.log("\n🧪 QA-2: Formal Oscillation Rule (User changed qty)");
    const oscillationData = {
        products_detected: [
            { product: "flyer", confidence: 0.95 }
        ],
        parameters_detected: [
            { key: "qty", value: 500, context: "flyer", confidence: 0.9 },
            { key: "qty", value: 1000, context: "flyer", confidence: 0.9 }
        ]
    };
    const res2 = compileOrder(oscillationData);
    console.log("Status:", res2.status, "Reason:", res2.reason);
    assert.strictEqual(res2.status, "CLARIFICATION_REQUIRED");
    assert.strictEqual(res2.reason, "PARAMETER_INSTABILITY");
    console.log("✅ QA-2 Passed.");

    // --- QA TEST 3: Weighted Ambiguity (Hard Fail on Qty) ---
    console.log("\n🧪 QA-3: Weighted Ambiguity (Ambiguous Qty)");
    const ambiguousQtyData = {
        products_detected: [
            { product: "flyer", confidence: 0.95 },
            { product: "sticker", confidence: 0.95 }
        ],
        parameters_detected: [
            { key: "qty", value: 500, context: "global", confidence: 0.9 } // Ambiguous who it belongs to
        ]
    };
    const res3 = compileOrder(ambiguousQtyData);
    console.log("Status:", res3.status, "Reason:", res3.reason);
    assert.strictEqual(res3.status, "HARD_FAIL");
    assert.strictEqual(res3.reason, "AMBIGUOUS_QUANTITY");
    console.log("✅ QA-3 Passed.");

    // --- QA TEST 4: Whitelist Integrity ---
    console.log("\n🧪 QA-4: Whitelist Integrity (Invalid param injection)");
    const whitelistData = {
        products_detected: [
            { product: "flyer", confidence: 0.95 }
        ],
        parameters_detected: [
            { key: "qty", value: 500, context: "flyer", confidence: 1.0 },
            { key: "flux_capacitor", value: "active", context: "flyer", confidence: 1.0 }
        ]
    };
    const res4 = compileOrder(whitelistData);
    console.log("Status:", res4.status);
    assert.strictEqual(res4.status, "READY");
    assert.strictEqual(res4.data[0].mapped_params.flux_capacitor, undefined);
    console.log("✅ QA-4 Passed.");

    // --- QA TEST 5: READY Status (Valid Multi-Entity) ---
    console.log("\n🧪 QA-5: READY Status (Valid Multi-Entity)");
    const validData = {
        products_detected: [
            { product: "flyer", confidence: 0.95 },
            { product: "sticker", confidence: 0.95 }
        ],
        parameters_detected: [
            { key: "qty", value: 500, context: "flyer", confidence: 0.9 },
            { key: "qty", value: 1000, context: "sticker", confidence: 0.9 }
        ]
    };
    const res5 = compileOrder(validData);
    console.log("Status:", res5.status, "Items count:", res5.data?.length);
    assert.strictEqual(res5.status, "READY");
    assert.strictEqual(res5.data.length, 2);
    console.log("✅ QA-5 Passed.");

    console.log("\n🏆 ALL PHASE 4 COMPILER TESTS PASSED! ZERO DEVIATION.");
}

runQASuite().catch(e => {
    console.error("💥 QA FAILED:", e.message);
    process.exit(1);
});
