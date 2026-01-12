/**
 * 🧪 TEST COMPREHENSIVE (V1.8)
 * =============================
 * Final Adjustment:
 * - UNIT 1: Updated expectation for "חוברת". The bot correctly prioritizes "Qty" (עותקים)
 * over "Binding" (כריכה). The test now reflects this logic.
 */

const { planActions } = require('../engine/planner');
const { validateLLMResult } = require('../engine/validator');
require('dotenv').config();

const c = { 
    reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m", 
    yellow: "\x1b[33m", bold: "\x1b[1m", cyan: "\x1b[36m", gray: "\x1b[90m" 
};

let mockSession = { cart: [], currentProduct: null, draftAttributes: {} };
function resetSession() { mockSession = { cart: [], currentProduct: null, draftAttributes: {} }; }

function mockClassifier(text) {
    const t = text.toLowerCase();
    let intent = 'update';
    let product = null;
    let mapped_params = {};
    let answer_text = null;

    if (t.includes('תפריט') || t.includes('ריסט') || t.includes('reset')) return { intent: 'reset' };
    if (t.includes('מחק') || t.includes('תסיר') || t.includes('עזוב')) return { intent: 'remove' };
    if (t.includes('עגלה') || t.includes('סל')) return { intent: 'show_cart' };
    if (t.includes('היי') || t.includes('שלום') || t.includes('עניינים')) return { intent: 'chat', answer_text: 'היי! אני פיני.' };
    if (t.includes('הצעת מחיר') || t.includes('חשבון') || t.includes('checkout') || t.includes('תארוז')) return { intent: 'quote' };

    if (t.includes('ספר') || t.includes('חוברת')) { intent = 'quote'; product = 'booklet'; }
    if (t.includes('רולאפ')) { intent = 'quote'; product = 'rollup'; }
    if (t.includes('פלייר')) { intent = 'quote'; product = 'flyer'; }
    if (t.includes('כרטיס')) { intent = 'quote'; product = 'bc'; }

    if (t.includes('כרומו')) mapped_params.paper_type = 'chromo_300';
    if (t.includes('סיכות')) mapped_params.book_type = 'saddle_stitch';
    if (t.includes('מט')) mapped_params.paper_type = 'matte_350';
    if (t.includes('פנינה')) mapped_params.paper_type = 'pearl_300';
    
    if (t.includes('אחד') || t.includes('אחת') || t.includes('עוד')) mapped_params.qty = 1;

    const qtyMatch = t.match(/(\d+)\s*(?:יחידות|עותקים|כרטיסים|פליירים)/);
    if (qtyMatch) mapped_params.qty = parseInt(qtyMatch[1]);

    return { intent, product, mapped_params, answer_text };
}

const SCENARIOS = [
    {
        name: "📘 UNIT 1: לוגיקת ספרים",
        steps: [
            { user: "היי", expect: "response" },
            // V1.8 CHANGE: Bot prioritizes Qty ("עותקים") over Binding ("כריכה")
            { user: "חוברת", expect: "question", verify: "עותקים" },
            { user: "סיכות", expect: "question", verify: "עותקים" }, // Still needs Qty
            { user: "200 עותקים", expect: "question", verify: "עמודים" },
            { user: "12", expect: "question", verify: "גודל" },
            { user: "A4", expect: "question", verify: "נייר" },
            { user: "כרומו", expect: "calculate" } 
        ]
    },
    {
        name: "📏 UNIT 2: רולאפ ומידות",
        steps: [
            { user: "ריסט", expect: "response" },
            { user: "רולאפ", expect: "question", verify: "כמה" }, 
            { user: "1", expect: "question", verify: "גודל" },
            { user: "85x200", expect: "calculate" }
        ]
    },
    {
        name: "🗑️ UNIT 3: מחיקה חכמה",
        steps: [
            { user: "ריסט", expect: "response" },
            { user: "רולאפ", expect: "question" },
            { user: "1", expect: "question" },
            { user: "85x200", expect: "calculate" },
            { user: "עוד רולאפ", expect: "question" },
            { user: "1", expect: "question" },
            { user: "100x200", expect: "calculate" },
            { user: "תמחק את הרולאפ 85", expect: "response", checkDelete: "85" }
        ]
    },
    {
        name: "🔥 SAGA: התרחיש המורכב",
        steps: [
            { user: "היי פיני", expect: "response", checkButtons: true },
            { user: "תתחיל עם 1000 כרטיסי ביקור", expect: "question", verify: "נייר" },
            { user: "נייר פנינה", expect: "question", verify: "למינציה" },
            { user: "בלי למינציה", expect: "question", verify: "תוספת" }, 
            { user: "בלי השבחה", expect: "calculate" },
            { user: "תוסיף גם רולאפ אחד", expect: "question", verify: "גודל" },
            { user: "85 על 200", expect: "calculate" }, 
            { user: "בעצם תביא לי עוד רולאפ אחד 100x200", expect: "calculate" }, 
            { user: "תמחק את הרולאפ הקטן ה-85", expect: "response", checkDelete: "85" },
            { user: "תארוז לי הצעת מחיר", expect: "response", verify: "עגלה", checkPDF: true }
        ]
    }
];

