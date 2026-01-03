/**
 * Pini Bot - Test Scenario Script
 * ================================
 * סקריפט בדיקה מקיף שמדמה שיחה אמיתית עם לקוח
 * 
 * להרצה: node test_scenario.js
 */

const { classifyMessage } = require('./classifier');
const { buildResponse, buildQuickReplies } = require('./responseBuilder');

// צבעים
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// סימולציית עגלה וסשן
let cart = [];
let totalLLMCalls = 0;
let totalDirectCalls = 0;

// ==============================
// סצנריו 1: לקוח חדש - הזמנת חתונה
// ==============================
const scenario1 = {
    name: "🎊 לקוח חתונה - הזמנה מלאה",
    description: "לקוח שמתכנן חתונה, צריך הזמנות + כרטיסי הושבה",
    messages: [
        { user: "היי", expected: "greeting" },
        { user: "אני מתחתן בקרוב!", expected: "chat", note: "שיחה חופשית - צריך LLM" },
        { user: "צריך 300 הזמנות לחתונה", expected: "quote" },
        { user: "יש לי עיצוב מCanva", expected: "design_check" },
        { user: "כמה זה עולה?", expected: "status" },
        { user: "תוסיף גם 300 כרטיסים קטנים", expected: "quote" },
        { user: "בעצם תעלה ל-350", expected: "update_qty", note: "עדכון לפריט אחרון" },
        { user: "ואת ההזמנות גם 350", expected: "quote", note: "מזכיר מוצר ספציפי = quote לא update" },
        { user: "מה יש לי בעגלה?", expected: "status" },
        { user: "תשלח לי הצעת מחיר", expected: "send_quote" },
    ]
};

// ==============================
// סצנריו 2: לקוח עסקי - הזמנה מרובה
// ==============================
const scenario2 = {
    name: "🏢 לקוח עסקי - קמפיין שיווקי",
    description: "חברה שצריכה חומרי שיווק לכנס",
    messages: [
        { user: "שלום, אני מחברת ABC", expected: "greeting" },
        { user: "יש לנו כנס בעוד חודש", expected: "chat" },
        { user: "צריך 5000 פליירים A5", expected: "quote" },
        { user: "גם 1000 כרטיסי ביקור לצוות", expected: "quote" },
        { user: "ו-3 רולאפים לדוכן", expected: "quote" },
        { user: "תעלה ל-10,000 פליירים", expected: "quote", note: "מזכיר מוצר = quote" },
        { user: "כמה יוצא סה\"כ?", expected: "status" },
        { user: "תוריד את הרולאפים", expected: "remove" },
        { user: "בעצם צריך 5 רולאפים", expected: "quote", note: "מוצר חדש" },
        { user: "מה ההבדל בין למינציה מט למבריקה?", expected: "chat" },
        { user: "שלח הצעה", expected: "send_quote" },
    ]
};

// ==============================
// סצנריו 3: לקוח מתלבט
// ==============================
const scenario3 = {
    name: "🤔 לקוח מתלבט - שינויים רבים",
    description: "לקוח שמשנה את דעתו כל הזמן",
    messages: [
        { user: "מה קורה", expected: "greeting" },
        { user: "אני צריך כרטיסי ביקור", expected: "quote_incomplete" },
        { user: "500", expected: "update_qty", note: "כמות בלבד - מבין מההקשר" },
        { user: "לא רגע, 1000", expected: "update_qty" },
        { user: "250", expected: "update_qty" },
        { user: "בעצם 500", expected: "update_qty" },
        { user: "תמחק", expected: "remove" },
        { user: "סליחה, כן צריך 500 כרטיסים", expected: "quote" },
        { user: "זהו תשלח", expected: "send_quote" },
    ]
};

