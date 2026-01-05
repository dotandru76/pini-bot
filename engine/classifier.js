/**
 * Message Classifier V4 - Pini Print Bot
 * =======================================
 * אלגוריתם משופר לזיהוי כוונות
 * 
 * סדר עדיפויות:
 * 0. סירוב (לא תודה, עזוב)
 * 1. Quick Replies (קטלוג, FAQ, צור קשר)
 * 2. שאלות אופציות (אילו, איזה, מה האפשרויות)
 * 3. שאלות הסבר (מה זה, מה ההבדל)
 * 4. שינוי חומר/גימור
 * 5. התייחסות להקשר (כבר אמרתי)
 * 6. המלצות (מה ממליץ לחתונה)
 * 7. מוצרים (quote, multi_quote, quote_incomplete)
 * 8. ברכות
 * 9. chat (LLM)
 */

// === מילות מפתח למוצרים ===
const PRODUCT_KEYWORDS = {
    // כרטיסי ביקור (+ שגיאות כתיב)
    'כרטיסי ביקור': 'bc',
    'כרטיס ביקור': 'bc', 
    'כרטיסי בקור': 'bc',  // שגיאת כתיב
    'כרטיס בקור': 'bc',   // שגיאת כתיב
    'כרטיסים': 'bc',
    'ביזנס קארד': 'bc',
    
    // כרטיסי הושבה
    'כרטיסי הושבה': 'place_card',
    'כרטיס הושבה': 'place_card',
    'הושבה': 'place_card',
    
    // פליירים (+ שגיאות כתיב)
    'פליירים': 'flyer',
    'פלייר': 'flyer',
    'פליירם': 'flyer',    // שגיאת כתיב
    'פלאייר': 'flyer',
    'פלאיירים': 'flyer',
    'עלונים': 'flyer',
    'עלון': 'flyer',
    
    // הזמנות
    'הזמנות': 'invitation',
    'הזמנה': 'invitation',
    'הזמנה לחתונה': 'invitation',
    'הזמנה לאירוע': 'invitation',
    
    // רולאפ / באנרים (+ שגיאות כתיב)
    'רולאפ': 'rollup',
    'רולאפים': 'rollup',
    'רולפ': 'rollup',     // שגיאת כתיב
    'רול אפ': 'rollup',
    'באנר': 'banner',
    'באנרים': 'banner',
    'שמשונית': 'banner',
    
    // מדבקות
    'מדבקות': 'sticker',
    'מדבקה': 'sticker',
    'סטיקרים': 'sticker',
    'סטיקר': 'sticker',
    
    // חוברות
    'חוברת': 'booklet',
    'חוברות': 'booklet',
    'ברושור': 'brochure',
    
    // פולדרים/תיקיות
    'פולדר': 'folder',
    'פולדרים': 'folder',
    'תיקייה': 'folder',
    'תיקיות': 'folder',
    
    // פוסטרים
    'פוסטר': 'poster',
    'פוסטרים': 'poster',
    'שלט': 'poster',
    'שלטים': 'poster',
    
    // ניירת משרדית
    'נייר מכתבים': 'letterhead',
    'ניירת משרדית': 'letterhead',
    
    // מעטפות
    'מעטפה': 'envelope',
    'מעטפות': 'envelope'
};

// === מילות פעולה ===
const ACTION_KEYWORDS = {
    remove: ['תמחק', 'מחק', 'תוריד', 'הורד', 'הסר', 'תבטל', 'בלי', 'לוותר'],
    clear: ['נקה עגלה', 'נקה הכל', 'מחק הכל', 'התחל מחדש', 'מההתחלה'],
    update: ['שנה ל', 'עדכן ל', 'תחליף ל', 'תעלה ל', 'תוריד ל'],
    send_quote: ['שלח הצעת', 'שלח הצעה', 'תשלח הצעה', 'הצעת מחיר בבקשה', 'זהו תשלח']
};

// === גימורים ===
const FINISHING_KEYWORDS = ['למינציה', 'הבלטה', 'פויל', 'לכה', 'פינות עגולות', 'קיפול'];

/**
 * פונקציה ראשית: סיווג הודעה
 */
