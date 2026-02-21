/** engine/planner.js V96.0 - Value Match Fix & Queue Logic */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { getMainMenu } = require('./productCatalog');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) { }

const PARAM_ALIASES = {
    'paper': 'paper_type', 'stock': 'paper_type',
    'coating': 'lamination', 'finish': 'finishing',
    'width': 'size', 'amount': 'qty', 'quantity': 'qty',
    'type': 'book_type', 'pages': 'pages'
};

const PRODUCT_NAMES_HE = { 'bc': 'כרטיסי ביקור', 'flyer': 'פליירים', 'booklet': 'ספרים וחוברות', 'rollup': 'רולאפ', 'sticker': 'מדבקות', 'poster': 'פוסטרים' };
const MAIN_MENU_BUTTONS = [{ label: '📋 תפריט ראשי', value: 'reset' }, { label: 'כרטיסי ביקור', value: 'bc' }, { label: 'רולאפ', value: 'rollup' }];

const PRODUCT_KEYWORDS = {
    'bc': ['כרטיס', 'ביקור', 'cards'],
    'flyer': ['פלייר', 'flyer'],
    'booklet': ['חוברות', 'ספר', 'booklet', 'קטלוג'],
    'rollup': ['רולאפ', 'rollup', 'רול'],
    'sticker': ['מדבק', 'sticker'],
    'poster': ['פוסטר', 'poster']
};

