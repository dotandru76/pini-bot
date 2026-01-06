/**
 * Pini Message Classifier V5 (Production Ready)
 * =============================================
 * שיפורים:
 * 1. זיהוי שאלות (?) - מונע הזמנה בטעות כשלקוח רק מתעניין.
 * 2. רגישות למילות קישור ("כמו", "בלי") ולרגש ("שחיטה", "פיצוי").
 * 3. טיפול חכם בסטטוס מחיר.
 */

const PRODUCT_KEYWORDS = {
    // עברית
    'פלייר': 'flyer', 'פליירים': 'flyer', 'עלון': 'flyer',
    'כרטיס': 'bc', 'כרטיסים': 'bc', 'ביקור': 'bc', 'ביזנס': 'bc',
    'הזמנה': 'invitation', 'הזמנות': 'invitation',
    'רולאפ': 'rollup', 'באנר': 'rollup', 'שמשונית': 'banner',
    'קנבס': 'canvas', 'תמונה': 'canvas',
    'מדבקה': 'sticker', 'מדבקות': 'sticker', 'סטיקר': 'sticker',
    'חוברת': 'booklet', 'קטלוג': 'booklet', 'מחברת': 'booklet', 'ספר': 'booklet',
    
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

// 🚩 מילים שמקפיצות ל-LLM מיד
const COMPLEXITY_TRIGGERS = [
    'למה', 'איך', 'מתי', 'האם', 'תלוי', 
    'קובץ', 'דחוף', 'הנחה', 'יקר', 'זול', 'משלוח', 'הבדל',
    'פיצוי', 'חינם', 'תלונה', 'שחיטה', 'גרוע', 'עקום', // רגש שלילי/שירות
    'כמו', 'בערך', 'אולי', // אי ודאות
    'בליד', 'קרופ', 'וקטור', // מונחים טכניים
    'למחר', 'היום', // דחיפות
    'why', 'how', 'when', 'discount', 'expensive'
];

/**
 * 🧠 זיהוי מורכבות חכם
 */
function isComplexOrder(text) {
    // 1. סימני חיבור מפורשים
    if (text.includes('+') || text.includes(' plus ')) return true;
    
    // 2. ריבוי מוצרים (למשל: "פלייר וגם כרטיס")
    const foundCategories = new Set();
    for (const [keyword, category] of Object.entries(PRODUCT_KEYWORDS)) {
        if (text.includes(keyword)) {
            foundCategories.add(category);
        }
    }
    
    if (foundCategories.size > 1) return true;

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

    // --- שלב 0: Safety & Complexity ---
    
    // א. הזמנה מרובת מוצרים -> LLM
    if (isComplexOrder(text)) {
        return { action: 'chat', data: {}, needsLLM: true };
    }

    // ב. טריגרים מילוליים (רגש, דחיפות, טכני) -> LLM
    if (COMPLEXITY_TRIGGERS.some(t => text.includes(t))) {
        return { action: 'chat', data: {}, needsLLM: true };
    }

    // ג. זיהוי שאלות על מוצרים ("הקנבסים זה עם מסגרת?") -> LLM
    // אם יש שם של מוצר וגם סימן שאלה, וזו לא שאלת מחיר סטנדרטית
    const hasProduct = findProductInText(text);
    const isPriceQuestion = text.includes('כמה') || text.includes('מחיר') || text.includes('cost');
    if (hasProduct && text.includes('?') && !isPriceQuestion) {
        return { action: 'chat', data: {}, needsLLM: true };
    }

    // --- שלב 1: זיהוי ליבה (מוצר + כמות) ---
    const qtyMatch = text.match(/(\d{1,3}(?:,\d{3})*)/); 
    const qty = qtyMatch ? parseInt(qtyMatch[0].replace(/,/g, '')) : null;
    const product = findProductInText(text);

    if (qty && product) {
        // האם זה עדכון?
        const isUpdate = ACTION_KEYWORDS.update.some(k => text.includes(k)) || 
                         (cart.some(i => i.product_name === product) && 
                          !text.includes('עוד') && !text.includes('תוסיף') && !text.includes('גם'));
        
        // תיקון: אם הלקוח אומר "תוריד ל-2000" זה Update, אבל אם הוא אומר "זה יקר, תוריד" - ה-Complex Trigger כבר תפס את זה למעלה
        if (isUpdate && (text.includes('שנה') || text.includes('עדכן') || text.includes('במקום') || text.includes('תוריד') || text.includes('תעלה'))) {
             return { action: 'update_qty', data: { product, qty }, needsLLM: false };
        }
        return { action: 'quote', data: { product, qty }, needsLLM: false };
    }

    // --- שלב 2: פעולות פשוטות ---

    // ברכות
    if (ACTION_KEYWORDS.greeting.some(k => text.includes(k)) && text.length < 20 && !text.includes('?')) {
        return { action: 'greeting', data: {}, needsLLM: false };
    }

    // ניקוי
    if (ACTION_KEYWORDS.clear.some(k => text.includes(k))) {
        return { action: 'clear', data: {}, needsLLM: false };
    }

    // שליחה / סיום
    if (ACTION_KEYWORDS.send_quote.some(k => text.includes(k))) {
        return { action: 'send_quote', data: {}, needsLLM: false };
    }

    // סטטוס (רק אם לא נתפס למעלה ע"י טריגרים כמו "שחיטה")
    if (ACTION_KEYWORDS.status.some(k => text.includes(k))) {
        return { action: 'status', data: {}, needsLLM: false };
    }

    // עיצוב / בדיקת קבצים
    if ((text.includes('עיצוב') || text.includes('pdf') || text.includes('קובץ')) && 
        (text.includes('יש') || text.includes('מוכן') || text.includes('ממני') || text.includes('בדיקה'))) {
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