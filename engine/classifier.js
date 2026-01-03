/**
 * Message Classifier - Pini Print Bot
 * ====================================
 * מסווג הודעות ללא LLM - חוסך 80% מהקריאות ל-Gemini
 * גרסה מתוקנת: הגנה מטלפונים, עדיפות לפעולות, תיקון באג "לוגו"
 */

// === מילות מפתח למוצרים ===
const PRODUCT_KEYWORDS = {
    // כרטיסי ביקור
    'כרטיס ביקור': 'bc',
    'כרטיסי ביקור': 'bc', 
    'כרטיסים': 'bc',
    'ביזנס קארד': 'bc',
    'business card': 'bc',
    
    // כרטיסי הושבה (place cards)
    'כרטיסי הושבה': 'place_card',
    'כרטיס הושבה': 'place_card',
    'הושבה': 'place_card',
    'place card': 'place_card',
    
    // פליירים
    'פלייר': 'flyer',
    'פליירים': 'flyer',
    'פלאייר': 'flyer',
    'פלאיירים': 'flyer',
    'עלון': 'flyer',
    'עלונים': 'flyer',
    'דף פרסום': 'flyer',
    'לחלוקה': 'flyer',
    'flyer': 'flyer',
    'flyers': 'flyer',
    
    // הזמנות
    'הזמנה': 'invitation',
    'הזמנות': 'invitation',
    'הזמנה לחתונה': 'invitation',
    'הזמנה לאירוע': 'invitation',
    'הזמנה לבר מצווה': 'invitation',
    'הזמנה לברית': 'invitation',
    'invitation': 'invitation',
    
    // רולאפ / באנרים
    'רולאפ': 'rollup',
    'רול אפ': 'rollup',
    'רולאפים': 'rollup',
    'באנר': 'rollup',
    'באנרים': 'rollup',
    'שמשונית': 'banner',
    'שמשוניות': 'banner',
    'roll up': 'rollup',
    'rollup': 'rollup',
    'banner': 'rollup',
    
    // קנבס
    'קנבס': 'canvas',
    'הדפסה על קנבס': 'canvas',
    'תמונה על קנבס': 'canvas',
    'canvas': 'canvas',
    
    // מדבקות
    'מדבקה': 'sticker',
    'מדבקות': 'sticker',
    'סטיקר': 'sticker',
    'סטיקרים': 'sticker',
    'sticker': 'sticker',
    'stickers': 'sticker',
    
    // חוברות
    'חוברת': 'booklet',
    'חוברות': 'booklet',
    'קטלוג': 'booklet',
    'קטלוגים': 'booklet',
    'ברושור': 'booklet',
    'booklet': 'booklet',
    'catalog': 'booklet',
    
    // פרוספקטים
    'פרוספקט': 'brochure',
    'פרוספקטים': 'brochure',
    'brochure': 'brochure',
    
    // פולדרים
    'פולדר': 'folder',
    'פולדרים': 'folder',
    'תיקייה': 'folder',
    'תיקיות': 'folder',
    'folder': 'folder',
    
    // פוסטרים
    'פוסטר': 'poster',
    'פוסטרים': 'poster',
    'כרזה': 'poster',
    'כרזות': 'poster',
    'poster': 'poster',
    
    // ניירת משרדית
    'נייר מכתבים': 'letterhead',
    'ניירת משרדית': 'letterhead',
    'דף לוגו': 'letterhead',
    'letterhead': 'letterhead',
    
    // מעטפות
    'מעטפה': 'envelope',
    'מעטפות': 'envelope',
    'envelope': 'envelope'
};

