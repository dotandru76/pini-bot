/** tests/test_offline.js V46.1 - Smart Mocking */
const { planActions } = require('../engine/planner');
const { validateLLMResult } = require('../engine/validator');
require('dotenv').config();

// --- 1. MOCK SESSION ---
let mockSession = {
    cart: [],
    currentProduct: null,
    draftAttributes: {}
};

function resetSession() {
    mockSession = { cart: [], currentProduct: null, draftAttributes: {} };
}

// --- 2. MOCK AI (המוח המזויף - עכשיו חכם יותר) ---
// מדמה את מה ש-Gemini היה מחלץ מהטקסט
function mockClassifier(text) {
    const t = text.toLowerCase();
    let mapped_params = {};

    // זיהוי פרמטרים (Simulating LLM Extraction)
    if (t.includes('מט')) mapped_params.paper_type = 'matte_350';
    if (t.includes('למינציה')) mapped_params.lamination = 'none';
    if (t.includes('השבחה')) mapped_params.finishing = 'none';
    
    // פקודות מערכת
    if (t.includes('היי')) return { intent: 'chat', answer_text: 'היי! מה נדפיס?' };
    if (t.includes('תפריט')) return { intent: 'reset' };
    if (t.includes('נקה')) return { intent: 'reset' };
    if (t.includes('עגלה')) return { intent: 'show_cart' };
    if (t.includes('ביי')) return { intent: 'chat', answer_text: 'ביי ביי!' };

    // מוצרים
    if (t.includes('כרטיס')) return { intent: 'quote', product: 'bc' };
    if (t.includes('ספר')) return { intent: 'quote', product: 'booklet' };
    if (t.includes('רולאפ')) return { intent: 'quote', product: 'rollup' };
    
    // סיום (ה-Validator יהפוך את זה ל-show_cart אם יש עגלה)
    if (t.includes('הצעת מחיר') || t.includes('שלח לי')) return { intent: 'quote' };

    // ברירת מחדל: עדכון
    return { intent: 'update', mapped_params };
}

// --- 3. THE TEST RUNNER ---
const SCENARIOS = [
    {
        name: "📚 זרימת ספרים (לוגיקה משולבת)",
        steps: [
            { user: "היי", expect: "response" },
            { user: "אני רוצה ספר", expect: "question" }, 
            { user: "כריכה רכה", expect: "question" }, 
            { user: "100 עותקים", expect: "question" }, 
            { user: "300 עמודים", expect: "question" }, 
            { user: "A5", expect: "question" },
            { user: "כרומו 300", expect: "calculate" }
        ]
    },
    {
        name: "🛒 זרימת סיום (Checkout)",
        steps: [
            { user: "תפריט", expect: "response" },
            { user: "1000 כרטיסי ביקור", expect: "question" },
            { user: "נייר מט", expect: "question" }, // המוק יחזיר paper_type, ולכן זה יעבוד
            { user: "ללא למינציה", expect: "question" },
            { user: "ללא השבחה", expect: "calculate" },
            { user: "מה יש בעגלה?", expect: "response" }, 
            { user: "תשלח לי הצעת מחיר", expect: "response" } // עכשיו זה יעבוד כי יש עגלה מלאה
        ]
    }
];

async function runOfflineTests() {
    console.log(`\x1b[36m🚀 STARTING OFFLINE LOGIC TEST (V46.1)\x1b[0m`);
    let passed = 0;
    let failed = 0;

    for (const scenario of SCENARIOS) {
        console.log(`\n\x1b[33m📂 ${scenario.name}\x1b[0m`);
        resetSession();

        for (const step of scenario.steps) {
            // 1. CLASSIFY (Mock)
            let mockResult = mockClassifier(step.user);
            
            // 2. VALIDATE (Real Logic)
            let validated = validateLLMResult({ 
                intent: mockResult.intent, 
                product: mockResult.product, 
                mapped_params: mockResult.mapped_params || {}, // העברת הפרמטרים מהמוק
                answer_text: mockResult.answer_text 
            }, step.user, mockSession);

            // 3. PLAN (Real Logic)
            const plan = planActions({ 
                intent: validated.intent, 
                extractedParams: validated.mapped_params, 
                product: validated.product,
                aiResponse: validated.answer_text,
                raw_text: step.user 
            }, mockSession);

            // תיקון לוגיקת שליפת הפעולה: מחפשים את התגובה האמיתית, לא סתם את הראשונה
            const action = plan.actions.find(a => 
                a.type === 'PRESENT_OPTIONS' || 
                a.type === 'CALCULATE_AND_ADD' || 
                a.type === 'GENERATE_RESPONSE'
            ) || plan.actions[0];
            
            // 4. ASSERT
            let actualType = 'unknown';
            if (action.type === 'PRESENT_OPTIONS') actualType = 'question';
            if (action.type === 'CALCULATE_AND_ADD') actualType = 'calculate';
            if (action.type === 'GENERATE_RESPONSE') actualType = 'response';
            
            // עדכון ה-Session
            if (action.type === 'PRESENT_OPTIONS') {
                mockSession.currentProduct = action.product;
                mockSession.draftAttributes = action.saveDraft;
            } else if (action.type === 'CALCULATE_AND_ADD') {
                mockSession.cart.push(action.payload);
                mockSession.currentProduct = null;
                mockSession.draftAttributes = {};
            } else if (action.type === 'REMOVE_FROM_CART') { // תמיכה במחיקה אם צריך
                mockSession.cart.pop();
            }

            // תיקון ספציפי ל-Reset: אם קיבלנו ניקוי + תגובה, זה נחשב תגובה
            if (plan.actions.some(a => a.type === 'CLEAR_SESSION_CONTEXT') && actualType === 'response') {
                // זה בסדר, זה ה-Reset
            }

            if (actualType === step.expect) {
                console.log(`✅ "${step.user}" -> ${actualType}`);
                passed++;
            } else {
                console.log(`❌ "${step.user}"`);
                console.log(`   Expected: ${step.expect}`);
                console.log(`   Got:      ${actualType}`);
                // console.log(`   Details:  ${JSON.stringify(action)}`); // לדיבאג
                failed++;
            }
        }
    }

    console.log(`\n📊 RESULTS: ${passed} Passed, ${failed} Failed`);
}

runOfflineTests();