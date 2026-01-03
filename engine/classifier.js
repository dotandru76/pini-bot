/**
 * Message Classifier - Pini Print Bot
 * ====================================
 * מסווג הודעות ללא LLM - חוסך 80% מהקריאות ל-Gemini
 * גרסה מתוקנת V3.8: כולל סינון מידות, A4 והגנה מפני עדכונים יתומים
 */

// === מילות מפתח למוצרים ===
const PRODUCT_KEYWORDS = {
    // כרטיסי ביקור
    'כרטיס ביקור': 'bc', 'כרטיסי ביקור': 'bc', 'כרטיסים': 'bc', 
    'ביזנס קארד': 'bc', 'business card': 'bc', 'business cards': 'bc',
    
    // כרטיסי הושבה
    'כרטיסי הושבה': 'place_card', 'כרטיס הושבה': 'place_card', 
    'הושבה': 'place_card', 'place card': 'place_card',
    
    // פליירים
    'פלייר': 'flyer', 'פליירים': 'flyer', 'פלאייר': 'flyer', 
    'פלאיירים': 'flyer', 'עלון': 'flyer', 'עלונים': 'flyer', 
    'flyer': 'flyer', 'flyers': 'flyer',
    
    // הזמנות
    'הזמנה': 'invitation', 'הזמנות': 'invitation', 
    'הזמנה לחתונה': 'invitation', 'invitation': 'invitation',
    
    // רולאפ / באנרים
    'רולאפ': 'rollup', 'רול אפ': 'rollup', 'רולאפים': 'rollup', 
    'באנר': 'rollup', 'באנרים': 'rollup', 'roll up': 'rollup',
    
    // קנבס
    'קנבס': 'canvas', 'הדפסה על קנבס': 'canvas', 
    'תמונה על קנבס': 'canvas', 'canvas': 'canvas',
    
    // מדבקות
    'מדבקה': 'sticker', 'מדבקות': 'sticker', 
    'סטיקר': 'sticker', 'סטיקרים': 'sticker',
    
    // חוברות
    'חוברת': 'booklet', 'חוברות': 'booklet', 
    'קטלוג': 'booklet', 'booklet': 'booklet',
    
    // פולדרים
    'פולדר': 'folder', 'פולדרים': 'folder', 'folder': 'folder',
    
    // פוסטרים
    'פוסטר': 'poster', 'פוסטרים': 'poster', 'poster': 'poster',
    
    // ניירת ומעטפות
    'נייר מכתבים': 'letterhead', 
    'מעטפה': 'envelope', 'מעטפות': 'envelope'
};

// === מילות פעולה (מורחב לכיסוי מלא) ===
const ACTION_KEYWORDS = {
    remove: [
        'תמחק', 'מחק', 'תוריד', 'הורד', 'הסר', 'תסיר', 
        'תבטל', 'בטל', 'הוצא', 'וותר', 'עזוב', 'לא צריך'
    ],
    clear: [
        'נקה עגלה', 'רוקן עגלה', 'נקה הכל', 'מחק הכל', 
        'התחל מחדש', 'אפס עגלה', 'תאפס', 'עזוב הכל', 'הכל מחדש'
    ],
    update: [
        'שנה ל', 'תשנה ל', 'עדכן', 'במקום', 'תחליף', 
        'תעלה ל', 'תוריד ל', 'רק ל', 'בעצם'
    ],
    status: [
        'מה בעגלה', 'סיכום', 'סה"כ', 'כמה יוצא', 'מה המחיר', 
        'מה המצב', 'דשבורד', 'סטטוס', 'כמה זה עולה', 'כמה עולה',
        'מה יש לי', 'מה יש בעגלה', 'תראה לי'
    ],
    design: [
        'עיצוב', 'קובץ', 'pdf', 'לוגו', 'תמונה', 
        'מוכן להדפסה', 'איך שולחים', 'יש לי קובץ'
    ],
    send_quote: [
        'שלח הצעת', 'שלח לי הצעה', 'שלח pdf', 'תייצר הצעה', 
        'הצעת מחיר', 'אפשר הצעה', 'זהו תשלח', 'סיימתי תשלח', 
        'שלח הזמנה', 'תארוז לי', 'תזמין', 'שלח הצעה', 
        'תשלח הצעה', 'תשלח לי'
    ],
    greeting: [
        'שלום', 'היי', 'הי', 'אהלן', 'מה קורה', 
        'מה נשמע', 'בוקר טוב', 'ערב טוב', 'hi', 'hello'
    ]
};

const MATERIAL_KEYWORDS = {
    'כרומו': 'chromo', 'מט': 'matte', 'מבריק': 'gloss', 
    'נטול עץ': 'offset', 'ממוחזר': 'recycled', 'פנינה': 'pearl', 
    'טקסטורה': 'texture', 'ויניל': 'vinyl', 'קנבס': 'canvas', 
    'שמשונית': 'pvc_banner', 'קאפה': 'kappa',
    '135 גרם': '135', '170 גרם': '170', '250 גרם': '250', 
    '300 גרם': '300', '350 גרם': '350'
};