// ==============================
// סצנריו 4: לקוח טכני - שאלות מקצועיות
// ==============================
const scenario4 = {
    name: "🔧 לקוח טכני - שאלות מקצועיות",
    description: "מעצב גרפי שמכיר את התחום",
    messages: [
        { user: "היי, אני גרפיקאי", expected: "greeting" },
        { user: "יש לי PDF מוכן להדפסה עם bleed", expected: "design_check" },
        { user: "2000 פליירים A5 על כרומו 170", expected: "quote" },
        { user: "זה יהיה CMYK או RGB?", expected: "chat" },
        { user: "מה הרזולוציה המינימלית?", expected: "chat" },
        { user: "אפשר גם 500 כרטיסי ביקור על 350 גרם?", expected: "quote" },
        { user: "עם למינציה מט וספוט UV על הלוגו", expected: "quote", note: "גימורים מורכבים" },
        { user: "כמה זמן אספקה?", expected: "chat" },
        { user: "סיכום בבקשה", expected: "status" },
    ]
};

// ==============================
// סצנריו 5: קצה מקרים - Edge Cases
// ==============================
const scenario5 = {
    name: "⚠️ Edge Cases - מקרי קצה",
    description: "בדיקת מקרים לא סטנדרטיים",
    messages: [
        { user: "?", expected: "chat" },
        { user: "אחד כרטיס ביקור", expected: "quote", note: "מספר בעברית" },
        { user: "שני באנרים", expected: "quote", note: "מספר בעברית" },
        { user: "מאה פליירים", expected: "quote", note: "מספר בעברית" },
        { user: "5,000 מדבקות", expected: "quote", note: "מספר עם פסיק" },
        { user: "כרטיסים", expected: "quote_incomplete", note: "בלי כמות" },
        { user: "500", expected: "update_qty", note: "רק מספר - עדכון" },
        { user: "תודה רבה!", expected: "chat" },
        { user: "להתראות", expected: "chat" },
        { user: "עזוב הכל, נתחיל מחדש", expected: "clear" },
        { user: "100000000 פליירים", expected: "quote", note: "כמות גדולה מאוד" },
    ]
};

// ==============================
// סצנריו 6: שפה מעורבת
// ==============================
const scenario6 = {
    name: "🌍 שפה מעורבת - עברית/אנגלית",
    description: "לקוח שמשתמש במונחים באנגלית",
    messages: [
        { user: "Hi, אני צריך flyers", expected: "quote_incomplete" },
        { user: "1000", expected: "update_qty" },
        { user: "גם business cards", expected: "quote_incomplete" },
        { user: "500", expected: "update_qty" },
        { user: "What's the total?", expected: "chat", note: "אנגלית מלאה - צריך LLM" },
        { user: "תשלח הצעה", expected: "send_quote" },
    ]
};

// הרצת סצנריו בודד
function runScenario(scenario) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`${BOLD}${CYAN}${scenario.name}${RESET}`);
    console.log(`${scenario.description}`);
    console.log(`${'═'.repeat(60)}\n`);
    
    cart = []; // איפוס עגלה
    let passed = 0;
    let failed = 0;
    let llmCalls = 0;
    let directCalls = 0;
    
    for (let i = 0; i < scenario.messages.length; i++) {
        const msg = scenario.messages[i];
        const result = classifyMessage(msg.user, { cart });
        
        const isCorrect = result.action === msg.expected;
        const icon = isCorrect ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
        const llmIcon = result.needsLLM ? '🤖' : '⚡';
        
        if (result.needsLLM) {
            llmCalls++;
            totalLLMCalls++;
        } else {
            directCalls++;
            totalDirectCalls++;
        }
        
        // עדכון עגלה לסימולציה
        if (result.action === 'quote' && result.data.product) {
            cart.push({ 
                product_name: result.data.product, 
                qty: result.data.qty || 100,
                client_price: 500
            });
        } else if (result.action === 'quote_incomplete' && result.data.product) {
            // גם quote_incomplete מוסיף לעגלה (בלי כמות)
            cart.push({ 
                product_name: result.data.product, 
                qty: null,
                client_price: 0
            });
        } else if (result.action === 'update_qty' && result.data.qty) {
            // עדכון כמות לפריט האחרון
            if (cart.length > 0) {
                cart[cart.length - 1].qty = result.data.qty;
            }
        } else if (result.action === 'clear') {
            cart = [];
        } else if (result.action === 'remove') {
            cart = cart.filter(i => !i.product_name.includes(result.data.product || ''));
        }
        
        console.log(`${icon} ${llmIcon} ${BLUE}לקוח:${RESET} "${msg.user}"`);
        console.log(`      ${YELLOW}→ ${result.action}${RESET}${msg.note ? ` (${msg.note})` : ''}`);
        
        if (!isCorrect) {
            console.log(`      ${RED}Expected: ${msg.expected}, Got: ${result.action}${RESET}`);
            failed++;
        } else {
            passed++;
        }
        console.log('');
    }
    
    // סיכום סצנריו
    const successRate = Math.round((passed / (passed + failed)) * 100);
    const directRate = Math.round((directCalls / (directCalls + llmCalls)) * 100);
    
    console.log(`${'─'.repeat(60)}`);
    console.log(`📊 Results: ${GREEN}${passed}/${passed + failed}${RESET} (${successRate}%)`);
    console.log(`⚡ Direct: ${directCalls}/${directCalls + llmCalls} (${directRate}%)`);
    console.log(`🤖 LLM: ${llmCalls} calls`);
    
    return { passed, failed, llmCalls, directCalls };
}

