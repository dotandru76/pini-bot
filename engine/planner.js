/** engine/planner.js */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { buildResponse } = require('./responseBuilder');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

function planActions(intentData, session) {
    const actions = [];

    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "איפסתי הכל. מה נדפיס?" } }] };
    }

    if (intentData.intent === 'show_cart') {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: buildResponse('cart_status', { cart: session.cart }), quickReplies: [{label: 'נקה', value: 'reset'}] } }] };
    }

    if (session.currentProduct && productsDB[session.currentProduct]) {
        const productConfig = productsDB[session.currentProduct];
        const currentAttributes = { ...session.draftAttributes };

        if (intentData.intent === 'answer' || intentData.intent === 'new_order') {
            const userMessage = intentData.extractedParams?.raw_text || "";
            for (const q of productConfig.questions) {
                if (!currentAttributes[q.key]) {
                    // לוגיקת שמירת תשובה (מספר/אופציה)
                    if (q.type === 'number' && /^\d+$/.test(userMessage)) currentAttributes[q.key] = parseInt(userMessage);
                    else if (q.options) {
                        const match = q.options.find(o => userMessage === o.value || userMessage === o.label);
                        if (match) currentAttributes[q.key] = match.value;
                    }
                    break;
                }
            }
        }

        let nextQuestion = productConfig.questions.find(q => !currentAttributes[q.key]);

        if (nextQuestion) {
            actions.push({
                type: 'PRESENT_OPTIONS',
                question: nextQuestion.question_he,
                options: nextQuestion.options || [],
                saveDraft: currentAttributes
            });
        } else {
            const finalPayload = { product: session.currentProduct, qty: currentAttributes.qty, ...currentAttributes };
            try {
                const calc = calculate_custom_job(session.cart, finalPayload);
                finalPayload.client_price = calc.lastAdded.client_price;
                finalPayload.description = calc.lastAdded.description;
            } catch (e) { finalPayload.client_price = 0; }

            actions.push({ type: 'CALCULATE_AND_ADD', payload: finalPayload });
            actions.push({ type: 'CLEAR_SESSION_CONTEXT' });
        }
        return { actions };
    }

    // ברירת מחדל אנושית
    return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: buildResponse('greeting'), quickReplies: [] } }] };
}

module.exports = { planActions };