const FINISHING_KEYWORDS = {
    'למינציה': 'lamination', 'למינציה מט': 'lami_matte', 
    'למינציה מבריקה': 'lami_gloss', 'סקודיקס': 'scodix', 
    'הבלטה': 'scodix', 'פויל': 'foil', 'הטבעה': 'foil', 
    'פינות עגולות': 'round_corners', 'קיפול': 'fold', 'ביג': 'crease'
};

/**
 * פונקציה ראשית: סיווג הודעה
 */
function classifyMessage(message, context = {}) {
    const text = message.toLowerCase().trim();
    const cart = context.cart || [];
    const pendingProduct = context.pendingProduct || null;
    
    console.log(`\n🔍 [Classifier] Analyzing: "${message}"`);

    // === 🛡️ שסתום ביטחון חכם (Smart Safety Valve) ===
    
    // 1. בדיקת ריבוי מוצרים (תמיד מסובך -> LLM)
    const distinctProducts = countUniqueProducts(text);
    if (distinctProducts.length > 1) {
        console.log(`   🤖 Complex request (multiple products) -> LLM`);
        return { action: 'chat', confidence: 0.8, needsLLM: true, data: {} };
    }

    // 2. בדיקת תיקון עצמי ("בעצם") - רק אם המשפט ארוך!
    const isCorrection = text.includes('בעצם') || text.includes('לא משנה') || text.includes('עזוב');
    if (isCorrection && extractQuantity(text) && text.length > 30) {
        console.log(`   🤖 Complex request (long correction) -> LLM`);
        return { action: 'chat', confidence: 0.8, needsLLM: true, data: {} };
    }

    // === זיהוי ישויות (מוצר וכמות) ===
    const quantity = extractQuantity(text);
    const explicitProduct = findProductInText(text, []); 
    const contextProduct = findProductInText(text, cart);
    const product = explicitProduct || contextProduct;

    // === לוגיקה עסקית (לפי סדר חשיבות) ===

    // 1. ניקוי
    if (matchesAny(text, ACTION_KEYWORDS.clear)) {
        console.log(`   ✅ Action: CLEAR CART`);
        return { action: 'clear', confidence: 0.95, needsLLM: false, data: {} };
    }
    
    // 2. בדיקת סגירה: רק אם אין כמות ומוצר באותו משפט (כדי לא לפספס "תעשה 100 ותשלח")
    if (matchesAny(text, ACTION_KEYWORDS.send_quote)) {
        if (!quantity || !explicitProduct) {
            console.log(`   ✅ Action: SEND QUOTE`);
            return { action: 'send_quote', confidence: 0.95, needsLLM: false, data: {} };
        }
    }
    
    // 3. הסרה
    if (matchesAny(text, ACTION_KEYWORDS.remove)) {
        // אם יש מספרים במשפט הסרה - חשוד כמורכב -> LLM
        if (extractQuantity(text)) return { action: 'chat', needsLLM: true, confidence: 0.7, data: {} };

        const productToRemove = findProductInText(text, cart);
        console.log(`   ✅ Action: REMOVE - ${productToRemove || 'unknown'}`);
        return { action: 'remove', confidence: productToRemove ? 0.9 : 0.7, needsLLM: !productToRemove, data: { product: productToRemove } };
    }
    
    // 4. סטטוס
    if (matchesAny(text, ACTION_KEYWORDS.status)) {
        console.log(`   ✅ Action: STATUS`);
        return { action: 'status', confidence: 0.95, needsLLM: false, data: {} };
    }
    
    // 5. בדיקת עיצוב (עם הגנה מפני גימורים כמו "לוגו עם לכה")
    const finishings = findFinishingInText(text);
    if (matchesAny(text, ACTION_KEYWORDS.design) && finishings.length === 0) {
        console.log(`   ✅ Action: DESIGN CHECK`);
        return { action: 'design_check', confidence: 0.85, needsLLM: false, data: {} };
    }

    // 6. זיהוי שאלות טכניות (אם אין כמות)
    const isQuestion = text.includes('?') || 
                       matchesAny(text, ['למה', 'איך', 'האם', 'תגיד', 'מתי', 'אפשר', 'מה ההבדל']);
                       
    if (isQuestion && !quantity) {
        console.log(`   🤖 Technical question detected -> LLM`);
        return { action: 'chat', confidence: 0.8, needsLLM: true, data: {} };
    }

    // === קבלת החלטות לפי מוצר וכמות ===
    
    // A. עדכון כמות / הוספה
    if (quantity) {
        // אם יש מוצר מפורש - זו הוספה/הצעה (אלא אם זה עדכון מובהק)
        if (explicitProduct && !matchesAny(text, ACTION_KEYWORDS.update)) {
             const material = findMaterialInText(text);
             console.log(`   ✅ Action: QUOTE - ${explicitProduct} × ${quantity}`);
             return { action: 'quote', confidence: 0.95, needsLLM: false, data: { product: explicitProduct, qty: quantity, material, finishing: finishings } };
        }

        // אחרת זה עדכון (או השלמה מ-Pending)
        if (pendingProduct) {
            console.log(`   ✅ Action: QUOTE (pending) - ${pendingProduct}`);
            return { action: 'quote', confidence: 0.90, needsLLM: false, data: { product: pendingProduct, qty: quantity, fromPending: true } };
        }

        // === תיקון הגנה מפני עדכון "יתום" ===
        // אם אין מוצר מפורש, ואין עגלה לעדכן, ואין הקשר - זה כנראה סתם מספרים
        if (cart.length === 0 && !contextProduct) {
             console.log(`   🤖 Orphan quantity detected (no product context) -> LLM`);
             return { action: 'chat', confidence: 0.6, needsLLM: true, data: {} };
        }

        // עדכון פריט קיים
        const productToUpdate = contextProduct || (cart.length > 0 ? cart[cart.length - 1]?.product_name : null);
        console.log(`   ✅ Action: UPDATE QTY - ${productToUpdate} → ${quantity}`);
        return { action: 'update_qty', confidence: 0.90, needsLLM: false, data: { product: productToUpdate, qty: quantity } };
    }
    
    // B. מוצר ללא כמות (ויש מוצר מפורש)
    if (product && !quantity) {
        console.log(`   ⚠️ Action: QUOTE (missing qty) - ${product}`);
        return { action: 'quote_incomplete', confidence: 0.80, needsLLM: false, data: { product, missing: 'qty' } };
    }
    
    // 7. ברכה (רק אם קצר)
    if (matchesAny(text, ACTION_KEYWORDS.greeting) && text.length < 20) {
        return { action: 'greeting', confidence: 0.90, needsLLM: false, data: {} };
    }
    
    // 8. ברירת מחדל -> LLM
    console.log(`   🤖 Action: CHAT (needs LLM)`);
    return { action: 'chat', confidence: 0.50, needsLLM: true, data: { detectedProduct: product, detectedQty: quantity } };
}

