const { analyzePrintReadyStatus } = require('../engine/decisionKernel');
const { planActions } = require('../engine/planner');

async function testDecisionKernel() {
    console.log("🧪 Testing Decision Kernel & Planner Integration...");

    const session = {
        draftAttributes: { width: 100, height: 100 },
        cart: [],
        currentProduct: 'flyer'
    };

    // Case 1: Low Resolution
    const lowResData = {
        intent: 'quote',
        mapped_params: { dpi: 72, width_mm: 100, height_mm: 100 },
        _debug: { source: "Vision" }
    };
    const res1 = planActions(lowResData, session);
    const kernel1 = res1.actions[0].payload.text.includes("איכות נמוכה");
    console.log(`Case 1 (Low Res Rejection): ${kernel1 ? '✅ PASSED' : '❌ FAILED'}`);

    // Case 2: Dimension Mismatch
    const mismatchData = {
        intent: 'quote',
        mapped_params: { dpi: 300, width_mm: 150, height_mm: 150 }, // 50% mismatch
        _debug: { source: "Vision" }
    };
    const res2 = planActions(mismatchData, session);
    const kernel2 = res2.actions[0].payload.text.includes("אי התאמה במידות");
    console.log(`Case 2 (Dimension Mismatch Rejection): ${kernel2 ? '✅ PASSED' : '❌ FAILED'}`);

    // Case 3: Ready for Print
    const validData = {
        intent: 'quote',
        mapped_params: { dpi: 300, width_mm: 102, height_mm: 98 }, // ~2% mismatch, should pass
        _debug: { source: "Vision" }
    };
    const res3 = planActions(validData, session);
    // Success if it DOES NOT contain a rejection message
    const rejectionKeywords = ["איכות נמוכה", "אי התאמה", "משהו לא לגמרי תקין"];
    const kernel3 = !rejectionKeywords.some(k => res3.actions[0].payload && res3.actions[0].payload.text && res3.actions[0].payload.text.includes(k));
    console.log(`Case 3 (Ready for Print): ${kernel3 ? '✅ PASSED' : '❌ FAILED'}`);

    if (kernel1 && kernel2 && kernel3) {
        console.log("\n✨ ALL KERNEL TESTS PASSED!");
    } else {
        console.error("\n❌ TESTS FAILED!");
        process.exit(1);
    }
}

testDecisionKernel();
