/**
 * Session Manager - Pini Print Bot
 * =================================
 * מנהל את הזיכרון של הבוט ומזריק ידע (RAG Lite) לפרומפט
 */

const fs = require('fs');
const path = require('path');
// טעינת הידע העסקי (ודא שקובץ productCatalog קיים בתיקיית engine)
let PRODUCT_CATALOG = {};
let BUSINESS_INFO = { faq: {} };

try {
    const catalogData = require('../engine/productCatalog');
    PRODUCT_CATALOG = catalogData.PRODUCT_CATALOG || {};
    BUSINESS_INFO = catalogData.BUSINESS_INFO || { faq: {} };
} catch (e) {
    console.warn("⚠️ Warning: Could not load productCatalog. Using defaults.");
}

// מאגר סשנים בזיכרון
const sessions = {};

// הגדרת משך סשן (30 דקות)
const SESSION_TIMEOUT = 30 * 60 * 1000;

function getSession(userId) {
    const now = Date.now();
    
    // יצירת סשן חדש אם לא קיים
    if (!sessions[userId]) {
        sessions[userId] = createNewSession(userId);
    }
    
    // בדיקת Timeout - איפוס אם עבר הזמן
    if (now - sessions[userId].lastInteraction > SESSION_TIMEOUT) {
        console.log(`[Session] Timeout for ${userId}, resetting session.`);
        sessions[userId] = createNewSession(userId);
    }
    
    sessions[userId].lastInteraction = now;
    return sessions[userId];
}

function createNewSession(userId) {
    return {
        id: userId,
        cart: [],           // עגלת קניות
        history: [],        // ✅ התיקון: היסטוריית צ'אט (היה חסר!)
        lastInteraction: Date.now(),
        customerPhone: null // זיהוי לקוח
    };
}

// === בניית הפרומפט ל-LLM עם הזרקת ידע ===
function generateSystemPrompt(userId) {
    const session = getSession(userId);
    
    // 1. סיכום עגלה
    let cartSummary = "העגלה ריקה.";
    if (session.cart.length > 0) {
        cartSummary = "🛒 עגלה נוכחית:\n" + session.cart.map((item, idx) => 
            `${idx + 1}. ${item.product_name} | כמות: ${item.qty} | מחיר: ₪${item.client_price}`
        ).join('\n');
    }

    // 2. בניית מאגר הידע (FAQ) כטקסט
    let knowledgeBase = "";
    if (BUSINESS_INFO.details) {
        knowledgeBase = `
📌 מידע עסקי חשוב (השתמש בזה כדי לענות על שאלות):
- עסק: ${BUSINESS_INFO.details.name || 'דפוס בית יצחק'}
- מיקום: ${BUSINESS_INFO.details.location || 'עמק חפר'}
- שעות: ${BUSINESS_INFO.details.hours || '08:00-18:00'}
- טלפון: ${BUSINESS_INFO.details.phone || ''}
- משלוחים: ${BUSINESS_INFO.details.shipping || 'יש משלוחים'}

📚 שאלות נפוצות ותשובות (FAQ):
${Object.entries(BUSINESS_INFO.faq || {}).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n')}
`;
    }

    // 3. החוקים הקשיחים
    const RULES = `
*** הוראות הפעלה לפיני (בוט דפוס) ***
1. אתה המומחה של הדפוס. ענה קצר, ענייני וחם.
2. השתמש במידע למעלה כדי לענות על שאלות (מיקום, שעות, בליד, קבצים).
3. אם שואלים משהו שלא מופיע במידע - תגיד שאתה לא בטוח ותציע שייצרו קשר בטלפון.
4. אל תמציא מחירים! מחירים מחושבים רק ע"י המחשבון.
5. דבר בעברית טבעית, כמו ישראלי ("אהלן", "סבבה", "בכיף").
`;

    // שילוב הכל
    return `${RULES}\n\n${knowledgeBase}\n\n${cartSummary}`;
}

// === פונקציות עזר לעגלה ===

function removeFromCart(userId, productKeyword) {
    const session = getSession(userId);
    const initialLength = session.cart.length;
    
    // סינון הפריט מהעגלה
    session.cart = session.cart.filter(item => 
        !item.product_name.includes(productKeyword) && 
        !item.product_category?.includes(productKeyword)
    );
    
    return session.cart.length < initialLength;
}

function clearCart(userId) {
    const session = getSession(userId);
    session.cart = [];
    return true;
}

module.exports = {
    getSession,
    generateSystemPrompt,
    removeFromCart,
    clearCart
};