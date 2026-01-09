/** engine/planner.js V57.0 - Safe Input Cleaning */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { getMainMenu } = require('./productCatalog');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) { console.error("⚠️ Failed to load productsDB:", e.message); }

const PARAM_ALIASES = {
    'paper': 'paper_type', 'stock': 'paper_type', 
    'coating': 'lamination', 'finish': 'finishing', 'width': 'size', 
    'amount': 'qty', 'quantity': 'qty', 'print': 'print', 'type': 'book_type',
    'cut': 'cut'
};

const PRODUCT_NAMES_HE = {
    'bc': 'כרטיסי ביקור', 'flyer': 'פליירים', 'booklet': 'חוברות/ספרים',
    'rollup': 'רולאפ', 'sticker': 'מדבקות', 'invitation': 'הזמנות'
};

const MAIN_MENU_BUTTONS = [
    { label: '📋 תפריט ראשי', value: 'reset' },
    { label: 'כרטיסי ביקור', value: 'bc' },
    { label: 'רולאפ', value: 'rollup' },
    { label: 'פליירים', value: 'flyer' }
];

function generateTechnicalSpec(params, productConfig) {
    let specs = [];
    if (productConfig && productConfig.questions) {
        productConfig.questions.forEach(q => {
            const val = params[q.key];
            if (val && q.key !== 'qty') {
                if (q.options) {
                    const opt = q.options.find(o => o.value === val);
                    specs.push(opt ? opt.label : val);
                } else {
                    specs.push(val);
                }
            }
        });
    } else {
        Object.entries(params).forEach(([k, v]) => {
            if (k !== 'qty') specs.push(v);
        });
    }
    return specs.join(', ');
}

