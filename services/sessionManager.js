/**
 * services/sessionManager.js
 * מנהל הזיכרון (In-Memory Session Store)
 * =======================================
 * תפקיד: לשמור את העגלה ואת הסטטוס של כל משתמש.
 * הערה: בייצור אמיתי מחליפים את זה ב-Redis, אבל לפיתוח זה מעולה.
 */

const sessions = {};

// הגדרת זמן תפוגה לשיחה (30 דקות)
const SESSION_TIMEOUT = 30 * 60 * 1000;

function getSession(userId) {
    if (!sessions[userId]) {
        console.log(`✨ New Session created for: ${userId}`);
        sessions[userId] = {
            id: userId,
            cart: [],           // המוצרים שנוספו לעגלה
            currentProduct: null, // המוצר שעליו מדברים כרגע
            draftAttributes: {},  // תשובות זמניות (לפני חישוב)
            lastActive: Date.now()
        };
    }
    
    // עדכון זמן פעילות אחרון
    sessions[userId].lastActive = Date.now();
    return sessions[userId];
}

function clearSession(userId) {
    if (sessions[userId]) {
        // שומרים על העגלה, מאפסים רק את השיחה הנוכחית
        sessions[userId].currentProduct = null;
        sessions[userId].draftAttributes = {};
        console.log(`🧹 Session context cleared for: ${userId}`);
    }
}

function clearCart(userId) {
    if (sessions[userId]) {
        sessions[userId].cart = [];
        sessions[userId].currentProduct = null;
        sessions[userId].draftAttributes = {};
        console.log(`🗑️ Cart emptied for: ${userId}`);
    }
}

// מנגנון ניקוי אוטומטי לזיכרון (Garbage Collection)
setInterval(() => {
    const now = Date.now();
    Object.keys(sessions).forEach(key => {
        if (now - sessions[key].lastActive > SESSION_TIMEOUT) {
            delete sessions[key];
        }
    });
}, 60 * 1000);

module.exports = { getSession, clearSession, clearCart };