/** engine/planner.js V47.0 - NaN Fix & Size Priority */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { getMainMenu } = require('./productCatalog');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const PARAM_ALIASES = {
    'paper': 'paper_type', 'stock': 'paper_type', 
    'coating': 'lamination', 'finish': 'finishing', 'width': 'size', 
    'amount': 'qty', 'quantity': 'qty', 'print': 'print', 'type': 'book_type',
    'cut': 'cut'
};

function planActions(intentData, session) {
    const actions = [];
    const rawInput = intentData.raw_text ? intentData.raw_text.toLowerCase().trim() : "";
    
    // --- 1. System Actions ---
    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: getMainMenu(), quickReplies: [{label:'כרטיסים', value:'bc'}, {label:'פליירים', value:'flyer'}] } }] };
    }
    if (intentData.intent === 'show_cart') {
        // תיקון NaN: מוודאים שיש client_price
        const total = session.cart.reduce((sum, i) => sum + (i.client_price || 0), 0);
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: session.cart.length ? `🛒 סה"כ בעגלה: ₪${total.toLocaleString()}` : "העגלה ריקה", quickReplies: [{label:'תפריט', value:'reset'}] } }] };
    }
    if (intentData.intent === 'remove') {
         return { actions: [{ type: 'REMOVE_FROM_CART', payload: {} }, { type: 'GENERATE_RESPONSE', payload: { text: "מחקתי את הפריט האחרון.", quickReplies: [{label:'תפריט', value:'reset'}] } }] };
    }

    // --- 2. Context ---
    let currentProductKey = intentData.product || session.currentProduct;
    if (intentData.intent === 'chat') currentProductKey = null;

    if (intentData.product && intentData.product !== session.currentProduct) {
        session.currentProduct = intentData.product;
        currentProductKey = intentData.product;
        session.draftAttributes = {}; 
    }

    if (!currentProductKey) {
        if (intentData.aiResponse && !intentData.aiResponse.includes("לא בטוח")) {
             return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: intentData.aiResponse } }] };
        }
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה נדפיס היום?", quickReplies: [{label:'כרטיסים', value:'bc'}, {label:'פליירים', value:'flyer'}, {label:'ספרים', value:'booklet'}] } }] };
    }

    const productConfig = productsDB[currentProductKey];
    if (!productConfig) return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מוצר זה בבנייה." } }] };

    // --- 3. Params Mapping ---
    let newParams = intentData.extractedParams || {};
    let normalizedParams = {};
    Object.keys(newParams).forEach(key => {
        const dbKey = PARAM_ALIASES[key] || key; 
        normalizedParams[dbKey] = newParams[key];
    });

    // === FORCE MATCH LOGIC (PRIORITY FIXED) ===
    let activeQuestion = null;
    if (productConfig.questions) {
        for (const q of productConfig.questions) {
            if (session.draftAttributes[q.key] == null) {
                activeQuestion = q;
                break;
            }
        }
    }

    if (activeQuestion) {
        let matchFound = false;

        // A. זיהוי מידות (עדיפות עליונה!)
        if (activeQuestion.key === 'size') {
            // Regex משופר שתופס גם "על" בעברית
            const sizeMatch = rawInput.match(/(\d+)\s*(?:x|X|על|\*)\s*(\d+)/);
            if (sizeMatch) {
                const val = `${sizeMatch[1]}x${sizeMatch[2]}`;
                console.log(`🎯 Force Match: Size "${val}"`);
                normalizedParams[activeQuestion.key] = val;
                matchFound = true;
            } else if (/^[a-zA-Z]+\d+$/.test(rawInput)) { 
                normalizedParams[activeQuestion.key] = rawInput.toUpperCase();
                matchFound = true;
            }
        }

        // B. כפתורים
        if (!matchFound && activeQuestion.options) {
            const STOP_WORDS = ['ספר', 'חוברת', 'רוצה', 'צריך', 'שלום', 'היי']; 
            const match = activeQuestion.options.find(opt => {
                const label = opt.label.toLowerCase();
                const val = opt.value.toLowerCase();
                if (rawInput === val || rawInput === label) return true;
                if (rawInput.length > 2 && !STOP_WORDS.includes(rawInput) && label.includes(rawInput)) return true;
                return false;
            });
            if (match) {
                console.log(`🎯 Force Match: Option "${match.value}"`);
                normalizedParams[activeQuestion.key] = match.value;
                matchFound = true;
            }
        }
        
        // C. מספרים (רק אם לא מצאנו גודל!)
        if (!matchFound && activeQuestion.type === 'number') {
            const numMatch = rawInput.match(/(\d+)/);
            if (numMatch) {
                console.log(`🎯 Force Match: Number "${numMatch[0]}" for ${activeQuestion.key}`);
                normalizedParams[activeQuestion.key] = parseInt(numMatch[0]);
                matchFound = true;
            }
        }

        // ניקוי רעשים אם נמצאה התאמה
        if (matchFound) {
            if (activeQuestion.key !== 'qty' && normalizedParams.qty) delete normalizedParams.qty;
        }
    }
    // ===============================

    // מיפוי רגיל
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

    // 4. Funnel
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
            buttons = [{label:'100', value:'100'}, {label:'500', value:'500'}];
        }
        
        actions.push({
            type: 'PRESENT_OPTIONS',
            question: questionToAsk.question_he,
            options: buttons, 
            product: currentProductKey,
            saveDraft: newDraft
        });
    } else {
        // 6. Calc
        try {
            const calcResult = calculate_custom_job(session.cart, { ...newDraft, product: currentProductKey });
            const item = calcResult.lastAdded;
            
            let successText = `✅ הוספתי לעגלה:\n**${item.description}**\nכמות: ${item.qty}\nסה"כ: ₪${item.client_price}`;
            
            // --- תיקון NaN: שומרים את האייטם המחושב, לא את הטיוטה! ---
            actions.push({ type: 'CALCULATE_AND_ADD', payload: item }); 
            // ---------------------------------------------------------

            actions.push({ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: successText,
                    quickReplies: [{ label: 'סיום והזמנה', value: 'checkout' }, { label: 'עוד מוצר', value: 'reset' }]
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