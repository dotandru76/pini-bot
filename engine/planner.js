/** engine/planner.js V37.1 - Upsell & Wizard */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { getMainMenu } = require('./productCatalog');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const PARAM_ALIASES = {
    'paper': 'paper_type', 'stock': 'paper_type', 
    'coating': 'lamination', 'finish': 'finishing', 'width': 'size', 
    'amount': 'qty', 'quantity': 'qty', 'print': 'print', 'type': 'book_type'
};

function planActions(intentData, session) {
    const actions = [];
    
    // 1. System Actions
    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: getMainMenu(), quickReplies: [{label:'כרטיסים', value:'bc'}, {label:'פליירים', value:'flyer'}] } }] };
    }
    if (intentData.intent === 'show_cart') {
        const total = session.cart.reduce((sum, i) => sum + i.client_price, 0);
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: session.cart.length ? `🛒 סה"כ: ₪${total}` : "עגלה ריקה", quickReplies: [{label:'תפריט', value:'reset'}] } }] };
    }
    if (intentData.intent === 'remove') {
         return { actions: [{ type: 'REMOVE_FROM_CART', payload: {} }, { type: 'GENERATE_RESPONSE', payload: { text: "מחקתי את הפריט האחרון.", quickReplies: [{label:'תפריט', value:'reset'}] } }] };
    }

    // 2. Context
    let currentProductKey = intentData.product || session.currentProduct;
    if (intentData.product && intentData.product !== session.currentProduct) {
        session.currentProduct = intentData.product;
        currentProductKey = intentData.product;
        session.draftAttributes = {}; 
    }

    if (!currentProductKey) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: intentData.aiResponse || "מה נדפיס?", quickReplies: [{label:'כרטיסים', value:'bc'}, {label:'פליירים', value:'flyer'}, {label:'ספרים', value:'booklet'}] } }] };
    }

    const productConfig = productsDB[currentProductKey];
    if (!productConfig) return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מוצר זה בבנייה." } }] };

    // 3. Update Params
    let newParams = intentData.extractedParams || {};
    let normalizedParams = {};
    Object.keys(newParams).forEach(key => {
        const dbKey = PARAM_ALIASES[key] || key; 
        normalizedParams[dbKey] = newParams[key];
    });

    if (productConfig.questions) {
        productConfig.questions.forEach(q => {
            const val = normalizedParams[q.key];
            if (val && q.options) {
                const match = q.options.find(opt => 
                    opt.value == val || opt.label.includes(val) || (val === 'none' && opt.value === 'none')
                );
                if (match) normalizedParams[q.key] = match.value;
            }
        });
    }

    const newDraft = { ...session.draftAttributes, ...normalizedParams };
    if (currentProductKey === 'sticker' && !newDraft.material) newDraft.material = 'vinyl_white';

    // 4. The Funnel
    let missingParam = null;
    let questionToAsk = null;

    if (productConfig.questions) {
        for (const q of productConfig.questions) {
            if (newDraft[q.key] == null) { 
                missingParam = q.key;
                questionToAsk = q;
                break;
            }
        }
    }

    // 5. Output
    if (missingParam) {
        let buttons = questionToAsk.options || [];
        if (questionToAsk.key === 'qty' && !buttons.length) {
            buttons = [{label:'100', value:'100'}, {label:'500', value:'500'}, {label:'1000', value:'1000'}];
        }
        
        actions.push({
            type: 'PRESENT_OPTIONS',
            question: questionToAsk.question_he,
            options: buttons, 
            product: currentProductKey,
            saveDraft: newDraft
        });
    } else {
        // --- 6. Calc & Upsell ---
        try {
            const calcResult = calculate_custom_job(session.cart, { ...newDraft, product: currentProductKey });
            const item = calcResult.lastAdded;
            
            let successText = `✅ הוספתי לעגלה:\n**${item.description}**\nכמות: ${item.qty}\nסה"כ: ₪${item.client_price}`;

            // === מנוע ה-Upsell ===
            try {
                // חישוב היפותטי לכמות כפולה
                const doubleQty = item.qty * 2;
                const upsellDraft = { ...newDraft, qty: doubleQty };
                const upsellResult = calculate_custom_job([], { ...upsellDraft, product: currentProductKey });
                
                const currentUnitPrice = item.client_price / item.qty;
                const nextUnitPrice = upsellResult.lastAdded.client_price / doubleQty;

                // אם המחיר ליחידה יורד ב-15% לפחות
                if (nextUnitPrice < currentUnitPrice * 0.85) {
                     successText += `\n\n💡 **טיפ:** אם תיקח ${doubleQty} יח', המחיר ליחידה ירד משמעותית! (₪${upsellResult.lastAdded.client_price} סה"כ)`;
                }
            } catch (e) { /* התעלמות משגיאות Upsell */ }
            // ======================

            successText += `\n\nמה עכשיו?`;

            actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
            actions.push({ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: successText,
                    quickReplies: [
                        { label: 'סיום והזמנה', value: 'checkout' },
                        { label: 'עוד מוצר', value: 'reset' }
                    ]
                } 
            });
            actions.push({ type: 'CHECK_QUEUE' }); 
        } catch (e) {
            actions.push({ type: 'GENERATE_RESPONSE', payload: { text: "שגיאה בחישוב.", quickReplies: [{label:'חזרה', value:'reset'}] } });
        }
    }

    return { actions };
}

module.exports = { planActions };