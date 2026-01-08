/** engine/planner.js V31.0 - Menu & PDF Logic */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { getMainMenu } = require('./productCatalog'); // וודא שקובץ זה קיים בתיקיית engine!

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

// מילון תרגום מונחי LLM למערכת
const PARAM_ALIASES = {
    'paper': 'paper_type', 'stock': 'paper_type', 'media': 'paper_type', 'material': 'paper_type',
    'coating': 'lamination', 'finish': 'finishing',
    'width': 'size', 'height': 'size', 'amount': 'qty', 'quantity': 'qty'
};

function planActions(intentData, session) {
    const actions = [];

    // --- 1. תפריט ואיפוס ---
    if (intentData.intent === 'reset') {
        const menuText = getMainMenu ? getMainMenu() : "תפריט ראשי:\n1. כרטיסי ביקור\n2. פליירים\n3. רולאפ";
        return { 
            actions: [
                { type: 'CLEAR_SESSION_CONTEXT' }, 
                { 
                    type: 'GENERATE_RESPONSE', 
                    payload: { 
                        text: menuText,
                        quickReplies: [
                            { label: 'כרטיסי ביקור', value: 'כרטיסי ביקור' },
                            { label: 'פליירים', value: 'פליירים' },
                            { label: 'רולאפ', value: 'רולאפ' }
                        ]
                    } 
                }
            ] 
        };
    }

    // --- 2. הצגת עגלה ---
    if (intentData.intent === 'show_cart') {
        const total = session.cart.reduce((sum, item) => sum + item.client_price, 0);
        const cartText = session.cart.length > 0 
            ? `🛒 **סיכום ביניים:**\nיש לך ${session.cart.length} פריטים.\nסה"כ: ₪${total.toLocaleString()}` 
            : "העגלה ריקה. בוא נתחיל!";
            
        const replies = session.cart.length > 0 
            ? [{ label: 'הורד הצעת מחיר (PDF)', value: 'checkout' }, { label: 'תפריט ראשי', value: 'reset' }]
            : [{ label: 'תפריט ראשי', value: 'reset' }];

        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: cartText, quickReplies: replies } }] };
    }

    if (intentData.intent === 'remove') {
         return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: null } }, { type: 'GENERATE_RESPONSE', payload: { text: "מחקתי את הפריט האחרון." } }] }; 
    }

    // --- 3. לוגיקת מוצרים ושיחה ---
    let currentProductKey = intentData.product || session.currentProduct;
    
    // ניהול החלפת מוצר
    if (intentData.product && intentData.product !== session.currentProduct) {
        session.currentProduct = intentData.product;
        currentProductKey = intentData.product;
        if (intentData.product !== session.currentProduct) session.draftAttributes = {}; 
    }

    if (!currentProductKey) {
        // אם אין מוצר, זו שיחת חולין
        const aiText = intentData.aiResponse || "אני כאן לכל שאלה! מה תרצה להדפיס?";
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: aiText,
                    quickReplies: [{ label: 'הצג תפריט', value: 'reset' }]
                } 
            }] 
        };
    }

    const productConfig = productsDB[currentProductKey];
    if (!productConfig) return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "המוצר הזה חסר במערכת." } }] };

    // נרמול פרמטרים
    let rawParams = intentData.extractedParams || {};
    let normalizedParams = {};
    Object.keys(rawParams).forEach(key => {
        const dbKey = PARAM_ALIASES[key] || key; 
        normalizedParams[dbKey] = rawParams[key];
    });

    // בדיקת אופציות תקינות
    if (productConfig.questions) {
        productConfig.questions.forEach(q => {
            const val = normalizedParams[q.key];
            if (val && q.options) {
                const match = q.options.find(opt => 
                    opt.value.toLowerCase() === val.toString().toLowerCase() || 
                    opt.label.includes(val) ||
                    (typeof val === 'string' && val.includes(opt.value))
                );
                if (match) normalizedParams[q.key] = match.value;
            }
        });
    }

    const newDraft = { ...session.draftAttributes, ...normalizedParams };
    
    // ברירות מחדל
    if (currentProductKey === 'sticker' && !newDraft.material) newDraft.material = 'vinyl_white';

    // בדיקת חוסרים (Funnel)
    let missingParam = null;
    let questionToAsk = null;

    if (productConfig.questions) {
        for (const q of productConfig.questions) {
            if (!newDraft[q.key]) { 
                missingParam = q.key; 
                questionToAsk = q; 
                break; 
            }
        }
    }

    if (missingParam) {
        let finalResponse = "";
        // אם יש טקסט מה-AI והוא רלוונטי, נשתמש בו
        if (intentData.aiResponse && intentData.intent !== 'quote') {
            finalResponse += intentData.aiResponse + "\n\n";
        } else if (Object.keys(session.draftAttributes).length === 0) {
            finalResponse += `בכיף! בוא נגדיר את ה**${productConfig.name}**. 👌\n`;
        }
        finalResponse += questionToAsk.question_he;

        actions.push({
            type: 'PRESENT_OPTIONS',
            question: finalResponse,
            options: questionToAsk.options || [],
            product: currentProductKey,
            saveDraft: newDraft
        });
    } else {
        // חישוב והוספה
        try {
            const calcParams = { ...newDraft, product: currentProductKey };
            const calcResult = calculate_custom_job(session.cart, calcParams);
            const item = calcResult.lastAdded;
            
            const successText = `✅ הוספתי לעגלה:\n**${item.description}**\nכמות: ${item.qty.toLocaleString()}\nמחיר: ₪${item.client_price.toLocaleString()}\n\nמה תרצה לעשות כעת?`;

            actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
            actions.push({ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: successText,
                    quickReplies: [{ label: 'הורד הצעת מחיר (PDF)', value: 'checkout' }, { label: 'הוסף עוד פריט', value: 'reset' }]
                } 
            });
            actions.push({ type: 'CHECK_QUEUE' }); 
        } catch (e) {
            actions.push({ type: 'GENERATE_RESPONSE', payload: { text: "שגיאה בחישוב המחיר. נסה לשנות כמות." } });
        }
    }

    return { actions };
}

module.exports = { planActions };