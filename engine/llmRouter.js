/**
 * Pini Universal Router (V6 - Multi-Item & Context Support)
 * ========================================================
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
 * הפונקציה שמנתבת את ההודעות ומבינה הקשר
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
    אתה "המוח המנתב" של פיני, בוט מכירות לדפוס. תפקידך להוציא JSON מדויק.
    
    מוצרים:
    ${PRODUCT_LIST_SHORT}

    כוונות (Intents):
    1. "quote": בקשת מחיר או הוספה (גם עבור כמה מוצרים יחד).
    2. "update": שינוי כמות לפריט קיים.
    3. "remove": הסרת פריט.
    4. "show_menu": המלצה או תפריט.
    5. "consult": תשובה לשאלת בוט (כמו "יש לי קובץ"), שאלה מקצועית, או דחיפות.
    6. "greeting": נימוס בלבד.
    7. "checkout": סיום הזמנה.
    8. "status": מצב עגלה.
    9. "design_check": דיבור על קבצים/עיצוב.

    כללים ל-JSON:
    - החזר שדה 'intent' ושדה 'items' (מערך של אובייקטים).
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
        return { intent: "consult", error: true };
    }
}

module.exports = { routeRequest };