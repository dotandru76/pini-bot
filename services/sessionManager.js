const fs = require('fs');
const path = require('path');

// --- חוקי ברירת מחדל (Fallback) למקרה שקובץ החוקים חסר ---
const DEFAULT_RULES = `
*** Pini Project - Iron Rules V4 (Fallback Mode) ***
1. Server Architecture:
   - Calculation Engine: Use 'calculate_custom_job' exclusively.
   - Global Profitability: Returns 'total_deal_stats' summarizing the ENTIRE cart.
   - Smart Cart: Prevent duplicates.
2. Bot Behavior:
   - NO PRICES IN TEXT: Show prices ONLY via the Visual Card tool.
   - Smart Defaults: If specs are missing, assume standard.
   - MUST SAY: "Calculated based on [default chosen], which is standard."
3. Visuals:
   - Price Breakdown: Card must show Paper/Print/Finishing costs.
   - Production Setup: Instructions for the machine operator.
   - Manager Dashboard: Show "Cost vs Pay".
`;

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

// ✅ פונקציה לעדכון העגלה - מתוקנת (סוגריים תקינים בלוגים)
function updateCart(userId, newQuote) {
    const session = getSession(userId);
    
    // נרמול שם המוצר להשוואה קלה
    const normalize = (str) => str ? str.toLowerCase().trim() : "";

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

// פונקציה למחיקת פריט ספציפי
function removeFromCart(userId, productToDelete) {
    const session = getSession(userId);
    const initialLength = session.cart.length;
    
    session.cart = session.cart.filter(item => 
        !item.product_name.toLowerCase().includes(productToDelete.toLowerCase())
    );

    if (session.cart.length < initialLength) {
        console.log(`[Smart Cart] Removed item containing: "${productToDelete}"`);
        return true; 
    }
    return false;
}

// פונקציית איפוס עגלה
function clearCart(userId) {
    const session = getSession(userId);
    session.cart = [];
    console.log(`[Smart Cart] Cart cleared completely for user: ${userId}`);
    return true;
}

// יצירת ה-System Prompt המלא (עם טעינת קובץ חיצוני)
function generateSystemPrompt(userId) {
    const session = getSession(userId);
    
    // סיכום עגלה עבור ה-AI
    let cartSummary = "Cart is empty.";
    if (session.cart.length > 0) {
        cartSummary = "Current Cart:\n" + session.cart.map((item, idx) => 
            `${idx+1}. ${item.product_name} | Qty: ${item.qty} | Price: ₪${item.client_price}`
        ).join('\n');
    }

    let masterRules = DEFAULT_RULES;
    try {
        // מנסה לטעון את קובץ החוקים החיצוני
        const v4Path = path.join(__dirname, '../pini_rules_v4');
        
        if (fs.existsSync(v4Path)) {
            masterRules = fs.readFileSync(v4Path, 'utf8');
        } else {
            console.log("⚠️ pini_rules_v4 missing, using internal fallback.");
        }
    } catch (err) {
        console.error("❌ Error reading rules file:", err.message);
    }

    return `
    ${masterRules}

    [REAL-TIME DATA]
    ${cartSummary}
    
    User ID: ${userId}
    Ensure all responses follow the "Visual Card" protocol defined in the rules.
    `;
}

module.exports = {
    getSession,
    updateCart,
    removeFromCart,
    clearCart,
    generateSystemPrompt
};