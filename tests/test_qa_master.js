/**
 * tests/test_qa_master.js
 * בדיקת איכות מקיפה (QA) - פיני הבוט
 * ====================================
 * מריץ תרחישי שיחה שלמים ובודק שהלוגיקה לא נשברת.
 * כולל בדיקות לזיהוי ספרים, החלפת נושא, ומחיקת פריטים.
 */

const { planActions } = require('../engine/planner');
const { extractParameters } = require('../engine/extractor');
const { getSession, clearSession } = require('../services/sessionManager');
require('dotenv').config();

// צבעים ללוגים בטרמינל
const c = { reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", bold: "\x1b[1m", cyan: "\x1b[36m" };

const SCENARIOS = [
    {
        name: "📚 זרימת ספרים (בדיקת לוגיקה מספרית)",
        steps: [
            { user: "אני רוצה להדפיס ספר", expectType: "question", expectText: "כמה" },
            { user: "100 עותקים", expectType: "question", expectText: "עמודים" }, // מוודא ש-100 נתפס ככמות
            { user: "300", expectType: "question", expectText: "גודל" }, // מוודא ש-300 נתפס כעמודים ולא דורס כמות
            { user: "A5", expectType: "question", expectText: "נייר" },
            { user: "נטול עץ", expectType: "question", expectText: "כריכה" },
            { user: "כריכה רכה", expectType: "calculate" }
        ]
    },
    {
        name: "🃏 זרימה מהירה (כרטיסי ביקור + התנגשות 'מט')",
        steps: [
            { user: "כרטיסי ביקור", expectType: "question", expectText: "כמה" },
            { user: "1000", expectType: "question", expectText: "נייר" },
            { user: "מט 350", expectType: "question", expectText: "למינציה" }, // מוודא ש'מט' זוהה כחלק מהנייר ולא כלמינציה מוקדמת
            { user: "מט", expectType: "calculate" } // מוודא ש'מט' כאן מזוהה כלמינציה
        ]
    },
    {
        name: "🔄 החלפת נושא (רולאפ)",
        steps: [
            { user: "פליירים", expectType: "question", expectText: "כמה" }, // מתחיל פלייר
            { user: "בעצם לא, תביא לי רולאפ", expectType: "question", expectText: "כמה" }, // מחליף לרולאפ
            { user: "1", expectType: "question", expectText: "גודל" },
            { user: "85x200", expectType: "calculate" }
        ]
    },
    {
        name: "🗑️ בדיקת מחיקת פריט בודד",
        steps: [
            // 1. הוספת פריט לעגלה
            { user: "רולאפ", expectType: "question", expectText: "כמה" },
            { user: "1", expectType: "question", expectText: "גודל" },
            { user: "85x200", expectType: "calculate" }, 
            
            // 2. בדיקת מחיקה
            { user: "תמחק את פריט 1", expectType: "remove" }, // מצפה לפעולת מחיקה
            
            // 3. וידוא שהמערכת חוזרת לשגרה
            { user: "היי", expectType: "response", expectText: "מה תרצה להדפיס" } 
        ]
    }
];

async function runTests() {
    console.log(`${c.bold}${c.cyan}🤖 PINI BOT MASTER QA TEST${c.reset}\n`);
    
    const sessionId = 'qa_tester';
    let totalErrors = 0;

    for (const scenario of SCENARIOS) {
        console.log(`${c.yellow}📂 ${scenario.name}${c.reset}`);
        clearSession(sessionId); // התחלה נקייה לכל תרחיש
        const session = getSession(sessionId);

        for (const step of scenario.steps) {
            try {
                // 1. סימולציה: חילוץ פרמטרים (כמו בשרת)
                const extraction = extractParameters(step.user);
                
                // 2. סימולציה: קביעת כוונה (Intent Detection logic from server.js)
                let intent = 'chat';
                
                if (extraction.isReset) intent = 'reset';
                else if (extraction.isRemove) intent = 'remove_item'; // <--- התוספת החשובה לטסט
                else if (extraction.isCartStatus) intent = 'show_cart';
                
                else if (session.currentProduct) {
                     // אם הוזכר מוצר חדש בזמן שיש מוצר פעיל -> החלפת נושא
                     if (extraction.products.length > 0 && !extraction.products.includes(session.currentProduct)) {
                         intent = 'new_order';
                         session.currentProduct = extraction.products[0];
                         session.draftAttributes = {}; // איפוס טיוטה
                     } else {
                         intent = 'answer';
                     }
                }
                else if (extraction.products.length > 0) {
                    intent = 'new_order';
                    session.currentProduct = extraction.products[0];
                }

                // 3. הרצת המוח (Planner)
                const plan = planActions({ 
                    intent, 
                    extractedParams: extraction, 
                    product: session.currentProduct 
                }, session);
                
                const action = plan.actions[0]; // לוקחים את הפעולה הראשית
                
                // 4. פענוח סוג הפעולה שהתקבלה לבדיקה
                let type = 'unknown';
                let responseText = '';

                if (action.type === 'PRESENT_OPTIONS') {
                    type = 'question';
                    responseText = action.question;
                    // עדכון סטייט בסימולטור
                    session.currentProduct = action.product;
                    session.draftAttributes = action.saveDraft;

                } else if (action.type === 'CALCULATE_AND_ADD') {
                    type = 'calculate';
                    session.cart.push(action.payload);
                    session.currentProduct = null;
                    session.draftAttributes = {};

                } else if (action.type === 'REMOVE_FROM_CART') {
                    type = 'remove';
                    // סימולציית מחיקה (פשטנית לטסט)
                    if (session.cart.length > 0) session.cart.pop();

                } else if (action.type === 'CLEAR_SESSION_CONTEXT') {
                    type = 'reset';
                    session.cart = [];
                    session.currentProduct = null;

                } else if (action.type === 'GENERATE_RESPONSE') {
                    type = 'response';
                    responseText = action.payload.text;
                }

                // 5. בדיקה האם התוצאה תואמת לציפייה
                const textMatch = !step.expectText || (responseText && responseText.includes(step.expectText));
                const typeMatch = type === step.expectType;

                if (typeMatch && textMatch) {
                    console.log(`   ✅ "${step.user}" -> ${type}`);
                } else {
                    console.log(`   ❌ "${step.user}"`);
                    console.log(`      Received: [${type}] "${responseText || ''}"`);
                    console.log(`      Expected: [${step.expectType}] "${step.expectText || ''}"`);
                    console.log(`      Draft State: ${JSON.stringify(session.draftAttributes)}`);
                    totalErrors++;
                }

            } catch (e) { 
                console.log(`   💥 Error processing "${step.user}": ${e.message}`); 
                totalErrors++;
            }
        }
        console.log(""); // שורה ריקה בין תרחישים
    }

    if (totalErrors === 0) {
        console.log(`${c.green}${c.bold}🎉 כל הבדיקות עברו בהצלחה! המערכת יציבה.${c.reset}`);
    } else {
        console.log(`${c.red}${c.bold}⚠️ סיכום: נמצאו ${totalErrors} שגיאות.${c.reset}`);
    }
}

runTests();