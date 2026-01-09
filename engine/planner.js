/** engine/planner.js V32.0 - The Wizard Monster */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { getMainMenu } = require('./productCatalog');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

// מילון נרמול פרמטרים
const PARAM_ALIASES = {
    'paper': 'paper_type', 'stock': 'paper_type', 'media': 'paper_type', 
    'coating': 'lamination', 'finish': 'finishing', 'width': 'size', 
    'amount': 'qty', 'quantity': 'qty', 'copies': 'qty'
};

function planActions(intentData, session) {
    const actions = [];
    const rawInput = intentData.raw_text ? intentData.raw_text.toLowerCase() : "";

    // === 1. The Wizard Guard (הגנה מפני מחיקה בטעות) ===
    // אם ה-LLM חשב שזה 'remove' אבל המשתמש דיבר על פרמטר ('בלי הדפסה')
    if (intentData.intent === 'remove') {
        const negationKeywords = ['הדפסה', 'למינציה', 'בלי', 'ללא', 'צבע', 'שחור'];
        if (negationKeywords.some(kw => rawInput.includes(kw))) {
            console.log("🛡️ Wizard Guard: Intercepted accidental remove. Converting to Update.");
            intentData.intent = 'update';
            // אם זיהינו על מה מדובר, נעדכן ידנית
            if (rawInput.includes('הדפסה')) intentData.extractedParams.print = 'none';
            if (rawInput.includes('למינציה')) intentData.extractedParams.lamination = 'none';
        }
    }

    // === 2. כוונות מערכת ===
    if (intentData.intent === 'reset') {
        return { 
            actions: [
                { type: 'CLEAR_SESSION_CONTEXT' }, 
                { 
                    type: 'GENERATE_RESPONSE', 
                    payload: { 
                        text: getMainMenu(),
                        quickReplies: [{label:'כרטיסי ביקור', value:'bc'}, {label:'פליירים', value:'flyer'}]
                    } 
                }
            ] 
        };
    }

    if (intentData.intent === 'show_cart') {
        const total = session.cart.reduce((sum, i) => sum + i.client_price, 0);
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: session.cart.length ? `🛒 סה"כ בעגלה: ₪${total.toLocaleString()}` : "העגלה ריקה.",
                    quickReplies: session.cart.length ? [{label:'הורד הצעת מחיר', value:'checkout'}] : [{label:'תפריט', value:'reset'}]
                } 
            }] 
        };
    }

    // === 3. ניהול ה-Wizard ===
    let currentProductKey = intentData.product || session.currentProduct;
    
    // החלפת מוצר
    if (intentData.product && intentData.product !== session.currentProduct) {
        session.currentProduct = intentData.product;
        currentProductKey = intentData.product;
        session.draftAttributes = {}; 
    }

    if (!currentProductKey) {
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: "מה תרצה להדפיס?",
                    quickReplies: [{label:'כרטיסי ביקור', value:'bc'}, {label:'הזמנות', value:'invitation'}, {label:'רולאפ', value:'rollup'}]
                } 
            }] 
        };
    }

    const productConfig = productsDB[currentProductKey];
    
    // נרמול פרמטרים שהגיעו מה-LLM
    let newParams = intentData.extractedParams || {};
    let normalizedParams = {};
    Object.keys(newParams).forEach(key => {
        const dbKey = PARAM_ALIASES[key] || key; 
        normalizedParams[dbKey] = newParams[key];
    });

    // מיפוי ערכים חכם (למשל 'מט' -> 'matte_350')
    if (productConfig.questions) {
        productConfig.questions.forEach(q => {
            const val = normalizedParams[q.key];
            if (val && q.options) {
                const match = q.options.find(opt => 
                    opt.value.toLowerCase() === val.toString().toLowerCase() || 
                    opt.label.includes(val)
                );
                if (match) normalizedParams[q.key] = match.value;
            }
        });
    }

    // עדכון ה-State
    const newDraft = { ...session.draftAttributes, ...normalizedParams };
    
    // ברירות מחדל קשיחות
    if (currentProductKey === 'sticker' && !newDraft.material) newDraft.material = 'vinyl_white';

    // === 4. מציאת השאלה הבאה (The Funnel) ===
    let missingParam = null;
    let questionToAsk = null;

    if (productConfig.questions) {
        for (const q of productConfig.questions) {
            // אם הפרמטר חסר (undefined/null)
            if (newDraft[q.key] == null) {
                missingParam = q.key;
                questionToAsk = q;
                break;
            }
        }
    }

    // === 5. תשובה למשתמש ===
    if (missingParam) {
        // בניית כפתורים חכמה
        let buttons = questionToAsk.options || [];
        if (questionToAsk.key === 'qty') {
            buttons = [{label:'100', value:'100'}, {label:'500', value:'500'}, {label:'1000', value:'1000'}];
        }

        actions.push({
            type: 'PRESENT_OPTIONS',
            question: questionToAsk.question_he,
            options: buttons, // חובה כפתורים!
            product: currentProductKey,
            saveDraft: newDraft
        });
    } else {
        // הכל מלא -> חישוב
        try {
            const calcResult = calculate_custom_job(session.cart, { ...newDraft, product: currentProductKey });
            const item = calcResult.lastAdded;
            
            const successText = `✅ הוספתי לעגלה:\n**${item.description}**\nכמות: ${item.qty}\nסה"כ: ₪${item.client_price}\n\nמה עכשיו?`;

            actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
            actions.push({ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: successText,
                    quickReplies: [
                        { label: 'הורד הצעת מחיר', value: 'checkout' },
                        { label: 'הוסף עוד פריט', value: 'reset' }
                    ]
                } 
            });
            actions.push({ type: 'CHECK_QUEUE' }); 
        } catch (e) {
            actions.push({ type: 'GENERATE_RESPONSE', payload: { text: "שגיאה בחישוב. נסה כמות אחרת." } });
        }
    }

    return { actions };
}

module.exports = { planActions };