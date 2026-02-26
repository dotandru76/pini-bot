/**
 * tests/chaos_test_3_1.js
 * Boss Level Scenario Verification (Exhibitor & Team)
 */
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:7860';
const USER_ID = `boss_tester_${Date.now()}`;

async function runBossTest() {
    console.log("🔥 STARTING CHAOS TEST 3.1: THE BOSS LEVEL");

    try {
        // TURN 1: Vision + Multi-Product Request
        console.log("\n📸 TURN 1: Uploading logo and sending loaded message...");
        const imagePath = path.join(__dirname, '../public/pini.png');
        const form = new FormData();
        form.append('image', fs.createReadStream(imagePath));
        form.append('userId', USER_ID);

        const uploadRes = await axios.post(`${BASE_URL}/api/chat/upload`, form, {
            headers: form.getHeaders()
        });
        console.log("   Upload Response:", uploadRes.data.text);

        const chatRes1 = await axios.post(`${BASE_URL}/api/chat`, {
            message: "היי, אני מרים דוכן בתערוכה שבוע הבא. אני חייב רולאפ אחד ואיזה 5000 פליירים. אה, ותעשה לי גם כרטיסי ביקור ל-5 אנשים מהצוות, כל אחד בתפקיד אחר. מצורף הלוגו שלנו, תשים אותו על הכל. אני לא מבין בגדלים, מה נהוג?",
            userId: USER_ID,
            requestId: uuidv4()
        });
        console.log("   Turn 1 Response:", chatRes1.data.text);

        // CHECK 1: Consultative Active & Cart Size 0
        const cart1 = chatRes1.data.cart || [];
        if (cart1.length === 0) {
            console.log("   ✅ RULE: CONSULTATIVE MODE ACTIVE (Cart empty).");
        } else {
            console.error("   ❌ RULE: PREMATURE PUSH (Cart not empty).");
        }

        // TURN 2: Specification Lock
        console.log("\n💬 TURN 2: Locking specifications (Multi-Entity BC)...");
        const chatRes2 = await axios.post(`${BASE_URL}/api/chat`, {
            message: "סגור על הרולאפ והפליירים. לצוות תעשה 100 כרטיסים לכל אחד, נייר כרומו מט רגיל. אני אשלח לך אקסל עם השמות והתפקידים אחר כך.",
            userId: USER_ID,
            requestId: uuidv4()
        });
        console.log("   Turn 2 Response Text:", chatRes2.data.text);

        // CHECK 2: Multi-Entity Math (5 * 100 = 500)
        const bcItem = chatRes2.data.cart.find(i => i.product === 'bc');
        if (bcItem && bcItem.validated_params.qty == 500) {
            console.log("   ✅ RULE: MULTI-ENTITY MATH SUCCESS (Total Qty: 500).");
        } else {
            console.error(`   ❌ RULE: MULTI-ENTITY MATH FAILED (Qty: ${bcItem?.validated_params.qty}).`);
        }

        // TURN 3: Budget Shock & Oscillation
        console.log("\n💬 TURN 3: Budget Shock & Quantity Oscillation...");
        const chatRes3 = await axios.post(`${BASE_URL}/api/chat`, {
            message: "וואו זה יקר! יש לי גג 400 שקל. תבטל את הרולאפ לגמרי. ותוריד את הפליירים ל-1000... בעצם לא, תעשה 2000 פליירים. הכרטיסי ביקור לצוות נשארים אותו דבר.",
            userId: USER_ID,
            requestId: uuidv4()
        });
        console.log("   Turn 3 Response:", chatRes3.data.text);

        // CHECK 3: Instability detected
        if (chatRes3.data.text.includes("שינוי בנתונים") || chatRes3.data.text.includes("1000") || chatRes3.data.text.includes("בלגן")) {
            console.log("   ✅ RULE: OSCILLATION DETECTION SUCCESS.");
        } else {
            console.warn("   ⚠️ RULE: OSCILLATION DETECTION WARNING (Msg text check failed).");
        }

        // TURN 4: Resolution
        console.log("\n💬 TURN 4: Final Resolution...");
        const chatRes4 = await axios.post(`${BASE_URL}/api/chat`, {
            message: "2000 פליירים. אפשר לשלם?",
            userId: USER_ID,
            requestId: uuidv4()
        });
        console.log("   Turn 4 Response:", chatRes4.data.text);

        // CHECK 4: Deletion & Re-Hash
        const finalCart = chatRes4.data.cart || [];
        const hasRollup = finalCart.some(i => i.product === 'rollup');
        const flyerItem = finalCart.find(i => i.product === 'flyer');

        if (!hasRollup && flyerItem && flyerItem.validated_params.qty == 2000) {
            console.log("   ✅ RULE: CART MUTATION SUCCESS (Rollup deleted, Flyer updated).");
            console.log("   ✅ RULE: INTEGRITY SUCCESS (Flyer Hash: " + flyerItem.integrityHash.substring(0, 10) + "...)");
        } else {
            console.error("   ❌ RULE: FINAL CART STATE MISMATCH.");
            console.log("   Cart:", JSON.stringify(finalCart, null, 2));
        }

    } catch (error) {
        console.error("💥 TEST ERROR:", error.message);
        if (error.response) console.error("Server Error Response:", error.response.data);
    }

    console.log("\n🏁 BOSS LEVEL TEST COMPLETE.");
}

runBossTest().catch(console.error);