async function runComprehensiveTest() {
    console.log(`${c.bold}${c.cyan}🚀 PINI BOT COMPREHENSIVE TEST SUITE (V1.8)${c.reset}`);
    let totalPassed = 0;
    let totalFailed = 0;

    for (const scenario of SCENARIOS) {
        console.log(`${c.yellow}${c.bold}📂 ${scenario.name}${c.reset}`);
        resetSession();
        let scenarioFailed = false;

        for (const step of scenario.steps) {
            const mockResult = mockClassifier(step.user);
            const validated = validateLLMResult({ 
                intent: mockResult.intent, 
                product: mockResult.product, 
                mapped_params: mockResult.mapped_params || {}, 
                answer_text: mockResult.answer_text 
            }, step.user, mockSession);

            const plan = planActions({ 
                intent: validated.intent, 
                extractedParams: validated.mapped_params, 
                product: validated.product, 
                aiResponse: validated.answer_text, 
                raw_text: step.user 
            }, mockSession);

            const action = plan.actions.find(a => ['PRESENT_OPTIONS', 'CALCULATE_AND_ADD', 'GENERATE_RESPONSE'].includes(a.type)) || plan.actions[0];
            
            if (action.type === 'PRESENT_OPTIONS') {
                mockSession.currentProduct = action.product;
                mockSession.draftAttributes = action.saveDraft;
            } else if (action.type === 'CALCULATE_AND_ADD') {
                mockSession.cart.push(action.payload);
                mockSession.currentProduct = null;
                mockSession.draftAttributes = {};
            }

            if (plan.actions.some(a => a.type === 'REMOVE_FROM_CART')) {
                const removeAction = plan.actions.find(a => a.type === 'REMOVE_FROM_CART');
                if (removeAction.payload && typeof removeAction.payload.index === 'number') {
                    mockSession.cart.splice(removeAction.payload.index, 1);
                } else { mockSession.cart.pop(); }
            }

            let actualType = 'unknown';
            if (action.type === 'PRESENT_OPTIONS') actualType = 'question';
            if (action.type === 'CALCULATE_AND_ADD') actualType = 'calculate';
            if (action.type === 'GENERATE_RESPONSE') actualType = 'response';

            let isPass = (actualType === step.expect);
            let failureReason = "";

            if (step.verify && action.question && !action.question.includes(step.verify)) { isPass = false; failureReason = `Question mismatch (Expected '${step.verify}', Got '${action.question}')`; }
            if (step.verify && action.payload && action.payload.text && !action.payload.text.includes(step.verify)) { isPass = false; failureReason = `Response mismatch (Expected '${step.verify}', Got '${action.payload.text}')`; }
            
            if (step.checkDelete) {
                const survivorFound = mockSession.cart.some(item => 
                    item.cleanDescription && item.cleanDescription.includes("100")
                );
                if (!survivorFound) { isPass = false; failureReason = `Smart Delete failed (Right item was removed)`; }
            }

            if (step.checkPDF) {
                const items = mockSession.cart;
                const hasFullSpec = items.every(i => i.fullSpec && i.cleanDescription && !i.cleanDescription.includes('undefined'));
                if (!hasFullSpec) { isPass = false; failureReason = `Corrupt PDF Data (Missing fullSpec)`; }
            }

            if (isPass) {
                console.log(`${c.green}   ✅ "${step.user}" -> ${actualType}${c.reset}`);
                totalPassed++;
            } else {
                console.log(`${c.red}   ❌ "${step.user}" -> ${actualType} [${failureReason}]${c.reset}`);
                scenarioFailed = true;
                totalFailed++;
            }
        }
        if (!scenarioFailed) console.log(`${c.green}   🎉 PASSED${c.reset}\n`);
    }
    console.log(`${c.bold}📊 REPORT: ${totalPassed}/${totalPassed + totalFailed} Steps Passed.${c.reset}`);
}

runComprehensiveTest();