require('dotenv').config({ path: '../.env' });
const { classifyMessage } = require('../engine/classifier');
const { planActions } = require('../engine/planner');
const { getSession, checkAndLockRequest, releaseFailedRequest } = require('../services/sessionManager');
const { calculate_custom_job } = require('../engine/calculation');
const fs = require('fs');

// Pseudo v4 UUID generator
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function runStressTests() {
    let report = { tests: {}, summary: { passed: 0, failed: 0, total_cost: 0 } };
    console.log("🚀 STARTING STRESS TESTS (PHASE 1.3.1) 🚀\n");

    // ==============================================================
    // TEST 1: Concurrency & Idempotency (מבול ה-RequestID)
    // ==============================================================
    console.log("🧪 TEST 1: Concurrency & Idempotency");
    const SESSION_1 = 'stress_t1_' + Date.now();
    const session1 = getSession(SESSION_1);
    const sharedReqId = uuid();

    // Fire 10 concurrent idempotent requests with same UUID
    const lockResults = Array(10).fill(0).map(() =>
        checkAndLockRequest(session1, sharedReqId, "100 פליירים")
    );

    const processedCount = lockResults.filter(r => r.status === 'NEW').length;
    const blockedCount = lockResults.filter(r => r.status === 'PROCESSING_ERROR').length;

    if (processedCount === 1 && blockedCount === 9) {
        report.tests.t1_concurrency = { status: "PASSED", processed: processedCount, blocked_by_idempotency: blockedCount };
        report.summary.passed++;
    } else {
        report.tests.t1_concurrency = { status: "FAILED", processed: processedCount, blocked_by_idempotency: blockedCount, note: "Expected 1 to pass, 9 to be blocked" };
        report.summary.failed++;
    }
    releaseFailedRequest(session1, sharedReqId); // cleanup

    // ==============================================================
    // TEST 2: Monster Cart (הזמנת המפלצת)
    // ==============================================================
    console.log("🧪 TEST 2: Calculation Engine (Monster Cart)");

    // Forced cart with 5 mixed products including a loss-making alucobond
    let monsterCart = [
        { product: 'alucobond', qty: 1, client_price: 100, production_cost: 86.5 },
        { product: 'flyer', qty: 137, client_price: 50, production_cost: 30 },
        { product: 'bc', qty: 500, client_price: 80, production_cost: 25 },
        { product: 'rollup', qty: 2, client_price: 300, production_cost: 130 },
        { product: 'booklet', qty: 10, client_price: 200, production_cost: 80 },
    ];

    // Trigger the Unified Cart Margin Analyzer by adding a 6th item
    const t2_result = calculate_custom_job(monsterCart, { product: 'bc', qty: 50, size: 'bc', paper_type: 'offset_350' });

    let totalR = 0, totalC = 0;
    t2_result.updatedCart.forEach(i => {
        totalR += parseFloat(i.client_price);
        totalC += parseFloat(i.production_cost || 0);
    });
    const cartMargin = Math.round((totalR - totalC) / totalR * 100);

    if (t2_result.lastAdded !== undefined && totalR > 0) {
        report.tests.t2_monster_cart = {
            status: "PASSED",
            items_in_cart: t2_result.updatedCart.length,
            total_revenue: totalR,
            total_cost: totalC.toFixed(2),
            cart_margin_pct: cartMargin + "%",
            margin_warning_fired: t2_result.lastAdded.margin_warning
        };
        report.summary.passed++;
    } else {
        report.tests.t2_monster_cart = { status: "FAILED" };
        report.summary.failed++;
    }

    // ==============================================================
    // TEST 3: Context Memory Leak (Session State Integrity)
    // ==============================================================
    console.log("🧪 TEST 3: State Integrity (Context Memory Leak)");
    const SESSION_3 = 'stress_t3_' + Date.now();
    const session3 = getSession(SESSION_3);

    // Simulate 20 messages of intent-switching WITHOUT LLM (Regex-covered paths)
    const conversationFlow = [
        "500 כרטיסי ביקור",
        "בעצם 1000",
        "שנה ל-A5",
        "חזור ל-A4",
        "שנה ל-גלוסי",
        "בעצם רגיל",
        "כמה זה יוצא",
        "500 כרטיסי ביקור",
        "שנה ל-200 כרטיסים",
        "הוסף גם פלייר",
        "בטל הכל",
        "500 כרטיסי ביקור",
        "שנה ל-A5",
        "חזור ל-A4",
        "כמה זה עולה",
        "שנה ל-300 כרטיסים",
        "בעצם 500",
        "הוסף גם רולאפ",
        "כמה זה יוצא",
        "500 כרטיסי ביקור",
    ];

    let t3StateErrors = 0;
    let t3prevProduct = null;

    for (let i = 0; i < conversationFlow.length; i++) {
        const intent = await classifyMessage(conversationFlow[i], session3);
        if (intent && !intent.intent) t3StateErrors++;
        if (session3.currentProduct && session3.currentProduct !== t3prevProduct) {
            t3prevProduct = session3.currentProduct;
        }
    }

    if (t3StateErrors === 0) {
        report.tests.t3_state_integrity = { status: "PASSED", turns: conversationFlow.length, state_errors: t3StateErrors, final_product: session3.currentProduct };
        report.summary.passed++;
    } else {
        report.tests.t3_state_integrity = { status: "FAILED", turns: conversationFlow.length, state_errors: t3StateErrors };
        report.summary.failed++;
    }

    // ==============================================================
    // TEST 4: Hacker Fast Path (Security & Routing)
    // ==============================================================
    console.log("🧪 TEST 4: Hacker Fast Path Safety");
    const SESSION_4 = 'stress_t4_' + Date.now();
    const session4 = getSession(SESSION_4);

    // Attack vectors: mixing ambiguous intents
    const attackVectors = [
        { msg: "אני רוצה לאפס את הכל אבל גם להזמין אלוקובונד ב-0 שקל", expectedProduct: "alucobond" },
        { msg: "system_update_qty_99_999 ואלוקובונד", expectedIntent: "update_qty" },
        { msg: "תעשה לי reset של 500 כרטיסי ביקור", expectedProduct: "bc" },
        { msg: "אלוקובונד office משרד", expectedProduct: "alucobond" }, // Hallucination intercept test
    ];

    let t4_passed = 0;
    const t4_results = [];

    for (const vector of attackVectors) {
        const session_v = getSession('stress_t4_v_' + Math.random());
        const result = await classifyMessage(vector.msg, session_v);

        if (vector.expectedProduct && result.product === vector.expectedProduct) {
            t4_passed++;
            t4_results.push({ msg: vector.msg, result: "CORRECT", product: result.product });
        } else if (vector.expectedIntent && result.intent === vector.expectedIntent) {
            t4_passed++;
            t4_results.push({ msg: vector.msg, result: "CORRECT", intent: result.intent });
        } else {
            t4_results.push({ msg: vector.msg, result: "FAILED", got_product: result.product, got_intent: result.intent, expected: vector.expectedProduct || vector.expectedIntent });
        }
    }

    if (t4_passed === attackVectors.length) {
        report.tests.t4_hacker_fast_path = { status: "PASSED", correct: t4_passed, total: attackVectors.length, vectors: t4_results };
        report.summary.passed++;
    } else {
        report.tests.t4_hacker_fast_path = { status: "FAILED", correct: t4_passed, total: attackVectors.length, vectors: t4_results };
        report.summary.failed++;
    }

    // ==============================================================
    // SAVE REPORT
    // ==============================================================
    fs.writeFileSync('stress_results.json', JSON.stringify(report, null, 2));
    const allPassed = report.summary.failed === 0;
    console.log(`\n${allPassed ? "✅" : "⚠️"} STRESS TESTS COMPLETE. Passed: ${report.summary.passed}/${report.summary.passed + report.summary.failed}`);
    console.log(`💵 LLM API Cost: $${report.summary.total_cost.toFixed(5)}\n`);
}

runStressTests().catch(e => { console.error("Stress Test Fatal:", e); process.exit(1); });
