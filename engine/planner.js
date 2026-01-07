/** engine/planner.js V11.3 - Final Polish */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

function planActions(intentData, session) {
    
    // --- 1. THE SUPERVISOR ---
    const hasParams = intentData.extractedParams && Object.keys(intentData.extractedParams).length > 0;
    
    // Downgrade empty updates to chat ("חחח סתם")
    if ((intentData.intent === 'update' || intentData.intent === 'consult') && !hasParams && !intentData.product) {
        intentData.intent = 'chat';
    }

    // Context Switch -> Force Quote ("החלפת נושא")
    if (intentData.intent === 'update' && intentData.product && intentData.product !== session.currentProduct) {
        intentData.intent = 'quote'; 
    }

    // --- 2. ACTION HANDLERS ---
    const actions = [];

    if (['greeting', 'thank_you', 'bye'].includes(intentData.intent)) {
        return { actions: [{ type: 'GENERATE_RESPONSE', template: 'greeting', payload: { text: "בכיף! אני כאן אם צריך עוד משהו. 😊" } }] };
    }
    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "איפסתי הכל. מה נדפיס?" } }] };
    }
    if (intentData.intent === 'remove') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "מחקתי את העגלה." } }] };
    }
    if (intentData.intent === 'show_cart') {
        const cartText = session.cart.length > 0 ? `יש לך ${session.cart.length} פריטים בעגלה.` : "העגלה ריקה כרגע.";
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: cartText } }] };
    }
    if (intentData.intent === 'checkout') {
         return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מעולה, אפיק לך הצעת מחיר מסודרת." } }] };
    }

    // === CHAT BARRIER ===
    if (intentData.intent === 'chat') {
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { text: "נשמע טוב! אני רק בוט דפוס 🤖, אז בוא נחזור לעניינים. תרצה להוסיף משהו לעגלה?" } 
            }] 
        };
    }
    // ====================

    // Scope Checks
    if (intentData.product === 'out_of_scope') return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "וואו, זה גדול עלינו. אני מתמחה בדפוס דיגיטלי ופורמט רחב סטנדרטי." } }] };
    if (intentData.product === 'impossible') return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "אממ... זה בלתי אפשרי טכנית להדפיס על זה. 😅" } }] };

    // --- 3. PRODUCT ENGINE ---
    let currentProductKey = intentData.product || session.currentProduct;
    
    // Restore context for update
    if ((intentData.intent === 'update' || intentData.intent === 'quote') && !currentProductKey && session.cart.length > 0) {
        currentProductKey = session.cart[session.cart.length - 1].product;
    }

    if (!currentProductKey) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה תרצה להדפיס? (פליירים, כרטיסים, רולאפ...)" } }] };
    }

    const productConfig = productsDB[currentProductKey];
    if (!productConfig) return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "המוצר הזה לא קיים במערכת כרגע." } }] };

    const newParams = intentData.extractedParams || {};
    if (productConfig.engine === 'wide' && newParams.paper_type) newParams.material = newParams.paper_type;

    const validNewParams = {};
    Object.keys(newParams).forEach(key => {
        if (newParams[key] !== null && newParams[key] !== undefined) validNewParams[key] = newParams[key];
    });

    const newDraft = (intentData.intent === 'quote') 
        ? validNewParams 
        : { ...session.draftAttributes, ...validNewParams };
    
    // Sticker Defaults
    if (currentProductKey === 'sticker' && !newDraft.material) newDraft.material = 'vinyl_white';

    let missingParam = null;
    let questionToAsk = null;

    if (productConfig.questions) {
        for (const q of productConfig.questions) {
            if (!newDraft[q.key]) { missingParam = q.key; questionToAsk = q; break; }
        }
    }

    if (missingParam) {
        actions.push({
            type: 'PRESENT_OPTIONS',
            question: questionToAsk.question_he,
            options: questionToAsk.options || [],
            product: currentProductKey,
            saveDraft: newDraft
        });
    } else {
        try {
            const calculationParams = { ...newDraft, product: currentProductKey };
            const calcResult = calculate_custom_job(session.cart, calculationParams);
            
            actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
            actions.push({ type: 'GENERATE_RESPONSE', template: 'quote_success', payload: { item: calcResult.lastAdded } });
        } catch (err) {
            actions.push({ type: 'GENERATE_RESPONSE', payload: { text: `שגיאה: ${err.message}` } });
        }
    }

    return { actions };
}

module.exports = { planActions };