function classifyMessage(message, context = {}) {
    const text = message.toLowerCase().trim();
    const cart = context.cart || [];
    const pendingProduct = context.pendingProduct || null;
    
    console.log(`\n🔍 [Classifier V4] Analyzing: "${message}"`);
    if (pendingProduct) {
        console.log(`   📌 Pending product: ${pendingProduct}`);
    }
    
    // ============================================
    // שלב 0: סירוב - עדיפות עליונה!
    // ============================================
    if (/^לא$|^לא תודה|^לא צריך|^לא רוצה|^עזוב|^ויתרתי|בסדר[,.]?\s*לא|לא משנה/.test(text)) {
        console.log(`   ✅ Action: DECLINE`);
        return {
            action: 'decline',
            confidence: 0.95,
            needsLLM: false,
            data: { clearPending: true }
        };
    }
    
    // ============================================
    // שלב 0.5: התלבטות - שולחים ל-LLM
    // ============================================
    const hesitationPattern = /לא יודע|לא בטוח|אולי|חושב ש.*אולי|מתלבט|מתלבטת/;
    if (hesitationPattern.test(text)) {
        console.log(`   🤔 Action: CHAT (hesitation detected)`);
        return {
            action: 'chat',
            confidence: 0.70,
            needsLLM: true,
            data: { taskType: 'clarify', reason: 'hesitation' }
        };
    }
    
    // ============================================
    // שלב 1: Quick Replies
    // ============================================
    
    // קטלוג מוצרים
    if (text.includes('קטלוג מוצרים') || 
        text.includes('מה יש לכם') || 
        text.includes('מה אפשר להזמין') ||
        text.includes('תפריט מחירים') ||
        text === 'קטלוג' ||  // מילה בודדת = catalog
        (text.includes('תפריט') && !text.includes('תפריטים'))) {
        console.log(`   ✅ Action: CATALOG`);
        return { action: 'catalog', confidence: 0.95, needsLLM: false, data: {} };
    }
    
    // FAQ
    if (text.includes('שאלות ותשובות') || text.includes('שאלות נפוצות')) {
        console.log(`   ✅ Action: FAQ`);
        return { action: 'faq', confidence: 0.95, needsLLM: false, data: {} };
    }
    
    // צור קשר
    if (text.includes('צור קשר') || text.includes('פרטי התקשרות')) {
        console.log(`   ✅ Action: CONTACT`);
        return { action: 'contact', confidence: 0.95, needsLLM: false, data: {} };
    }
    
    // סטטוס הזמנה
    if (text.includes('סטטוס הזמנה') || text.includes('מעקב הזמנה')) {
        console.log(`   ✅ Action: ORDER_STATUS`);
        return { action: 'order_status', confidence: 0.95, needsLLM: false, data: {} };
    }
    
    // ============================================
    // שלב 2: שאלות אופציות (לפני שאלות הסבר!)
    // לא כשיש "לשלוח/קובץ/פורמט"
    // ============================================
    const optionsPattern = /אילו|איזה.*(?:אפשר|סוג|אופצי)|מה.*(?:אופצי|אפשרויות)|סוגי\s*(?:נייר|חומר)|מה יש ל/;
    const notOptionsPattern = /לשלוח|קובץ|פורמט|פייל|file/;
    if (optionsPattern.test(text) && !notOptionsPattern.test(text)) {
        const product = findProductInText(text) || pendingProduct;
        console.log(`   ✅ Action: OPTIONS${product ? ' for ' + product : ''}`);
        return {
            action: 'options',
            confidence: 0.90,
            needsLLM: true, // LLM יסביר את האופציות
            data: { product, taskType: 'explain' }
        };
    }
    
    // ============================================
    // שלב 3: שאלות הסבר (מה זה X?)
    // ============================================
    const explainPattern = /^מה זה|^מהו|^מהי|מה ההבדל|תסביר|מה אומר/;
    if (explainPattern.test(text)) {
        const product = findProductInText(text);
        console.log(`   ✅ Action: EXPLAIN${product ? ' - ' + product : ''}`);
        return {
            action: 'explain',
            confidence: 0.90,
            needsLLM: true,
            data: { product, taskType: 'explain' }
        };
    }
    
    // ============================================
    // שלב 4: שינוי חומר / גימור
    // ============================================
    const changeMaterialPattern = /לשנות.*(?:חומר|נייר)|להחליף.*(?:חומר|נייר)|נייר אחר|חומר אחר|תחליף|תשנה|\d+\s*גרם/;
    if (changeMaterialPattern.test(text)) {
        console.log(`   ✅ Action: CHANGE_MATERIAL`);
        return {
            action: 'change_material',
            confidence: 0.90,
            needsLLM: false,
            data: { product: pendingProduct || cart[cart.length-1]?.product_name }
        };
    }
    
    const changeFinishingPattern = new RegExp(FINISHING_KEYWORDS.join('|'));
    if (changeFinishingPattern.test(text) && (text.includes('אפשר') || text.includes('להוסיף') || text.includes('רוצה'))) {
        console.log(`   ✅ Action: CHANGE_FINISHING`);
        return {
            action: 'change_finishing',
            confidence: 0.90,
            needsLLM: false,
            data: { finishing: findFinishingInText(text) }
        };
    }
    
    // ============================================
    // שלב 5: התייחסות להקשר קודם
    // ============================================
    const contextPattern = /כבר (?:דיברתי|אמרתי)|(?:דיברנו|אמרתי).*קודם|כמו שאמרתי|כמו (?:הפעם )?הקודמת|כמו קודם|הפעם הקודמת/;
    if (contextPattern.test(text)) {
        console.log(`   ✅ Action: CONTEXT_REFERENCE`);
        return {
            action: 'context_reference',
            confidence: 0.85,
            needsLLM: true,
            data: { taskType: 'clarify' }
        };
    }
    
    // ============================================
    // שלב 6: המלצות (מה ממליץ ל...)
    // ============================================
    const recommendPattern = /מה.*ממליץ|מה כדאי|מה מתאים/;
    const occasions = ['חתונה', 'חתונות', 'תערוכה', 'אירוע', 'עסק', 'בר מצווה', 'בת מצווה', 'ברית'];
    if (recommendPattern.test(text) || occasions.some(o => text.includes(o) && text.length < 50)) {
        const occasion = occasions.find(o => text.includes(o));
        console.log(`   ✅ Action: RECOMMEND${occasion ? ' for ' + occasion : ''}`);
        return {
            action: 'recommend',
            confidence: 0.85,
            needsLLM: true,
            data: { occasion, taskType: 'recommend' }
        };
    }
    
    // ============================================
    // שלב 7: פעולות עגלה (ניקוי, הסרה, שליחה)
    // ============================================
    
    // ניקוי עגלה
    if (matchesAny(text, ACTION_KEYWORDS.clear)) {
        console.log(`   ✅ Action: CLEAR CART`);
        return { action: 'clear', confidence: 0.95, needsLLM: false, data: {} };
    }
    
    // הסרת פריט
    if (matchesAny(text, ACTION_KEYWORDS.remove)) {
        const product = findProductInText(text, cart);
        console.log(`   ✅ Action: REMOVE - ${product || 'unknown'}`);
        return { action: 'remove', confidence: 0.90, needsLLM: false, data: { product } };
    }
    
    // שליחת הצעה
    if (matchesAny(text, ACTION_KEYWORDS.send_quote)) {
        console.log(`   ✅ Action: SEND_QUOTE`);
        return { action: 'send_quote', confidence: 0.95, needsLLM: false, data: {} };
    }
    
    // סטטוס עגלה
    if (/מה בעגלה|כמה יוצא|מה המחיר|כמה זה עולה/.test(text)) {
        console.log(`   ✅ Action: STATUS`);
        return { action: 'status', confidence: 0.95, needsLLM: false, data: {} };
    }
    
    // ============================================
    // שלב 8: הזמנות (מוצרים + כמויות)
    // ============================================
    
    const allProducts = findAllProductsWithQuantities(text);
    
    // מספר בלבד - השלמה או עדכון
    const quantity = extractQuantity(text);
    if (quantity && allProducts.length === 0) {
        if (pendingProduct) {
            console.log(`   ✅ Action: QUOTE (completing) - ${pendingProduct} × ${quantity}`);
            return {
                action: 'quote',
                confidence: 0.90,
                needsLLM: false,
                data: { product: pendingProduct, qty: quantity, fromPending: true }
            };
        }
        if (cart.length > 0) {
            const lastItem = cart[cart.length - 1];
            console.log(`   ✅ Action: UPDATE_QTY - ${lastItem?.product_name} → ${quantity}`);
            return {
                action: 'update_qty',
                confidence: 0.85,
                needsLLM: false,
                data: { product: lastItem?.product_name, qty: quantity }
            };
        }
    }
    
    // כמה מוצרים עם כמויות
    if (allProducts.length > 1 && allProducts.filter(p => p.qty).length >= 2) {
        console.log(`   ✅ Action: MULTI_QUOTE - ${allProducts.map(p => p.product + '×' + (p.qty||'?')).join(', ')}`);
        return {
            action: 'multi_quote',
            confidence: 0.95,
            needsLLM: false,
            data: { products: allProducts }
        };
    }
    
    // מוצר אחד עם כמות
    if (allProducts.length >= 1 && allProducts[0].qty) {
        const p = allProducts[0];
        console.log(`   ✅ Action: QUOTE - ${p.product} × ${p.qty}`);
        return {
            action: 'quote',
            confidence: 0.95,
            needsLLM: false,
            data: { product: p.product, qty: p.qty }
        };
    }
    
    // מוצר בלי כמות
    const singleProduct = findProductInText(text);
    if (singleProduct) {
        console.log(`   ⚠️ Action: QUOTE_INCOMPLETE - ${singleProduct}`);
        return {
            action: 'quote_incomplete',
            confidence: 0.85, // שרת יכול לשאול "כמה?"
            needsLLM: false,
            data: { product: singleProduct, missing: 'qty' }
        };
    }
    
    // ============================================
    // שלב 9: ברכות (כולל סלנג)
    // ============================================
    const greetings = ['היי', 'שלום', 'הי', 'אהלן', 'בוקר טוב', 'ערב טוב', 'מה שלומך', 'מה נשמע', 'מה המצב', 'מה קורה', 'אחי', 'אחלה'];
    if (greetings.some(g => text.includes(g)) && text.length < 25) {
        console.log(`   ✅ Action: GREETING`);
        return { action: 'greeting', confidence: 0.90, needsLLM: false, data: {} };
    }
    
    // ============================================
    // שלב 10: ברירת מחדל - LLM
    // ============================================
    console.log(`   🤖 Action: CHAT (needs LLM)`);
    return {
        action: 'chat',
        confidence: 0.50,
        needsLLM: true,
        data: { taskType: 'freestyle' }
    };
}

