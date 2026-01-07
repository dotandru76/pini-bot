/**
 * Pini Universal Router (V7 - Strategy Engine)
 * ============================================
 * מנוע הבנה מבוסס LLM.
 * חידוש: לא רק מבין מה נאמר, אלא מתכנן את הצעד הבא (Strategy).
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// מודל פלאש לביצועים מהירים
const routerModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const PRODUCT_LIST_SHORT = `
- bc: כרטיסי ביקור (business cards)
- flyer: פליירים, מנשרים, עלונים
- invitation: הזמנות (חתונה, אירוע)
- rollup: רולאפ, באנר, שמשונית
- sticker: מדבקות, תוויות
- booklet: חוברות, קטלוגים, מחברות
- poster: פוסטרים, קנבס, קאפה
- office: ניירת משרדית, מעטפות
`;

/**
 * הפונקציה שמנתבת את ההודעות ומבינה הקשר ואסטרטגיה
 */
async function routeRequest(message, currentCartContext = [], history = []) {
    
    const cartSummary = currentCartContext.length > 0 
        ? currentCartContext.map(i => `${i.product_name} (${i.qty})`).join(', ')
        : "עגלה ריקה";

    // הקשר מהודעות אחרונות
    const lastMessages = history.slice(-3).map(m => 
        `${m.role === 'model' ? 'בוט' : 'לקוח'}: "${m.content}"`
    ).join('\n    ');

    const systemPrompt = `
    אתה "המוח המנתב" של פיני, בוט מכירות לדפוס. תפקידך להוציא JSON מדויק ולחזות את הצעד הבא.
    
    מוצרים:
    ${PRODUCT_LIST_SHORT}

    כוונות (Intents):
    1. "quote": בקשת מחיר או הוספה.
    2. "update": שינוי כמות לפריט קיים.
    3. "remove": הסרת פריט.
    4. "show_menu": המלצה או תפריט.
    5. "consult": תשובה לשאלת בוט, שאלה מקצועית, או דחיפות.
    6. "greeting": נימוס בלבד.
    7. "checkout": סיום הזמנה.
    8. "status": מצב עגלה.
    9. "design_check": דיבור על קבצים/עיצוב.

    *** אסטרטגיה (Strategy) - הצעד החכם הבא: ***
    עליך לזהות מה חסר כדי לסגור עסקה ולהנחות את השרת:
    - "offer_popular": הלקוח שאל על מוצר בלי כמות -> השרת יציע את הכמות הנפוצה.
    - "check_urgency": הלקוח נשמע לחוץ ("דחוף", "למחר") -> השרת יבדוק אקספרס.
    - "req_file": יש מוצר וכמות, אבל לא דיברנו על קובץ -> השרת יבקש קובץ.
    - "close_deal": יש הכל (מוצר, כמות, קובץ) -> השרת ידחוף לסגירה.
    - "standard": אין אסטרטגיה מיוחדת, המשך רגיל.

    כללים ל-JSON:
    - החזר שדה 'intent', 'strategy' ושדה 'items' (מערך).
    - כל פריט ב-'items' מכיל: 'product' (קוד באנגלית), 'qty' (מספר), 'attributes' (אובייקט).

    היסטוריה:
    ${lastMessages || "אין"}

    הודעת לקוח: "${message}"
    מצב עגלה: ${cartSummary}
    `;

    try {
        const result = await routerModel.generateContent(systemPrompt);
        const responseText = result.response.text();
        const response = JSON.parse(responseText);
        
        if (!response.intent) response.intent = 'consult';
        if (!response.strategy) response.strategy = 'standard';
        
        // תיקון פורמט אם המודל החזיר מוצר בודד
        if (!response.items && response.product) {
            response.items = [{
                product: response.product,
                qty: response.qty,
                attributes: response.attributes
            }];
        }
        
        return response;
        
    } catch (error) {
        console.error("Router Error:", error);
        return { intent: "consult", strategy: "standard", error: true };
    }
}

module.exports = { routeRequest };