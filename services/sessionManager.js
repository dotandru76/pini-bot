// services/sessionManager.js
const fs = require('fs');
const path = require('path');

// --- חוקי ברירת מחדל (Fallback) למקרה שקובץ החוקים חסר ---
const DEFAULT_RULES = `
*** Pini Project - Iron Rules V4 ***

1. Server Architecture:
   - Calculation Engine: Use 'calculate_custom_job' exclusively for ALL price requests.
   - Global Profitability: Server returns 'total_deal_stats' summarizing the ENTIRE cart.
   - Smart Cart: Prevents duplicates - updates existing items instead of adding new ones.

2. Bot Behavior - CRITICAL:
   - NO PRICES IN TEXT: Never write prices in your text responses. Prices appear ONLY in the Visual Card.
   - Smart Defaults: If user doesn't specify paper/finishing, use smart defaults and TELL the user what you chose.
   - MUST SAY: "חישבתי על בסיס [נייר שנבחר], שזה הסטנדרט ל[סוג המוצר]."
   - Be friendly and professional. Speak Hebrew.

3. Visual Output:
   - Price Breakdown: Card shows Paper/Print/Setup/Finishing costs.
   - Production Setup: Instructions for machine operator.
   - Manager Dashboard: Shows total deal profitability.

4. Product Mapping (Hebrew to English):
   - "כרטיס ביקור" / "כרטיסי ביקור" → Business Card
   - "פלייר" / "פליירים" / "עלון" / "לחלוקה" → Flyer
   - "הזמנה" / "הזמנות" → Invitation
   - "פוסטר" / "כרזה" → Poster
   - "חוברת" / "קטלוג" → Booklet

5. Cart Management:
   - "תמחק" / "הסר" / "תוריד" → remove_item_from_cart
   - "נקה עגלה" / "התחל מחדש" → remove_item_from_cart with "ALL"

6. Response Style:
   - Keep responses SHORT and friendly
   - Don't repeat the price in text - it's in the card
   - Ask follow-up questions if needed
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

// פונקציה לעדכון העגלה
function updateCart(userId, newQuote) {
    const session = getSession(userId);
    
    const normalize = (str) => str ? str.toLowerCase().trim() : "";

    const existingIndex = session.cart.findIndex(item => 
        normalize(item.product_name) === normalize(newQuote.product_name)
    );
    
    if (existingIndex !== -1) {
        console.log(`[Smart Cart] Updating existing item: ${newQuote.product_name}`);
        session.cart[existingIndex] = newQuote;
    } else {
        console.log(`[Smart Cart] Adding new item: ${newQuote.product_name}`);
        session.cart.push(newQuote);
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
    console.log(`[Smart Cart] Cart cleared for user: ${userId.substring(0, 8)}...`);
    return true;
}

// יצירת ה-System Prompt המלא
function generateSystemPrompt(userId) {
    const session = getSession(userId);
    
    // סיכום עגלה עבור ה-AI
    let cartSummary = "העגלה ריקה.";
    if (session.cart.length > 0) {
        cartSummary = "עגלה נוכחית:\n" + session.cart.map((item, idx) => 
            `${idx + 1}. ${item.product_name} | כמות: ${item.qty} | מחיר: ₪${item.client_price}`
        ).join('\n');
    }

    let masterRules = DEFAULT_RULES;
    
    // מנסה לטעון את קובץ החוקים החיצוני
    try {
        const v4Path = path.join(__dirname, '../pini_rules_v4');
        
        if (fs.existsSync(v4Path)) {
            masterRules = fs.readFileSync(v4Path, 'utf8');
            console.log("📜 Loaded external rules: pini_rules_v4");
        } else {
            console.log("⚠️ pini_rules_v4 not found, using internal fallback.");
        }
    } catch (err) {
        console.error("❌ Error reading rules file:", err.message);
    }

    return `
אתה פיני, נציג שירות של דפוס בית יצחק. אתה ידידותי, מקצועי ומדבר עברית.

${masterRules}

--- מצב נוכחי ---
${cartSummary}

--- הנחיות חשובות ---
1. כשמבקשים הצעת מחיר - השתמש תמיד בכלי calculate_custom_job
2. אל תכתוב מחירים בטקסט - הם מופיעים בכרטיס הויזואלי
3. אם לא צוין נייר - בחר ברירת מחדל והסבר ללקוח
4. היה קצר וענייני
`;
}

module.exports = {
    getSession,
    updateCart,
    removeFromCart,
    clearCart,
    generateSystemPrompt
};