function planActions(intentData, session) {
    const actions = [];
    let rawInput = intentData.raw_text ? String(intentData.raw_text).trim() : "";

    // 1. System Actions
    if (intentData.intent === 'reset') return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: getMainMenu(), quickReplies: MAIN_MENU_BUTTONS } }] };

    if (intentData.intent === 'show_cart') {
        const total = session.cart.reduce((sum, i) => sum + (i.client_price || 0), 0);
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: `🛒 סה"כ בעגלה: ₪${total.toLocaleString()}`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    if (intentData.intent === 'remove') {
        return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: session.cart.length - 1 } }, { type: 'GENERATE_RESPONSE', payload: { text: `🗑️ מחקתי את הפריט האחרון.`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    if (intentData.intent === 'remove_specific') {
        return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: intentData.payload.index } }, { type: 'GENERATE_RESPONSE', payload: { text: `🗑️ הפריט הוסר מהעגלה.`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    if (intentData.intent === 'update_qty') {
        const { index, qty } = intentData.payload;
        if (session.cart[index]) {
            // In a full implementation, we would recalculate the price here instead of just updating qty
            // For now, we update the qty and calculate a rough new price if it's strictly proportional, or ideally trigger a recalculate action.
            session.cart[index].qty = qty;

            // Quick recalculation for the specific item
            try {
                const { calculateCustom } = require('../services/productionEngine');
                const calcResult = calculateCustom(session.cart[index].attributes || session.cart[index]);
                if (calcResult && calcResult.client_price) {
                    session.cart[index].client_price = calcResult.client_price;
                }
            } catch (e) {
                console.log("Could not recalculate automatically");
            }

            return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: `✅ הכמות עודכנה ל-${qty}.`, quickReplies: MAIN_MENU_BUTTONS } }] };
        }
    }

    // 2. Product & Queue Logic
    let currentProductKey = session.currentProduct;

    if (intentData.intent === 'quote' && intentData.product) {
        if (intentData.product !== session.currentProduct) {
            session.currentProduct = intentData.product;
            session.draftAttributes = {};
            currentProductKey = intentData.product;

            if (intentData.allDetectedProducts && intentData.allDetectedProducts.length > 1) {
                const queue = intentData.allDetectedProducts.filter(p => p !== currentProductKey);
                session.productQueue = [...new Set(queue)];
                console.log(`🔄 [PLANNER] Queue initialized: ${session.productQueue.join(', ')}`);
            }
        }
    }

    if (!currentProductKey && session.productQueue && session.productQueue.length > 0) {
        currentProductKey = session.productQueue.shift();
        session.currentProduct = currentProductKey;
        session.draftAttributes = {};
    }

    if (!currentProductKey) {
        let aiTalk = intentData.answer_text || intentData.aiResponse || "מה נדפיס היום?";
        let customButtons = [];

        if (intentData.recommended_products && intentData.recommended_products.length > 0) {
            customButtons = intentData.recommended_products.map(key => {
                return { label: PRODUCT_NAMES_HE[key] || key, value: key };
            });
        }

        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: aiTalk, quickReplies: customButtons } }] };
    }

    // 3. Hybrid Wizard Logic
    const productConfig = productsDB[currentProductKey];
    let draft = session.draftAttributes || {};

    // שלב 0: מה נשאל פעם קודמת? (לפני שמעדכנים מהקלט החדש)
    let questionAskedLastTime = null;
    for (const q of productConfig.questions) {
        if (draft[q.key] == null) {
            questionAskedLastTime = q;
            break;
        }
    }

    // Capture Event Context if AI identified one (Upselling Trigger)
    if (intentData.event_context) {
        session.eventContext = intentData.event_context;
        console.log(`🎉 [PLANNER] Event Context Identified & Saved: ${session.eventContext}`);
    }

    // שלב א': קליטה חכמה
    if (intentData.extractedParams) {
        Object.keys(intentData.extractedParams).forEach(key => {
            const normalizedKey = PARAM_ALIASES[key] || key;
            const val = intentData.extractedParams[key];
            if (val !== null && val !== undefined && val !== '') {
                draft[normalizedKey] = val;
            }
        });
    }

    // --- FIX V96.0: Enhanced Value Match Logic ---
    if (questionAskedLastTime && draft[questionAskedLastTime.key] == null) {
        let valueToSave = null;

        // 1. Did LLM catch it directly?
        if (intentData.extractedParams && intentData.extractedParams[questionAskedLastTime.key]) {
            valueToSave = intentData.extractedParams[questionAskedLastTime.key];
        }

        // 2. Try raw input matching if available
        if (!valueToSave && rawInput) {
            const inputLower = rawInput.toLowerCase().trim();
            const numMatch = rawInput.match(/(\d+)/);

            if (numMatch) {
                if (questionAskedLastTime.key === 'qty' || questionAskedLastTime.key === 'pages' || questionAskedLastTime.type === 'number') {
                    valueToSave = parseInt(numMatch[0]);
                }
            }

            if (!valueToSave && questionAskedLastTime.options) {
                const match = questionAskedLastTime.options.find(opt => {
                    const l = opt.label.toLowerCase();
                    const v = String(opt.value).toLowerCase();

                    return inputLower === v ||
                        inputLower === l ||
                        l.includes(inputLower) ||
                        inputLower.includes(l.split(' ')[0]) ||
                        inputLower.includes(l.split('(')[0].trim());
                });

                if (match) {
                    valueToSave = match.value;
                    console.log(`🎯 [PLANNER] Matched Option! Input: "${rawInput}" -> Value: "${match.value}"`);
                }

                if (!valueToSave && (inputLower.includes('בלי') || inputLower.includes('ללא') || inputLower === 'none')) {
                    valueToSave = 'none';
                }
            }
        }

        if (valueToSave !== null) {
            draft[questionAskedLastTime.key] = valueToSave;
            console.log(`📝 [PLANNER] Saved parameter: ${questionAskedLastTime.key} = ${valueToSave}`);
        } else {
            console.log(`⚠️ [PLANNER] Failed to extract parameter for: ${questionAskedLastTime.key} from input: "${rawInput}"`);
        }
    }

    session.draftAttributes = draft;

    // 4. בדיקה מה הלאה
    let nextQuestion = null;
    for (const q of productConfig.questions) {
        if (draft[q.key] == null) {
            nextQuestion = q;
            break;
        }
    }

    const { checkUpsell } = require('./upseller');

    if (nextQuestion) {
        const productNameHE = PRODUCT_NAMES_HE[currentProductKey] || currentProductKey;
        const prefix = `📌 **לגבי ה${productNameHE}:** `;

        return {
            actions: [{
                type: 'PRESENT_OPTIONS',
                question: prefix + nextQuestion.question_he,
                options: nextQuestion.options || [],
                product: currentProductKey,
                saveDraft: draft
            }]
        };
    } else {
        try {
            if (currentProductKey === 'rollup' && !draft.size) draft.size = '85x200';

            const calcResult = calculate_custom_job(session.cart, { ...draft, product: currentProductKey });
            const hebrewName = PRODUCT_NAMES_HE[currentProductKey] || currentProductKey;
            const cleanDesc = calcResult.lastAdded.description || "";

            const item = {
                ...calcResult.lastAdded,
                product: hebrewName,
                productName: hebrewName,
                description: cleanDesc,
                attributes: draft
            };

            actions.push({ type: 'CALCULATE_AND_ADD', payload: item });

            // ======= UPSELL ENGINE INJECTION =======
            const upsellPitch = checkUpsell(session.cart, currentProductKey, session.eventContext);

            if (session.productQueue && session.productQueue.length > 0) {
                const nextProduct = session.productQueue.shift();
                session.currentProduct = nextProduct;
                session.draftAttributes = {};

                const nextNameHE = PRODUCT_NAMES_HE[nextProduct] || nextProduct;
                const nextConfig = productsDB[nextProduct];
                const firstQ = nextConfig.questions[0];

                actions.push({
                    type: 'GENERATE_RESPONSE',
                    payload: {
                        text: `✅ הוספתי את ה${hebrewName} לעגלה (₪${item.client_price}).\n\n🔄 **עובר מיד ל${nextNameHE}...**\n\n❓ ${firstQ.question_he}`,
                        quickReplies: firstQ.options || []
                    }
                });
            } else if (upsellPitch) {
                // We have a pitch to make!
                actions.push({
                    type: 'GENERATE_RESPONSE',
                    payload: {
                        text: `✅ הוספתי לעגלה: ${item.productName} (₪${item.client_price})\n\n💡 ${upsellPitch.pitch}`,
                        quickReplies: [
                            { label: `כן, תוסיף ${PRODUCT_NAMES_HE[upsellPitch.product_key] || upsellPitch.product_key}`, value: upsellPitch.product_key },
                            { label: 'לא תודה, סיום וצ\'ק אאוט', value: 'checkout' }
                        ]
                    }
                });
            } else {
                actions.push({
                    type: 'GENERATE_RESPONSE',
                    payload: {
                        text: `✅ הוספתי לעגלה: ${item.productName}\n📝 מפרט: ${item.description}\n💵 סה"כ: ₪${item.client_price}`,
                        quickReplies: [{ label: 'סיום וצ\'ק אאוט', value: 'checkout' }, { label: 'הוסף עוד פריט', value: 'reset' }]
                    }
                });
            }
            return { actions };
        } catch (e) {
            console.error(e);
            return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "שגיאה בחישוב.", quickReplies: MAIN_MENU_BUTTONS } }] };
        }
    }
}

module.exports = { planActions };