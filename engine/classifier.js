/**
 * Pini Message Classifier V4 (Smart Logic)
 * ========================================
 * תיקון קריטי: זיהוי מורכבות לפי סוגי מוצרים (ולא סתם מספרים),
 * ושינוי סדר העדיפויות כדי למנוע טעויות בזיהוי.
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
    send_quote: ['שלח', 'הצעה', 'סגור', 'תשלח', 'send', 'quote', 'finish', 'חשבונית'],
    status: ['כמה זה', 'מחיר', 'סיכום', 'עגלה', 'תראה לי', 'סה"כ', 'כמה יוצא', 'total', 'status']
};

const HEBREW_NUMBERS = {
    'אחד': 1, 'אחת': 1, 'שני': 2, 'שתי': 2, 'שניים': 2, 'שלושה': 3, 'שלוש': 3,
    'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5, 'עשרה': 10, 'עשר': 10,
    'מאה': 100, 'מאתיים': 200, 'אלף': 1000, 'אלפיים': 2000
};

// טריגרים ל-LLM (מילים שמעידות על שיחה מורכבת/רגשית)
const COMPLEXITY_TRIGGERS = [
    'למה', 'איך', 'מתי', 'האם', 'תלוי', 
    'קובץ', 'דחוף', 'הנחה', 'יקר', 'זול', 'משלוח', 'הבדל',
    'why', 'how', 'when', 'discount', 'expensive'
];

/**
 * 🧠 זיהוי מורכבות חכם
 * בודק אם יש הזמנה של מספר מוצרים שונים במקביל
 */
function isComplexOrder(text) {
    // 1. סימני חיבור מפורשים
    if (text.includes('+') || text.includes(' plus ')) return true;
    
    // 2. בדיקה: כמה סוגי מוצרים שונים הוזכרו במשפט?
    // אם הוזכרו גם "פלייר" וגם "כרטיס" -> זה מורכב לטיפול מהיר
    const foundCategories = new Set();
    for (const [keyword, category] of Object.entries(PRODUCT_KEYWORDS)) {
        if (text.includes(keyword)) {
            foundCategories.add(category);
        }
    }
    
    if (foundCategories.size > 1) {
        return true; // יש יותר ממוצר אחד -> ל-LLM
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

    // --- שלב 0: בדיקות בטיחות ומורכבות (Safety First) ---
    
    // א. האם זו הזמנה מרובת מוצרים?
    if (isComplexOrder(text)) {
        console.log("⚠️ Complex order detected (Multi-Product) -> Sending to LLM");
        return { action: 'chat', data: {}, needsLLM: true };
    }

    // ב. האם יש טריגרים של שיחה מורכבת ("יקר לי", "איך זה עובד")?
    // בודקים את זה *לפני* שמחפשים מילות מפתח כמו "בטל" או "שלח"
    if (COMPLEXITY_TRIGGERS.some(t => text.includes(t))) {
        return { action: 'chat', data: {}, needsLLM: true };
    }

    // --- שלב 1: זיהוי ליבה (מוצר + כמות) ---
    // העלינו את זה למעלה! אם יש "1000 פליירים", זה קודם כל Quote.
    // זה מונע מ"תשלח לי 1000 פליירים" ליפול על "Send Quote" בטעות.
    
    const qtyMatch = text.match(/(\d{1,3}(?:,\d{3})*)/); 
    const qty = qtyMatch ? parseInt(qtyMatch[0].replace(/,/g, '')) : null;
    const product = findProductInText(text);

    if (qty && product) {
        // בודקים אם זה עדכון
        const isUpdate = ACTION_KEYWORDS.update.some(k => text.includes(k)) || 
                         (cart.some(i => i.product_name === product) && 
                          !text.includes('עוד') && !text.includes('תוסיף') && !text.includes('גם'));
        
        if (isUpdate && (text.includes('שנה') || text.includes('עדכן') || text.includes('במקום'))) {
             return { action: 'update_qty', data: { product, qty }, needsLLM: false };
        }
        return { action: 'quote', data: { product, qty }, needsLLM: false };
    }

    // --- שלב 2: פעולות פשוטות ---

    // ברכות
    if (ACTION_KEYWORDS.greeting.some(k => text.includes(k)) && text.length < 20) {
        return { action: 'greeting', data: {}, needsLLM: false };
    }

    // ניקוי
    if (ACTION_KEYWORDS.clear.some(k => text.includes(k))) {
        return { action: 'clear', data: {}, needsLLM: false };
    }

    // שליחה / סיום (רק אם לא מצאנו מוצר+כמות קודם)
    if (ACTION_KEYWORDS.send_quote.some(k => text.includes(k))) {
        return { action: 'send_quote', data: {}, needsLLM: false };
    }

    // סטטוס
    if (ACTION_KEYWORDS.status.some(k => text.includes(k))) {
        return { action: 'status', data: {}, needsLLM: false };
    }

    // עיצוב
    if ((text.includes('עיצוב') || text.includes('pdf') || text.includes('קובץ')) && 
        (text.includes('יש') || text.includes('מוכן') || text.includes('ממני'))) {
         return { action: 'design_check', data: {}, needsLLM: false };
    }

    // הסרה
    if (ACTION_KEYWORDS.remove.some(k => text.includes(k))) {
        const productToRemove = findProductInText(text);
        return { action: 'remove', data: { product: productToRemove }, needsLLM: false };
    }

    // --- שלב 3: השלמות ---

    if (product && !qty) {
        return { action: 'quote_incomplete', data: { product }, needsLLM: false };
    }

    if (qty && !product) {
        if (cart.length > 0) {
            return { action: 'update_qty', data: { qty }, needsLLM: false };
        }
    }

    // ברירת מחדל
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