/**
 * tests/test_scenarios_complex.js
 * בדיקת "הלקוח המשוגע" - 30 שלבים בשיחה רציפה
 * ============================================
 */

const { classifyMessage } = require('../engine/classifier');
const { planActions } = require('../engine/planner');
const { getSession, clearSession } = require('../services/sessionManager');
require('dotenv').config();

const c = { reset: "\x1b[0m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", cyan: "\x1b[36m" };

const SCENARIOS = [
    // --- סבב 1: הזמנת פליירים עם חרטות ---
    { step: 1, text: "היי פיני", expected: "greeting" },
    { step: 2, text: "אני רוצה להדפיס פליירים", expected: "ask_size" }, 
    { step: 3, text: "בגודל A5", expected: "ask_paper" }, // תשובה לשאלה קודמת
    { step: 4, text: "נייר עבה", expected: "ask_qty" },   // LLM should map "עבה" to chromo
    { step: 5, text: "1000 יחידות", expected: "calculate" },
    { step: 6, text: "בעצם תשנה את הכמות ל-5000", expected: "calculate_update" }, // שינוי דעה
    { step: 7, text: "עזוב, תמחק את הפליירים", expected: "remove_cart" }, // חרטה מלאה

    // --- סבב 2: כרטיסי ביקור (סלנג) ---
    { step: 8, text: "טוב, בוא נעשה כרטיסי ביקור", expected: "ask_qty" },
    { step: 9, text: "תביא לי אלפייה", expected: "ask_paper" }, // אלפייה = 1000
    { step: 10, text: "נייר רגיל", expected: "calculate" },
    
    // --- סבב 3: רולאפ (מידות מוזרות) ---
    { step: 11, text: "כמה עולה רולאפ?", expected: "ask_size" },
    { step: 12, text: "מטר עשרים", expected: "ask_qty" }, // 120 ס"מ
    { step: 13, text: "יחידה אחת", expected: "calculate" },
    
    // --- סבב 4: בלבול ומוצרים חסרים ---
    { step: 14, text: "אני רוצה להדפיס", expected: "ask_what" }, // לא אמר מה
    { step: 15, text: "הזמנות לחתונה", expected: "ask_qty" },
    { step: 16, text: "200 הזמנות", expected: "ask_size" },
    { step: 17, text: "גודל רגיל", expected: "ask_paper" }, // LLM צריך לנחש 13x18 או לשאול
    { step: 18, text: "נייר פנינה כזה מנצנץ", expected: "calculate" }, // pearl_300

    // --- סבב 5: קנבס ומסגרות ---
    { step: 19, text: "בא לי תמונה על קנבס לסלון", expected: "ask_size" },
    { step: 20, text: "משהו גדול, מטר על מטר", expected: "ask_frame" }, // 100x100
    { step: 21, text: "בלי מסגרת", expected: "ask_qty" },
    { step: 22, text: "אחד", expected: "calculate" },

    // --- סבב 6: מדבקות (שטח) ---
    { step: 23, text: "מדבקות ויניל", expected: "ask_qty_sqm" },
    { step: 24, text: "5 מטר רבוע", expected: "ask_cut" },
    { step: 25, text: "חיתוך צורני", expected: "calculate" },

    // --- סבב 7: סיום וסגירה ---
    { step: 26, text: "מה יש לי בעגלה?", expected: "show_cart" }, // (לא מומש ב-planner כרגע, יפול ל-consult)
    { step: 27, text: "תשלח לי הצעת מחיר מסודרת", expected: "pdf_flow" }, // checkout
    { step: 28, text: "תודה רבה!", expected: "greeting/consult" },
    { step: 29, text: "ביי", expected: "greeting" },
    { step: 30, text: "תמחק הכל להתחלה", expected: "reset" }
];

async function runScenarioTest() {
    console.log(`${c.cyan}🚀 STARTING CONTINUOUS CONVERSATION TEST (30 STEPS)${c.reset}\n`);
    
    const sessionId = 'stress_test_user_1';
    clearSession(sessionId); // מתחילים נקי
    const session = getSession(sessionId);
    
    let passCount = 0;

    for (const scenario of SCENARIOS) {
        console.log(`${c.yellow}Step ${scenario.step}: "${scenario.text}"${c.reset}`);
        
        try {
            // 1. סיווג
            const classification = await classifyMessage(scenario.text, session);
            
            // 2. תכנון
            const plan = planActions(classification, session);
            
            // 3. עדכון ה-Session (סימולציה של מה שהשרת עושה)
            // זה קריטי כדי שהשלב הבא יכיר את השלב הקודם
            for (const action of plan.actions) {
                if (action.type === 'PRESENT_OPTIONS') {
                    session.currentProduct = action.product;
                    session.draftAttributes = action.saveDraft;
                    console.log(`   🤖 Bot: ${action.question} [Product: ${action.product}]`);
                }
                if (action.type === 'CALCULATE_AND_ADD') {
                    const item = action.payload; // מדמים הוספה
                    // שים לב: בטסט האמיתי calculation מחזיר אובייקט מלא, כאן אנחנו רק מדמים
                    session.cart.push({ product: session.currentProduct, price: 100 }); 
                    console.log(`   💰 Bot: Calculated Price! (Item added to cart)`);
                }
                if (action.type === 'CLEAR_SESSION_CONTEXT') {
                    session.currentProduct = null;
                    session.draftAttributes = {};
                    console.log(`   ✨ Context Cleared`);
                }
                if (action.type === 'GENERATE_RESPONSE') {
                    console.log(`   💬 Bot: ${action.payload.text || action.template}`);
                }
            }

            // בדיקת הצלחה בסיסית (אם הבוט הגיב במשהו)
            if (plan.actions.length > 0) {
                passCount++;
            } else {
                console.log(`${c.red}   ❌ No response generated${c.reset}`);
            }
            console.log("--------------------------------------------------");

        } catch (e) {
            console.log(`${c.red}💥 Error in Step ${scenario.step}: ${e.message}${c.reset}`);
        }
    }

    console.log(`\n${c.green}🏁 TEST FINISHED: ${passCount}/30 Successful Interactions${c.reset}`);
}

runScenarioTest();