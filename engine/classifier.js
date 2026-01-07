/**
 * Pini Classifier V2 (Rule-Based First)
 * =====================================
 * מסווג הודעות על בסיס חוקים קשיחים.
 * המטרה: 90% מההודעות לא צריכות להגיע ל-LLM.
 */

const { PRODUCT_MAP } = require('./calculation');

// מילות מפתח לפעולות
const ACTIONS = {
    REMOVE: ['תמחק', 'הסר', 'תוריד', 'בטל', 'הוצא', 'לא צריך', 'remove', 'delete', 'cancel'],
    UPDATE: ['שנה', 'עדכן', 'תחליף', 'במקום', 'תעלה ל', 'תוריד ל', 'change', 'update', 'edit'],
    CLEAR: ['נקה הכל', 'תמחק הכל', 'מחק עגלה', 'התחל מחדש', 'איפוס', 'עזוב הכל', 'reset', 'clear'],
    STATUS: ['כמה זה', 'מחיר', 'סיכום', 'עגלה', 'תראה לי', 'סה"כ', 'כמה יוצא', 'status', 'total'],
    SEND: ['שלח', 'הצעה', 'סגור', 'תשלח', 'חשבונית', 'תכין לי', 'send', 'finish', 'checkout'],
    GREETING: ['היי', 'שלום', 'בוקר טוב', 'ערב טוב', 'פיני', 'אהלן', 'hi', 'hello']
};

// טריגרים למורכבות (מחייבים LLM)
const COMPLEX_TRIGGERS = [
    'למה', 'איך', 'מתי', 'האם', 'תלוי', 'הבדל',
    'פיצוי', 'חינם', 'תלונה', 'שחיטה', 'גרוע', // רגש שלילי
    'כמו', 'בערך', 'אולי', // אי ודאות
    'עיצוב', 'גרפיקה', 'לוגו', // עיצוב (דורש הבנה)
    'why', 'how', 'when', 'difference'
];

function classifyMessage(text, context = {}) {
    const cleanText = text.toLowerCase().trim();
    const cart = context.cart || [];
    const hasCart = cart.length > 0;

    // 1. בדיקת בטיחות: האם זו בקשה מורכבת?
    if (COMPLEX_TRIGGERS.some(t => cleanText.includes(t))) {
        return { intent: 'consult', confidence: 1.0, needsLLM: true, reason: 'complexity_trigger' };
    }

    // 2. זיהוי פעולות ברורות (Keywords)
    
    // ניקוי
    if (ACTIONS.CLEAR.some(k => cleanText.includes(k))) {
        return { intent: 'clear', confidence: 1.0, needsLLM: false };
    }

    // הסרה (רק אם יש מוצר במשפט)
    if (ACTIONS.REMOVE.some(k => cleanText.includes(k))) {
        return { intent: 'remove', confidence: 0.9, needsLLM: false };
    }

    // סיום / שליחה
    if (ACTIONS.SEND.some(k => cleanText.includes(k))) {
        return { intent: 'checkout', confidence: 1.0, needsLLM: false };
    }

    // סטטוס
    if (ACTIONS.STATUS.some(k => cleanText.includes(k))) {
        return { intent: 'status', confidence: 1.0, needsLLM: false };
    }

    // 3. זיהוי הזמנה/עדכון (מספר + מוצר)
    const hasNumber = /\d+/.test(cleanText) || containsHebrewNumber(cleanText);
    const productKey = identifyProductInText(cleanText);

    if (hasNumber) {
        // אם יש מילת עדכון ("שנה ל-1000")
        if (ACTIONS.UPDATE.some(k => cleanText.includes(k))) {
            return { intent: 'update', confidence: 0.9, needsLLM: false };
        }
        
        // אם יש מוצר מפורש ("1000 פליירים")
        if (productKey) {
            return { intent: 'quote', confidence: 1.0, needsLLM: false }; // הוספה חדשה
        }

        // אם יש רק מספר ("1000") ויש משהו בעגלה -> עדכון אחרון
        if (!productKey && hasCart) {
            return { intent: 'update', confidence: 0.8, needsLLM: false };
        }
    }

    // 4. מוצר ללא כמות ("אני צריך פליירים")
    if (productKey && !hasNumber) {
        return { intent: 'quote', confidence: 0.9, needsLLM: false }; // יטופל כ-Missing Info
    }

    // 5. ברכה (רק אם קצר)
    if (ACTIONS.GREETING.some(k => cleanText.includes(k)) && cleanText.length < 20) {
        return { intent: 'greeting', confidence: 0.9, needsLLM: false };
    }

    // ברירת מחדל: לא הבנו -> LLM
    return { intent: 'consult', confidence: 0.5, needsLLM: true, reason: 'unknown' };
}

// עזר: זיהוי מוצר בטקסט
function identifyProductInText(text) {
    for (const [keyword, category] of Object.entries(PRODUCT_MAP)) {
        if (text.includes(keyword)) return category;
    }
    return null;
}

// עזר: זיהוי מספר בעברית
function containsHebrewNumber(text) {
    const hebrewNumbers = ['אחד', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר', 'מאה', 'אלף'];
    return hebrewNumbers.some(n => text.includes(n));
}

module.exports = { classifyMessage };