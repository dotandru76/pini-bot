/** Parameter Extractor V6 (With Raw Text) */
const KEYWORD_MAP = {
    'bc': 'bc', 'כרטיס': 'bc', 'כרטיסים': 'bc', 'ביקור': 'bc',
    'flyer': 'flyer', 'פלייר': 'flyer', 'פליירים': 'flyer', 'עלון': 'flyer',
    'booklet': 'booklet', 'חוברת': 'booklet', 'חוברות': 'booklet', 'ספר': 'booklet', 'ספרים': 'booklet', 'קטלוג': 'booklet',
    'invitation': 'invitation', 'הזמנה': 'invitation', 'הזמנות': 'invitation', 'חתונה': 'invitation',
    'rollup': 'rollup', 'רולאפ': 'rollup', 'רול': 'rollup', 'באנר': 'rollup',
    'poster': 'poster', 'פוסטר': 'poster', 'קנבס': 'poster', 'canvas': 'poster',
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
        isCartStatus: false,
        raw_text: text // <--- התיקון הקריטי: העברת הטקסט המקורי
    };

    // בדיקות מיוחדות
    if (cleanText.includes('reset') || cleanText.includes('התחל') || cleanText.includes('תפריט') || cleanText.includes('נקה')) {
        result.isReset = true;
        return result;
    }

    if (cleanText.includes('cart') || cleanText.includes('עגלה') || cleanText.includes('סיכום') || cleanText.includes('סטטוס')) {
        result.isCartStatus = true;
        return result;
    }

    // זיהוי מוצרים
    const foundProducts = new Set();
    Object.keys(KEYWORD_MAP).forEach(keyword => {
        if (cleanText.includes(keyword)) {
            foundProducts.add(KEYWORD_MAP[keyword]);
        }
    });
    result.products = Array.from(foundProducts);

    // זיהוי כמות (שיפור קטן: מתעלמים ממספרים בתוך מילים כמו A5, 300gr אם אפשר, אבל ה-Planner יעשה את התיקון האמיתי)
    const kMatch = cleanText.match(/(\d+)k/);
    if (kMatch) {
        result.qty = parseInt(kMatch[1]) * 1000;
    } else {
        const numMatch = cleanText.match(/\d+/);
        if (numMatch) {
            result.qty = parseInt(numMatch[0]);
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