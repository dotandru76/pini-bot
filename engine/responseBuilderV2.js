/**
 * Response Builder V2 - Pini Print Bot
 * =====================================
 * תגובות עם אישיות + מכירה חכמה
 */

const { 
    humanize, 
    generateSmartRecommendation,
    generateEmpatheticResponse,
    detectMood,
    getProductHebrew,
    handlePriceObjection,
    PINI_PERSONALITY
} = require('./personalityEngine');

// === בחירת ביטוי אקראי ===
function pick(category) {
    const options = PINI_PERSONALITY.expressions[category];
    if (!options || options.length === 0) return '';
    return options[Math.floor(Math.random() * options.length)];
}

// === תבניות תגובה משופרות ===
const RESPONSE_TEMPLATES = {
    
    // === ברכות ===
    greeting: (context = {}) => {
        const hour = new Date().getHours();
        let timeGreeting = '';
        
        if (hour >= 5 && hour < 12) timeGreeting = 'בוקר טוב! ☀️';
        else if (hour >= 12 && hour < 17) timeGreeting = 'צהריים טובים!';
        else if (hour >= 17 && hour < 21) timeGreeting = 'ערב טוב!';
        else timeGreeting = 'לילה טוב! 🌙';
        
        const greetings = [
            `${timeGreeting} פיני פה מדפוס בית יצחק. מה נדפיס?`,
            `היי! ${timeGreeting} איך אפשר לעזור?`,
            `שלום! פיני מבית יצחק. במה אוכל לשרת?`
        ];
        
        // אם יש לקוח מוכר
        if (context.customer?.name) {
            return `היי ${context.customer.name}! ${timeGreeting} שמח לראות אותך שוב 😊`;
        }
        
        return greetings[Math.floor(Math.random() * greetings.length)];
    },
    
    // === הצעת מחיר חדשה ===
    quote_added: (context) => {
        const { item, recommendation } = context;
        const productName = item.product_name;
        const qty = item.qty.toLocaleString();
        const price = item.client_price.toLocaleString();
        
        // תגובה בסיסית
        let response = `${pick('excitement')} ${qty} ${productName} ב-₪${price}`;
        
        // הוסף פירוט אם יש
        if (item.description && !item.isDefaultUsed) {
            response += `\n📝 ${item.description}`;
        } else if (item.isDefaultUsed) {
            response += `\n💡 (על ${item.description} - אפשר לשנות)`;
        }
        
        // הוסף המלצה חכמה
        if (recommendation) {
            response += `\n\n${recommendation.message}`;
        }
        
        // הוסף סגירה
        response += `\n\n${pick('closing')}`;
        
        return response;
    },
    
    // === עדכון כמות ===
    quote_updated: (context) => {
        const { item, oldQty, recommendation } = context;
        const direction = item.qty > oldQty ? 'הגדלתי' : 'הקטנתי';
        
        let response = `${pick('empathy')} ${direction} ל-${item.qty.toLocaleString()} יחידות.\n`;
        response += `💰 מחיר מעודכן: ₪${item.client_price.toLocaleString()}`;
        
        // אם הקטין - אולי להציע לחשוב שוב?
        if (item.qty < oldQty && item.qty < 500) {
            response += `\n\n💡 טיפ: ב-500 יחידות המחיר ליחידה יורד משמעותית`;
        }
        
        // המלצה
        if (recommendation) {
            response += `\n\n${recommendation.message}`;
        }
        
        return response;
    },
    
    // === סטטוס עגלה ===
    cart_status: (context) => {
        const { cart, customer } = context;
        
        if (!cart || cart.length === 0) {
            return `העגלה ריקה 🛒\n\nמה תרצה להזמין? כרטיסי ביקור? פליירים? הזמנות?`;
        }
        
        let response = `📋 **ההזמנה שלך:**\n\n`;
        let total = 0;
        
        cart.forEach((item, i) => {
            response += `${i + 1}. ${item.product_name} (${item.qty.toLocaleString()}) - ₪${item.client_price.toLocaleString()}\n`;
            total += item.client_price;
        });
        
        response += `\n💰 **סה"כ: ₪${total.toLocaleString()}**`;
        
        // אם לקוח VIP - רמוז להנחה
        if (customer?.isVIP) {
            response += `\n\n⭐ כלקוח VIP, יש לך הנחה קבועה על ההזמנה`;
        }
        
        // הצע לשלוח הצעה
        if (cart.length > 0) {
            response += `\n\nרוצה שאשלח הצעת מחיר רשמית?`;
        }
        
        return response;
    },
    
    // === הסרת פריט ===
    item_removed: (context) => {
        const { productName } = context;
        const responses = [
            `הסרתי את ה${productName} 👍`,
            `בסדר, בלי ה${productName}`,
            `${productName} - הוסר מההזמנה`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    },
    
    // === פריט לא נמצא ===
    item_not_found: (context) => {
        const { productName, cart } = context;
        let response = `לא מצאתי "${productName}" בעגלה 🤔`;
        
        if (cart && cart.length > 0) {
            response += `\n\nיש לי: ${cart.map(i => i.product_name).join(', ')}`;
        }
        
        return response;
    },
    
    // === ניקוי עגלה ===
    cart_cleared: () => {
        const responses = [
            "סבבה, מתחילים מחדש 🔄",
            "אוקיי, ריקנתי הכל. מה נעשה?",
            "עגלה ריקה! בוא נתחיל מהתחלה"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    },
    
    // === שאלת כמות (quote_incomplete) ===
    ask_quantity: (context) => {
        const { product } = context;
        const productHeb = getProductHebrew(product);
        
        const responses = [
            `${productHeb} - מעולה! 👍\n\nכמה יחידות?`,
            `אחלה! כמה ${productHeb} צריך?`,
            `${productHeb}, סבבה. מה הכמות?`
        ];
        
        // הוסף כמויות נפוצות כהצעה
        let response = responses[Math.floor(Math.random() * responses.length)];
        
        const commonQtys = {
            'bc': [100, 250, 500, 1000],
            'flyer': [500, 1000, 2500, 5000],
            'invitation': [100, 200, 300, 500],
            'sticker': [100, 500, 1000, 2000]
        };
        
        const qtys = commonQtys[product];
        if (qtys) {
            response += `\n\n💡 הכי נפוץ: ${qtys.join(' / ')}`;
        }
        
        return response;
    },
    
    // === שאלת עיצוב ===
    design_check: (context) => {
        const responses = [
            `מעולה שיש עיצוב! 🎨\n\nכמה דברים לוודא:\n✅ רזולוציה 300 DPI\n✅ פורמט PDF\n✅ צבעים CMYK\n\nאפשר לשלוח לי לבדיקה חינם!`,
            `יופי! בדוק שהקובץ ב-300 DPI ו-CMYK.\n\nשלח לי ואני אבדוק שהכל תקין 👍`,
            `אחלה! 🎨 תשלח את הקובץ ואני אוודא שמוכן להדפסה.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    },
    
    // === שאלת עיצוב - צריך עיצוב ===
    needs_design: (context) => {
        return `אין בעיה! יש לנו מעצבת מעולה 🎨\n\nהעיצוב עולה ₪150-350 תלוי במורכבות.\nזה כולל 2 סבבי תיקונים.\n\nרוצה שאתאם שיחה?`;
    },
    
    // === שליחת הצעה ===
    send_quote: (context) => {
        const { cart, total } = context;
        
        if (!cart || cart.length === 0) {
            return `אין פריטים בעגלה עדיין 😅\n\nמה תרצה להוסיף?`;
        }
        
        return `מכין לך הצעת מחיר רשמית... 📄\n\n💰 סה"כ: ₪${total?.toLocaleString() || '---'}\n\nההצעה תהיה מוכנה תיכף!`;
    },
    
    // === תגובה למחיר יקר ===
    price_objection: (context) => {
        const strategies = handlePriceObjection(
            context.price, 
            context.product, 
            context.quantity, 
            context
        );
        
        // בחר אסטרטגיה (העדפה להנחה אם אפשר, אחרת הסבר ערך)
        const strategy = strategies.find(s => s.type === 'discount') || strategies[0];
        
        return generateEmpatheticResponse('expensive') + '\n\n' + strategy.response;
    },
    
    // === מדבקות - צריך פרטים ===
    sticker_details: (context) => {
        const { qty } = context;
        
        return `אחלה, ${qty?.toLocaleString() || ''} מדבקות! 🏷️

כדי לתת מחיר מדויק, צריך לדעת:

📐 **גודל?** (למשל: 5×5 ס"מ, 7×10 ס"מ)
⭕ **צורה?** עגול / מרובע / צורני מיוחד
📦 **חומר?** נייר / ויניל עמיד / שקוף

מה יהיה?`;
    }
};

// === בניית תגובה ===
function buildResponse(type, context = {}) {
    const template = RESPONSE_TEMPLATES[type];
    
    if (!template) {
        console.warn(`[ResponseBuilder] Unknown template: ${type}`);
        return 'איך אפשר לעזור?';
    }
    
    // הפעל את התבנית
    let response = typeof template === 'function' ? template(context) : template;
    
    // זהה מצב רוח והתאם
    if (context.userMessage) {
        const mood = detectMood(context.userMessage);
        if (mood === 'price_sensitive' && type !== 'price_objection') {
            // אל תציע upsell ללקוח רגיש למחיר
            response = response.replace(/💡.*הנחה.*\n?/g, '');
        }
    }
    
    return response;
}

// === בניית Quick Replies ===
function buildQuickReplies(type, context = {}) {
    const replies = {
        greeting: [
            { text: 'כרטיסי ביקור', value: 'כרטיסי ביקור' },
            { text: 'פליירים', value: 'פליירים' },
            { text: 'הזמנות לאירוע', value: 'הזמנות' },
            { text: 'משהו אחר', value: 'מה עוד יש לכם?' }
        ],
        
        ask_quantity: [
            { text: '100', value: '100' },
            { text: '250', value: '250' },
            { text: '500', value: '500' },
            { text: '1000', value: '1000' }
        ],
        
        quote_added: [
            { text: 'עוד משהו', value: 'מה עוד?' },
            { text: 'שלח הצעה', value: 'שלח הצעת מחיר' },
            { text: 'שנה כמות', value: 'שנה כמות' }
        ],
        
        cart_status: [
            { text: 'שלח הצעה', value: 'שלח הצעת מחיר' },
            { text: 'הוסף פריט', value: 'מה עוד אפשר?' },
            { text: 'נקה הכל', value: 'נקה עגלה' }
        ],
        
        sticker_details: [
            { text: 'עגול 5 ס"מ', value: 'מדבקות עגולות 5 ס"מ' },
            { text: 'מרובע 7×5', value: 'מדבקות מרובעות 7 על 5' },
            { text: 'אחר', value: 'גודל אחר' }
        ],
        
        design_check: [
            { text: 'יש לי קובץ', value: 'יש לי קובץ מוכן' },
            { text: 'צריך עיצוב', value: 'צריך עיצוב' },
            { text: 'יש מCanva', value: 'יש לי עיצוב מקנבה' }
        ]
    };
    
    return replies[type] || [];
}

module.exports = {
    buildResponse,
    buildQuickReplies,
    RESPONSE_TEMPLATES,
    pick
};
