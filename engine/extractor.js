/** Parameter Extractor V5 (Expanded Product List) */
const KEYWORD_MAP = {
    // כרטיסים
    'bc': 'bc', 'כרטיס': 'bc', 'כרטיסים': 'bc', 'ביקור': 'bc',
    
    // פליירים
    'flyer': 'flyer', 'פלייר': 'flyer', 'פליירים': 'flyer', 'עלון': 'flyer',
    
    // ספרים וחוברות
    'booklet': 'booklet', 'חוברת': 'booklet', 'חוברות': 'booklet', 
    'ספר': 'booklet', 'ספרים': 'booklet', 'קטלוג': 'booklet', 'מחברת': 'booklet',
    
    // הזמנות
    'invitation': 'invitation', 'הזמנה': 'invitation', 'הזמנות': 'invitation', 
    'חתונה': 'invitation', 'בר מצווה': 'invitation',
    
    // רולאפ
    'rollup': 'rollup', 'רולאפ': 'rollup', 'רול': 'rollup', 'באנר': 'rollup',
    
    // פוסטרים וקנבס
    'poster': 'poster', 'פוסטר': 'poster', 'תמונה': 'poster', 
    'קנבס': 'poster', 'canvas': 'poster', 'הגדלה': 'poster',
    
    // מדבקות
    'sticker': 'sticker', 'מדבקה': 'sticker', 'מדבקות': 'sticker', 'סטיקר': 'sticker',
    
    // מעטפות
    'envelope': 'envelope', 'מעטפה': 'envelope', 'מעטפות': 'envelope',
    
    // פולדרים
    'folder': 'folder', 'פולדר': 'folder', 'תיקייה': 'folder'
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
        isCartStatus: false
    };

    if (cleanText.includes('reset') || cleanText.includes('התחל') || cleanText.includes('תפריט') || cleanText.includes('נקה')) {
        result.isReset = true;
        return result;
    }

    if (cleanText.includes('cart') || cleanText.includes('עגלה') || cleanText.includes('סיכום') || cleanText.includes('סטטוס')) {
        result.isCartStatus = true;
        return result;
    }

    const foundProducts = new Set();
    Object.keys(KEYWORD_MAP).forEach(keyword => {
        if (cleanText.includes(keyword)) {
            foundProducts.add(KEYWORD_MAP[keyword]);
        }
    });
    result.products = Array.from(foundProducts);

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