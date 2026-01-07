/**
 * Smart LLM Handler - Pini Print Bot (V3 - Integrated)
 * ====================================================
 * משלב את לוגיקת הבקרה שלך עם המנוע של Google Gemini.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

// אתחול המודל (חובה!)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// === סוגי משימות (העתק מהקוד שלך) ===
const TASK_TYPES = {
    GREETING: 'greeting',
    CLARIFY: 'clarify',
    RECOMMEND: 'recommend',
    EXPLAIN: 'explain',
    CONFIRM_QUOTE: 'confirm_quote',
    HANDLE_OBJECTION: 'handle_objection',
    UPSELL: 'upsell',
    FREESTYLE: 'freestyle'
};

// === Prompts (העתק מהקוד שלך) ===
const TASK_PROMPTS = {
    [TASK_TYPES.GREETING]: `אתה פיני, בוט ידידותי של דפוס 'בית יצחק'. ענה בחום ובקצרה. שאל במה לעזור.`,
    [TASK_TYPES.CLARIFY]: `אתה פיני. הלקוח לא היה ברור. שאל שאלה אחת ממוקדת כדי להבין איזה מוצר הוא צריך (כרטיסי ביקור, פליירים וכו'). אל תציע מחירים.`,
    [TASK_TYPES.RECOMMEND]: `אתה פיני. הלקוח סיפר על אירוע. תן 2-3 רעיונות למוצרי דפוס מתאימים.`,
    [TASK_TYPES.EXPLAIN]: `אתה פיני. הלקוח שואל על אופציות. הסבר בקצרה ובבהירות.`,
    [TASK_TYPES.CONFIRM_QUOTE]: `אתה פיני. השרת חישב מחיר. הצג אותו בצורה נעימה. חובה להשתמש במחיר המדויק שניתן לך.`,
    [TASK_TYPES.HANDLE_OBJECTION]: `אתה פיני. הלקוח חושב שיקר. הסבר את הערך (איכות, מהירות). אל תציע הנחה אלא אם קיבלת אישור.`,
    [TASK_TYPES.UPSELL]: `אתה פיני. הצע שדרוג בעדינות (למשל למינציה או נייר עבה).`,
    [TASK_TYPES.FREESTYLE]: `אתה פיני. ענה בקצרה ובידידותיות. אם נשאלת על מחיר - אמור שאתה צריך פרטים (מוצר וכמות).`
};

/**
 * הפונקציה הראשית שהשרת קורא לה
 */
async function handleWithSmartLLM(message, session, customer) {
    try {
        // 1. הכנת הנתונים (Data Mapping)
        const contextData = {
            customer: customer,
            cart: session.cart,
            userMessage: message,
            // חישוב נתונים ללוגיקה שלך
            hasQuote: session.cart.length > 0,
            availableProducts: ['כרטיסי ביקור', 'פליירים', 'הזמנות', 'רולאפ', 'מדבקות', 'פולדרים', 'קנבס'],
            canDiscount: false, // כרגע אין אישור להנחות
            canExpressDelivery: true
        };

        // 2. זיהוי משימה
        const taskType = detectTaskType(message, contextData);
        
        // 3. בניית הפרומפט
        const promptObj = buildPrompt(taskType, contextData);
        const fullPrompt = `
        ${promptObj.system}
        
        מידע רלוונטי לשיחה:
        ${promptObj.context}
        
        הודעת הלקוח: "${message}"
        
        הנחיה חשובה: ענה בעברית בלבד, תשובה קצרה (עד 2 משפטים).
        `;

        // 4. קריאה ל-Gemini
        const result = await model.generateContent(fullPrompt);
        let responseText = result.response.text().trim();

        // 5. בקרת איכות (הלוגיקה שלך!)
        const validation = validateResponse(responseText, taskType, contextData);
        
        if (!validation.isValid) {
            console.log("⚠️ LLM Validation Issues:", validation.issues);
            responseText = fixResponse(responseText, validation.corrections, contextData);
        }

        // 6. החזרת תשובה לשרת
        return {
            content: responseText,
            quickReplies: generateQuickReplies(taskType)
        };

    } catch (error) {
        console.error("❌ Gemini Error:", error);
        return {
            content: "סליחה, נתקעתי רגע. תוכל לחזור על הבקשה?",
            quickReplies: []
        };
    }
}

// === פונקציות העזר שלך (לוגיקה) ===

function buildContext(taskType, data = {}) {
    const parts = [];
    if (data.customer) parts.push(`לקוח: ${data.customer.name || 'אורח'}`);
    
    if (data.cart && data.cart.length > 0) {
        const cartSummary = data.cart.map(i => `${i.product_name} (${i.qty} יח')`).join(', ');
        parts.push(`בעגלה כרגע: ${cartSummary}`);
    }

    switch (taskType) {
        case TASK_TYPES.HANDLE_OBJECTION:
            parts.push("אין אישור לתת הנחות כרגע. נסה להסביר על איכות הנייר וההדפסה.");
            break;
        case TASK_TYPES.RECOMMEND:
            parts.push("המלצות אפשריות: הזמנות על נייר פנינה, מגנטים למזכרת, מדבקות ממותגות.");
            break;
    }
    
    return parts.join('\n');
}

function buildPrompt(taskType, data = {}) {
    const systemPrompt = TASK_PROMPTS[taskType] || TASK_PROMPTS[TASK_TYPES.FREESTYLE];
    const context = buildContext(taskType, data);
    return { system: systemPrompt, context: context };
}

function validateResponse(response, taskType, data = {}) {
    const issues = [];
    const corrections = {};
    
    // בדיקה: האם הבטיח הנחה לא מאושרת?
    const discountWords = ['הנחה', 'אוריד', 'מבצע', 'מחיר מיוחד'];
    if (!data.canDiscount) {
        discountWords.forEach(word => {
            if (response.includes(word)) {
                issues.push(`הבטחת הנחה לא מאושרת: "${word}"`);
                corrections.removeDiscount = true;
            }
        });
    }

    return {
        isValid: issues.length === 0,
        issues,
        corrections
    };
}

function fixResponse(response, corrections, data = {}) {
    let fixed = response;
    if (corrections.removeDiscount) {
        fixed = "אני מבין את עניין המחיר, אבל אצלנו מקפידים על חומרים ברמה הגבוהה ביותר וגימור מושלם.";
    }
    return fixed;
}

function detectTaskType(message, context = {}) {
    const text = message.toLowerCase();
    if (text.includes('יקר') || text.includes('הנחה')) return TASK_TYPES.HANDLE_OBJECTION;
    if (text.includes('מה זה') || text.includes('הסבר')) return TASK_TYPES.EXPLAIN;
    if (text.includes('ממליץ') || text.includes('רעיון')) return TASK_TYPES.RECOMMEND;
    if (text.length < 15 && (text.includes('היי') || text.includes('שלום'))) return TASK_TYPES.GREETING;
    return TASK_TYPES.FREESTYLE;
}

function generateQuickReplies(taskType) {
    // יצירת כפתורים לפי ההקשר
    if (taskType === TASK_TYPES.GREETING) return [{text: "כרטיסי ביקור", value: "כרטיסי ביקור"}, {text: "פליירים", value: "פליירים"}];
    if (taskType === TASK_TYPES.HANDLE_OBJECTION) return [{text: "טוב, נמשיך", value: "status"}, {text: "יש אופציה זולה?", value: "זול יותר"}];
    return [];
}

module.exports = { handleWithSmartLLM };