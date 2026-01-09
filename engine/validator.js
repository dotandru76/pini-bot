/** engine/validator.js V44.0 - Checkout Logic Added */
const fs = require('fs');

const PRODUCT_KEYWORDS = {
    'כרטיס': 'bc', 'ביקור': 'bc', 'פלייר': 'flyer', 'עלון': 'flyer',
    'הזמנ': 'invitation', 'רולאפ': 'rollup', 'מדבק': 'sticker', 'סטיקר': 'sticker',
    'חוברת': 'booklet', 'ספר': 'booklet', 'קטלוג': 'booklet', 'ברכון': 'booklet',
    'פולדר': 'folder', 'מעטפ': 'envelope'
};

function validateLLMResult(llmResult, rawText, session) {
    console.log(`🛡️ [VALIDATOR] Input Intent: "${llmResult.intent}"`);
    
    const text = rawText.toLowerCase().trim();
    let validated = { ...llmResult };
    validated.mapped_params = validated.mapped_params || {};

    // 1. זיהוי פרידה/סיום
    const chatTriggers = ['ביי', 'להתראות', 'תודה', 'אחלה', 'סיימנו', 'קפה', 'מים', 'מי בנה'];
    if (chatTriggers.some(w => text.includes(w)) && !validated.product) {
        validated.intent = 'chat';
        validated.product = null;
    }

    // 2. זיהוי נייר
    if (text.includes('כרומו')) {
        if (text.includes('300') || text.includes('עבה')) validated.mapped_params.paper_type = 'chromo_300';
        if (text.includes('130') || text.includes('דק')) validated.mapped_params.paper_type = 'chromo_130';
        if (validated.intent === 'chat') validated.intent = 'update';
    }

    // 3. הגנת שלילה
    if (validated.intent === 'remove') {
        const negationWords = ['לא', 'בלי', 'ללא', 'none'];
        const featureWords = ['הדפסה', 'למינציה', 'צבע', 'עיצוב', 'גימור'];
        const hasProductKeyword = Object.keys(PRODUCT_KEYWORDS).some(k => text.includes(k));

        if (negationWords.some(w => text.includes(w)) && featureWords.some(w => text.includes(w)) && !hasProductKeyword) {
            validated.intent = 'update';
            if (text.includes('הדפסה')) validated.mapped_params.print = 'none';
            if (text.includes('למינציה')) validated.mapped_params.lamination = 'none';
        }
    }

    // 4. זיהוי מטרים
    const meterMatch = text.match(/(\d+)\s*מטר/);
    if (meterMatch) {
        validated.mapped_params.qty = parseInt(meterMatch[1]);
        if (validated.intent === 'chat') validated.intent = 'update';
    }

    // 5. ניתוב קשיח (מוצרים)
    for (const [key, val] of Object.entries(PRODUCT_KEYWORDS)) {
        if (text.includes(key)) {
            if (validated.product !== val) {
                validated.product = val;
                const numMatch = text.match(/(\d+)/);
                if (numMatch && parseInt(numMatch[0]) > 0 && !text.includes('מחק')) {
                    validated.intent = 'quote';
                    validated.mapped_params.qty = parseInt(numMatch[0]);
                } else if (validated.intent === 'chat') {
                    validated.intent = 'quote';
                }
            }
        }
    }

    // 6. === תיקון CHECKOUT ===
    // אם הלקוח מבקש הצעה/מחיר ויש לו משהו בעגלה -> שלח אותו לסיום
    if (validated.intent === 'quote' && session.cart && session.cart.length > 0) {
        const checkoutWords = ['הצעת מחיר', 'הצעה', 'שלח לי', 'סיכום', 'כמה לתשלום', 'חשבון'];
        if (checkoutWords.some(w => text.includes(w)) && !validated.product) {
            console.log(`🛡️ [VALIDATOR] Detected Checkout Request -> Converting to show_cart`);
            validated.intent = 'show_cart';
        }
    }

    return validated;
}

module.exports = { validateLLMResult };