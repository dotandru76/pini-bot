/**
 * Smart LLM Handler - Pini Print Bot
 * ===================================
 * LLM קל עם בקרת שרת
 * 
 * העיקרון:
 * 1. שרת מכין context מינימלי
 * 2. LLM עונה בקצרה
 * 3. שרת מאמת ומתקן
 */

// === סוגי משימות ל-LLM ===
const TASK_TYPES = {
    GREETING: 'greeting',           // ברכה/שיחה קלה
    CLARIFY: 'clarify',             // הבהרה - מה הלקוח רוצה?
    RECOMMEND: 'recommend',          // המלצה - מה מתאים לו?
    EXPLAIN: 'explain',             // הסבר על מוצר/אופציות
    CONFIRM_QUOTE: 'confirm_quote', // אישור הצעת מחיר (שרת חישב)
    HANDLE_OBJECTION: 'handle_objection', // התנגדות מחיר
    UPSELL: 'upsell',               // הצעת שדרוג
    FREESTYLE: 'freestyle'          // שיחה חופשית (נדיר)
};

// === Prompts קצרים לפי משימה ===
const TASK_PROMPTS = {
    
    [TASK_TYPES.GREETING]: `אתה פיני, בוט ידידותי של דפוס.
ענה בחום ובקצרה. שאל במה לעזור.
אל תציע מוצרים ספציפיים אלא אם נשאלת.`,

    [TASK_TYPES.CLARIFY]: `אתה פיני מדפוס בית יצחק.
הלקוח ביקש כמה דברים או לא היה ברור.
שאל שאלה אחת ממוקדת להבהיר מה הוא צריך.
אל תציע מחירים - רק תבין מה הוא רוצה.`,

    [TASK_TYPES.RECOMMEND]: `אתה פיני מדפוס בית יצחק.
הלקוח סיפר על אירוע/צורך.
תן 2-3 המלצות קצרות ורלוונטיות.
אל תציע מחירים - רק רעיונות.`,

    [TASK_TYPES.EXPLAIN]: `אתה פיני מדפוס בית יצחק.
הלקוח שואל על אופציות/הבדלים.
הסבר בקצרה ובבהירות.
השתמש במידע שניתן לך בלבד.`,

    [TASK_TYPES.CONFIRM_QUOTE]: `אתה פיני מדפוס בית יצחק.
השרת חישב הצעת מחיר. תציג אותה בצורה נעימה.
חובה להשתמש במחיר המדויק שניתן לך.
אסור להמציא מחירים או הנחות.`,

    [TASK_TYPES.HANDLE_OBJECTION]: `אתה פיני מדפוס בית יצחק.
הלקוח חושב שיקר. הסבר את הערך בלי להתנצל.
אל תציע הנחה אלא אם השרת אישר.
הצע אלטרנטיבה זולה יותר אם יש.`,

    [TASK_TYPES.UPSELL]: `אתה פיני מדפוס בית יצחק.
הצע שדרוג/תוספת בעדינות.
השתמש רק באופציות שניתנו לך.
אל תלחץ - הצע והמשך.`,

    [TASK_TYPES.FREESTYLE]: `אתה פיני, בוט של דפוס בית יצחק.
ענה בקצרה ובידידותיות.
אם נשאלת על מחיר - אמור שתבדוק ותחזור.
אל תמציא מידע.`
};

// === בניית Context לפי משימה ===
function buildContext(taskType, data = {}) {
    const parts = [];
    
    // מידע על הלקוח
    if (data.customer) {
        parts.push(`לקוח: ${data.customer.name || 'חדש'}${data.customer.isVIP ? ' (VIP)' : ''}`);
    }
    
    // עגלה נוכחית
    if (data.cart && data.cart.length > 0) {
        const cartSummary = data.cart.map(i => 
            `${i.product_name} x${i.qty} = ₪${i.client_price}`
        ).join(', ');
        parts.push(`בעגלה: ${cartSummary}`);
    }
    
    // מידע ספציפי למשימה
    switch (taskType) {
        case TASK_TYPES.CONFIRM_QUOTE:
            if (data.quote) {
                parts.push(`הצעת מחיר:`);
                parts.push(`  מוצר: ${data.quote.product_name}`);
                parts.push(`  כמות: ${data.quote.qty}`);
                parts.push(`  מחיר: ₪${data.quote.price} (זה המחיר הסופי!)`);
                if (data.quote.includes) {
                    parts.push(`  כולל: ${data.quote.includes}`);
                }
                if (data.quote.options) {
                    parts.push(`  אפשר גם: ${data.quote.options}`);
                }
            }
            break;
            
        case TASK_TYPES.EXPLAIN:
            if (data.productInfo) {
                parts.push(`מידע על המוצר:`);
                parts.push(data.productInfo);
            }
            break;
            
        case TASK_TYPES.RECOMMEND:
            if (data.occasion) {
                parts.push(`האירוע: ${data.occasion}`);
            }
            if (data.suggestions) {
                parts.push(`מוצרים רלוונטיים: ${data.suggestions.join(', ')}`);
            }
            break;
            
        case TASK_TYPES.HANDLE_OBJECTION:
            if (data.currentPrice) {
                parts.push(`המחיר הנוכחי: ₪${data.currentPrice}`);
            }
            if (data.canDiscount) {
                parts.push(`אפשר להציע: ${data.discountOption}`);
            }
            if (data.cheaperAlternative) {
                parts.push(`אלטרנטיבה זולה: ${data.cheaperAlternative}`);
            }
            break;
            
        case TASK_TYPES.UPSELL:
            if (data.upsellOptions) {
                parts.push(`אופציות לשדרוג:`);
                data.upsellOptions.forEach(opt => {
                    parts.push(`  - ${opt.name}: +₪${opt.price}`);
                });
            }
            break;
    }
    
    // הודעת הלקוח
    if (data.userMessage) {
        parts.push(`הלקוח אמר: "${data.userMessage}"`);
    }
    
    return parts.join('\n');
}

