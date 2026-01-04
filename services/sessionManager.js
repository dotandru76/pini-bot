/**
 * Session Manager - Pini Print Bot
 * =================================
 * מנהל את הזיכרון ומזריק ידע (RAG Lite)
 */

const fs = require('fs');
const path = require('path');
const { PRODUCT_CATALOG, BUSINESS_INFO } = require('../engine/productCatalog'); 

const sessions = {};
const SESSION_TIMEOUT = 30 * 60 * 1000;

function getSession(userId) {
    const now = Date.now();
    if (!sessions[userId]) sessions[userId] = createNewSession(userId);
    
    if (now - sessions[userId].lastInteraction > SESSION_TIMEOUT) {
        sessions[userId] = createNewSession(userId);
    }
    
    sessions[userId].lastInteraction = now;
    return sessions[userId];
}

function createNewSession(userId) {
    return { id: userId, cart: [], lastInteraction: Date.now() };
}

// === הזרקת הידע לפרומפט ===
function generateSystemPrompt(userId) {
    const session = getSession(userId);
    
    // סיכום עגלה
    let cartSummary = "העגלה ריקה.";
    if (session.cart.length > 0) {
        cartSummary = "🛒 עגלה:\n" + session.cart.map((item, idx) => 
            `${idx + 1}. ${item.product_name} | כמות: ${item.qty} | מחיר: ₪${item.client_price}`
        ).join('\n');
    }

    // הזרקת המידע העסקי (RAG)
    let knowledgeBase = `
📌 מידע על הדפוס (השתמש בזה לתשובות):
- שם: ${BUSINESS_INFO.details.name}
- כתובת: ${BUSINESS_INFO.details.location}
- שעות: ${BUSINESS_INFO.details.hours}
- משלוחים: ${BUSINESS_INFO.details.shipping}
- יכולות: ${BUSINESS_INFO.capabilities.digital}, ${BUSINESS_INFO.capabilities.wide}

📚 שאלות נפוצות:
${Object.entries(BUSINESS_INFO.faq).map(([q, a]) => `Q: ${q} A: ${a}`).join('\n')}
`;

    const RULES = `
אתה פיני, הבוט של דפוס בית יצחק.
1. ענה קצר ולעניין בעברית טבעית.
2. השתמש במידע למעלה כדי לענות על שאלות (מיקום, שעות, טכנולוגיה).
3. אל תמציא מחירים! מחירים מחושבים רק ע"י המערכת.
4. אם שואלים משהו שלא מופיע כאן, תגיד שאתה לא בטוח ותציע להתקשר.
`;

    return `${RULES}\n\n${knowledgeBase}\n\n${cartSummary}`;
}

// ... (addToCart, removeFromCart, clearCart נשארים אותו דבר) ...
function addToCart(userId, item) {
    const session = getSession(userId);
    const existingIndex = session.cart.findIndex(i => i.product_name === item.product_name);
    if (existingIndex >= 0) session.cart[existingIndex] = item;
    else session.cart.push(item);
    return session.cart;
}

function removeFromCart(userId, productKeyword) {
    const session = getSession(userId);
    const initialLength = session.cart.length;
    session.cart = session.cart.filter(item => !item.product_name.includes(productKeyword));
    return session.cart.length < initialLength;
}

function clearCart(userId) {
    const session = getSession(userId);
    session.cart = [];
    return true;
}

module.exports = { getSession, generateSystemPrompt, addToCart, removeFromCart, clearCart };