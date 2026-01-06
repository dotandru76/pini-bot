/**
 * Pini Universal Router (V5.1 - With Context Memory)
 * ==================================================
 * מנוע הבנה מבוסס LLM שמתנהג כמו איש מכירות חכם.
 * הופך שפה טבעית לפקודות JSON שהשרת יודע לבצע בבטחה.
 * *עדכון:* כולל זיכרון שיחה לטיפול בתשובות המשך.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// משתמשים במודל Flash - זול, מהיר וחכם מספיק לניתוב
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
 * הפונקציה שמנתבת את כל ההודעות (כשהמנוע המהיר נכשל)
 * כעת מקבלת גם את היסטוריית השיחה!
 */
async function routeRequest(message, currentCartContext = [], history = []) {
    
    // סיכום העגלה
    const cartSummary = currentCartContext.length > 0 
        ? currentCartContext.map(i => `${i.product_name} (${i.qty})`).join(', ')
        : "עגלה ריקה";

    // עיבוד ההיסטוריה: לוקחים את 3 ההודעות האחרונות כדי לתת הקשר
    // זה קריטי כדי להבין תשובות כמו "כן", "לא", "יש לי קובץ"
    const lastMessages = history.slice(-3).map(m => 
        `${m.role === 'model' ? 'בוט' : 'לקוח'}: "${m.content}"`
    ).join('\n    ');

    const systemPrompt = `
    אתה "המוח המנתב" של פיני, בוט מכירות לדפוס.
    תפקידך: לנתח את הודעת הלקוח ולהוציא פקודת JSON מדויקת לשרת.
    
    המוצרים שלנו:
    ${PRODUCT_LIST_SHORT}

    רשימת כוונות (Intents) מותרות:
    1. "quote": בקשת הצעת מחיר או הוספה (דוגמה: "תכין לי 1000 כרטיסים").
    2. "update": שינוי פריט קיים (דוגמה: "תשנה ל-500", "תוסיף למינציה").
    3. "remove": הסרת פריט (דוגמה: "תבטל את הרולאפ").
    4. "show_menu": בקשת תפריט או המלצה (דוגמה: "מה יש לחתונה?", "אני צריך דברים לכנס").
    5. "consult": שאלה מקצועית, תשובה לשאלת הבוט (כמו "יש לי קובץ"), או בקשת עזרה.
    6. "greeting": סתם שלום/נימוס (דוגמה: "היי", "תודה").
    7. "checkout": הלקוח רוצה לסיים/לשלם (דוגמה: "תשלח הצעה", "איך משלמים?").
    8. "status": בדיקת מצב עגלה (דוגמה: "מה יש לי בעגלה?", "כמה יצא הכל?").
    9. "design_check": הלקוח מדבר על קובץ מוכן/עיצוב (דוגמה: "יש לי PDF", "צריך עיצוב?").

    היסטוריית שיחה אחרונה (להקשר בלבד):
    --- התחלת היסטוריה ---
    ${lastMessages || "אין היסטוריה"}
    --- סוף היסטוריה ---

    הנחיות קריטיות לשימוש בהיסטוריה:
    - אם הבוט שאל שאלה בהודעה הקודמת, והלקוח עונה תשובה קצרה (כמו "כן", "לא", "יש לי"),
      עליך לסווג את זה לפי נושא השאלה (לרוב 'consult' או 'design_check'), **ולא** כ-'greeting'!
    
    הנחיות ל-JSON:
    - product: קוד המוצר באנגלית (למשל 'bc').
    - qty: מספר שלם בלבד.
    - context: אם הלקוח ציין אירוע (חתונה/כנס) - שמור ב-'context'.
    - attributes: אם הלקוח ציין נייר/גימור, שמור באובייקט.

    הודעת הלקוח הנוכחית: "${message}"
    מצב עגלה: ${cartSummary}
    `;

    try {
        const result = await routerModel.generateContent(systemPrompt);
        const responseText = result.response.text();
        const response = JSON.parse(responseText);
        
        if (!response.intent) response.intent = 'consult';
        return response;
        
    } catch (error) {
        console.error("Router Error:", error);
        return { intent: "consult", error: true };
    }
}

module.exports = { routeRequest };