// === מילות פעולה ===
const ACTION_KEYWORDS = {
    remove: [
        'תמחק', 'מחק', 'תוריד', 'הורד', 'הסר', 'תסיר', 
        'תבטל', 'בטל', 'הוצא', 'תוציא', 'תוריד מהעגלה',
        'לא צריך', 'לא רוצה', 'בלי ה', 'לא רוצה את ה',
        'וותר', 'ויתור', 'תוותר', 'ויתרתי', 'לוותר',
        'עזוב', 'עזוב את'
    ],
    clear: [
        'נקה עגלה', 'רוקן עגלה', 'נקה הכל', 'מחק הכל',
        'התחל מחדש', 'התחלה מחדש', 'אפס עגלה', 'עגלה חדשה',
        'תרוקן', 'תנקה הכל', 'עזוב הכל', 'נתחיל מחדש',
        'תתחיל מחדש', 'מההתחלה', 'תאפס', 'עזוב הכל'
    ],
    update: [
        'שנה ל', 'תשנה ל', 'עדכן ל', 'תעדכן ל', 
        'במקום', 'תחליף ל', 'החלף ל',
        'תעלה ל', 'תוריד ל', 'תגדיל ל', 'תקטין ל',
        'תעלה את הכמות', 'תוריד את הכמות',
        'רק ל', 'בעצם'
    ],
    status: [
        'מה בעגלה', 'מה יש בעגלה', 'הצג עגלה', 'תראה עגלה',
        'סיכום', 'סה"כ', 'כמה יוצא', 'מה המחיר הכולל',
        'מה הזמנתי', 'מה ביקשתי', 'מה יש לי בעגלה',
        'הראה לי את העגלה', 'מה בהזמנה', 'מה יש בהזמנה',
        'כמה זה עולה', 'כמה עולה', 'מה המחיר', 'מה העלות',
        'מה המצב', 'דשבורד'
    ],
    design: [
        'עיצוב', 'קובץ', 'pdf', 'לוגו', 'תמונה',
        'יש לי קובץ', 'אין לי קובץ', 'צריך עיצוב',
        'מוכן להדפסה', 'איך שולחים קובץ', 'איך אני שולח'
    ],
    send_quote: [
        'שלח הצעת', 'שלח לי הצעה', 'שלח לי הצעת', 'שלח pdf', 'שלח לי pdf',
        'תשלח הצעת', 'תשלח לי הצעה', 'תשלח לי הצעת', 'תשלח pdf',
        'תייצר הצעה', 'תייצר הצעת', 'תייצר pdf', 
        'הצעת מחיר בבקשה', 'הצעה בבקשה',
        'אפשר הצעה', 'אפשר הצעת', 'תפיק הצעה', 'הפק הצעה',
        'תכין הצעה', 'תכין הצעת', 'תעשה הצעה', 'תעשה הצעת',
        'לשלוח הצעה', 'לייצר הצעה', 'שלח הצעה',
        'זהו תשלח', 'זהו שלח', 'סיימתי תשלח', 'סיימתי שלח',
        'שלח הזמנה', 'בצע הזמנה', 'סגור הזמנה', 'תארוז לי',
        'תזמין'
    ],
    greeting: [
        'שלום', 'היי', 'הי', 'אהלן', 'מה קורה', 'מה נשמע',
        'בוקר טוב', 'ערב טוב', 'צהריים טובים'
    ]
};

// === מילות חומרים ===
const MATERIAL_KEYWORDS = {
    // ניירות
    'כרומו': 'chromo',
    'מט': 'matte',
    'מבריק': 'gloss',
    'נטול עץ': 'offset',
    'ממוחזר': 'recycled',
    'פנינה': 'pearl',
    'טקסטורה': 'texture',
    'פשתן': 'texture',
    
    // פורמט רחב
    'ויניל': 'vinyl',
    'קנבס כותנה': 'canvas_cotton',
    'קנבס': 'canvas',
    'שמשונית': 'pvc_banner',
    'קאפה': 'kappa',
    
    // משקלים
    '135 גרם': '135',
    '170 גרם': '170',
    '250 גרם': '250',
    '300 גרם': '300',
    '350 גרם': '350'
};

// === מילות גימור ===
const FINISHING_KEYWORDS = {
    'למינציה': 'lamination',
    'למינציה מט': 'lami_matte',
    'למינציה מבריקה': 'lami_gloss',
    'למינציה משי': 'lami_silk',
    'מגע משי': 'lami_silk',
    'לכה סלקטיבית': 'scodix',
    'סקודיקס': 'scodix',
    'הבלטה': 'scodix',
    'פויל': 'foil',
    'הטבעה': 'foil',
    'זהב': 'foil_gold',
    'כסף': 'foil_silver',
    'פינות עגולות': 'round_corners',
    'קיפול': 'fold',
    'ביג': 'crease'
};

/**
 * פונקציה ראשית: סיווג הודעה
 * @param {string} message - הודעת המשתמש
 * @param {object} context - הקשר (עגלה נוכחית, היסטוריה, pendingProduct)
 * @returns {object} - תוצאת הסיווג
 */