// === פונקציות עזר ===

function matchesAny(text, keywords) {
    return keywords.some(kw => text.includes(kw));
}

function findProductInText(text, cart = []) {
    const lower = text.toLowerCase();
    
    // קודם בודק עגלה
    for (const item of cart) {
        const name = item.product_name?.toLowerCase() || '';
        if (lower.includes(name)) return item.product_name;
    }
    
    // מילות מפתח - ממוין לפי אורך
    const sorted = Object.keys(PRODUCT_KEYWORDS).sort((a, b) => b.length - a.length);
    for (const keyword of sorted) {
        if (lower.includes(keyword)) {
            return PRODUCT_KEYWORDS[keyword];
        }
    }
    return null;
}

function findAllProductsWithQuantities(text) {
    const lower = text.toLowerCase();
    const results = [];
    const sorted = Object.keys(PRODUCT_KEYWORDS).sort((a, b) => b.length - a.length);
    
    for (const keyword of sorted) {
        const patterns = [
            new RegExp(`(\\d+(?:,\\d{3})*)\\s*${keyword}`, 'i'),
            new RegExp(`(\\d+(?:,\\d{3})*)\\s+(?:יחידות\\s+)?${keyword}`, 'i'),
        ];
        
        for (const pattern of patterns) {
            const match = lower.match(pattern);
            if (match) {
                const qty = parseInt(match[1].replace(/,/g, ''));
                const product = PRODUCT_KEYWORDS[keyword];
                if (!results.find(r => r.product === product) && qty >= 10) {
                    results.push({ product, qty, keyword });
                }
                break;
            }
        }
    }
    
    return results;
}

function extractQuantity(text) {
    // סינון מידות, משקלים, גדלים
    let clean = text
        .replace(/\d+x\d+/gi, '')      // מידות
        .replace(/\d+\s*גרם/gi, '')    // משקל
        .replace(/\d+\s*ס"מ/gi, '')    // סנטימטרים
        .replace(/a\d+/gi, '')         // A4, A5
        .replace(/\d{2,3}-?\d{7}/g, ''); // טלפונים
    
    const match = clean.match(/(\d+(?:,\d{3})*)/);
    if (match) {
        const num = parseInt(match[1].replace(/,/g, ''));
        if (num >= 10 && num <= 100000) return num;
    }
    return null;
}

function findFinishingInText(text) {
    const found = [];
    for (const finish of FINISHING_KEYWORDS) {
        if (text.includes(finish)) found.push(finish);
    }
    return found;
}

module.exports = {
    classifyMessage,
    findProductInText,
    findAllProductsWithQuantities,
    extractQuantity,
    PRODUCT_KEYWORDS
};