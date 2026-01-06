/**
 * Session Manager
 * ===============
 * מנהל את הזיכרון לטווח קצר של המשתמשים (עגלה, היסטוריה).
 * הכל נשמר בזיכרון (RAM) ונמחק כשהשרת עושה ריסטרט.
 */

const sessions = {};

/**
 * מקבל או יוצר סשן למשתמש
 */
function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = {
            id: userId,
            cart: [],
            history: [], // היסטוריית שיחה
            customerPhone: null,
            lastInteraction: Date.now()
        };
    }
    return sessions[userId];
}

/**
 * מוסיף הודעה להיסטוריה (כדי שהבוט יזכור הקשר)
 */
function addToHistory(userId, role, content) {
    const session = getSession(userId);
    
    // מוודא שהמערך קיים
    if (!session.history) session.history = [];
    
    session.history.push({
        role: role, // 'user' or 'model'
        content: content,
        timestamp: Date.now()
    });

    // שומר רק את ה-20 הודעות האחרונות כדי לא להעמיס על הזיכרון
    if (session.history.length > 20) {
        session.history.shift();
    }
}

/**
 * מסיר פריט מהעגלה לפי שם
 */
function removeFromCart(userId, productKey) {
    const session = getSession(userId);
    const initialLength = session.cart.length;
    
    if (!productKey) return false;

    // מסנן החוצה את הפריט שמכיל את המילה (למשל 'flyer')
    session.cart = session.cart.filter(item => {
        const pName = (item.product_name || '').toLowerCase();
        const key = productKey.toLowerCase();
        
        // אם מצאנו התאמה - לא מחזירים את הפריט (מוחקים אותו)
        return !pName.includes(key) && !item.product_category.includes(key);
    });

    return session.cart.length < initialLength; // מחזיר true אם משהו נמחק
}

/**
 * מנקה את כל העגלה
 */
function clearCart(userId) {
    const session = getSession(userId);
    session.cart = [];
}

module.exports = {
    getSession,
    addToHistory, // <--- זה היה חסר לך!
    removeFromCart,
    clearCart
};