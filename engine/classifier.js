/** engine/classifier.js V11.4 - The Finisher */
const { routeWithLLM } = require('./llmRouter');

const KEYWORDS = {
    // צמצמתי את רשימת הברכות כדי למנוע False Positives
    greetings: ['היי', 'שלום', 'אהלן', 'בוקר טוב', 'ערב טוב', 'היוש', 'הלו', 'תודה', 'ביי', 'להתראות', 'אחלה', 'מעולה', 'תודה רבה', 'יא מלך', 'אין עליך', 'ביי ביי', 'יאללה ביי', 'מה קורה', 'מה העניינים', 'מה המצב'],
    restart: ['התחל מחדש', 'ריסט', 'reset', 'תפריט', 'חזרה להתחלה', 'ראשי', 'התחלה'],
    checkout: ['תשלום', 'לשלם', 'חשבון', 'סיום', 'קופה', 'הצעה', 'שלח לי', 'סיכום', 'תארוז', 'איך משלמים', 'אפשר לשלם'], 
    remove: ['תמחק', 'תוריד', 'בטל', 'לא רוצה', 'נקה סל', 'נקה הכל', 'רוקן', 'לנקות'], 
    show_cart: ['מה בעגלה', 'מה יש בעגלה', 'הצג עגלה', 'סטטוס עגלה', 'כמה יצא', 'מה בסל', 'מה יש בסל', 'כמה זה יוצא', 'מה יש לי']
};

async function classifyMessage(message, context = {}) {
    const text = message.toLowerCase().trim();

    // 1. FAST PATH
    
    // Greeting Priority: Only if it STARTS with greeting or is VERY short
    // Fixes Step 8 failure ("Sababa add rollup...")
    if (KEYWORDS.greetings.some(k => text.startsWith(k) || text === k)) {
        // אם המשפט מכיל עוד מילים משמעותיות, נעביר ל-LLM
        // אם הוא קצר (פחות מ-20 תווים), זה כנראה רק ברכה
        if (text.length < 20) return { intent: 'greeting', needsLLM: false };
    }

    if (KEYWORDS.restart.some(k => text.includes(k))) return { intent: 'reset', needsLLM: false };
    
    // Strict Remove: Prevent "Did you remove?" (Step 26 failure)
    // Only remove if it starts with the keyword OR is exactly the keyword
    if (KEYWORDS.remove.some(k => text === k || text.startsWith(k + ' '))) return { intent: 'remove', needsLLM: false };
    
    if (KEYWORDS.show_cart.some(k => text.includes(k))) return { intent: 'show_cart', needsLLM: false };
    
    if (KEYWORDS.checkout.some(k => text.includes(k))) {
        if (context.cart && context.cart.length > 0) return { intent: 'checkout', needsLLM: false };
    }

    // 2. SMART PATH
    try {
        let llmResult = await routeWithLLM(message, context);
        if (Array.isArray(llmResult)) llmResult = llmResult[0];

        return {
            intent: llmResult.intent || 'consult',
            product: llmResult.product,
            extractedParams: llmResult.entities || {},
            needsLLM: true,
            confidence: llmResult.confidence,
            summary: llmResult.entities?.text_summary
        };
        
    } catch (e) {
        console.error("Classifier Fallback:", e);
        return { intent: 'consult', needsLLM: true };
    }
}

module.exports = { classifyMessage };