/**
 * Message Classifier - Pini Print Bot
 * ====================================
 * מסווג הודעות ללא LLM - חוסך 80% מהקריאות ל-Gemini
 * 
 * Actions:
 *   - quote: בקשה להצעת מחיר (יש מוצר + כמות)
 *   - update_qty: שינוי כמות (יש מספר + הקשר לעגלה)
 *   - remove: הסרת פריט
 *   - clear: ניקוי עגלה
 *   - status: שאלה על מצב העגלה
 *   - design_check: שאלה לגבי עיצוב
 *   - chat: שיחה חופשית (צריך LLM)
 */

// === מילות מפתח למוצרים ===
const PRODUCT_KEYWORDS = {
    // כרטיסי ביקור
    'כרטיס ביקור': 'bc',
    'כרטיסי ביקור': 'bc', 
    'כרטיסים': 'bc',
    'ביזנס קארד': 'bc',
    'business card': 'bc',
    
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
        'לא צריך', 'לא רוצה', 'בלי ה', 'לא רוצה את ה'
    ],
    clear: [
        'נקה עגלה', 'רוקן עגלה', 'נקה הכל', 'מחק הכל',
        'התחל מחדש', 'התחלה מחדש', 'אפס עגלה', 'עגלה חדשה',
        'תרוקן', 'תנקה הכל', 'עזוב הכל', 'נתחיל מחדש',
        'תתחיל מחדש', 'מההתחלה', 'תאפס'
    ],
    update: [
        'שנה ל', 'תשנה ל', 'עדכן ל', 'תעדכן ל', 
        'במקום', 'תחליף ל', 'החלף ל',
        'תעלה ל', 'תוריד ל', 'תגדיל ל', 'תקטין ל',
        'תעלה את הכמות', 'תוריד את הכמות'
    ],
    status: [
        'מה בעגלה', 'מה יש בעגלה', 'הצג עגלה', 'תראה עגלה',
        'סיכום', 'סה"כ', 'כמה יוצא', 'מה המחיר הכולל',
        'מה הזמנתי', 'מה ביקשתי', 'מה יש לי בעגלה',
        'הראה לי את העגלה', 'מה בהזמנה', 'מה יש בהזמנה'
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
        'לשלוח הצעה', 'לייצר הצעה'
    ],
    greeting: [
        'שלום', 'היי', 'הי', 'אהלן', 'מה קורה', 'מה נשמע',
        'בוקר טוב', 'ערב טוב', 'צהריים טובים'
    ]
};

// === מילות חומרים (לזיהוי בהקשר) ===
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
 * @param {object} context - הקשר (עגלה נוכחית, היסטוריה)
 * @returns {object} - תוצאת הסיווג
 */
