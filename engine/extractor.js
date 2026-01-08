/** engine/extractor.js - With Remove Logic */
const KEYWORD_MAP = {
    'bc': 'bc', 'כרטיס': 'bc', 'כרטיסים': 'bc', 'ביקור': 'bc',
    'flyer': 'flyer', 'פלייר': 'flyer', 'פליירים': 'flyer', 'עלון': 'flyer',
    'booklet': 'booklet', 'חוברת': 'booklet', 'חוברות': 'booklet', 'ספר': 'booklet', 'ספרים': 'booklet', 'קטלוג': 'booklet',
    'invitation': 'invitation', 'הזמנה': 'invitation', 'הזמנות': 'invitation', 'חתונה': 'invitation',
    'rollup': 'rollup', 'רולאפ': 'rollup', 'באנר': 'rollup',
    'poster': 'poster', 'פוסטר': 'poster', 'קנבס': 'poster',
    'sticker': 'sticker', 'מדבקה': 'sticker', 'מדבקות': 'sticker',
    'envelope': 'envelope', 'מעטפה': 'envelope', 'מעטפות': 'envelope',
    'folder': 'folder', 'פולדר': 'folder'
};

const HEBREW_NUMBERS = {
    'אחד': 1, 'אחת': 1, 'שני': 2, 'שתי': 2, 'שלוש': 3, 'שלושה': 3,
    'ארבע': 4, 'ארבעה': 4, 'חמש': 5, 'חמישה': 5, 'שש': 6, 'שישה': 6,
    'שבע': 7, 'שמונה': 8, 'תשע': 9, 'עשר': 10, 'מאה': 100, 'אלף': 1000
};

function extractParameters(text) {
    let cleanText = text.toLowerCase().replace(/,/g, '');
    
    const result = {
        products: [],
        qty: null,
        isReset: false,
        isRemove: false, // <--- חדש
        targetIndex: null, // <--- חדש
        isCartStatus: false,
        raw_text: text
    };

    // 1. זיהוי מחיקה ספציפית
    const removeKeywords = ['מחק', 'הסר', 'בטל', 'להוריד', 'תוריד'];
    if (removeKeywords.some(w => cleanText.includes(w))) {
        result.isRemove = true;
        // ננסה למצוא מספר (למשל: "מחק את 1")
        const numMatch = cleanText.match(/(\d+)/);
        if (numMatch) result.targetIndex = parseInt(numMatch[0]);
        // אם אין מספר, ננסה למצוא שם מוצר למטה...
    }

    // 2. זיהוי איפוס מלא
    const resetKeywords = ['reset', 'התחל', 'תפריט', 'נקה הכל', 'איפוס', 'יציאה'];
    if (resetKeywords.some(word => cleanText.includes(word)) && !result.isRemove) {
        result.isReset = true;
        return result;
    }

    // 3. זיהוי עגלה
    if (cleanText.includes('cart') || cleanText.includes('עגלה') || cleanText.includes('סיכום') || cleanText.includes('סטטוס')) {
        result.isCartStatus = true;
        return result;
    }

    // 4. זיהוי מוצרים
    const foundProducts = new Set();
    Object.keys(KEYWORD_MAP).forEach(keyword => {
        if (cleanText.includes(keyword)) {
            foundProducts.add(KEYWORD_MAP[keyword]);
        }
    });
    result.products = Array.from(foundProducts);

    // 5. זיהוי כמות
    const kMatch = cleanText.match(/(\d+)k/);
    if (kMatch) {
        result.qty = parseInt(kMatch[1]) * 1000;
    } else {
        const numMatch = cleanText.match(/\d+/);
        if (numMatch) {
            // אם זה לא מחיקה, ניקח את המספר ככמות
            if (!result.isRemove) result.qty = parseInt(numMatch[0]);
        } else {
            for (const [word, val] of Object.entries(HEBREW_NUMBERS)) {
                if (cleanText.includes(word)) {
                    result.qty = val;
                    break;
                }
            }
        }
    }

    return result;
}

module.exports = { extractParameters };