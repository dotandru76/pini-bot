/**
 * Pini Bot - Stress Test Generator
 * ================================
 * מייצר ומריץ וריאציות קשות כדי למצוא נקודות שבירה
 */

const { classifyMessage } = require('../engine/classifier');

// מאגר רכיבים ליצירת משפטים
const products = ['פליירים', 'כרטיסי ביקור', 'רולאפ', 'הזמנות', 'מדבקות', 'A4', 'רולאפ 85x200'];
const quantities = ['500', '1000', '2', 'אחד', 'אלף', '10,000', '170', '85']; // כולל מספרים מטעים
const actions = ['תכין לי', 'בא לי', 'צריך', 'תוסיף', 'תוריד', 'שנה ל-', 'היי פיני'];
const fillers = ['דחוף', 'למחר', 'בבקשה', 'של הבוס', 'איכותי', 'גרם', 'ס"מ'];

// פונקציה שמייצרת משפט רנדומלי
function generateScenario() {
    const p = products[Math.floor(Math.random() * products.length)];
    const q = quantities[Math.floor(Math.random() * quantities.length)];
    const a = actions[Math.floor(Math.random() * actions.length)];
    const f = fillers[Math.floor(Math.random() * fillers.length)];
    
    // תבניות משפט שונות
    const patterns = [
        `${a} ${q} ${p}`,           // תכין לי 500 פליירים
        `${p} ${q} ${f}`,           // פליירים 1000 דחוף
        `${a} ${p} ${f}`,           // צריך רולאפ דחוף (בלי כמות)
        `${q} ${f} ${p}`,           // 500 למחר פליירים
        `${p} גודל ${q} ${f}`       // רולאפ גודל 85 ס"מ (מכשיל!)
    ];
    
    return patterns[Math.floor(Math.random() * patterns.length)];
}

console.log("\n🚀 Starting Stress Test (Simulating 50 Hard Cases)...\n");

let passed = 0;
let total = 50; // נריץ 50 דוגמאות מייצגות (במקום 1000 כדי לא להציף את המסך)
let riskyCases = [];

for (let i = 0; i < total; i++) {
    const text = generateScenario();
    const result = classifyMessage(text);
    
    let status = "✅ OK";
    let isRisky = false;

    // ניתוח סיכונים אוטומטי
    
    // 1. זיהוי כמות נמוכה מדי במוצרים המוניים (למשל 85 פליירים - חשוד כמדד ס"מ)
    if (result.data.qty && result.data.qty < 100 && result.data.product === 'flyer') {
        status = "⚠️ Suspicious Qty (Dimension?)";
        isRisky = true;
    }

    // 2. זיהוי מספרים ללא מוצר (כשלא אמור להיות)
    if (result.data.qty && !result.data.product && !text.includes('שנה')) {
        status = "⚠️ Qty without Product";
        isRisky = true;
    }

    // 3. זיהוי A4 כמוצר או כמות
    if (text.includes('A4') && result.data.qty === 4) {
         status = "❌ Failed: '4' from A4 detected as Qty";
         isRisky = true;
    }

    console.log(`Test #${i+1}: "${text}"`);
    console.log(`   -> Action: ${result.action} | Product: ${result.data.product || 'N/A'} | Qty: ${result.data.qty || 'N/A'} | LLM: ${result.needsLLM}`);
    
    if (isRisky) {
        console.log(`   🚨 ${status}`);
        riskyCases.push({ text, result: result.data });
    } else {
        passed++;
    }
    console.log('------------------------------------------------');
}

console.log(`\n📊 Summary: ${passed}/${total} passed automatic safety checks.`);
console.log(`🚨 Found ${riskyCases.length} risky edge cases.`);

if (riskyCases.length > 0) {
    console.log("\nTop Risky Cases Analysis:");
    riskyCases.slice(0, 5).forEach(c => console.log(`- "${c.text}" -> Got Qty: ${c.result.qty}`));
}