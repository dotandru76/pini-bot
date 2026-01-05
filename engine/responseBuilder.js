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

// === מיפוי שמות מוצרים לעברית ===
const PRODUCT_NAMES_HEB = {
    'bc': 'כרטיסי ביקור',
    'business_card': 'כרטיסי ביקור',
    'flyer': 'פליירים',
    'invitation': 'הזמנות',
    'place_card': 'כרטיסי הושבה',
    'sticker': 'מדבקות',
    'rollup': 'רולאפ',
    'banner': 'באנר',
    'poster': 'פוסטר',
    'booklet': 'חוברת',
    'brochure': 'ברושור',
    'folder': 'פולדר',
    'envelope': 'מעטפות',
    'letterhead': 'ניירת משרדית',
    'canvas': 'קנבס'
};

function getHebrewProductName(name) {
    if (!name) return 'פריט';
    const lower = name.toLowerCase();
    return PRODUCT_NAMES_HEB[lower] || name;
}

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
        const productName = getHebrewProductName(item.product_name);
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
    
    // === הוספת כמה מוצרים בבת אחת ===
    multi_quote_added: (context) => {
        const { items, cart } = context;
        
        let response = `${pick('excitement')} הוספתי הכל:\n\n`;
        
        items.forEach((item, i) => {
            const productName = getHebrewProductName(item.product_name);
            response += `${i + 1}. ${item.qty.toLocaleString()} ${productName} - ₪${item.client_price.toLocaleString()}\n`;
        });
        
        const total = cart.reduce((sum, item) => sum + (item.client_price || 0), 0);
        response += `\n💰 סה"כ: ₪${total.toLocaleString()}`;
        
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
    },
    
    // === קטלוג מוצרים ===
    catalog: (context) => {
        return `🖨️ מה נדפיס היום?

🖼️ כרטיסי ביקור
📄 פליירים ועלונים
💒 הזמנות לאירועים
🎪 רולאפים ושילוט
🏷️ מדבקות
📚 חוברות וקטלוגים

💬 כתוב מה אתה צריך ואני אחזיר הצעה!`;
    },
    
    // === שאלות ותשובות ===
    faq: (context) => {
        return `❓ שאלות נפוצות:

⏱️ זמני הכנה?
רוב העבודות מוכנות תוך 3-5 ימי עסקים.
דחוף? יש אפשרות להדפסה תוך 24 שעות.

🚚 משלוחים?
שליח עד הבית או איסוף עצמי.
משלוח חינם בהזמנות מעל ₪300.

💳 תשלום?
אשראי, ביט, העברה בנקאית.
עסקים - אפשר חשבונית +30.

🎨 עיצוב?
אין לך קובץ? יש לנו מעצבת מעולה!
יש לך קובץ? תשלח ואבדוק שמוכן להדפסה.

💬 עוד שאלות? שאל אותי!`;
    },
    
    // === צור קשר ===
    contact: (context) => {
        return `📞 איך ליצור קשר?

📱 טלפון: 03-XXXXXXX
💬 וואטסאפ: זה אני! תכתוב והנה אני עונה 😊
📍 כתובת: רחוב הדפוס XX, תל אביב
🕐 שעות פעילות: א'-ה' 08:00-18:00

💬 מה תרצה לדעת?`;
    },
    
    // === סטטוס הזמנה ===
    order_status: (context) => {
        return `📦 בדיקת סטטוס הזמנה

מה מספר ההזמנה שלך?
(קיבלת אותו ב-SMS או במייל)

💡 אם אין לך מספר - תן לי שם או טלפון ואחפש.`;
    },
    
    // === סירוב ===
    decline: (context) => {
        const responses = [
            "בסדר גמור! אם תצטרך משהו, אני כאן 😊",
            "אין בעיה! במה אפשר לעזור?",
            "סבבה. מה עוד אפשר לעשות בשבילך?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    },
    
    // === אופציות חומר ===
    material_options: (context) => {
        const { product } = context;
        const productName = getHebrewProductName(product);
        
        const options = {
            'bc': `📋 אופציות נייר לכרטיסי ביקור:

• 350 גרם כרומו - קלאסי ומקצועי
• 350 גרם כותנה - מרגיש יוקרתי
• 350 גרם פנינה - נצנוץ עדין
• 400 גרם כרומו - עבה במיוחד

💡 הכי פופולרי: כרומו 350 גרם עם למינציה מט`,
            
            'flyer': `📋 אופציות נייר לפליירים:

• 135 גרם - דק, לחלוקה המונית
• 170 גרם - סטנדרטי, איכותי
• 250 גרם - עבה, לא מתקפל

💡 לחלוקה ברחוב: 135 גרם
💡 לתיבות דואר: 170 גרם`,
            
            'invitation': `📋 אופציות נייר להזמנות:

• כרומו 300 גרם - קלאסי
• כותנה 300 גרם - מרגיש יוקרתי
• פנינה 300 גרם - נצנוץ עדין
• נייר ממוחזר - אקולוגי

💡 לחתונה: כותנה או פנינה מומלץ!`
        };
        
        return options[product] || `📋 אופציות נייר ל${productName}:

• נייר רגיל - כלכלי
• נייר עבה - איכותי יותר
• נייר מיוחד - פנינה/כותנה/טקסטורה

מה מתאים לך?`;
    },
    
    // === אופציות גימור ===
    finishing_options: (context) => {
        return `✨ גימורים זמינים:

• למינציה מט - מראה מודרני
• למינציה מבריק - בולט וחד
• הבלטה - טקסט/לוגו בולט
• פויל זהב/כסף - נצנוץ יוקרתי
• לכה סלקטיבית - מבריק חלקי
• פינות עגולות - מראה רך

💡 מה להוסיף?`;
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
        ],
        
        faq: [
            { text: 'הזמנה חדשה', value: 'רוצה להזמין' },
            { text: 'קטלוג מוצרים', value: 'קטלוג מוצרים' },
            { text: 'צור קשר', value: 'צור קשר' }
        ],
        
        material_options: [
            { text: 'נייר רגיל', value: 'נייר רגיל' },
            { text: 'נייר עבה', value: 'נייר עבה יותר' },
            { text: 'נייר כותנה', value: 'נייר כותנה' },
            { text: 'להשאיר ככה', value: 'בסדר ככה' }
        ],
        
        finishing_options: [
            { text: 'למינציה מט', value: 'תוסיף למינציה מט' },
            { text: 'למינציה מבריק', value: 'תוסיף למינציה מבריק' },
            { text: 'בלי גימור', value: 'בלי גימור' }
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