function classifyMessage(message, context = {}) {
    const text = message.toLowerCase().trim();
    const cart = context.cart || [];
    const pendingProduct = context.pendingProduct || null;
    
    console.log(`\n🔍 [Classifier] Analyzing: "${message}"`);
    if (pendingProduct) {
        console.log(`   📌 Pending product: ${pendingProduct}`);
    }

    // === שלב 1: בדיקת פעולות מיוחדות (עדיפות עליונה) ===
    
    // 1. ניקוי עגלה
    if (matchesAny(text, ACTION_KEYWORDS.clear)) {
        console.log(`   ✅ Action: CLEAR CART`);
        return { action: 'clear', confidence: 0.95, needsLLM: false, data: {} };
    }
    
    // 2. בקשת שליחת הצעה/סגירת הזמנה (לפני שמזהים "הזמנה" כמוצר)
    if (matchesAny(text, ACTION_KEYWORDS.send_quote)) {
        console.log(`   ✅ Action: SEND QUOTE (PDF/Order)`);
        return { action: 'send_quote', confidence: 0.95, needsLLM: false, data: {} };
    }
    
    // 3. הסרת פריט
    if (matchesAny(text, ACTION_KEYWORDS.remove)) {
        const productToRemove = findProductInText(text, cart);
        console.log(`   ✅ Action: REMOVE - ${productToRemove || 'unknown'}`);
        return {
            action: 'remove',
            confidence: productToRemove ? 0.90 : 0.70,
            needsLLM: !productToRemove,
            data: { product: productToRemove, rawText: text }
        };
    }
    
    // 4. שאילתת סטטוס
    if (matchesAny(text, ACTION_KEYWORDS.status)) {
        console.log(`   ✅ Action: STATUS`);
        return { action: 'status', confidence: 0.95, needsLLM: false, data: {} };
    }
    
    // 5. בדיקת עיצוב (תיקון באג: מוודא שאין גימורים כמו "לכה" באותו משפט)
    const finishings = findFinishingInText(text);
    if (matchesAny(text, ACTION_KEYWORDS.design)) {
        // אם מצאנו גם גימורים במשפט (למשל "לכה על הלוגו"), זה לא בהכרח שאלה על קובץ
        if (finishings.length === 0) {
            console.log(`   ✅ Action: DESIGN CHECK`);
            return { action: 'design_check', confidence: 0.85, needsLLM: false, data: {} };
        }
    }

    // === שלב 2: ניתוח מוצרים וכמויות ===
    
    // חילוץ מספר (כמות) - כולל הגנה מטלפונים!
    const quantity = extractQuantity(text);
    
    // חילוץ מוצר (חדש עדיף על ישן)
    const explicitProduct = findProductInText(text, []); 
    const contextProduct = findProductInText(text, cart);
    const product = explicitProduct || contextProduct;
    
    // === שלב 3: החלטה על הפעולה ===
    
    // מקרה א': יש מספר אבל אין מוצר מפורש
    if (quantity && !explicitProduct) {
        if (pendingProduct) {
            console.log(`   ✅ Action: QUOTE (completing pending) - ${pendingProduct} × ${quantity}`);
            return {
                action: 'quote',
                confidence: 0.90,
                needsLLM: false,
                data: { product: pendingProduct, qty: quantity, fromPending: true }
            };
        }
        
        if (cart.length > 0) {
            const productToUpdate = contextProduct || cart[cart.length - 1]?.product_name;
            console.log(`   ✅ Action: UPDATE QTY - ${productToUpdate} → ${quantity}`);
            return {
                action: 'update_qty',
                confidence: 0.85,
                needsLLM: false,
                data: { product: productToUpdate, qty: quantity, inferred: true }
            };
        }
    }
    
    // מקרה ב': עדכון כמות מפורש ("שנה ל-500", "תעלה ל...")
    if (quantity && matchesAny(text, ACTION_KEYWORDS.update)) {
        const productToUpdate = product || (cart.length > 0 ? cart[cart.length - 1]?.product_name : null);
        console.log(`   ✅ Action: UPDATE QTY - ${productToUpdate} → ${quantity}`);
        return {
            action: 'update_qty',
            confidence: 0.90,
            needsLLM: false,
            data: { product: productToUpdate, qty: quantity }
        };
    }
    
    // מקרה ג': הצעת מחיר חדשה (יש מוצר וכמות)
    if (product && quantity) {
        const material = findMaterialInText(text);
        
        console.log(`   ✅ Action: QUOTE - ${product} × ${quantity}`);
        return {
            action: 'quote',
            confidence: 0.95,
            needsLLM: false,
            data: { product, qty: quantity, material, finishing: finishings }
        };
    }
    
    // מקרה ד': יש מוצר בלי כמות - נשאל
    if (product && !quantity) {
        console.log(`   ⚠️ Action: QUOTE (missing qty) - ${product}`);
        return {
            action: 'quote_incomplete',
            confidence: 0.80,
            needsLLM: false,
            data: { product, missing: 'qty' }
        };
    }
    
    // === שלב 4: בדיקות אחרונות ===
    
    // ברכה
    if (matchesAny(text, ACTION_KEYWORDS.greeting) && text.length < 20) {
        return { action: 'greeting', confidence: 0.90, needsLLM: false, data: {} };
    }
    
    // ברירת מחדל - LLM
    console.log(`   🤖 Action: CHAT (needs LLM)`);
    return {
        action: 'chat',
        confidence: 0.50,
        needsLLM: true,
        data: { detectedProduct: product, detectedQty: quantity }
    };
}

