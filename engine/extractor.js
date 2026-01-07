/**
 * Parameter Extractor
 * ===================
 * מחלץ נתונים מובנים מטקסט חופשי ללא שימוש ב-AI.
 * תומך במספרים, כמויות (k), ומוצרים.
 */

const { PRODUCT_MAP } = require('./calculation');

const HEBREW_NUMBERS = {
    'אחד': 1, 'אחת': 1, 'שני': 2, 'שתי': 2, 'שניים': 2, 'שלושה': 3, 'שלוש': 3,
    'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5, 'שישה': 6, 'שש': 6,
    'שבעה': 7, 'שבע': 7, 'שמונה': 8, 'תשעה': 9, 'תשע': 9, 'עשרה': 10, 'עשר': 10,
    'עשרים': 20, 'חמישים': 50, 'מאה': 100, 'מאתיים': 200, 'חמש מאות': 500,
    'אלף': 1000, 'אלפיים': 2000, 'חמשת אלפים': 5000, 'עשרת אלפים': 10000
};

const MODIFIERS = {
    'דחוף': { urgency: 'high' },
    'מהר': { urgency: 'high' },
    'היום': { urgency: 'high' },
    'מחר': { urgency: 'high' },
    'אקספרס': { urgency: 'high' },
    'עכשיו': { urgency: 'high' },
    'זול': { budget: 'low' },
    'הכי טוב': { quality: 'high' },
    'פרימיום': { quality: 'high' }
};

function extractParameters(text) {
    let cleanText = text.toLowerCase().replace(/,/g, ''); // הסרת פסיקים (1,000 -> 1000)
    const params = {
        product: null,
        qty: null,
        attributes: {}
    };

    // 1. חילוץ מוצר
    for (const [keyword, category] of Object.entries(PRODUCT_MAP)) {
        if (cleanText.includes(keyword)) {
            params.product = category;
            break; // מספיק מוצר אחד למשפט פשוט
        }
    }

    // 2. חילוץ כמות (מספרים)
    // תמיכה ב-k (1k = 1000)
    const kMatch = cleanText.match(/(\d+)k/);
    if (kMatch) {
        params.qty = parseInt(kMatch[1]) * 1000;
    } else {
        // מספר רגיל
        const numMatch = cleanText.match(/\d+/);
        if (numMatch) {
            params.qty = parseInt(numMatch[0]);
        } else {
            // מספר במילים
            for (const [word, val] of Object.entries(HEBREW_NUMBERS)) {
                if (cleanText.includes(word)) {
                    params.qty = val;
                    break;
                }
            }
        }
    }

    // 3. חילוץ תכונות נוספות (דחיפות, איכות)
    for (const [word, attr] of Object.entries(MODIFIERS)) {
        if (cleanText.includes(word)) {
            Object.assign(params.attributes, attr);
        }
    }

    return params;
}

module.exports = { extractParameters };