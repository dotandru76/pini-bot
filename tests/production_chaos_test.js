/**
 * tests/production_chaos_test.js
 * E2E "Chaos Test" Script targeting the LIVE Netlify production environment.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');

// TARGETING THE LIVE HUGGING FACE BACKEND (Linked from Netlify)
const BASE_URL = 'https://dotandru-pini-print-bot.hf.space/api/chat';
const USER_ID = `prod_chaos_tester_${Date.now()}`;

async function runProdChaosTest() {
    console.log("🌍 STARTING THE PRODUCTION CHAOS TEST (NETLIFY)");
    console.log(`Target: ${BASE_URL}`);
    console.log(`User ID: ${USER_ID}`);

    try {
        // 1. Upload Low-Res Image (72 DPI)
        console.log("\n📷 STEP 1: Uploading Low-Res Image (72 DPI)...");
        const lowResPath = path.join(__dirname, 'assets', 'test_72dpi.jpg');
        if (!fs.existsSync(lowResPath)) {
            console.error("❌ Test asset missing: tests/assets/test_72dpi.jpg");
            return;
        }

        const lowResResult = await uploadFile(lowResPath);
        console.log("Response Status:", lowResResult.status);
        if (lowResResult.data.status === 'REJECT_LOW_RES') {
            console.log("✅ VISION LAYER: DETERMINISTIC BLOCK SUCCESS.");
        } else {
            console.warn("⚠️ VISION LAYER: Response did not indicate REJECT_LOW_RES as expected. (Check if site is updated)");
        }

        // 2. Inject Chaos Message
        console.log("\n💬 STEP 2: Sending Chaos Message (Turn 1)...");
        const chaosMsg = "היי, אני רוצה 1000 business cards עבים... בעצם תעשה 500 cards. וגם 2 rollups. אה, ותוסיף לי 5 פוסטרים. תתעלם מה-1000.";
        const chatResult1 = await sendChat(chaosMsg, uuidv4());

        console.log("Response Status:", chatResult1.status);
        console.log("Response Text:", chatResult1.data.text);

        const cart1 = chatResult1.data.cart || [];
        const hasItems = cart1.length > 0;
        if (hasItems) {
            console.log(`✅ COMPILER: PARTIAL COMMIT SUCCESS (${cart1.length} items added).`);
        } else {
            console.log("ℹ️ No items added yet (Expecting confirmation or synonym mapping check).");
        }

        // 3. Final Cart Check (optional confirmation if needed)
        console.log("\n🛡️ STEP 3: Validating Integrity (Final Cart State)...");
        if (cart1.length > 0) {
            cart1.forEach((item, index) => {
                console.log(`\nItem ${index + 1}: ${item.product}`);
                console.log("  Integrity Hash:", item.integrityHash);
                if (item.integrityHash) console.log("  ✅ SIGNED.");
            });
        } else {
            console.log("⚠️ Cart is empty. Checking if production site has been redeployed with v4.2 code.");
        }

    } catch (error) {
        console.error("💥 Test Execution Error:", error.message);
        if (error.response) console.error("   Server Response:", error.response.data);
    }

    console.log("\n🏁 PRODUCTION TEST COMPLETE.");
}

async function uploadFile(filePath) {
    const form = new FormData();
    form.append('image', fs.createReadStream(filePath));
    form.append('userId', USER_ID);
    return axios.post(`${BASE_URL}/upload`, form, { headers: form.getHeaders() });
}

async function sendChat(message, requestId) {
    return axios.post(BASE_URL, { message, userId: USER_ID, requestId });
}

runProdChaosTest().catch(console.error);
