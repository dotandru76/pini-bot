/** engine/planner.js V76.0 - Fix Quote Trap */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { getMainMenu } = require('./productCatalog');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const PARAM_ALIASES = { 'paper': 'paper_type', 'stock': 'paper_type', 'coating': 'lamination', 'finish': 'finishing', 'width': 'size', 'amount': 'qty', 'quantity': 'qty', 'type': 'book_type' };
const PRODUCT_NAMES_HE = { 'bc': 'כרטיסי ביקור', 'flyer': 'פליירים', 'booklet': 'חוברות', 'rollup': 'רולאפ', 'sticker': 'מדבקות' };
const MAIN_MENU_BUTTONS = [{ label: '📋 תפריט ראשי', value: 'reset' }, { label: 'כרטיסי ביקור', value: 'bc' }, { label: 'רולאפ', value: 'rollup' }];

function generateTechnicalSpec(params, productConfig) {
    let specs = [];
    if (productConfig && productConfig.questions) {
        productConfig.questions.forEach(q => {
            const val = params[q.key];
            if (val && q.key !== 'qty') {
                if (q.options) {
                    const opt = q.options.find(o => o.value === val);
                    specs.push(opt ? opt.label : val);
                } else { specs.push(val); }
            }
        });
    }
    return specs.join(', ').replace(/\*/g, '');
}

function planActions(intentData, session) {
    const actions = [];
    let rawInput = intentData.raw_text ? intentData.raw_text.toLowerCase().trim() : "";
    
    // 1. System Actions
    if (intentData.intent === 'reset') return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: getMainMenu(), quickReplies: MAIN_MENU_BUTTONS } }] };
    
    // --- FIX V76.0: Only treat quote as show_cart if NO product is defined ---
    // This allows "I want a price for a booklet" (intent=quote, product=booklet) to pass through to Product Logic.
    if (intentData.intent === 'show_cart' || (intentData.intent === 'quote' && !intentData.product)) {
        const total = session.cart.reduce((sum, i) => sum + (i.client_price || 0), 0);
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: `🛒 סה"כ בעגלה: ₪${total.toLocaleString()}`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    // 2. Smart Remove
    if (intentData.intent === 'remove') {
        let indexToRemove = session.cart.length - 1;
        if (session.cart.length > 0) {
            const keywords = rawInput.split(' ').map(w => w.replace(/[ה\-]/g, '')).filter(w => w.length > 1);
            let bestScore = -1, bestIndex = -1;
            for (let i = 0; i < session.cart.length; i++) {
                const item = session.cart[i];
                const itemText = (item.cleanDescription || item.productName || "").toLowerCase();
                const score = keywords.reduce((acc, kw) => acc + (itemText.includes(kw) ? 1 : 0), 0);
                if (score > bestScore) { bestScore = score; bestIndex = i; }
            }
            if (bestScore > 0) indexToRemove = bestIndex;
        }
        return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: indexToRemove } }, { type: 'GENERATE_RESPONSE', payload: { text: `🗑️ מחקתי את הפריט מהעגלה.`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    // 3. Edit Last Item
    if (intentData.intent === 'update' && !session.currentProduct && session.cart.length > 0) {
        const lastItem = session.cart[session.cart.length - 1];
        session.currentProduct = lastItem.product;
        session.draftAttributes = { ...lastItem.attributes };
        actions.push({ type: 'REMOVE_FROM_CART', payload: { index: session.cart.length - 1 } });
    }

    // 4. Chat / Consult
    if (intentData.intent === 'chat' || intentData.intent === 'consult') {
        session.currentProduct = null; session.draftAttributes = {};
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: intentData.aiResponse || "איך אוכל לעזור?", quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    // 5. Product Logic
    let currentProductKey = intentData.product || session.currentProduct;
    if (intentData.product && intentData.product !== session.currentProduct) {
        session.currentProduct = intentData.product; session.draftAttributes = {};
    }
    if (!currentProductKey) return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה נדפיס היום?", quickReplies: MAIN_MENU_BUTTONS } }] };

    const productConfig = productsDB[currentProductKey];
    let newParams = intentData.extractedParams || {};
    let normalizedParams = {};
    Object.keys(newParams).forEach(key => { normalizedParams[PARAM_ALIASES[key] || key] = newParams[key]; });

    // Global Size Regex
    const sizeMatch = rawInput.match(/(\d+)\s*(?:x|X|על|\*)\s*(\d+)/);
    if (sizeMatch) normalizedParams['size'] = `${sizeMatch[1]}x${sizeMatch[2]}`;
    if (currentProductKey === 'rollup' && rawInput.includes('85') && !rawInput.includes('x')) normalizedParams['size'] = '85x200';

    const newDraft = { ...session.draftAttributes, ...normalizedParams };
    
    // Funnel
    let missingParam = null, questionToAsk = null;
    if (productConfig.questions) {
        for (const q of productConfig.questions) {
            // Strict Fuzzy Match
            if (newDraft[q.key] == null && q.options) {
                const isNumber = /^\d+$/.test(rawInput);
                const match = q.options.find(opt => 
                    rawInput.includes(opt.label.toLowerCase()) || 
                    rawInput.includes(opt.value.toLowerCase()) ||
                    (!isNumber && rawInput.length > 2 && opt.label.toLowerCase().includes(rawInput))
                );
                if (match) { newDraft[q.key] = match.value; continue; }
            }
            if (newDraft[q.key] == null) { missingParam = q.key; questionToAsk = q; break; }
        }
    }

    // Strict Qty Guard
    if (!missingParam && !newDraft.qty && currentProductKey !== 'rollup') {
        missingParam = 'qty';
        questionToAsk = productConfig.questions.find(q => q.key === 'qty');
    }

    if (missingParam) {
        if (questionToAsk.type === 'number') {
            const num = rawInput.match(/(\d+)/);
            if (num) { 
                const qtyWasExtracted = !!intentData.extractedParams?.qty;
                if (missingParam === 'qty' || !qtyWasExtracted) {
                    newDraft[missingParam] = parseInt(num[0]);
                    return planActions({ ...intentData, raw_text: "" }, { ...session, draftAttributes: newDraft });
                }
            }
        }
        return { actions: [{ type: 'PRESENT_OPTIONS', question: questionToAsk.question_he, options: questionToAsk.options || [], product: currentProductKey, saveDraft: newDraft }] };
    } else {
        try {
            if (currentProductKey === 'rollup' && !newDraft.size) newDraft.size = '85x200';
            const calcResult = calculate_custom_job(session.cart, { ...newDraft, product: currentProductKey });
            
            const productName = PRODUCT_NAMES_HE[currentProductKey] || currentProductKey;
            const sizeDesc = newDraft.size ? ` - ${newDraft.size}` : '';
            const fullSpec = generateTechnicalSpec(newDraft, productConfig);
            
            const item = { 
                ...calcResult.lastAdded, 
                productName, 
                fullSpec, 
                cleanDescription: `${productName}${sizeDesc}`, 
                attributes: newDraft 
            };
            
            actions.push({ type: 'CALCULATE_AND_ADD', payload: item }); 
            actions.push({ type: 'GENERATE_RESPONSE', payload: { text: `✅ הוספתי לעגלה: ${item.productName}\nסה"כ: ₪${item.client_price}`, quickReplies: [{label:'סיום', value:'checkout'}, {label:'עוד', value:'reset'}] } });
            return { actions };
        } catch (e) {
            return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "שגיאה בחישוב. נסה שוב?", quickReplies: MAIN_MENU_BUTTONS } }] };
        }
    }
}

module.exports = { planActions };