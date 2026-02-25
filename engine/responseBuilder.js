/** engine/responseBuilder.js */
const RESPONSES = {
    ask_quantity: () => `בשמחה! איזו כמות נדפיס?`,

    // ברכה מומחית
    greeting: () => "היי! אני פיני, מומחה הדפוס של בית יצחק. 👨‍🎨\nאני כאן לייעץ ולתת הצעות מחיר.\nאיך אוכל לעזור היום?",

    cart_status: (ctx) => {
        if (!ctx.cart || ctx.cart.length === 0) return "העגלה ריקה כרגע. בוא נתחיל!";
        return `📂 **סיכום ביניים:**\nיש לך ${ctx.cart.length} פריטים בעגלה.\nסה"כ: ₪${ctx.cart.reduce((s, i) => s + i.client_price, 0)}`;
    },

    send_quote: () => "הפקתי לך הצעת מחיר מסודרת. 👇",

    unknown: () => "אני איתך. כדי שאוכל לתת הצעה, תגיד לי איזה מוצר אתה צריך (למשל: פליירים, מדבקות, חוברות)."
};

const QUICK_REPLIES = {
    greeting: [], // ריק! לא דוחפים מוצרים
    send_quote: [{ label: 'תודה', value: 'reset' }]
};

function buildResponse(key, ctx) { return RESPONSES[key] ? RESPONSES[key](ctx) : RESPONSES.unknown(); }
function buildQuickReplies(key) { return QUICK_REPLIES[key] || []; }

module.exports = { buildResponse, buildQuickReplies };