// === בניית Prompt מלא ===
function buildPrompt(taskType, data = {}) {
    const systemPrompt = TASK_PROMPTS[taskType] || TASK_PROMPTS[TASK_TYPES.FREESTYLE];
    const context = buildContext(taskType, data);
    
    return {
        system: systemPrompt,
        context: context,
        // הערכת טוקנים (גס)
        estimatedTokens: Math.ceil((systemPrompt.length + context.length) / 4)
    };
}

// === אימות תשובת LLM ===
function validateResponse(response, taskType, data = {}) {
    const issues = [];
    const corrections = {};
    
    // בדיקה 1: האם יש מחירים שגויים?
    const priceMatches = response.match(/₪[\d,]+/g);
    if (priceMatches && data.quote) {
        const correctPrice = `₪${data.quote.price}`;
        priceMatches.forEach(price => {
            const numericPrice = parseInt(price.replace(/[₪,]/g, ''));
            const expectedPrice = data.quote.price;
            // סטייה של יותר מ-5% = שגיאה
            if (Math.abs(numericPrice - expectedPrice) / expectedPrice > 0.05) {
                issues.push(`מחיר שגוי: ${price} במקום ${correctPrice}`);
                corrections.price = correctPrice;
            }
        });
    }
    
    // בדיקה 2: האם הבטיח הנחה לא מאושרת?
    const discountWords = ['הנחה', 'אוריד', 'מבצע', 'אתן לך', 'מחיר מיוחד'];
    if (!data.canDiscount) {
        discountWords.forEach(word => {
            if (response.includes(word)) {
                issues.push(`הבטחת הנחה לא מאושרת: "${word}"`);
                corrections.removeDiscount = true;
            }
        });
    }
    
    // בדיקה 3: האם המציא מוצר?
    const inventedProducts = ['קנבס', 'הדפסה על בד', 'חולצות', 'ספלים'];
    inventedProducts.forEach(product => {
        if (response.includes(product) && !data.availableProducts?.includes(product)) {
            issues.push(`מוצר לא קיים: "${product}"`);
            corrections.removeProduct = product;
        }
    });
    
    // בדיקה 4: האם הבטיח זמן אספקה לא ריאלי?
    const deliveryMatch = response.match(/תוך\s*(יום|שעה|שעות|24)/);
    if (deliveryMatch && !data.canExpressDelivery) {
        issues.push(`הבטחת אספקה מהירה לא מאושרת`);
        corrections.removeDeliveryPromise = true;
    }
    
    return {
        isValid: issues.length === 0,
        issues,
        corrections,
        originalResponse: response
    };
}

// === תיקון תשובה ===
function fixResponse(response, corrections, data = {}) {
    let fixed = response;
    
    // תיקון מחיר
    if (corrections.price) {
        fixed = fixed.replace(/₪[\d,]+/g, corrections.price);
    }
    
    // הסרת הבטחת הנחה
    if (corrections.removeDiscount) {
        fixed = fixed.replace(/ואפשר.*הנחה.*?\./g, '.');
        fixed = fixed.replace(/אתן לך.*מחיר.*?\./g, '.');
    }
    
    return fixed;
}

// === זיהוי סוג המשימה ===
function detectTaskType(message, context = {}) {
    const text = message.toLowerCase();
    
    // ברכות
    const greetings = ['היי', 'שלום', 'הי', 'אהלן', 'בוקר טוב', 'ערב טוב'];
    if (greetings.some(g => text.includes(g)) && text.length < 20) {
        return TASK_TYPES.GREETING;
    }
    
    // שאלות על אופציות
    const questionWords = ['איזה', 'אילו', 'מה יש', 'מה האופציות', 'מה ההבדל', 'מה אפשר'];
    if (questionWords.some(q => text.includes(q))) {
        return TASK_TYPES.EXPLAIN;
    }
    
    // אירוע/צורך - צריך המלצה
    const occasions = ['חתונה', 'בר מצווה', 'ברית', 'תערוכה', 'כנס', 'פתיחת עסק', 'אירוע'];
    if (occasions.some(o => text.includes(o)) && !context.hasQuote) {
        return TASK_TYPES.RECOMMEND;
    }
    
    // התנגדות למחיר
    const objections = ['יקר', 'זול יותר', 'הרבה כסף', 'לא משתלם', 'מחיר גבוה'];
    if (objections.some(o => text.includes(o))) {
        return TASK_TYPES.HANDLE_OBJECTION;
    }
    
    // רשימת מוצרים - צריך הבהרה
    const products = ['פליירים', 'כרטיסי', 'הזמנות', 'מדבקות', 'רולאפ'];
    const productCount = products.filter(p => text.includes(p)).length;
    if (productCount > 1) {
        return TASK_TYPES.CLARIFY;
    }
    
    // ברירת מחדל
    return TASK_TYPES.FREESTYLE;
}

// === ייצוא ===
module.exports = {
    TASK_TYPES,
    TASK_PROMPTS,
    buildPrompt,
    buildContext,
    validateResponse,
    fixResponse,
    detectTaskType
};
