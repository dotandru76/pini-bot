/**
 * 🧪 TEST ULTIMATE MASTER (V51.0)
 * Fixed for Mock Classification issues and PDF Data checks
 */

const { planActions } = require('../engine/planner');
const { validateLLMResult } = require('../engine/validator');
require('dotenv').config();

const c = { reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", bold: "\x1b[1m", cyan: "\x1b[36m" };

// MOCK SESSION
let mockSession = { cart: [], currentProduct: null, draftAttributes: {} };
function resetSession() { mockSession = { cart: [], currentProduct: null, draftAttributes: {} }; }

// MOCK CLASSIFIER (Fixed Order)
function mockClassifier(text) {
    const t = text.toLowerCase();
    let mapped_params = {};

    // 1. קודם כל בודקים מחיקה/סיום/פקודות
    if (t.includes('תפריט') || t.includes('ריסט') || t.includes('reset')) return { intent: 'reset' };
    if (t.includes('מחק') || t.includes('תסיר')) return { intent: 'remove' }; // עכשיו זה לפני המוצרים!
    if (t.includes('עגלה') || t.includes('סל')) return { intent: 'show_cart' };
    if (t.includes('הצעת מחיר') || t.includes('חשבון') || t.includes('checkout')) return { intent: 'quote' };
    if (t.includes('היי') || t.includes('שלום')) return { intent: 'chat', answer_text: 'היי! אני פיני.' };

    // 2. עכשיו מוצרים
    if (t.includes('ספר') || t.includes('חוברת')) return { intent: 'quote', product: 'booklet' };
    if (t.includes('רולאפ')) return { intent: 'quote', product: 'rollup' };
    if (t.includes('פלייר')) return { intent: 'quote', product: 'flyer' };
    if (t.includes('כרטיס')) return { intent: 'quote', product: 'bc' };

    // 3. פרמטרים
    if (t.includes('מט')) mapped_params.paper_type = 'matte_350';
    if (t.includes('כרומו')) mapped_params.paper_type = 'chromo_300';
    if (t.includes('למינציה')) mapped_params.lamination = 'matte';
    if (t.includes('סיכות')) mapped_params.book_type = 'saddle_stitch';
    if (t.includes('השבחה')) mapped_params.finishing = 'none'; // הוספת המיפוי החסר

    return { intent: 'update', mapped_params };
}

// THE SCENARIOS (Updated Expectations)
const SCENARIOS = [
    {
        name: "📚 SCENARIO 1: הספרים וההגנה על הכמות",
        description: "בודק שהמספר 12 (עמודים) לא דורס את ה-200 (עותקים)",
        steps: [
            { user: "היי", expect: "response" },
            { user: "אני רוצה להדפיס חוברת", expect: "question", verify: "סוג" },
            { user: "סיכות", expect: "question", verify: "עותקים" },
            { user: "200 עותקים", expect: "question", verify: "עמודים" }, 
            { user: "12 עמודים", expect: "question", verify: "גודל" }, 
            { user: "A4", expect: "question", verify: "נייר" },
            { user: "כרומו", expect: "calculate" }
        ]
    },
    {
        name: "📏 SCENARIO 2: הרולאפ והמידות",
        description: "בודק שהמידה 85x200 מזוהה כגודל",
        steps: [
            { user: "תפריט", expect: "response" },
            { user: "אני צריך רולאפ", expect: "question", verify: "כמה" }, // עודכן מ-"כמות" ל-"כמה"
            { user: "1", expect: "question", verify: "גודל" },
            { user: "85x200", expect: "calculate" }
        ]
    },
    {
        name: "🗑️ SCENARIO 3: המחיקה הכירורגית",
        description: "מחיקת פריט ספציפי לפי תיאור",
        steps: [
            { user: "ריסט", expect: "response" },
            // פריט 1
            { user: "רולאפ", expect: "question" },
            { user: "1", expect: "question" },
            { user: "85x200", expect: "calculate" },
            // פריט 2
            { user: "עוד רולאפ", expect: "question" },
            { user: "1", expect: "question" },
            { user: "100x200", expect: "calculate" },
            // מחיקה - עכשיו זה יזוהה כ-remove בגלל הסדר החדש במוק
            { user: "תמחק את הרולאפ 85", expect: "response", checkDelete: "85" }
        ]
    },
    {
        name: "🛒 SCENARIO 4: עגלה וקופה",
        description: "בדיקת זרימת סיום והעשרת נתונים (PDF Ready)",
        steps: [
            { user: "תפריט", expect: "response" },
            { user: "1000 כרטיסי ביקור", expect: "question" },
            { user: "נייר מט", expect: "question" },
            { user: "בלי למינציה", expect: "question" },
            { user: "בלי השבחה", expect: "calculate", checkFullSpec: true }, // בדיקה שיש מפרט מלא
            { user: "שלח לי הצעת מחיר", expect: "response", verify: "סה\"כ" } 
        ]
    }
];

// RUNNER
async function runUltimateTest() {
    console.log(`${c.bold}${c.cyan}🚀 PINI BOT ULTIMATE TEST SUITE (V51.0)${c.reset}`);
    let totalPassed = 0;
    let totalFailed = 0;

    for (const scenario of SCENARIOS) {
        console.log(`${c.yellow}${c.bold}📂 ${scenario.name}${c.reset}`);
        resetSession();
        let scenarioFailed = false;

        for (const step of scenario.steps) {
            const mockResult = mockClassifier(step.user);
            const validated = validateLLMResult({ 
                intent: mockResult.intent, product: mockResult.product, mapped_params: mockResult.mapped_params || {}, answer_text: mockResult.answer_text 
            }, step.user, mockSession);

            const plan = planActions({ 
                intent: validated.intent, extractedParams: validated.mapped_params, product: validated.product, aiResponse: validated.answer_text, raw_text: step.user 
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
            let extraMsg = "";

            if (step.verify && action.question && !action.question.includes(step.verify)) isPass = false;
            if (step.verify && action.payload && action.payload.text && !action.payload.text.includes(step.verify)) isPass = false;
            
            if (step.checkDelete) {
                const remaining = mockSession.cart[0];
                if (remaining && remaining.description.includes("100")) extraMsg = `✨ Verified: "85" deleted.`;
                else isPass = false;
            }

            // בדיקת מפרט עשיר ל-PDF
            if (step.checkFullSpec) {
                const lastItem = mockSession.cart[mockSession.cart.length-1];
                if (lastItem && lastItem.fullSpec && lastItem.productName) {
                    extraMsg = `✨ PDF Ready: ${lastItem.productName} [${lastItem.fullSpec}]`;
                } else {
                    isPass = false;
                    extraMsg = `⚠️ Missing PDF specs`;
                }
            }

            if (isPass) {
                console.log(`${c.green}   ✅ "${step.user}" -> ${actualType} ${extraMsg}${c.reset}`);
                totalPassed++;
            } else {
                console.log(`${c.red}   ❌ "${step.user}" (Got: ${actualType})${c.reset}`);
                scenarioFailed = true;
                totalFailed++;
            }
        }
        if (!scenarioFailed) console.log(`${c.green}   🎉 SCENARIO PASSED${c.reset}\n`);
    }
    console.log(`${c.bold}📊 FINAL REPORT: ${totalPassed} Passed, ${totalFailed} Failed${c.reset}`);
}

runUltimateTest();