function planActions(intentData, session) {
    const actions = [];
    let rawInput = intentData.raw_text ? intentData.raw_text.toLowerCase().trim() : "";
    
    // --- 1. System Actions ---
    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: getMainMenu(), quickReplies: MAIN_MENU_BUTTONS } }] };
    }
    if (intentData.intent === 'show_cart') {
        const total = session.cart.reduce((sum, i) => sum + (i.client_price || 0), 0);
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: session.cart.length ? `🛒 סה"כ בעגלה: ₪${total.toLocaleString()}` : "העגלה ריקה", quickReplies: [{label:'תפריט', value:'reset'}] } }] };
    }

    // === SMART REMOVE LOGIC ===
    if (intentData.intent === 'remove') {
        let indexToRemove = session.cart.length - 1; 
        let itemDesc = "הפריט האחרון";

        if (session.cart.length > 0) {
            // ניקוי חכם: מסיר "ה-" ממספרים (למשל "ה-85" -> "85")
            const keywords = rawInput.split(' ').map(w => {
                let clean = w.replace(/[.,?!'"\-]/g, ''); 
                if (/^ה\d+$/.test(clean)) clean = clean.substring(1); 
                return clean;
            }).filter(w => 
                w.length > 1 && !['תמחק', 'את', 'זה', 'רוצה', 'בבקשה', 'לי', 'אחד', 'שהוא', 'של', 'הזה', 'רולאפ', 'הפריט', 'הקטן'].includes(w)
            );

            if (keywords.length > 0) {
                let bestScore = -1;
                let bestIndex = -1;
                for (let i = 0; i < session.cart.length; i++) {
                    const item = session.cart[i];
                    const itemText = (item.cleanDescription + " " + (item.fullSpec || "")).toLowerCase();
                    const score = keywords.reduce((acc, kw) => acc + (itemText.includes(kw) ? 1 : 0), 0);
                    
                    if (score > bestScore) { 
                        bestScore = score; 
                        bestIndex = i; 
                    } else if (score === bestScore && score > 0) {
                         bestIndex = i;
                    }
                }
                if (bestScore > 0) indexToRemove = bestIndex;
            }
            
            const item = session.cart[indexToRemove];
            itemDesc = item.cleanDescription || "פריט";
            return { 
                actions: [
                    { type: 'REMOVE_FROM_CART', payload: { index: indexToRemove } }, 
                    { type: 'GENERATE_RESPONSE', payload: { text: `🗑️ מחקתי את **${itemDesc}** מהעגלה.`, quickReplies: MAIN_MENU_BUTTONS } }
                ] 
            };
        } else {
            return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "העגלה כבר ריקה.", quickReplies: MAIN_MENU_BUTTONS } }] };
        }
    }

    // --- 2. Context ---
    let currentProductKey = intentData.product || session.currentProduct;
    if (intentData.intent === 'chat') {
        currentProductKey = null;
        const response = intentData.aiResponse || "אהלן! אני פיני. מה נדפיס היום?";
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: response, quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    if (intentData.product && intentData.product !== session.currentProduct) {
        session.currentProduct = intentData.product;
        currentProductKey = intentData.product;
        session.draftAttributes = {}; 
    }

    if (!currentProductKey) {
        if (intentData.aiResponse && !intentData.aiResponse.includes("לא בטוח")) {
             return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: intentData.aiResponse, quickReplies: MAIN_MENU_BUTTONS } }] };
        }
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה נדפיס היום?", quickReplies: MAIN_MENU_BUTTONS } }] };
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

    // === 🛡️ SAFE CLEANING (V57) ===
    // ניקוי הקלט מתבצע רק אם אנחנו *לא* במצב מחיקה
    const isEditing = intentData.intent !== 'remove' && intentData.intent !== 'show_cart';

    if (isEditing) {
        // 1. Global Regex Size
        const sizeMatch = rawInput.match(/(\d+)\s*(?:x|X|על|\*)\s*(\d+)/);
        if (sizeMatch) {
            const val = `${sizeMatch[1]}x${sizeMatch[2]}`;
            console.log(`🎯 Global Regex: Extracted Size "${val}"`);
            normalizedParams['size'] = val;
            rawInput = rawInput.replace(sizeMatch[0], ' '); 
        }

        // 2. Qty Cleaning
        if (normalizedParams.qty) {
            const qtyRegex = new RegExp(`\\b${normalizedParams.qty}\\b`);
            if (qtyRegex.test(rawInput)) {
                 console.log(`🧹 Cleaning extracted qty "${normalizedParams.qty}" from text`);
                 rawInput = rawInput.replace(qtyRegex, ' ');
            }
        }
    }

    // === FORCE MATCH LOGIC ===
    let activeQuestion = null;
    if (productConfig.questions) {
        for (const q of productConfig.questions) {
            const currentVal = normalizedParams[q.key] || session.draftAttributes[q.key];
            if (currentVal == null) {
                activeQuestion = q;
                break;
            }
        }
    }

    if (activeQuestion) {
        let matchFound = false;

        // A. Size (Fallback)
        if (activeQuestion.key === 'size' && !normalizedParams.size) {
             if (/^[a-zA-Z]+\d+$/.test(rawInput)) { 
                normalizedParams[activeQuestion.key] = rawInput.toUpperCase();
                matchFound = true;
            }
        }

        // B. Buttons
        if (!matchFound && activeQuestion.options) {
            const STOP_WORDS = ['ספר', 'חוברת', 'רוצה', 'צריך', 'שלום', 'היי', 'אני', 'את']; 
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
        
        // C. Numbers
        if (!matchFound && activeQuestion.type === 'number') {
            const numMatch = rawInput.match(/(\d+)/);
            if (numMatch) {
                console.log(`🎯 Force Match: Number "${numMatch[0]}" for ${activeQuestion.key}`);
                normalizedParams[activeQuestion.key] = parseInt(numMatch[0]);
                matchFound = true;
            }
        }
    }

    // MAPPING
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
            
            const productName = PRODUCT_NAMES_HE[currentProductKey] || currentProductKey || "מוצר כללי";
            const fullSpec = generateTechnicalSpec(newDraft, productConfig);
            
            const cleanDesc = `${productName} - ${fullSpec}`;
            const displayDesc = `**${productName}**\n${fullSpec}`;

            const item = { 
                ...calcResult.lastAdded,
                productName: productName,
                fullSpec: fullSpec,
                description: cleanDesc, 
                cleanDescription: cleanDesc,
                displayDescription: displayDesc,
                attributes: newDraft
            };
            
            let successText = `✅ הוספתי לעגלה:\n${displayDesc}\nכמות: ${item.qty}\nסה"כ: ₪${item.client_price}`;
            
            actions.push({ type: 'CALCULATE_AND_ADD', payload: item }); 
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