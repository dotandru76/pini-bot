/**
 * Session Manager - Pini Print Bot (Fixed Prompt)
 * ===============================================
 */
const fs = require('fs');
const path = require('path');

// טעינת הידע העסקי
let PRODUCT_CATALOG = {};
let BUSINESS_INFO = { faq: {} };

try {
    const catalogData = require('../engine/productCatalog');
    PRODUCT_CATALOG = catalogData.PRODUCT_CATALOG || {};
    BUSINESS_INFO = catalogData.BUSINESS_INFO || { faq: {} };
} catch (e) { console.warn("⚠️ Warning: Could not load productCatalog."); }

const sessions = {};
const SESSION_TIMEOUT = 30 * 60 * 1000;

function getSession(userId) {
    const now = Date.now();
    if (!sessions[userId]) sessions[userId] = createNewSession(userId);
    if (now - sessions[userId].lastInteraction > SESSION_TIMEOUT) sessions[userId] = createNewSession(userId);
    sessions[userId].lastInteraction = now;
    return sessions[userId];
}

function createNewSession(userId) {
    return {
        id: userId,
        cart: [],
        history: [],
        lastInteraction: Date.now(),
        customerPhone: null
    };
}

// === הפרומפט המתוקן ===
function generateSystemPrompt(userId) {
    const session = getSession(userId);
    
    let cartSummary = "העגלה ריקה.";
    if (session.cart.length > 0) {
        cartSummary = "🛒 עגלה נוכחית:\n" + session.cart.map((item, idx) => 
            `${idx + 1}. ${item.product_name} | כמות: ${item.qty} | מחיר: ₪${item.client_price}`
        ).join('\n');
    }

    // הזרקת ידע
    let knowledgeBase = "";
    if (BUSINESS_INFO.details) {
        knowledgeBase = `
פרטי העסק: ${BUSINESS_INFO.details.name}, ${BUSINESS_INFO.details.location}
שעות: ${BUSINESS_INFO.details.hours}
משלוחים: ${BUSINESS_INFO.details.shipping}
`;
    }

    return `
אתה פיני, נציג המכירות של דפוס בית יצחק.
מטרתך: לעזור ללקוח להזמין מוצרי דפוס ולתת הצעות מחיר.

🛑 **חוק ברזל (CRITICAL):**
כשהלקוח מבקש להזמין מוצרים (כמו "תכין לי 1000 כרטיסים ו-500 פליירים"), אתה **חייב** להפעיל את הכלי (Function Call) שנקרא **calculate_custom_job** עבור כל מוצר בנפרד!
**אסור לך** להגיד "אני לא יכול לתת מחיר" או "תשתמש במחשבון". יש לך את המחשבון - תשתמש בו!

הנחיות נוספות:
1. ענה קצר, בעברית ישראלית טבעית ("סבבה", "אחלה", "אין בעיה").
2. לשאלות מידע (איפה אתם, מתי פתוח) - ענה לפי המידע למטה.
3. לשאלות טכניות (בליד, קבצים) - ענה מקצועית.

${knowledgeBase}

${cartSummary}
`;
}

function removeFromCart(userId, keyword) {
    const session = getSession(userId);
    const startLen = session.cart.length;
    session.cart = session.cart.filter(i => !i.product_name.includes(keyword));
    return session.cart.length < startLen;
}

function clearCart(userId) {
    const session = getSession(userId);
    session.cart = [];
    return true;
}

module.exports = { getSession, generateSystemPrompt, removeFromCart, clearCart };