/**
 * Response Builder V3 - Pini Print Bot
 * =====================================
 * בונה את תשובת ה-JSON הסופית ללקוח
 * כולל טקסט, דשבורד, ו-Quick Replies חכמים
 */

const { generateQuickReplies } = require('./menuGenerator');
const { generateDashboard } = require('./dashboardManager');

/**
 * פונקציה ראשית לבניית התגובה
 * @param {object} session - אובייקט הסשן (כולל העגלה)
 * @param {object} classification - תוצאת הסיווג (action, data)
 * @param {string} llmResponseText - הטקסט שיצר ה-LLM (או טקסט גנרי)
 * @param {object} customer - פרטי הלקוח (אופציונלי)
 */
function buildResponse(session, classification, llmResponseText, customer) {
    
    // 1. זיהוי המוצר הנוכחי (אם יש) לטובת כפתורים רלוונטיים
    let currentProduct = classification.data?.product;
    
    // אם אין מוצר בבקשה הנוכחית, נבדוק אם יש משהו בעגלה שאפשר להתייחס אליו
    if (!currentProduct && session.cart.length > 0) {
        // ניקח את המוצר האחרון שנוסף/עודכן בעגלה
        currentProduct = session.cart[session.cart.length - 1].product_name;
    }

    // 2. יצירת כפתורים חכמים (Chips/Quick Replies) באמצעות המנוע החדש
    const quickReplies = generateQuickReplies(classification, currentProduct);

    // 3. יצירת דשבורד (תקציר עסקה)
    // מעבירים את הטלפון של הלקוח אם קיים, כדי להציג מידע פרסונלי
    const dashboard = generateDashboard(session, customer?.phone);

    // 4. בניית האובייקט הסופי שמוחזר לקליינט (API Response)
    return {
        // הטקסט לתצוגה (בועת צ'אט)
        text: llmResponseText || "אוקיי, הבנתי. איך אפשר להמשיך?", 
        
        // מטא-דאטה לשימוש הקליינט (Frontend / WhatsApp)
        meta: {
            intent: classification.action,       // מה המשתמש רצה (quote, chat, etc)
            product: currentProduct,             // המוצר המדובר
            mood: 'neutral',                     // (אופציונלי - לשימוש עתידי עם PersonalityEngine)
            quick_replies: quickReplies          // רשימת הכפתורים להצגה
        },

        // נתונים להצגה ויזואלית (Visual Cards)
        cart: session.cart,                      // העגלה המלאה
        dashboard: dashboard                     // סיכום המנהלים/לקוח
    };
}

module.exports = { buildResponse };