// הרצת כל הסצנריואים
function runAllScenarios() {
    console.log(`\n${'█'.repeat(60)}`);
    console.log(`${BOLD}     🧪 PINI BOT - COMPREHENSIVE TEST SUITE${RESET}`);
    console.log(`${'█'.repeat(60)}`);
    
    const scenarios = [scenario1, scenario2, scenario3, scenario4, scenario5, scenario6];
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const scenario of scenarios) {
        const result = runScenario(scenario);
        totalPassed += result.passed;
        totalFailed += result.failed;
    }
    
    // סיכום כללי
    console.log(`\n${'█'.repeat(60)}`);
    console.log(`${BOLD}     📈 OVERALL SUMMARY${RESET}`);
    console.log(`${'█'.repeat(60)}\n`);
    
    const totalTests = totalPassed + totalFailed;
    const overallSuccess = Math.round((totalPassed / totalTests) * 100);
    const overallDirect = Math.round((totalDirectCalls / (totalDirectCalls + totalLLMCalls)) * 100);
    
    console.log(`   Total Tests:     ${totalTests}`);
    console.log(`   ${GREEN}Passed:${RESET}          ${totalPassed}`);
    console.log(`   ${totalFailed > 0 ? RED : ''}Failed:${RESET}          ${totalFailed}`);
    console.log(`   Success Rate:    ${overallSuccess >= 80 ? GREEN : YELLOW}${overallSuccess}%${RESET}`);
    console.log('');
    console.log(`   ⚡ Direct Calls:  ${totalDirectCalls} (${overallDirect}%)`);
    console.log(`   🤖 LLM Calls:     ${totalLLMCalls} (${100 - overallDirect}%)`);
    console.log('');
    
    if (overallDirect >= 80) {
        console.log(`   ${GREEN}✅ TARGET MET: ${overallDirect}% direct handling (goal: 80%)${RESET}`);
    } else {
        console.log(`   ${YELLOW}⚠️ BELOW TARGET: ${overallDirect}% direct (goal: 80%)${RESET}`);
    }
    
    // חישוב חיסכון
    const savingsPerCall = 0.003; // $0.003 per LLM call
    const potentialCost = totalTests * savingsPerCall;
    const actualCost = totalLLMCalls * savingsPerCall;
    const savings = potentialCost - actualCost;
    
    console.log('');
    console.log(`   💰 Cost Analysis (per ${totalTests} requests):`);
    console.log(`      Without classifier: $${potentialCost.toFixed(3)}`);
    console.log(`      With classifier:    $${actualCost.toFixed(3)}`);
    console.log(`      ${GREEN}Savings:           $${savings.toFixed(3)} (${overallDirect}%)${RESET}`);
    
    console.log(`\n${'█'.repeat(60)}\n`);
}

// הרצה
runAllScenarios();