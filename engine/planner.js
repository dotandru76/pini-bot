/** engine/planner.js V81.0 - The Hybrid Wizard (Smart + Strict) */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { getMainMenu } = require('./productCatalog');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

// מיפוי שמות למונחים טכניים כדי שה-LLM והמערכת ידברו באותה שפה
const PARAM_ALIASES = { 
    'paper': 'paper_type', 'stock': 'paper_type', 'sug_niyar': 'paper_type',
    'coating': 'lamination', 'laminatzia': 'lamination',
    'finish': 'finishing', 'haskhba': 'finishing',
    'width': 'size', 'godel': 'size',
    'amount': 'qty', 'quantity': 'qty', 'kamut': 'qty',
    'type': 'book_type', 'sug': 'book_type',
    'pages': 'pages', 'amudim': 'pages'
};

const PRODUCT_NAMES_HE = { 'bc': 'כרטיסי ביקור', 'flyer': 'פליירים', 'booklet': 'חוברות', 'rollup': 'רולאפ', 'sticker': 'מדבקות' };
const MAIN_MENU_BUTTONS = [{ label: '📋 תפריט ראשי', value: 'reset' }, { label: 'כרטיסי ביקור', value: 'bc' }, { label: 'רולאפ', value: 'rollup' }];

function planActions(intentData, session) {
    const actions = [];
    let rawInput = intentData.raw_text ? intentData.raw_text.trim() : "";
    
    // --- 1. פעולות מערכת ---
    if (intentData.intent === 'reset') return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: getMainMenu(), quickReplies: MAIN_MENU_BUTTONS } }] };
    
    if (intentData.intent === 'show_cart') {
        const total = session.cart.reduce((sum, i) => sum + (i.client_price || 0), 0);
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: `🛒 סה"כ בעגלה: ₪${total.toLocaleString()}`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }
    
    if (intentData.intent === 'remove') {
        return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: session.cart.length - 1 } }, { type: 'GENERATE_RESPONSE', payload: { text: `🗑️ מחקתי.`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    // --- 2. ניהול מוצר (Context) ---
    let currentProductKey = session.currentProduct;
    
    // אם ה-LLM זיהה מוצר חדש (למשל "אני רוצה רולאפ")
    if (intentData.intent === 'quote' && intentData.product) {
        if (intentData.product !== session.currentProduct) {
            session.currentProduct = intentData.product;
            session.draftAttributes = {}; // איפוס לדף חלק
            currentProductKey = intentData.product;
        }
    }

    if (!currentProductKey) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה נדפיס היום?", quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    // --- 3. המוח ההיברידי ---
    const productConfig = productsDB[currentProductKey];
    let draft = session.draftAttributes || {};

    // שלב 0: קליטה חכמה מה-LLM (ה"מוח")
    // אם ה-LLM חילץ פרמטרים מהמלל החופשי (למשל: "500 עותקים"), נכניס אותם לטופס
    if (intentData.extractedParams) {
        Object.keys(intentData.extractedParams).forEach(key => {
            const normalizedKey = PARAM_ALIASES[key] || key;
            const val = intentData.extractedParams[key];
            // מעדכנים רק אם יש ערך אמיתי
            if (val !== null && val !== undefined && val !== '') {
                draft[normalizedKey] = val;
            }
        });
    }

    // שלב א': השלמה "טיפשה" (WIZARD) - אם ה-LLM פספס, אנחנו בודקים תשובה ישירה לשאלה האחרונה
    // בודקים מה שאלנו בפעם הקודמת
    let questionAskedLastTime = null;
    for (const q of productConfig.questions) {
        if (draft[q.key] == null) { // השאלה הראשונה שאין לה תשובה ב-draft היא זו ששאלנו
            questionAskedLastTime = q;
            break; 
        }
    }

    // אם הייתה שאלה פתוחה, וה-LLM לא מילא אותה כבר בשלב 0, ננסה למלא אותה מהקלט הגולמי
    if (questionAskedLastTime && draft[questionAskedLastTime.key] == null && rawInput) {
        let valueToSave = null;

        // אם זו שאלת מספר (כמו עמודים/כמות) והמשתמש כתב רק מספר
        if (questionAskedLastTime.type === 'number') {
            const numMatch = rawInput.match(/(\d+)/);
            if (numMatch) valueToSave = parseInt(numMatch[0]);
        }
        
        // אם זו שאלת בחירה (כפתורים)
        if (questionAskedLastTime.options) {
            const match = questionAskedLastTime.options.find(opt => 
                rawInput === opt.value || 
                rawInput.includes(opt.label) || 
                opt.label.includes(rawInput)
            );
            if (match) valueToSave = match.value;
            
            if (!valueToSave && (rawInput.includes('בלי') || rawInput.includes('ללא') || rawInput === 'none')) {
                valueToSave = 'none';
            }
        }

        if (valueToSave !== null) {
            draft[questionAskedLastTime.key] = valueToSave;
        }
    }
    
    // שמירת המצב המעודכן
    session.draftAttributes = draft;

    // --- 4. בדיקה מה הלאה (הלולאה) ---
    // עוברים שוב על הרשימה כדי לראות מה *עדיין* חסר
    let nextQuestion = null;
    for (const q of productConfig.questions) {
        if (draft[q.key] == null) {
            nextQuestion = q;
            break;
        }
    }

    if (nextQuestion) {
        // מצאנו חור בטופס -> שואלים את השאלה
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
        // הטופס מלא -> מחשבים מחיר
        try {
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