// === פונקציות עזר ===

function matchesAny(text, keywords) {
    return keywords.some(kw => text.includes(kw));
}

function extractQuantity(text) {
    // 1. הגנה: ניקוי מספרי טלפון (05X-XXXXXXX או רצפים ארוכים)
    let cleanText = text.replace(/05\d[- ]?\d{7}/g, ''); // מסיר 05X-XXXXXXX
    cleanText = cleanText.replace(/05\d{8}/g, '');       // מסיר 05XXXXXXXX
    cleanText = cleanText.replace(/\+972\d+/g, '');      // מסיר +972...

    // 2. מילים למספרים בעברית
    const hebrewNumbers = {
        'אחד': 1, 'אחת': 1, 'יחיד': 1, 'יחידה': 1,
        'שניים': 2, 'שתיים': 2, 'שני': 2, 'זוג': 2,
        'שלושה': 3, 'שלוש': 3,
        'ארבעה': 4, 'ארבע': 4,
        'חמישה': 5, 'חמש': 5,
        'עשר': 10, 'עשרה': 10,
        'עשרים': 20, 'חמישים': 50,
        'מאה': 100, 'מאתיים': 200, 'חמש מאות': 500, 'אלף': 1000
    };
    
    const excludePatterns = [/מחשבה שנייה/, /פעם שנייה/, /שנייה אחת/, /רגע שני/];
    for (const pattern of excludePatterns) {
        if (pattern.test(cleanText)) {
            cleanText = cleanText.replace(pattern, '');
        }
    }
    
    for (const [word, num] of Object.entries(hebrewNumbers)) {
        const regex = new RegExp(`(^|\\s)${word}(\\s|$)`);
        if (regex.test(cleanText)) return num;
    }
    
    const patterns = [
        /(\d{1,3}(?:,\d{3})+)/, 
        /(\d+)\s*(?:יחידות|יח'|יח|פריטים|עותקים|קלפים)/,
        /(\d+)\s*(?:כרטיס|פלייר|עלון|הזמנ|מדבק|חוברו|פוסטר|רולאפ|באנר)/,
        /(?:כמות|qty|כמות של)\s*:?\s*(\d+)/i,
        /ל[- ]?(\d+)/,
        /^(\d+)$/,
        /(\d+)/
    ];
    
    for (const pattern of patterns) {
        const match = cleanText.match(pattern);
        if (match) {
            const num = parseInt(match[1].replace(/,/g, ''));
            if (num >= 1 && num <= 100000000) return num;
        }
    }
    
    return null;
}

function findProductInText(text, cart = []) {
    const lowerText = text.toLowerCase();
    
    if (cart && cart.length > 0) {
        for (const item of cart) {
            const itemName = item.product_name?.toLowerCase() || '';
            if (lowerText.includes(itemName) || 
                lowerText.includes(itemName.replace(/ים$/, '')) || 
                lowerText.includes(itemName.replace(/ות$/, 'ה'))) { 
                return item.product_name;
            }
        }
    }
    
    const sortedKeywords = Object.keys(PRODUCT_KEYWORDS)
        .sort((a, b) => b.length - a.length);
    
    for (const keyword of sortedKeywords) {
        if (lowerText.includes(keyword)) {
            return PRODUCT_KEYWORDS[keyword];
        }
    }
    
    return null;
}

function findMaterialInText(text) {
    const lowerText = text.toLowerCase();
    for (const [keyword, value] of Object.entries(MATERIAL_KEYWORDS)) {
        if (lowerText.includes(keyword)) return value;
    }
    return null;
}

function findFinishingInText(text) {
    const lowerText = text.toLowerCase();
    const found = [];
    for (const [keyword, value] of Object.entries(FINISHING_KEYWORDS)) {
        if (lowerText.includes(keyword)) found.push(value);
    }
    return found;
}

function getProductHebrewName(productKey) {
    const names = {
        'bc': 'כרטיסי ביקור', 'flyer': 'פליירים', 'invitation': 'הזמנות',
        'rollup': 'רולאפ', 'banner': 'שמשונית', 'canvas': 'קנבס',
        'sticker': 'מדבקות', 'booklet': 'חוברת', 'brochure': 'פרוספקט',
        'folder': 'פולדר', 'poster': 'פוסטר',
        'letterhead': 'נייר מכתבים', 'envelope': 'מעטפות'
    };
    return names[productKey] || productKey;
}

module.exports = {
    classifyMessage,
    extractQuantity,
    findProductInText,
    findMaterialInText,
    findFinishingInText,
    getProductHebrewName,
    PRODUCT_KEYWORDS,
    MATERIAL_KEYWORDS,
    FINISHING_KEYWORDS
};