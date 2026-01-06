/**
 * Pini Message Classifier V3 (Final Safety Logic)
 * ===============================================
 * מנוע סיווג מהיר עם "שסתום ביטחון" למקרים מורכבים.
 * אם יש ספק - מעבירים ל-LLM.
 */

const PRODUCT_KEYWORDS = {
    'פלייר': 'flyer', 'פליירים': 'flyer', 'עלון': 'flyer',
    'כרטיס': 'bc', 'כרטיסים': 'bc', 'ביקור': 'bc', 'ביזנס': 'bc',
    'הזמנה': 'invitation', 'הזמנות': 'invitation',
    'רולאפ': 'rollup', 'באנר': 'rollup', 'שמשונית': 'banner',
    'קנבס': 'canvas', 'תמונה': 'canvas',
    'מדבקה': 'sticker', 'מדבקות': 'sticker', 'סטיקר': 'sticker',
    'חוברת': 'booklet', 'קטלוג': 'booklet', 'מחברת': 'booklet',
    
    // אנגלית
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

const COMPLEXITY_TRIGGERS = [
    'למה', 'איך', 'מתי', 'האם', 'תלוי', 
    'קובץ', 'דחוף', 'הנחה', 'יקר', 'זול', 'משלוח',
    'why', 'how', 'when', 'discount'
];

/**
 * 🛑 פונקציית הבטיחות הקריטית 🛑
 * מזהה אם ההזמנה מורכבת מדי לטיפול מהיר
 */
function isComplexOrder(text) {
    // 1. האם יש סימני חיבור? (כמו בהודעה שלך: "כרטיסים + פליירים")
    if (text.includes('+') || text.includes(' plus ')) return true;
    
    // 2. האם יש מילות קישור מחשידות?
    if (text.includes(' וגם ') || text.includes(' בנוסף ') || text.includes(' ו ')) return true;

    // 3. האם יש יותר ממספר אחד משמעותי במשפט?
    // (למשל "400 כרטיסים ו 500 פליירים")
    const numbers = text.match(/\d+/g);
    if (numbers && numbers.length > 1) {
        // מסננים מספרים שנראים כמו טלפון (מתחילים ב-05)
        const realNumbers = numbers.filter(n => !n.startsWith('05') && parseInt(n) < 1000000);
        if (realNumbers.length > 1) return true; // יש יותר מכמות אחת -> ל-LLM!
    }

    return false;
}

function classifyMessage(message, context = {}) {
    let text = message.toLowerCase();
    const cart = context.cart || [];

    // המרת מספרים בעברית
    for (const [word, num] of Object.entries(HEBREW_NUMBERS)) {
        if (text.includes(word)) {
            text = text.replace(word, num);
        }
    }

    // --- 🚨 בדיקת מורכבות ראשונית 🚨 ---
    // אם זו הזמנה מורכבת, עוקפים את כל הלוגיקה ושולחים ישר ל-LLM
    if (isComplexOrder(text)) {
        console.log("⚠️ Complex order detected -> Sending to LLM");
        return { action: 'chat', data: {}, needsLLM: true };
    }
    // ------------------------------------

    // 1. ברכות
    if (ACTION_KEYWORDS.greeting.some(k => text.includes(k)) && text.length < 20) {
        return { action: 'greeting', data: {}, needsLLM: false };
    }

    // 2. ניקוי
    if (ACTION_KEYWORDS.clear.some(k => text.includes(k))) {
        return { action: 'clear', data: {}, needsLLM: false };
    }

    // 3. סיום/שליחה
    if (ACTION_KEYWORDS.send_quote.some(k => text.includes(k))) {
        return { action: 'send_quote', data: {}, needsLLM: false };
    }

    // 4. סטטוס
    if (ACTION_KEYWORDS.status.some(k => text.includes(k))) {
        return { action: 'status', data: {}, needsLLM: false };
    }

    // 5. עיצוב
    if ((text.includes('עיצוב') || text.includes('pdf') || text.includes('קובץ')) && 
        (text.includes('יש') || text.includes('מוכן') || text.includes('ממני'))) {
         return { action: 'design_check', data: {}, needsLLM: false };
    }

    // 6. הסרה
    if (ACTION_KEYWORDS.remove.some(k => text.includes(k))) {
        const product = findProductInText(text);
        return { action: 'remove', data: { product }, needsLLM: false };
    }

    // 7. מורכבות טקסטואלית כללית
    if (text.length > 60 || COMPLEXITY_TRIGGERS.some(t => text.includes(t))) {
        const hasQty = /\d/.test(text);
        const hasProd = findProductInText(text);
        // אם זה ארוך ואין כמות+מוצר ברורים -> LLM
        if (!(hasQty && hasProd)) {
            return { action: 'chat', data: {}, needsLLM: true };
        }
    }

    // 8. זיהוי רגיל (מוצר יחיד)
    const qtyMatch = text.match(/(\d{1,3}(?:,\d{3})*)/); 
    const qty = qtyMatch ? parseInt(qtyMatch[0].replace(/,/g, '')) : null;
    const product = findProductInText(text);

    if (qty && product) {
        const isUpdate = ACTION_KEYWORDS.update.some(k => text.includes(k)) || 
                         (cart.some(i => i.product_name === product) && !text.includes('עוד') && !text.includes('תוסיף'));
        
        if (isUpdate && (text.includes('שנה') || text.includes('עדכן') || text.includes('במקום'))) {
             return { action: 'update_qty', data: { product, qty }, needsLLM: false };
        }
        return { action: 'quote', data: { product, qty }, needsLLM: false };
    }

    if (product && !qty) {
        return { action: 'quote_incomplete', data: { product }, needsLLM: false };
    }

    if (qty && !product) {
        if (cart.length > 0) {
            return { action: 'update_qty', data: { qty }, needsLLM: false };
        }
    }

    // ברירת מחדל: לא הבנו -> LLM
    return { action: 'chat', data: {}, needsLLM: true };
}

function findProductInText(text) {
    for (const [keyword, key] of Object.entries(PRODUCT_KEYWORDS)) {
        if (text.includes(keyword)) {
            return key;
        }
    }
    return null;
}

module.exports = { classifyMessage };