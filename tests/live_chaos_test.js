/**
 * tests/live_chaos_test.js
 * E2E "Chaos Test" Script to simulate the confused customer scenario.
 * Updated for Planner v4.2 (Smart Gateway)
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:7860/api/chat';
const USER_ID = `chaos_tester_${Date.now()}`;

async function runChaosTest() {
    console.log("🚀 STARTING THE CHAOS TEST (E2E) - v4.2 SMART GATEWAY");
    console.log(`User ID: ${USER_ID}`);

    // 1. Upload Low-Res Image (72 DPI)
    console.log("\n📷 STEP 1: Uploading Low-Res Image (72 DPI)...");
    const lowResResult = await uploadFile(path.join(__dirname, 'assets', 'test_72dpi.jpg'));
    if (lowResResult.data.status === 'REJECT_LOW_RES') {
        console.log("✅ VISION LAYER: DETERMINISTIC BLOCK SUCCESS.");
    } else {
        console.error("❌ VISION LAYER: FAILED TO BLOCK.");
    }

    // 2. Inject Chaos Message (Synonyms & Ambiguity)
    console.log("\n💬 STEP 2: Sending Chaos Message (Turn 1)...");
    const chaosMsg = "היי, אני רוצה 1000 business cards עבים... בעצם תעשה 500 cards. וגם 2 rollups. אה, ותוסיף לי 5 פוסטרים. תתעלם ממה שאמרתי על ה-1000.";
    const chatResult1 = await sendChat(chaosMsg, uuidv4());

    console.log("Response Status:", chatResult1.status);
    console.log("Response Text:", chatResult1.data.text);

    // In v4.2, Business Cards should be auto-mapped to 'bc' and added (0.95 confidence)
    const cart1 = chatResult1.data.cart || [];
    const hasBC = cart1.some(i => i.product === 'bc');
    if (hasBC) {
        console.log("✅ COMPILER: PARTIAL COMMIT SUCCESS (bc added on Turn 1).");
    } else {
        console.error("❌ COMPILER: FAILED TO ADD BC ON TURN 1.");
        console.log("   Current Cart:", JSON.stringify(cart1));
    }

    // 3. Resolve Clarification & Upload 300 DPI
    console.log("\n📷 STEP 3: Uploading High-Res Image (300 DPI) and Confirming Pending items...");
    await uploadFile(path.join(__dirname, 'assets', 'test_300dpi.jpg'));

    // Send a VERY clear confirmation for the remaining items
    const confirmMsg = "אני רוצה 2 רולאפים ו-5 פוסטרים. בבקשה תכניס לעגלה.";
    const chatResult2 = await sendChat(confirmMsg, uuidv4());
    console.log("Response Status:", chatResult2.status);
    console.log("Response Text:", chatResult2.data.text);

    // 4. Validate Integrity Layer
    console.log("\n🛡️ STEP 4: Validating Integrity (Cart Analysis)...");
    const cart2 = chatResult2.data.cart || [];
    if (cart2.length > 0) {
        cart2.forEach((item, index) => {
            console.log(`\nItem ${index + 1}: ${item.product}`);
            console.log("  Trace ID:", item.traceId);
            console.log("  Integrity Hash:", item.integrityHash);

            if (item.traceId && item.integrityHash) {
                console.log("  ✅ INTEGRITY: SIGNED & FROZEN.");
            } else {
                console.error("  ❌ INTEGRITY: MISSING SIGNATURE.");
            }
        });

        if (cart2.length >= 3) {
            console.log("\n🏆 CHAOS TEST PASSED: ALL ITEMS RECONCILED.");
        } else {
            console.warn(`\n⚠️ Partial Success: Only ${cart2.length}/3 items in cart.`);
            console.log("   Full Cart State:", JSON.stringify(cart2, null, 2));
        }
    } else {
        console.error("❌ CART IS EMPTY. TEST FAILED.");
    }

    console.log("\n🏁 CHAOS TEST COMPLETE.");
}

async function uploadFile(filePath) {
    const form = new FormData();
    form.append('image', fs.createReadStream(filePath));
    form.append('userId', USER_ID);
    try {
        const response = await axios.post(`${BASE_URL}/upload`, form, { headers: form.getHeaders() });
        return { status: response.status, data: response.data };
    } catch (error) { return { status: error.response?.status || 500, data: error.response?.data || {} }; }
}

async function sendChat(message, requestId) {
    try {
        const response = await axios.post(BASE_URL, { message, userId: USER_ID, requestId });
        return { status: response.status, data: response.data };
    } catch (error) { return { status: error.response?.status || 500, data: error.response?.data || {} }; }
}

runChaosTest().catch(console.error);
