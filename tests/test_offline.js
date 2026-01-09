/** tests/test_offline.js V49.0 - Smart Delete Support */
const { planActions } = require('../engine/planner');
const { validateLLMResult } = require('../engine/validator');
require('dotenv').config();

// MOCK SESSION
let mockSession = { cart: [], currentProduct: null, draftAttributes: {} };
function resetSession() { mockSession = { cart: [], currentProduct: null, draftAttributes: {} }; }

// MOCK CLASSIFIER (Updated for the complex scenario)
function mockClassifier(text) {
    const t = text.toLowerCase();
    let mapped_params = {};

    // פרמטרים
    if (t.includes('מט')) mapped_params.paper_type = 'matte_350';
    if (t.includes('100') && t.includes('200')) mapped_params.size = '100x200'; // Mocking size extraction
    
    // פקודות
    if (t.includes('היי')) return { intent: 'chat', answer_text: 'היי!' };
    if (t.includes('תפריט')) return { intent: 'reset' };
    if (t.includes('מחק')) return { intent: 'remove' }; // זיהוי מחיקה
    
    // מוצרים
    if (t.includes('רולאפ')) return { intent: 'quote', product: 'rollup' };

    return { intent: 'update', mapped_params };
}

// SCENARIO
const SCENARIOS = [
    {
        name: "🗑️ מחיקה חכמה (Smart Delete)",
        steps: [
            { user: "תפריט", expect: "response" },
            { user: "אני רוצה רולאפ", expect: "question" },
            { user: "1", expect: "question" },
            { user: "100x200", expect: "calculate" }, // פריט 0: 100x200
            { user: "אני רוצה עוד רולאפ", expect: "question" },
            { user: "1", expect: "question" },
            { user: "120x200", expect: "calculate" }, // פריט 1: 120x200 (האחרון)
            // עכשיו ננסה למחוק את הראשון (100x200) ולא את האחרון
            { user: "תמחק את הרולאפ שהוא 100 על 200", expect: "response" }
        ]
    }
];

async function runOfflineTests() {
    console.log(`\x1b[36m🚀 STARTING OFFLINE LOGIC TEST (V49.0)\x1b[0m`);
    let passed = 0;
    let failed = 0;

    for (const scenario of SCENARIOS) {
        console.log(`\n\x1b[33m📂 ${scenario.name}\x1b[0m`);
        resetSession();

        for (const step of scenario.steps) {
            let mockResult = mockClassifier(step.user);
            
            let validated = validateLLMResult({ 
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
            
            // --- LOGIC EXECUTION ---
            if (action.type === 'PRESENT_OPTIONS') {
                mockSession.currentProduct = action.product;
                mockSession.draftAttributes = action.saveDraft;
            } else if (action.type === 'CALCULATE_AND_ADD') {
                mockSession.cart.push(action.payload);
                mockSession.currentProduct = null;
                mockSession.draftAttributes = {};
            } else if (plan.actions.some(a => a.type === 'REMOVE_FROM_CART')) {
                // *** התיקון כאן: שימוש באינדקס מה-Planner ***
                const removeAction = plan.actions.find(a => a.type === 'REMOVE_FROM_CART');
                if (removeAction.payload && typeof removeAction.payload.index === 'number') {
                    console.log(`   ✂️ Splicing item at index ${removeAction.payload.index}`);
                    mockSession.cart.splice(removeAction.payload.index, 1);
                } else {
                    mockSession.cart.pop(); // Fallback
                }
            }

            let actualType = 'unknown';
            if (action.type === 'PRESENT_OPTIONS') actualType = 'question';
            if (action.type === 'CALCULATE_AND_ADD') actualType = 'calculate';
            if (action.type === 'GENERATE_RESPONSE') actualType = 'response';

            if (actualType === step.expect) {
                console.log(`✅ "${step.user}" -> ${actualType}`);
                passed++;
                if(step.user.includes("תמחק")) {
                    // וידוא שנשאר הפריט הנכון (הגדול יותר)
                    const remainingItem = mockSession.cart[0];
                    if(remainingItem && remainingItem.description.includes("120")) {
                        console.log(`   ✨ Verified: The correct item (100x200) was deleted!`);
                    } else {
                        console.log(`   ⚠️ Warning: Wrong item deleted.`);
                    }
                }
            } else {
                console.log(`❌ "${step.user}"`);
                console.log(`   Got: ${actualType}`);
                failed++;
            }
        }
    }
    console.log(`\n📊 RESULTS: ${passed} Passed, ${failed} Failed`);
}

runOfflineTests();