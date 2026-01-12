/** engine/planner.js V80.0 - The Strict Wizard */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { getMainMenu } = require('./productCatalog');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const PRODUCT_NAMES_HE = { 'bc': 'כרטיסי ביקור', 'flyer': 'פליירים', 'booklet': 'חוברות', 'rollup': 'רולאפ', 'sticker': 'מדבקות' };
const MAIN_MENU_BUTTONS = [{ label: '📋 תפריט ראשי', value: 'reset' }, { label: 'כרטיסי ביקור', value: 'bc' }, { label: 'רולאפ', value: 'rollup' }];

function planActions(intentData, session) {
    const actions = [];
    let rawInput = intentData.raw_text ? intentData.raw_text.trim() : ""; // שומרים על Case לאנגלית
    
    // 1. פקודות מערכת (עוקפות הכל)
    if (intentData.intent === 'reset') return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: getMainMenu(), quickReplies: MAIN_MENU_BUTTONS } }] };
    if (intentData.intent === 'show_cart') {
        const total = session.cart.reduce((sum, i) => sum + (i.client_price || 0), 0);
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: `🛒 סה"כ בעגלה: ₪${total.toLocaleString()}`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }
    if (intentData.intent === 'remove') {
        return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: session.cart.length - 1 } }, { type: 'GENERATE_RESPONSE', payload: { text: `🗑️ מחקתי.`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    // 2. זיהוי מוצר חדש (כניסה ל-Wizard)
    let currentProductKey = session.currentProduct;
    // אם זו בקשה חדשה למוצר (intent=quote) או שאין מוצר פעיל
    if (intentData.intent === 'quote' && intentData.product) {
        if (intentData.product !== session.currentProduct) {
            session.currentProduct = intentData.product;
            session.draftAttributes = {}; // איפוס דראפט למוצר חדש
            currentProductKey = intentData.product;
        }
    }

    // אם עדיין אין מוצר, שולחים לתפריט
    if (!currentProductKey) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה נדפיס היום?", quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    // 3. ה-WIZARD הקשוח (לולאת שאלות)
    const productConfig = productsDB[currentProductKey];
    let draft = session.draftAttributes || {};
    
    // -- שלב א: קליטת תשובה לשאלה הקודמת (אם הייתה) --
    // אנחנו עוברים על השאלות לפי הסדר. הראשונה שחסרה ב-draft היא זו ששאלנו בפעם הקודמת.
    let questionAskedLastTime = null;
    for (const q of productConfig.questions) {
        if (draft[q.key] == null) { 
            questionAskedLastTime = q; 
            break; 
        }
    }

    // אם הייתה שאלה פתוחה, ננסה למלא אותה עם הקלט הנוכחי
    if (questionAskedLastTime && rawInput) {
        let valueToSave = null;

        // בדיקה 1: האם זה מספר? (עבור כמויות, עמודים, מידות)
        if (questionAskedLastTime.type === 'number') {
            const numMatch = rawInput.match(/(\d+)/);
            if (numMatch) valueToSave = parseInt(numMatch[0]);
        }
        
        // בדיקה 2: האם זה בחירה מרשימה? (נייר, גימור)
        if (questionAskedLastTime.options) {
            // מחפשים התאמה ל-Value (באנגלית) או ל-Label (בעברית)
            const match = questionAskedLastTime.options.find(opt => 
                rawInput === opt.value || // בדיקה מדויקת לקוד (מהכפתור)
                rawInput.includes(opt.label) || // בדיקה לטקסט (מהמשתמש)
                opt.label.includes(rawInput) // בדיקה חלקית
            );
            if (match) valueToSave = match.value;
            
            // טיפול ב"ללא" / "בלי"
            if (!valueToSave && (rawInput.includes('בלי') || rawInput.includes('ללא') || rawInput === 'none')) {
                valueToSave = 'none';
            }
        }

        // שמירת התשובה (רק אם מצאנו משהו חוקי)
        if (valueToSave !== null) {
            draft[questionAskedLastTime.key] = valueToSave;
            session.draftAttributes = draft; // עדכון הזיכרון
        }
    }

    // -- שלב ב: זיהוי השאלה הבאה --
    // עוברים שוב על הרשימה עם ה-Draft המעודכן
    let nextQuestion = null;
    for (const q of productConfig.questions) {
        if (draft[q.key] == null) {
            nextQuestion = q;
            break;
        }
    }

    // -- שלב ג: החלטה --
    if (nextQuestion) {
        // יש עוד שאלות - שאל את הבאה
        return { 
            actions: [{ 
                type: 'PRESENT_OPTIONS', 
                question: nextQuestion.question_he, 
                options: nextQuestion.options || [], 
                product: currentProductKey, 
                saveDraft: draft 
            }] 
        };
    } else {
        // אין עוד שאלות - חשב מחיר!
        try {
            // תיקוני ברירת מחדל
            if (currentProductKey === 'rollup' && !draft.size) draft.size = '85x200';
            
            const calcResult = calculate_custom_job(session.cart, { ...draft, product: currentProductKey });
            const item = { 
                ...calcResult.lastAdded, 
                productName: PRODUCT_NAMES_HE[currentProductKey] || currentProductKey,
                attributes: draft 
            };
            
            actions.push({ type: 'CALCULATE_AND_ADD', payload: item }); 
            actions.push({ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: `✅ הוספתי לעגלה: ${item.productName}\n📝 מפרט: ${item.description}\n💵 סה"כ: ₪${item.client_price}`, 
                    quickReplies: [{label:'סיום וצ\'ק אאוט', value:'checkout'}, {label:'הוסף עוד פריט', value:'reset'}] 
                } 
            });
            return { actions };
        } catch (e) {
            console.error(e);
            return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "שגיאה בחישוב. בוא נתחיל מחדש.", quickReplies: MAIN_MENU_BUTTONS } }] };
        }
    }
}

module.exports = { planActions };