function classifyMessage(message, context = {}) {
    const text = message.toLowerCase().trim();
    const cart = context.cart || [];
    
    console.log(`\n🔍 [Classifier] Analyzing: "${message}"`);
    
    // === שלב 1: בדיקת פעולות מיוחדות ===
    
    // ניקוי עגלה
    if (matchesAny(text, ACTION_KEYWORDS.clear)) {
        console.log(`   ✅ Action: CLEAR CART`);
        return {
            action: 'clear',
            confidence: 0.95,
            needsLLM: false,
            data: {}
        };
    }
    
    // הסרת פריט
    const removeMatch = matchesAny(text, ACTION_KEYWORDS.remove);
    if (removeMatch) {
        const productToRemove = findProductInText(text, cart);
        console.log(`   ✅ Action: REMOVE - ${productToRemove || 'unknown'}`);
        return {
            action: 'remove',
            confidence: productToRemove ? 0.90 : 0.70,
            needsLLM: !productToRemove, // אם לא מצאנו מוצר ספציפי, נשאל את ה-LLM
            data: { 
                product: productToRemove,
                rawText: text
            }
        };
    }
    
    // שאילתת סטטוס
    if (matchesAny(text, ACTION_KEYWORDS.status)) {
        console.log(`   ✅ Action: STATUS`);
        return {
            action: 'status',
            confidence: 0.95,
            needsLLM: false,
            data: {}
        };
    }
    
    // === שלב 2: בדיקת בקשת הצעת מחיר ===
    
    // חילוץ מספר (כמות)
    const quantity = extractQuantity(text);
    
    // חילוץ מוצר
    const product = findProductInText(text);
    
    // עדכון כמות (יש מספר, אין מוצר חדש, יש עגלה)
    if (quantity && !product && cart.length > 0 && matchesAny(text, ACTION_KEYWORDS.update)) {
        // מנסה להבין איזה מוצר לעדכן
        const productToUpdate = findProductInText(text, cart) || cart[cart.length - 1]?.product_name;
        console.log(`   ✅ Action: UPDATE QTY - ${productToUpdate} → ${quantity}`);
        return {
            action: 'update_qty',
            confidence: 0.85,
            needsLLM: false,
            data: {
                product: productToUpdate,
                qty: quantity
            }
        };
    }
    
    // הצעת מחיר חדשה (יש מוצר וכמות)
    if (product && quantity) {
        const material = findMaterialInText(text);
        const finishing = findFinishingInText(text);
        
        console.log(`   ✅ Action: QUOTE - ${product} × ${quantity}`);
        if (material) console.log(`      Material: ${material}`);
        if (finishing.length) console.log(`      Finishing: ${finishing.join(', ')}`);
        
        return {
            action: 'quote',
            confidence: 0.95,
            needsLLM: false,
            data: {
                product,
                qty: quantity,
                material,
                finishing
            }
        };
    }
    
    // יש מוצר בלי כמות - נשאל
    if (product && !quantity) {
        console.log(`   ⚠️ Action: QUOTE (missing qty) - ${product}`);
        return {
            action: 'quote_incomplete',
            confidence: 0.80,
            needsLLM: false,
            data: {
                product,
                missing: 'qty'
            }
        };
    }
    
    // יש כמות בלי מוצר - ייתכן עדכון
    if (quantity && !product && cart.length > 0) {
        // אם יש רק מספר, כנראה רוצה לעדכן את הפריט האחרון
        const lastItem = cart[cart.length - 1];
        console.log(`   ⚠️ Action: Possible UPDATE - ${quantity} (last item: ${lastItem?.product_name})`);
        return {
            action: 'update_qty',
            confidence: 0.70,
            needsLLM: false,
            data: {
                product: lastItem?.product_name,
                qty: quantity,
                inferred: true
            }
        };
    }
    
    // === שלב 3: בקשת שליחת הצעה ===
    if (matchesAny(text, ACTION_KEYWORDS.send_quote)) {
        console.log(`   ✅ Action: SEND QUOTE (PDF)`);
        return {
            action: 'send_quote',
            confidence: 0.90,
            needsLLM: false,
            data: {}
        };
    }
    
    // === שלב 3.5: שאלות עיצוב ===
    if (matchesAny(text, ACTION_KEYWORDS.design)) {
        console.log(`   ✅ Action: DESIGN CHECK`);
        return {
            action: 'design_check',
            confidence: 0.85,
            needsLLM: false,
            data: {}
        };
    }
    
    // === שלב 3.6: ברכות ===
    if (matchesAny(text, ACTION_KEYWORDS.greeting) && text.length < 20) {
        console.log(`   ✅ Action: GREETING`);
        return {
            action: 'greeting',
            confidence: 0.90,
            needsLLM: false,
            data: {}
        };
    }
    
    // === שלב 4: ברירת מחדל - צריך LLM ===
    console.log(`   🤖 Action: CHAT (needs LLM)`);
    return {
        action: 'chat',
        confidence: 0.50,
        needsLLM: true,
        data: {
            detectedProduct: product,
            detectedQty: quantity
        }
    };
}

// === פונקציות עזר ===

/**
 * בודק אם הטקסט מכיל אחת מהמילים ברשימה
 */
function matchesAny(text, keywords) {
    return keywords.some(kw => text.includes(kw));
}

/**
 * חילוץ מספר מהטקסט
 */