// === פונקציות עזר ===

function matchesAny(text, keywords) {
    return keywords.some(kw => text.includes(kw));
}

function countUniqueProducts(text) {
    const found = new Set();
    const lowerText = text.toLowerCase();
    for (const [keyword, key] of Object.entries(PRODUCT_KEYWORDS)) {
        if (lowerText.includes(keyword)) found.add(key);
    }
    return Array.from(found);
}

function extractQuantity(text) {
    // 1. ניקוי טלפונים אגרסיבי
    let cleanText = text.replace(/05\d[- ]?\d{7}/g, '').replace(/05\d{8}/g, '').replace(/\+972\d+/g, '');
    
    // === תיקון חדש: ניקוי מידות, גדלי נייר ומשקלים ===
    // מסיר: "170 גרם", "85 סמ", "200 מטר", "A4", "A5", "B2"
    cleanText = cleanText.replace(/\b\d+\s*(?:גרם|גר'|g|gr|ס"מ|סמ|cm|mm|מטר|m)\b/gi, ''); 
    cleanText = cleanText.replace(/\b[a-zA-Z][2-6]\b/g, ''); // מסיר A3, A4, A5, B2
    // ==========================================================
    
    // 2. ניקוי ביטויים מטעים
    const excludePatterns = [/מחשבה שנייה/, /פעם שנייה/, /שנייה אחת/, /רגע שני/];
    for (const pattern of excludePatterns) cleanText = cleanText.replace(pattern, '');
    
    const hebrewNumbers = {
        'אחד': 1, 'אחת': 1, 'יחיד': 1, 'שניים': 2, 'שתיים': 2, 'שני': 2, 'זוג': 2,
        'שלושה': 3, 'שלוש': 3, 'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5,
        'עשר': 10, 'עשרה': 10, 'עשרים': 20, 'חמישים': 50, 'מאה': 100, 'אלף': 1000
    };
    
    // בדיקה מדויקת יותר למספרים בעברית (Boundaries)
    for (const [word, num] of Object.entries(hebrewNumbers)) {
        if (new RegExp(`(^|\\s)${word}($|\\s|-)`).test(cleanText)) return num;
    }
    
    const patterns = [
        /(\d{1,3}(?:,\d{3})+)/, 
        /(\d+)\s*(?:יחידות|יח'|פריטים)/,
        /(\d+)\s*(?:כרטיס|פלייר|הזמנ|רולאפ)/,
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
    // בדיקה בעגלה קודם (Context)
    if (cart && cart.length > 0) {
        for (const item of cart) {
            const itemName = item.product_name?.toLowerCase() || '';
            if (lowerText.includes(itemName) || lowerText.includes(itemName.replace(/ים$/, ''))) return item.product_name;
        }
    }
    // בדיקה כללית
    const sortedKeywords = Object.keys(PRODUCT_KEYWORDS).sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeywords) {
        if (lowerText.includes(keyword)) return PRODUCT_KEYWORDS[keyword];
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

function getProductHebrewName(key) { return key; }

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