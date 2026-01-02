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
    
    // נרמול שם המוצר להשוואה קלה
    const normalize = (str) => str.toLowerCase().trim();

    // חיפוש אם המוצר כבר קיים בעגלה
    const existingIndex = session.cart.findIndex(item => 
        normalize(item.product_name) === normalize(newQuote.product_name)
    );
    
    if (existingIndex !== -1) {
        console.log(`[Smart Cart] Updating existing item: ${newQuote.product_name}`);
        session.cart[existingIndex] = newQuote; // עדכון השורה הקיימת
    } else {
        console.log(`[Smart Cart] Adding new item: ${newQuote.product_name}`);
        session.cart.push(newQuote); // הוספת מוצר חדש
    }
    return session.cart;
}

// --- חדש: פונקציה למחיקת פריט ספציפי ---
function removeFromCart(userId, productToDelete) {
    const session = getSession(userId);
    const initialLength = session.cart.length;
    
    // מסננים החוצה את הפריט המבוקש
    session.cart = session.cart.filter(item => 
        !item.product_name.toLowerCase().includes(productToDelete.toLowerCase())
    );

    if (session.cart.length < initialLength) {
        console.log(`[Smart Cart] Removed item containing: "${productToDelete}"`);
        return true; // בוצעה מחיקה
    }
    return false; // לא נמצא פריט
}

// פונקציית איפוס עגלה (רק אם הלקוח מבקש במפורש "למחוק הכל")
function clearCart(userId) {
    const session = getSession(userId);
    session.cart = [];
    console.log(`[Smart Cart] Cart cleared completely for user: ${userId}`);
    return true;
}

// יצירת ה-System Prompt המלא עבור Gemini
function generateSystemPrompt(userId) {
    const session = getSession(userId);
    
    // סיכום עגלה עבור ה-AI כדי שידע מה יש כרגע
    const cartSummary = session.cart.length > 0 
        ? `[Current Cart Items]: ${session.cart.map(i => `${i.product_name} (Qty: ${i.qty})`).join(', ')}` 
        : "Cart is empty";

    return `
    You are "Pini" (פיני), an expert print production AI manager for "Dfus Beit Yitzhak".
    
    ${cartSummary}

    *** IRON CLAD RULES (V5) - DO NOT BREAK ***

    1. **PRODUCT MAPPING (STRICT):**
       - "Flyers" -> product_name: "Flyer"
       - "Business Cards" -> product_name: "Business Card"
       - "Books/Booklets" -> product_name: "Book"
       - "Invitations" -> product_name: "Invitation"
       - "Stickers" -> product_name: "Stickers"

    2. **SMART DEFAULTS (ASSERTIVENESS):**
       - **NEVER ASK** about paper type or weight unless the user explicitly asks for options.
       - **Flyers Default:** Paper = "Chrome 135g" (כרומו 135).
       - **Business Cards Default:** Paper = "Matte 300g" (מט 300) + Lamination = "Matte".
       - **Invitations Default:** Paper = "Matte 300g".
       - If user omits details, YOU DECIDE based on these defaults and calculate immediately.
       - Example: User says "1000 flyers". You do NOT ask "Which paper?". You calculate immediately for Chrome 135g.

    3. **CART MANAGEMENT TOOLS:**
       - **To ADD or UPDATE:** Use 'calculate_custom_job'. If the item exists (e.g., Flyer), calling this again with new Qty will update it automatically.
       - **To DELETE a specific item:** Use 'remove_item_from_cart' (e.g., product_name: "Business Card").
       - **To CLEAR ALL:** Use 'remove_item_from_cart' with product_name: "ALL".

    4. **TONE & STYLE:**
       - Speak Hebrew. Professional, short, and efficient.
       - **NO PRICES IN TEXT:** Never write the price in the chat message. Only show it via the tool/card.
       - If the user asks to "change" something (e.g., "Change flyers to 5000"), just run the calculation tool with the new quantity.

    5. **RESPONSE STRUCTURE:**
       - Acknowledge the action briefly ("Update: 5000 flyers calculated.", "Removed business cards.").
    `;
}

module.exports = {
    getSession,
    updateCart,
    removeFromCart, // <--- לוודא שמייצאים את הפונקציה החדשה
    clearCart,
    generateSystemPrompt
};