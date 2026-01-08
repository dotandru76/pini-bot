/**
 * Parameter Extractor V2 (Multi-Product & Bilingual)
 * ==================================================
 * מזהה רשימת מוצרים ומכניס אותם לתור.
 * תומך בעברית ואנגלית.
 */

const KEYWORD_MAP = {
    // כרטיסי ביקור
    'bc': 'bc', 'כרטיס': 'bc', 'כרטיסים': 'bc', 'ביקור': 'bc', 
    'business card': 'bc', 'cards': 'bc',
    
    // פליירים
    'flyer': 'flyer', 'פלייר': 'flyer', 'פליירים': 'flyer', 'עלון': 'flyer', 
    'flyers': 'flyer', 'leaflet': 'flyer',
    
    // הזמנות
    'invitation': 'invitation', 'הזמנה': 'invitation', 'הזמנות': 'invitation', 
    'invites': 'invitation', 'wedding': 'invitation', 'חתונה': 'invitation',
    
    // רולאפ
    'rollup': 'rollup', 'רולאפ': 'rollup', 'רול-אפ': 'rollup', 'roll-up': 'rollup', 
    'banner': 'rollup', 'באנר': 'rollup',
    
    // מעטפות
    'envelope': 'envelope', 'מעטפה': 'envelope', 'מעטפות': 'envelope',
    
    // פוסטרים
    'poster': 'poster', 'פוסטר': 'poster', 'פוסטרים': 'poster',
    
    // מדבקות
    'sticker': 'sticker', 'מדבקה': 'sticker', 'מדבקות': 'sticker', 
    'labels': 'sticker', 'vinyl': 'sticker',
    
    // חוברות
    'booklet': 'booklet', 'חוברת': 'booklet', 'חוברות': 'booklet', 
    'catalog': 'booklet', 'קטלוג': 'booklet'
};

const HEBREW_NUMBERS = {
    'אחד': 1, 'אחת': 1, 'שני': 2, 'שתי': 2, 'שניים': 2, 'שלושה': 3, 'שלוש': 3,
    'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5, 'שישה': 6, 'שש': 6,
    'שבעה': 7, 'שבע': 7, 'שמונה': 8, 'תשעה': 9, 'תשע': 9, 'עשרה': 10, 'עשר': 10,
    'אלף': 1000, 'אלפיים': 2000
};

function extractParameters(text) {
    let cleanText = text.toLowerCase().replace(/,/g, ''); 
    
    const result = {
        products: [], // רשימת מוצרים לטיפול (התור)
        qty: null,    // כמות גלובלית אם צוינה
        isReset: false
    };

    // 1. בדיקת מילות איפוס
    if (cleanText.includes('reset') || cleanText.includes('התחל') || cleanText.includes('תפריט')) {
        result.isReset = true;
        return result;
    }

    // 2. זיהוי מוצרים (תומך בריבוי מוצרים)
    const foundProducts = new Set();
    Object.keys(KEYWORD_MAP).forEach(keyword => {
        if (cleanText.includes(keyword)) {
            foundProducts.add(KEYWORD_MAP[keyword]);
        }
    });
    result.products = Array.from(foundProducts);

    // 3. חילוץ כמות (מספרים)
    const kMatch = cleanText.match(/(\d+)k/); // 5k = 5000
    if (kMatch) {
        result.qty = parseInt(kMatch[1]) * 1000;
    } else {
        const numMatch = cleanText.match(/\d+/);
        if (numMatch) {
            result.qty = parseInt(numMatch[0]);
        } else {
            // תמיכה במספרים במילים
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