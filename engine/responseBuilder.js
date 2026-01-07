/**
 * Pini Response Builder V9 (Complete Edition)
 * ===========================================
 * המנוע שהופך נתונים יבשים לטקסט אנושי וזורם.
 * כולל:
 * - תמיכה בכל סוגי התבניות של ה-Planner.
 * - גיוון בניסוחים (כדי לא להישמע רובוטי).
 * - טיפול באפשרויות דחיפות (Upsell).
 */

// עזר: בחירה רנדומלית ממערך לגיוון התשובות
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const RESPONSES = {
    // --- הוספה ועדכון ---
    quote_added: (ctx) => {
        const item = ctx.item;
        const openers = ['מעולה!', 'אחלה בחירה.', 'רשמתי.', 'אין בעיה.'];
        const opener = pick(openers);
        
        return `${opener} הוספתי לעגלה: ${item.qty} יח' ${item.product_name}.\n` +
               `💰 מחיר: ₪${item.client_price}\n` +
               `💡 מפרט: ${item.paper_type || 'סטנדרט'} | ${item.print_type || 'צבעוני'}`;
    },
    
    quote_updated: (ctx) => {
        const item = ctx.item;
        return `עדכנתי את הכמות! 👍\n` +
               `עכשיו יש לך ${item.qty} יח' של ${item.product_name}.\n` +
               `המחיר המעודכן: ₪${item.client_price}`;
    },

    quote_premium_suggestion: (ctx) => {
        const item = ctx.item;
        return `הבנתי שאתה מחפש משהו ברמה גבוהה. ✨\n` +
               `שמתי לך ${item.product_name} על נייר ${item.paper_type} (פרימיום).\n` +
               `זה יוצא ₪${item.client_price} ל-${item.qty} יחידות.\nאיך זה נשמע?`;
    },

    // --- שאלות והבהרות ---
    ask_quantity: (ctx) => {
        const prod = ctx.item?.product_name || "את המוצר";
        const questions = [
            `בשמחה! איזו כמות של ${prod} תרצה להדפיס?`,
            `כמה יחידות של ${prod} להכין לך?`,
            `אין בעיה. מה הכמות הדרושה ל-${prod}?`
        ];
        return pick(questions) + " (למשל: 100, 1000...)";
    },

    ask_general: (ctx) => {
        // ברירת מחדל כשהשרת צריך לשאול משהו כללי
        return "חסרים לי קצת פרטים כדי לתת מחיר מדויק. 🤔\nאיזה מוצר וכמות אתה צריך?";
    },

    ask_clarification: () => {
        return "סליחה, לא הייתי בטוח למה התכוונת. 😅\nתוכל לפרט איזה מוצר וכמות? (למשל: '1000 פליירים')";
    },

    // --- ניהול עגלה ---
    item_removed: () => {
        return "אין בעיה, מחקתי את הפריט מהעגלה. 🗑️\nצריך משהו אחר במקום?";
    },

    cart_cleared: () => {
        return "ניקיתי את העגלה! דף חלק. 📄\nמה נדפיס עכשיו?";
    },

    cart_empty_error: () => {
        return "העגלה ריקה כרגע, אז אין לי מה לעדכן או למחוק. 🤷‍♂️\nמה תרצה להזמין?";
    },

    cart_status: (ctx) => {
        if (!ctx.cart || ctx.cart.length === 0) return "העגלה שלך ריקה כרגע 🛒. בוא נמלא אותה!";
        
        let msg = "🛒 **המצב בעגלה:**\n";
        let total = 0;
        ctx.cart.forEach((item, i) => {
            msg += `${i+1}. ${item.product_name} (${item.qty} יח') - ₪${item.client_price}\n`;
            total += item.client_price;
        });
        msg += `\n💰 **סה"כ לתשלום: ₪${total}**`;
        return msg;
    },

    // --- סיום ---
    send_quote: (ctx) => {
        const total = ctx.total || ctx.cart.reduce((sum, item) => sum + item.client_price, 0);
        return `סיכום הזמנה מסודר: 📝\n` +
               `סה"כ לתשלום: ₪${total}\n` +
               `האם לשלוח לך לינק לתשלום והעלאת קבצים?`;
    },

    greeting: () => {
        const hours = new Date().getHours();
        let timeGreeting = "שלום!";
        if (hours >= 5 && hours < 12) timeGreeting = "בוקר טוב! ☀️";
        else if (hours >= 12 && hours < 18) timeGreeting = "צהריים טובים! 🌤️";
        else if (hours >= 18) timeGreeting = "ערב טוב! 🌙";

        return `${timeGreeting} אני פיני מבית יצחק. 🤖\nאפשר לבקש ממני הצעות מחיר, לבדוק סטטוס, או סתם להתייעץ.\nמה נדפיס היום?`;
    }
};

// --- כפתורים מהירים (Quick Replies) ---
const QUICK_REPLIES = {
    quote_added: [
        { text: 'סגור הזמנה', value: 'שלח חשבונית' },
        { text: 'הוסף עוד פריט', value: 'תפריט' },
        { text: 'נקה עגלה', value: 'נקה הכל' }
    ],
    ask_quantity: [
        { text: '100', value: '100' },
        { text: '500', value: '500' },
        { text: '1000', value: '1000' },
        { text: '5000', value: '5000' }
    ],
    greeting: [
        { text: 'כרטיסי ביקור', value: 'כרטיסי ביקור' },
        { text: 'פליירים', value: 'פליירים' },
        { text: 'רולאפ', value: 'רולאפ' },
        { text: 'הזמנות', value: 'הזמנות' }
    ],
    cart_status: [
        { text: 'סיים הזמנה', value: 'checkout' },
        { text: 'נקה הכל', value: 'clear' },
        { text: 'הוסף פריט', value: 'menu' }
    ],
    send_quote: [
        { text: '👍 שלח לינק', value: 'אשר' },
        { text: 'רגע, רוצה לשנות', value: 'status' }
    ],
    ask_general: [
        { text: 'כרטיסי ביקור', value: 'כרטיסי ביקור' },
        { text: 'פליירים', value: 'פליירים' }
    ]
};

/**
 * הפונקציה הראשית שבונה את התשובה
 */
function buildResponse(templateName, context = {}) {
    const builder = RESPONSES[templateName];
    
    // אם התבנית לא קיימת, מחזירים הודעת ברירת מחדל (Fallback)
    if (!builder) {
        console.error(`Missing template: ${templateName}`);
        return "קיבלתי, אבל משהו לא הסתדר לי בתצוגה. 😅";
    }

    let responseText = builder(context);

    // --- הוספת דחיפות (Upsell Logic) ---
    // אם השרת חישב אופציית דחיפות, אנחנו מוסיפים את הטקסט כאן
    if (context.urgency && context.urgency.canExpress) {
        responseText += `\n\n🚀 **ראיתי שזה דחוף!**\n` +
                        `אפשר להריץ את זה במסלול אקספרס בתוספת ₪${context.urgency.cost}.\n` +
                        `לאשר אקספרס?`;
    }

    return responseText;
}

function buildQuickReplies(templateName) {
    return QUICK_REPLIES[templateName] || [];
}

module.exports = { buildResponse, buildQuickReplies };