/**
 * Response Builder - Pini Print Bot
 * ===================================
 * בניית תשובות מבוססות תבניות - ללא LLM
 */

// === תבניות תשובה ===
const TEMPLATES = {
    // הצעת מחיר חדשה
    quote_added: (item) => {
        const lines = [
            `מעולה! הוספתי ${item.qty.toLocaleString()} ${item.product_name}.`,
            `חישבתי על בסיס ${item.description}.`
        ];
        
        if (item.isDefaultUsed) {
            lines.push(`זה הסטנדרט המומלץ למוצר הזה 👍`);
        }
        
        if (item.upsell) {
            lines.push('');
            lines.push(`💡 ${item.upsell.message}`);
        }
        
        return lines.join('\n');
    },
    
    // עדכון כמות
    quote_updated: (item, oldQty) => {
        return `עדכנתי את ${item.product_name} מ-${oldQty.toLocaleString()} ל-${item.qty.toLocaleString()}. המחיר החדש: ₪${item.client_price.toLocaleString()}.`;
    },
    
    // הסרת פריט
    item_removed: (productName) => {
        return `הסרתי את ${productName} מהעגלה. מה עוד אפשר לעזור?`;
    },
    
    // פריט לא נמצא
    item_not_found: (productName) => {
        return `לא מצאתי "${productName}" בעגלה. תרצה לראות מה יש שם?`;
    },
    
    // ניקוי עגלה
    cart_cleared: () => {
        return `העגלה רוקנה. במה נתחיל הפעם?`;
    },
    
    // סטטוס עגלה
    cart_status: (cart, stats) => {
        if (cart.length === 0) {
            return `העגלה ריקה כרגע. מה תרצה להזמין?`;
        }
        
        const lines = [`📦 **העגלה שלך:**\n`];
        
        cart.forEach((item, idx) => {
            lines.push(`${idx + 1}. ${item.product_name} × ${item.qty.toLocaleString()} → ₪${item.client_price.toLocaleString()}`);
        });
        
        lines.push('');
        lines.push(`💰 **סה"כ: ₪${stats.totalPrice.toLocaleString()}**`);
        
        return lines.join('\n');
    },
    
    // חסר כמות
    missing_quantity: (product) => {
        const productName = getProductHebrewName(product);
        return `כמה ${productName} צריך? (למשל: 500, 1000, 5000)`;
    },
    
    // חסר מוצר
    missing_product: (qty) => {
        return `${qty.toLocaleString()} של מה? 😊\n\nאפשר: כרטיסי ביקור, פליירים, הזמנות, רולאפ, מדבקות...`;
    },
    
    // שאלת עיצוב
    design_question: () => {
        return `לפני שממשיכים - יש לך קובץ מוכן להדפסה?\n\n` +
               `✅ כן, PDF מוכן\n` +
               `📄 יש לי עיצוב אבל לא בטוח\n` +
               `🎨 צריך עיצוב\n` +
               `🆕 צריך הכל מאפס`;
    },
    
    // Upsell
    upsell_suggestion: (current, suggested, extraCost, extraUnits) => {
        if (extraCost === 0) {
            return `💡 טיפ: תקבל ${extraUnits.toLocaleString()} יחידות נוספות בחינם! (ממילא מודפסות על אותו גיליון)`;
        }
        return `💡 טיפ: ב-₪${extraCost} נוספים בלבד תקבל ${suggested.toLocaleString()} במקום ${current.toLocaleString()}!`;
    },
    
    // ברכת פתיחה
    greeting: () => {
        const hour = new Date().getHours();
        let timeGreeting = 'שלום';
        if (hour >= 5 && hour < 12) timeGreeting = 'בוקר טוב';
        else if (hour >= 12 && hour < 17) timeGreeting = 'צהריים טובים';
        else if (hour >= 17 && hour < 21) timeGreeting = 'ערב טוב';
        else timeGreeting = 'לילה טוב';
        
        const greetings = [
            `${timeGreeting}! 👋 אני פיני מדפוס בית יצחק. מה נדפיס היום?`,
            `${timeGreeting}! אשמח לעזור עם הצעת מחיר לדפוס. מה צריך?`,
            `היי! 😊 אני כאן לעזור. ספר לי מה אתה מחפש`
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    },
    
    // שגיאה כללית
    error_generic: () => {
        return `אופס, משהו השתבש. אפשר לנסות שוב?`;
    },
    
    // אישור הזמנה
    order_confirmation: (cart, stats) => {
        return `✅ מעולה! הצעת המחיר מוכנה:\n\n` +
               `${cart.length} פריטים\n` +
               `סה"כ: ₪${stats.totalPrice.toLocaleString()}\n\n` +
               `לשלוח PDF או להמשיך להוסיף פריטים?`;
    }
};

/**
 * בניית תשובה מבוססת תבנית
 */
function buildResponse(action, data) {
    switch (action) {
        case 'quote_added':
            return TEMPLATES.quote_added(data.item);
            
        case 'quote_updated':
            return TEMPLATES.quote_updated(data.item, data.oldQty);
            
        case 'item_removed':
            return TEMPLATES.item_removed(data.productName);
            
        case 'item_not_found':
            return TEMPLATES.item_not_found(data.productName);
            
        case 'cart_cleared':
            return TEMPLATES.cart_cleared();
            
        case 'cart_status':
            return TEMPLATES.cart_status(data.cart, data.stats);
            
        case 'missing_quantity':
            return TEMPLATES.missing_quantity(data.product);
            
        case 'missing_product':
            return TEMPLATES.missing_product(data.qty);
            
        case 'design_question':
            return TEMPLATES.design_question();
            
        case 'upsell':
            return TEMPLATES.upsell_suggestion(
                data.current, 
                data.suggested, 
                data.extraCost,
                data.extraUnits
            );
            
        case 'greeting':
            return TEMPLATES.greeting();
            
        case 'error':
            return TEMPLATES.error_generic();
            
        default:
            return null; // יחזיר null אם צריך LLM
    }
}

/**
 * שמות מוצרים בעברית
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

/**
 * בניית Quick Reply buttons
 */
function buildQuickReplies(action, data = {}) {
    switch (action) {
        case 'quantity_options':
            return [
                { text: '250', value: '250' },
                { text: '500', value: '500' },
                { text: '1,000', value: '1000' },
                { text: '2,500', value: '2500' },
                { text: '5,000', value: '5000' }
            ];
            
        case 'product_options':
            return [
                { text: '🃏 כרטיסי ביקור', value: 'כרטיסי ביקור' },
                { text: '📄 פליירים', value: 'פליירים' },
                { text: '💌 הזמנות', value: 'הזמנות' },
                { text: '🎯 רולאפ', value: 'רולאפ' },
                { text: '🏷️ מדבקות', value: 'מדבקות' }
            ];
            
        case 'design_options':
            return [
                { text: '✅ כן, PDF מוכן', value: 'design_ready' },
                { text: '📄 יש עיצוב, לא בטוח', value: 'design_check' },
                { text: '🎨 צריך עיצוב', value: 'design_needed' },
                { text: '🆕 צריך הכל', value: 'design_full' }
            ];
            
        case 'confirm_options':
            return [
                { text: '✅ אשר הזמנה', value: 'confirm' },
                { text: '📝 שנה משהו', value: 'edit' },
                { text: '📄 שלח PDF', value: 'pdf' }
            ];
            
        case 'yes_no':
            return [
                { text: '✅ כן', value: 'yes' },
                { text: '❌ לא', value: 'no' }
            ];
            
        default:
            return [];
    }
}

module.exports = {
    buildResponse,
    buildQuickReplies,
    getProductHebrewName,
    TEMPLATES
};
