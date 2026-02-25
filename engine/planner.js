/** engine/planner.js V96.0 - Value Match Fix & Queue Logic */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { getMainMenu } = require('./productCatalog');
const { analyzePrintReadyStatus } = require('./decisionKernel');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) { }

const PARAM_ALIASES = {
    'paper': 'paper_type', 'stock': 'paper_type',
    'coating': 'lamination', 'finish': 'finishing',
    'width': 'size', 'amount': 'qty', 'quantity': 'qty',
    'type': 'book_type', 'pages': 'pages'
};

const PRODUCT_NAMES_HE = {
    'bc': 'כרטיסי ביקור',
    'flyer': 'פליירים',
    'booklet': 'ספרים וחוברות',
    'rollup': 'רולאפ',
    'sticker': 'מדבקות',
    'poster': 'פוסטרים',
    'invitation': 'הזמנות',
    'place_card': 'פתקי הושבה / כרטיסי שולחן',
    'folder': 'פולדרים / תיקיות',
    'office': 'ניירת משרדית',
    'alucobond': 'שילוט אלוקובונד',
    'roll_stickers': 'מדבקות בגלילים',
    'scodix': 'כרטיסי יוקרה סקודיקס'
};
const MAIN_MENU_BUTTONS = []; // UI Purge: Removed Main Menu, BC, and Rollup buttons as requested.

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

    // --- PHASE 2.3: Decision Kernel Integration ---
    if (intentData.mapped_params && (intentData.mapped_params.dpi || intentData.mapped_params.width_mm)) {
        const kernelResult = analyzePrintReadyStatus(intentData.mapped_params, session);
        console.log(`🛡️ [KERNEL] Result: ${kernelResult.status} | ${kernelResult.details}`);

        // Push kernel result to debug metadata for Frontend Overlay
        if (!intentData._debug) intentData._debug = {};
        intentData._debug.kernel = kernelResult;

        if (kernelResult.status !== 'READY_FOR_PRINT') {
            console.warn(`🛑 [PLANNER] Technical Rejection: ${kernelResult.status}`);
            let rejectionMsg = "משהו לא לגמרי תקין בקובץ: ";

            if (kernelResult.status === 'REJECT_LOW_RES') {
                rejectionMsg = `⚠️ **איכות נמוכה**: הרזולוציה שזיהיתי (${intentData.mapped_params.dpi} DPI) נמוכה מדי לדפוס איכותי. כדאי להעלות קובץ באיכות גבוהה יותר (300 DPI מומלץ).`;
            } else if (kernelResult.status === 'DIMENSION_MISMATCH') {
                rejectionMsg = `📐 **אי התאמה במידות**: המידות שזיהיתי בקובץ (${intentData.mapped_params.width_mm}x${intentData.mapped_params.height_mm} מ"מ) לא מתאימות להזמנה שלך (${session.draftAttributes.width}x${session.draftAttributes.height} מ"מ).`;
            }

            return {
                actions: [{
                    type: 'GENERATE_RESPONSE',
                    payload: {
                        text: rejectionMsg + "\n\nננסה שוב? אפשר להעלות קובץ חדש או לתאר מה לשנות.",
                        quickReplies: [{ label: 'דבר עם נציג', value: 'human' }]
                    }
                }]
            };
        }
    }

    // 1. System Actions
    if (intentData.intent === 'reset') return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: getMainMenu(), quickReplies: MAIN_MENU_BUTTONS } }] };

    // --- PHASE 1.3 MICRO-PATCH: Missing Add-to-Cart fix & X-Ray Logging ---
    console.log(`\x1b[36m🔍 [X-RAY PLANNER] Intent: ${intentData.intent}, Product: ${intentData.product || session.currentProduct || 'None'}, Raw: "${rawInput}"\x1b[0m`);

    // If the user said "cart" but they meant "add the current item to the cart" or "add 500 cards to cart"
    if (intentData.intent === 'show_cart' || intentData.intent === 'add_to_cart') {
        const paramsMap = intentData.mapped_params || intentData.extractedParams;
        if (session.currentProduct || intentData.product || (paramsMap && Object.keys(paramsMap).length > 0)) {
            console.log(`\x1b[36m🔍 [X-RAY PLANNER] Intercepted 'show_cart' as a product continuation/creation.\x1b[0m`);
            intentData.intent = 'quote'; // Force it into the calculation flow
        } else {
            console.log(`\x1b[36m🔍 [X-RAY PLANNER] True 'show_cart' intent detected. Returning cart total.\x1b[0m`);
            const total = session.cart.reduce((sum, i) => sum + (i.client_price || 0), 0);
            return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: `🛒 סה"כ בעגלה: ₪${total.toLocaleString()}`, quickReplies: MAIN_MENU_BUTTONS } }] };
        }
    }

    if (intentData.intent === 'remove') {
        return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: session.cart.length - 1 } }, { type: 'GENERATE_RESPONSE', payload: { text: `🗑️ מחקתי את הפריט האחרון.`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    if (intentData.intent === 'remove_specific') {
        return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: intentData.payload.index } }, { type: 'GENERATE_RESPONSE', payload: { text: `🗑️ הפריט הוסר מהעגלה.`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    if (intentData.intent === 'update_qty' || (intentData.intent === 'update' && intentData.payload && intentData.payload.index !== undefined)) {
        const { index, qty } = intentData.payload || intentData;
        if (session.cart[index]) {
            console.log(`\x1b[33m🔄 [PLANNER] Recalculating Item ${index} after Qty Update to ${qty}...\x1b[0m`);

            // Temporary attributes for recalculation
            const attributes = { ...session.cart[index].attributes, qty, product: session.cart[index].productKey || session.cart[index].product };

            try {
                // Calculate WITHOUT appending (pass empty array as baseline cart)
                const calcResult = calculate_custom_job([], attributes);

                if (calcResult && calcResult.lastAdded) {
                    session.cart[index] = {
                        ...session.cart[index],
                        ...calcResult.lastAdded,
                        qty: qty // Ensure qty is explicitly set
                    };
                }
            } catch (e) {
                console.error("[PLANNER] Error during qty recalculation:", e.message);
                session.cart[index].qty = qty; // Fallback to just updating qty
            }

            return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: `✅ הכמות עודכנה ל-${qty}.`, quickReplies: [] } }] };
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
        let customButtons = [{ label: 'דבר עם נציג', value: 'human' }]; // Minimalist fallback

        if (intentData.recommended_products && intentData.recommended_products.length > 0) {
            // UI Purge: Hard filter to prevent "Ghost Buttons" (BC, Rollup, Main Menu) from appearing
            const BANNED_BUTTONS = ['bc', 'rollup', 'main_menu', 'reset'];
            customButtons = intentData.recommended_products
                .filter(key => !BANNED_BUTTONS.includes(key))
                .map(key => {
                    return { label: PRODUCT_NAMES_HE[key] || key, value: key };
                });
        }

        // If after filtering we have no buttons, default to human rep
        if (customButtons.length === 0) customButtons = [{ label: 'דבר עם נציג', value: 'human' }];

        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: aiTalk, quickReplies: customButtons } }] };
    }

    // 3. Hybrid Wizard Logic
    const productConfig = productsDB[currentProductKey];

    // 🔥 CRASH PROTECTION: If the LLM picked a product not in our DB
    if (!productConfig || !productConfig.questions) {
        console.error(`❌ [PLANNER ERROR] Product '${currentProductKey}' is missing from products.json!`);
        session.currentProduct = null;
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מתנצל, אין לי עדיין תמחור אוטומטי למוצר הזה. מה עוד תרצה שנדפיס?", quickReplies: [{ label: 'תפריט ראשי', value: 'reset' }] } }] };
    }

    let draft = session.draftAttributes || {};

    // --- PHASE 1.3: UI Isolation Logic ---
    // If we are actively answering questions for a product (Wizard mode), don't show the MAIN_MENU_BUTTONS
    const baseQuickReplies = (Object.keys(draft).length > 0 || currentProductKey) ? [] : MAIN_MENU_BUTTONS;

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
    // --- PHASE 1.3 MICRO-PATCH: The Quantity Loop Bug Fix ---
    // Make sure we use mapped_params if extractedParams is undefined
    const paramsMap = intentData.mapped_params || intentData.extractedParams;
    if (paramsMap) {
        Object.keys(paramsMap).forEach(key => {
            const normalizedKey = PARAM_ALIASES[key] || key;
            const val = paramsMap[key];
            if (val !== null && val !== undefined && val !== '') {
                draft[normalizedKey] = val;
                console.log(`\x1b[32m🔍 [X-RAY PLANNER] Directly merged param into draft: ${normalizedKey} = ${val}\x1b[0m`);
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
        // --- PHASE 1.3: Persona Injection ---
        const warmGreetings = ["בטח", "בשמחה", "מעולה", "קיבלתי", "מצוין"];
        const randomGreeting = warmGreetings[Math.floor(Math.random() * warmGreetings.length)];
        const prefix = Object.keys(draft).length === 0 ?
            `${randomGreeting}, בוא נתקדם עם ה${productNameHE} שלך.\n\n` :
            `${randomGreeting}, `;

        console.log(`\x1b[33m🔍 [X-RAY PLANNER] Missing Data! Asking question for key: ${nextQuestion.key}\x1b[0m`);

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
        console.log(`\x1b[32m🔍 [X-RAY PLANNER] All data collected! Triggering Engine Calculation for: ${currentProductKey}\x1b[0m`);
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
            return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "שגיאה בחישוב.", quickReplies: baseQuickReplies } }] };
        }
    }
}

module.exports = { planActions };