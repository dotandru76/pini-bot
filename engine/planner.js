/** engine/planner.js V22.0 - Final Polish */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

function planActions(intentData, session) {
    const actions = [];

    // --- טיפול במחיקה ---
    if (intentData.intent === 'remove_item') {
        const params = intentData.extractedParams || {};
        const productToRemove = (params.products && params.products.length > 0) ? params.products[0] : null;
        
        return {
            actions: [{
                type: 'REMOVE_FROM_CART',
                payload: {
                    index: params.targetIndex,
                    product: productToRemove
                }
            }]
        };
    }

    // --- פעולות גלובליות ---
    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "איפסתי הכל. מה נדפיס?" } }] };
    }
    if (intentData.intent === 'show_cart') {
        const cartText = session.cart.length > 0 ? `יש לך ${session.cart.length} פריטים בעגלה.` : "העגלה ריקה כרגע.";
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: cartText } }] };
    }
    
    // תיקון הטסט: איחוד התשובה לשיחת חולין עם התשובה המכירתית
    if (intentData.intent === 'chat' && !session.currentProduct) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "אני איתך. מה תרצה להדפיס? (פליירים, ספרים, רולאפ...)" } }] };
    }

    // --- ניהול הקשר מוצר ---
    let currentProductKey = intentData.product || session.currentProduct;
    if (!currentProductKey) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה תרצה להדפיס? (פליירים, ספרים, רולאפ...)" } }] };
    }

    const productConfig = productsDB[currentProductKey];
    if (!productConfig) return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "המוצר הזה לא קיים במערכת כרגע." } }] };

    // --- פענוח חכם (Smart Parsing) ---
    let newParams = intentData.extractedParams || {};
    const userText = (newParams.raw_text || "").toLowerCase().trim();
    
    const isPureNumber = /^\d+$/.test(userText.replace(/,/g, ''));

    // זיהוי אופציות (Text Matching)
    let potentialMatches = [];

    if (productConfig.questions) {
        for (const q of productConfig.questions) {
            const isMissing = !session.draftAttributes[q.key]; 
            
            if (q.options) {
                for (const opt of q.options) {
                    const val = opt.value.toLowerCase();
                    const label = opt.label.toLowerCase();
                    const cleanLabel = label.replace(/\s*\(.*?\)\s*/g, '').trim(); 
                    
                    let matchType = null;
                    if (userText.includes(val)) matchType = 'val_exact';
                    else if (userText.includes(label)) matchType = 'label_exact';
                    else if (cleanLabel.length > 1 && userText.includes(cleanLabel)) matchType = 'label_clean';
                    else if (label.includes(userText) && userText.length >= 2) matchType = 'user_partial'; 

                    if (matchType) {
                        potentialMatches.push({
                            key: q.key,
                            value: opt.value,
                            text: matchType === 'val_exact' ? val : (matchType === 'user_partial' ? userText : cleanLabel),
                            score: (matchType === 'val_exact' ? 20 : 10) + (isMissing ? 50 : 0)
                        });
                    }
                }
            }
        }
    }

    // מיון וסינון
    potentialMatches.sort((a, b) => b.score - a.score);
    const finalMatches = [];
    
    for (const match of potentialMatches) {
        const isSubstring = finalMatches.some(approved => 
            approved.text.includes(match.text) && approved.key !== match.key
        );

        if (!isSubstring) {
            finalMatches.push(match);
            newParams[match.key] = match.value;
            
            if (newParams.qty && match.text.includes(newParams.qty.toString())) {
                 delete newParams.qty;
            }
        }
    }

    // --- תיקון "מלכודת הכמות" ---
    if (intentData.intent === 'answer' || session.currentProduct) {
        let pendingQuestion = null;
        for (const q of productConfig.questions) {
            if (!session.draftAttributes[q.key] && !newParams[q.key]) { 
                pendingQuestion = q;
                break;
            }
        }

        if (pendingQuestion && pendingQuestion.type === 'number' && isPureNumber) {
            const numVal = parseInt(userText.replace(/,/g, ''));
            
            if (pendingQuestion.key !== 'qty') {
                newParams[pendingQuestion.key] = numVal;
                delete newParams.qty;
            } else {
                newParams.qty = numVal;
            }
        }
    }

    // מיזוג נתונים
    const validNewParams = {};
    Object.keys(newParams).forEach(key => {
        if (newParams[key] !== null && newParams[key] !== undefined && key !== 'raw_text') {
            validNewParams[key] = newParams[key];
        }
    });

    const newDraft = (intentData.intent === 'new_order' && intentData.product) 
        ? validNewParams 
        : { ...session.draftAttributes, ...validNewParams };
    
    if (currentProductKey === 'sticker' && !newDraft.material) newDraft.material = 'vinyl_white';

    // --- מה חסר? ---
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
            actions.push({ type: 'CHECK_QUEUE' }); 
        } catch (err) {
            console.error("Calc Error:", err);
            actions.push({ type: 'GENERATE_RESPONSE', payload: { text: "נתקלתי בבעיה בחישוב. נסה לשנות פרמטרים." } });
        }
    }

    return { actions };
}

module.exports = { planActions };