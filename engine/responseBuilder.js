/**
 * Response Builder V3.1 - Pini Print Bot (Fixed)
 * ==============================================
 * כולל תיקון לתבנית 'chat' החסרה
 */

const { 
    detectMood,
    handlePriceObjection,
    generateEmpatheticResponse,
    getProductHebrew, // הוספתי ייבוא חסר אם היה
    PINI_PERSONALITY
} = require('./personalityEngine');

const { generateQuickReplies } = require('./menuGenerator');
const { generateDashboard } = require('./dashboardManager');

// === בחירת ביטוי אקראי ===
function pick(category) {
    if (!PINI_PERSONALITY || !PINI_PERSONALITY.expressions) return '';
    const options = PINI_PERSONALITY.expressions[category];
    return options && options.length > 0 ? options[Math.floor(Math.random() * options.length)] : '';
}

// === תבניות תגובה ===
const RESPONSE_TEMPLATES = {
    
    // === ✅ התיקון החשוב: תבנית כללית לצ'אט (LLM) ===
    chat: (context) => {
        // מחזיר פשוט את הטקסט שג'מיני יצר
        return context.llmResponse || "לא הבנתי, תוכל לחזור על זה?";
    },

    // === ברכות ===
    greeting: (context = {}) => {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'בוקר טוב! ☀️' : (hour < 18 ? 'צהריים טובים!' : 'ערב טוב! 🌙');
        const name = context.customer?.name ? ` ${context.customer.name}` : '';
        return `היי${name}! ${timeGreeting} פיני פה מדפוס בית יצחק. מה נדפיס היום?`;
    },
    
    // === הצעת מחיר חדשה ===
    quote_added: (context) => {
        const { item, recommendation } = context;
        let response = `${pick('excitement') || 'מעולה!'} ${item.qty.toLocaleString()} ${item.product_name} ב-₪${item.client_price.toLocaleString()}`;
        
        if (item.description && !item.isDefaultUsed) response += `\n📝 ${item.description}`;
        else if (item.isDefaultUsed) response += `\n💡 (חישבתי לפי סטנדרט: ${item.description})`;
        
        if (recommendation) response += `\n\n${recommendation.message}`;
        return response + `\n\n${pick('closing') || 'איך נתקדם?'}`;
    },
    
    // === עדכון כמות ===
    quote_updated: (context) => {
        const { item, oldQty } = context;
        const direction = item.qty > oldQty ? 'הגדלתי' : 'הקטנתי';
        return `${pick('empathy') || 'אין בעיה,'} ${direction} ל-${item.qty.toLocaleString()} יחידות.\n💰 מחיר מעודכן: ₪${item.client_price.toLocaleString()}`;
    },
    
    // === סטטוס עגלה ===
    cart_status: (context) => {
        const { cart } = context;
        if (!cart || cart.length === 0) return `העגלה ריקה 🛒\nמה תרצה להזמין?`;
        
        let response = `📋 **ההזמנה שלך:**\n\n`;
        let total = 0;
        cart.forEach((item, i) => {
            response += `${i + 1}. ${item.product_name} (${item.qty.toLocaleString()}) - ₪${item.client_price.toLocaleString()}\n`;
            total += item.client_price;
        });
        return response + `\n💰 **סה"כ: ₪${total.toLocaleString()}**\n\nלשלוח הצעה מסודרת?`;
    },
    
    // === הסרת פריט ===
    item_removed: (context) => `הסרתי את ה${context.productName} 👍`,
    
    // === פריט לא נמצא ===
    item_not_found: (context) => `לא מצאתי "${context.productName}" בעגלה 🤔`,
    
    // === ניקוי עגלה ===
    cart_cleared: () => "סבבה, רוקנתי את העגלה. מתחילים מחדש! 🔄",
    
    // === שאלת כמות ===
    ask_quantity: (context) => {
        const product = context.product || 'מוצר';
        return `${product} - מעולה! 👍\nכמה יחידות להכין?`;
    },
    
    // === שאלת עיצוב ===
    design_check: () => `מעולה שיש עיצוב! 🎨\n\nרק לוודא:\n✅ רזולוציה 300 DPI\n✅ פורמט PDF\n✅ צבעים CMYK\n✅ בליד (גלישה) 2-3 מ"מ\n\nשלח לי ואני אבדוק שזה תקין לדפוס! 👍`,
    
    // === שליחת הצעה ===
    send_quote: (context) => {
        if (!context.cart || context.cart.length === 0) return `אין פריטים בעגלה עדיין 😅`;
        return `מכין לך הצעת מחיר רשמית... 📄\n\n💰 סה"כ: ₪${context.total.toLocaleString()}\n\nהקובץ יישלח מיד!`;
    },

    price_objection: (context) => "אני מבין, האיכות אצלנו היא ללא פשרות, אבל בוא נראה אם אפשר להתאים משהו לתקציב."
};

function buildResponse(type, context = {}) {
    const template = RESPONSE_TEMPLATES[type];
    if (!template) {
        console.warn(`[ResponseBuilder] Unknown template: ${type} - Fallback to chat`);
        return context.llmResponse || 'איך אפשר לעזור?';
    }
    const text = typeof template === 'function' ? template(context) : template;
    
    // יצירת Metadata ו-Quick Replies
    const currentProduct = context.classification?.data?.product || (context.cart?.length > 0 ? context.cart[context.cart.length-1].product_name : null);
    const quickReplies = generateQuickReplies({ action: type }, currentProduct);
    const dashboard = generateDashboard(context.session || { cart: context.cart, id: 'temp' }, context.customer?.phone);

    return {
        text,
        meta: { 
            intent: type,
            quick_replies: quickReplies
        },
        cart: context.cart || [],
        dashboard
    };
}

module.exports = { buildResponse, buildQuickReplies: generateQuickReplies };