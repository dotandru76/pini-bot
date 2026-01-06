/**
 * Pini Message Classifier V2 (Rule-Based)
 * ========================================
 * מנוע סיווג מהיר שלא עולה כסף (No LLM Cost)
 * מטרתו: לזהות בקשות פשוטות ולחסוך פנייה ל-Gemini.
 */

const PRODUCT_KEYWORDS = {
    // עברית
    'פלייר': 'flyer', 'פליירים': 'flyer', 'עלון': 'flyer',
    'כרטיס': 'bc', 'כרטיסים': 'bc', 'ביקור': 'bc', 'ביזנס': 'bc',
    'הזמנה': 'invitation', 'הזמנות': 'invitation',
    'רולאפ': 'rollup', 'באנר': 'rollup', 'שמשונית': 'banner',
    'קנבס': 'canvas', 'תמונה': 'canvas',
    'מדבקה': 'sticker', 'מדבקות': 'sticker', 'סטיקר': 'sticker',
    'חוברת': 'booklet', 'קטלוג': 'booklet', 'מחברת': 'booklet',
    
    // English Support
    'flyer': 'flyer', 'flyers': 'flyer',
    'business card': 'bc', 'cards': 'bc',
    'invitation': 'invitation', 'invites': 'invitation',
    'sticker': 'sticker', 'stickers': 'sticker',
    'rollup': 'rollup', 'banner': 'rollup'
};

const ACTION_KEYWORDS = {
    remove: ['תמחק', 'הסר', 'תוריד', 'בטל', 'הוצא', 'לא צריך', 'remove', 'delete'],
    update: ['שנה', 'עדכן', 'תחליף', 'במקום', 'תעלה ל', 'תוריד ל', 'change', 'update'],
    clear: ['נקה הכל', 'תמחק הכל', 'מחק עגלה', 'התחל מחדש', 'איפוס', 'עזוב הכל', 'reset', 'clear'],
    greeting: ['היי', 'שלום', 'בוקר טוב', 'ערב טוב', 'מה קורה', 'מה נשמע', 'אהלן', 'hi', 'hello'],
    send_quote: ['שלח', 'הצעה', 'סגור', 'תשלח', 'send', 'quote', 'finish'],
    status: ['כמה זה', 'מחיר', 'סיכום', 'עגלה', 'תראה לי', 'סה"כ', 'כמה יוצא', 'total', 'status']
};

const HEBREW_NUMBERS = {
    'אחד': 1, 'אחת': 1, 'שני': 2, 'שתי': 2, 'שניים': 2, 'שלושה': 3, 'שלוש': 3,
    'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5, 'עשרה': 10, 'עשר': 10,
    'מאה': 100, 'מאתיים': 200, 'אלף': 1000, 'אלפיים': 2000
};

// טריגרים ל-LLM (מילים שמעידות על מורכבות)
const COMPLEXITY_TRIGGERS = [
    'למה', 'איך', 'מתי', 'האם', 'תלוי', 
    'קובץ', 'דחוף', 'הנחה', 'יקר', 'זול', 'משלוח',
    'why', 'how', 'when', 'discount'
];

/**
 * הפונקציה הראשית שמחליטה מה לעשות עם ההודעה
 */
function classifyMessage(message, context = {}) {
    let text = message.toLowerCase();
    const cart = context.cart || [];

    // 0. המרת מספרים בעברית לספרות (לפני הכל)
    for (const [word, num] of Object.entries(HEBREW_NUMBERS)) {
        if (text.includes(word)) {
            text = text.replace(word, num);
        }
    }

    // 1. זיהוי ברכות (מהיר)
    if (ACTION_KEYWORDS.greeting.some(k => text.includes(k)) && text.length < 20) {
        return { action: 'greeting', data: {}, needsLLM: false };
    }

    // 2. ניקוי עגלה
    if (ACTION_KEYWORDS.clear.some(k => text.includes(k))) {
        return { action: 'clear', data: {}, needsLLM: false };
    }

    // 3. שליחת הזמנה / סיום
    if (ACTION_KEYWORDS.send_quote.some(k => text.includes(k))) {
        return { action: 'send_quote', data: {}, needsLLM: false };
    }

    // 4. בדיקת סטטוס / מחיר
    if (ACTION_KEYWORDS.status.some(k => text.includes(k))) {
        return { action: 'status', data: {}, needsLLM: false };
    }

    // 5. בדיקת עיצוב (זיהוי קבצים או שאלות עיצוב)
    if ((text.includes('עיצוב') || text.includes('pdf') || text.includes('קובץ')) && 
        (text.includes('יש') || text.includes('מוכן') || text.includes('ממני'))) {
         return { action: 'design_check', data: {}, needsLLM: false };
    }

    // 6. הסרת פריט
    if (ACTION_KEYWORDS.remove.some(k => text.includes(k))) {
        const product = findProductInText(text);
        return { action: 'remove', data: { product }, needsLLM: false };
    }

    // 7. בדיקת מורכבות (Safety Valve)
    // אם ההודעה ארוכה מדי או מכילה מילות שאלה מורכבות -> שלח ל-LLM
    if (text.length > 60 || COMPLEXITY_TRIGGERS.some(t => text.includes(t))) {
        // חריג: אם יש כמות ומוצר ברורים, נתייחס לזה כהזמנה למרות המלל
        const hasQty = /\d/.test(text);
        const hasProd = findProductInText(text);
        if (!(hasQty && hasProd)) {
            return { action: 'chat', data: {}, needsLLM: true };
        }
    }

    // 8. זיהוי מוצרים וכמויות (הלב של המערכת)
    const qtyMatch = text.match(/(\d{1,3}(?:,\d{3})*)/); 
    const qty = qtyMatch ? parseInt(qtyMatch[0].replace(/,/g, '')) : null;
    const product = findProductInText(text);

    // מקרה A: יש כמות + מוצר (הוספה/הצעת מחיר)
    if (qty && product) {
        // האם זה עדכון לפריט קיים?
        const isUpdate = ACTION_KEYWORDS.update.some(k => text.includes(k)) || 
                         (cart.some(i => i.product_name === product) && !text.includes('עוד') && !text.includes('תוסיף'));
        
        if (isUpdate && (text.includes('שנה') || text.includes('עדכן') || text.includes('במקום'))) {
             return { action: 'update_qty', data: { product, qty }, needsLLM: false };
        }
        
        return { action: 'quote', data: { product, qty }, needsLLM: false };
    }

    // מקרה B: יש רק מוצר (חסרה כמות)
    if (product && !qty) {
        return { action: 'quote_incomplete', data: { product }, needsLLM: false };
    }

    // מקרה C: יש רק כמות (עדכון כמות אחרונה)
    if (qty && !product) {
        if (cart.length > 0) {
            return { action: 'update_qty', data: { qty }, needsLLM: false };
        }
    }

    // ברירת מחדל: לא הבנו -> LLM
    return { action: 'chat', data: {}, needsLLM: true };
}

/**
 * מוצא מפתח מוצר מתוך הטקסט
 */
function findProductInText(text) {
    for (const [keyword, key] of Object.entries(PRODUCT_KEYWORDS)) {
        if (text.includes(keyword)) {
            return key;
        }
    }
    return null;
}

module.exports = { classifyMessage };