function extractQuantity(text) {
    // מילים למספרים בעברית
    const hebrewNumbers = {
        'אחד': 1, 'אחת': 1, 'יחיד': 1, 'יחידה': 1,
        'שניים': 2, 'שתיים': 2, 'שני': 2, 'זוג': 2,
        'שלושה': 3, 'שלוש': 3,
        'ארבעה': 4, 'ארבע': 4,
        'חמישה': 5, 'חמש': 5,
        'עשר': 10, 'עשרה': 10,
        'עשרים': 20,
        'חמישים': 50,
        'מאה': 100,
        'מאתיים': 200,
        'חמש מאות': 500,
        'אלף': 1000
    };
    
    // קודם בדוק מילים בעברית
    for (const [word, num] of Object.entries(hebrewNumbers)) {
        if (text.includes(word)) {
            return num;
        }
    }
    
    // תבניות מספרים
    const patterns = [
        /(\d{1,3}(?:,\d{3})+)/, // 1,000 or 10,000
        /(\d+)\s*(?:יחידות|יח'|יח|פריטים|עותקים|קלפים)/,
        /(\d+)\s*(?:כרטיס|פלייר|עלון|הזמנ|מדבק|חוברו|פוסטר)/,
        /(?:כמות|qty|כמות של)\s*:?\s*(\d+)/i,
        /(\d+)/  // מספר כללי
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            // נקה פסיקים והמר למספר
            const num = parseInt(match[1].replace(/,/g, ''));
            // בדיקת סבירות (לא פחות מ-1, לא יותר מ-1,000,000)
            if (num >= 1 && num <= 1000000) {
                return num;
            }
        }
    }
    
    return null;
}

/**
 * מציאת מוצר בטקסט
 */
function findProductInText(text, cart = []) {
    const lowerText = text.toLowerCase();
    
    // קודם בודק מוצרים בעגלה (לזיהוי "תמחק את הפליירים")
    for (const item of cart) {
        const itemName = item.product_name?.toLowerCase() || '';
        if (lowerText.includes(itemName) || 
            lowerText.includes(itemName.replace(/ים$/, '')) || // צורת יחיד
            lowerText.includes(itemName.replace(/ות$/, 'ה'))) { // צורת יחיד נקבה
            return item.product_name;
        }
    }
    
    // אחרי זה בודק מילות מפתח
    // ממיין לפי אורך יורד כדי לתפוס "כרטיס ביקור" לפני "כרטיס"
    const sortedKeywords = Object.keys(PRODUCT_KEYWORDS)
        .sort((a, b) => b.length - a.length);
    
    for (const keyword of sortedKeywords) {
        if (lowerText.includes(keyword)) {
            return PRODUCT_KEYWORDS[keyword];
        }
    }
    
    return null;
}

/**
 * מציאת חומר בטקסט
 */
function findMaterialInText(text) {
    const lowerText = text.toLowerCase();
    
    for (const [keyword, value] of Object.entries(MATERIAL_KEYWORDS)) {
        if (lowerText.includes(keyword)) {
            return value;
        }
    }
    
    return null;
}

/**
 * מציאת גימורים בטקסט (יכול להיות יותר מאחד)
 */
function findFinishingInText(text) {
    const lowerText = text.toLowerCase();
    const found = [];
    
    for (const [keyword, value] of Object.entries(FINISHING_KEYWORDS)) {
        if (lowerText.includes(keyword)) {
            found.push(value);
        }
    }
    
    return found;
}

/**
 * קבלת שם מוצר בעברית
 */
function getProductHebrewName(productKey) {
    const names = {
        'bc': 'כרטיסי ביקור',
        'flyer': 'פליירים',
        'invitation': 'הזמנות',
        'rollup': 'רולאפ',
        'banner': 'שמשונית',
        'canvas': 'קנבס',
        'sticker': 'מדבקות',
        'booklet': 'חוברת',
        'brochure': 'פרוספקט',
        'folder': 'פולדר',
        'poster': 'פוסטר',
        'letterhead': 'נייר מכתבים',
        'envelope': 'מעטפות'
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
