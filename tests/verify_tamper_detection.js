/**
 * tests/verify_tamper_detection.js
 * CTO Mandate Phase 5: Tamper Detection & Immutability Test
 */

const { assembleProductionItem, createIntegrityHash } = require('../engine/integrity');
const { pushToSessionCart } = require('../services/sessionManager');
const assert = require('assert');

async function runIntegrityTests() {
    console.log("🛡️ Starting Integrity Layer v1.0 Verification...");

    const mockCalcResult = {
        product: "flyer",
        client_price: 250,
        unit_price: "0.50",
        production_cost: "100.00",
        description: "500 flyers",
        engine: "digital"
    };

    const mockParams = {
        qty: 500,
        paper_type: "chromo_135",
        size: "A5"
    };

    // --- TEST 1: Assembly & Immutability ---
    console.log("\n🧪 Test 1: Assembly & Deep Freeze");
    const item = assembleProductionItem(mockCalcResult, mockParams);

    console.log("Item Trace ID:", item.traceId);
    console.log("Item Integrity Hash:", item.integrityHash);

    assert.ok(item.traceId, "Missing Trace ID");
    assert.ok(item.integrityHash, "Missing Integrity Hash");

    // Attempt mutation (Deep Freeze Check)
    try {
        item.pricing_snapshot.client_price = 0; // Attempt to change price
    } catch (e) {
        console.log("✅ Expected Error: Item is frozen.");
    }
    assert.strictEqual(item.pricing_snapshot.client_price, 250, "Object mutation occurred! Deep freeze failed.");
    console.log("✅ Test 1 Passed: Item is immutable.");

    // --- TEST 2: Tamper Detection (Hash Mismatch) ---
    console.log("\n🧪 Test 2: Tamper Detection (Cryptographic Verification)");

    // Create a clone but WITH a modified field (Simulating a bypass or DB manipulation)
    const tamperedItem = JSON.parse(JSON.stringify(item));
    tamperedItem.pricing_snapshot.client_price = 0; // The "cheat"

    const recalculatedHash = createIntegrityHash(tamperedItem);

    console.log("Original Hash:  ", item.integrityHash);
    console.log("Tampered Hash:  ", recalculatedHash);

    assert.notStrictEqual(item.integrityHash, recalculatedHash, "Tamper detected! Hash should have changed.");
    console.log("✅ Test 2 Passed: Mismatch identified.");

    // --- TEST 3: Session Uniqueness ---
    console.log("\n🧪 Test 3: Session Uniqueness");
    const mockSession = { cart: [] };

    const push1 = pushToSessionCart(mockSession, item);
    assert.strictEqual(push1, true, "Should allow first push");
    assert.strictEqual(mockSession.cart.length, 1);

    const push2 = pushToSessionCart(mockSession, item); // Same item (same traceId)
    assert.strictEqual(push2, false, "Should block duplicate traceId");
    assert.strictEqual(mockSession.cart.length, 1);

    console.log("✅ Test 3 Passed: Duplicates blocked.");

    console.log("\n🏆 ALL INTEGRITY TESTS PASSED! CART IS SECURE.");
}

runIntegrityTests().catch(e => {
    console.error("💥 TEST FAILED:", e.message);
    process.exit(1);
});
