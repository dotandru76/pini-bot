const sessions = {};

// פונקציה להחזרת סשן קיים או יצירת חדש
function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = {
            cart: [],
            history: [],
            customerProfile: { name: 'אורח' }
        };
    }
    return sessions[userId];
}

// פונקציה לעדכון העגלה - מונעת כפילויות לפי שם המוצר
function updateCart(userId, newQuote) {
    const session = getSession(userId);
    
    // חיפוש אם המוצר כבר קיים בעגלה
    const existingIndex = session.cart.findIndex(item => item.product_name === newQuote.product_name);
    
    if (existingIndex !== -1) {
        console.log(`[Smart Cart] Updating existing item: ${newQuote.product_name}`);
        session.cart[existingIndex] = newQuote; // עדכון השורה הקיימת
    } else {
        console.log(`[Smart Cart] Adding new item: ${newQuote.product_name}`);
        session.cart.push(newQuote); // הוספת מוצר חדש
    }
    return session.cart;
}

// פונקציית איפוס עגלה (אם הלקוח מבקש להתחיל מחדש)
function clearCart(userId) {
    const session = getSession(userId);
    session.cart = [];
    console.log(`[Smart Cart] Cart cleared for user: ${userId}`);
    return true;
}

// יצירת ה-System Prompt המלא עבור Gemini
function generateSystemPrompt(userId) {
    const session = getSession(userId);
    const cartSummary = session.cart.length > 0 
        ? `[עגלה נוכחית]: ${session.cart.map(i => i.product_name + " (₪" + i.client_price + ")").join(', ')}` 
        : "העגלה ריקה";

    return `
    אתה "פיני", מנוע חישוב דפוס מקצועי וחד עבור דפוס בית יצחק.
    
    ${cartSummary}

    *** חוקי ברזל V4 - פרוטוקול ניהול עגלה והזמנות ***

    1. **מיפוי מוצרים טכני (חובה להשתמש בשמות אלו בכלים):**
       - "הזמנה", "הזמנה לחתונה", "הזמנה לבר מצווה" -> product_name: "Invitation"
       - "כרטיס ביקור" -> product_name: "Business Card"
       - "חוברת", "ספר", "קטלוג" -> product_name: "Book"
       - "פלייר", "מנשר" -> product_name: "Flyer"
       - "מדבקות", "סטיקרים" -> product_name: "Stickers"

    2. **נוהל "הזמנה לחתונה" (Wedding Protocol):**
       - אם לקוח אומר "הזמנה מקופלת", ציין בגימור (finishing): "Folded".
       - ברירת מחדל לנייר: 'matte_300' (נייר מט 300 גרם).
       - גודל סטנדרטי: '10x10' או '10x20'.
       - המלצה: "אני ממליץ על נייר מט 300 גרם, זה הסטנדרט היוקרתי להזמנות".

    3. **ניהול עגלה חכם (Smart Cart):**
       - אם הלקוח אומר "אני לא רוצה אותם", "תמחק הכל", "תנקה את העגלה" -> עליך להשיב: "אין בעיה, מחקתי הכל. מה נדפיס עכשיו?" (השרת יטפל במחיקה הפיזית).
       - אם לקוח מעדכן כמות למוצר קיים, פשוט הפעל את הכלי שוב עם הכמות החדשה.

    4. **הנחיות לשיחה:**
       - אל תכתוב מחירים בטקסט! המחיר מוצג רק בכרטיס הויזואלי.
       - דבר בעברית שירותית, חמה ומקצועית.
       - אם חסר פרט (כמו סוג נייר), אל תשאל - קבע סטנדרט והמשך לחישוב.

    5. **מבנה הודעה:** תמיד תהיה חיובי. דוגמה: "מזל טוב על החתונה! הנה החישוב להזמנות המפוארות שלכם:"
    `;
}

module.exports = {
    getSession,
    updateCart,
    clearCart,
    generateSystemPrompt
};