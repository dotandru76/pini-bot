/** engine/planner.js V17.0 - Short Words & Regex Fix */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

function planActions(intentData, session) {
    const actions = [];

    // 1. גלובלי
    if (intentData.intent === 'reset') {
        return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: "איפסתי הכל. מה נדפיס?" } }] };
    }
    if (intentData.intent === 'show_cart') {
        const cartText = session.cart.length > 0 ? `יש לך ${session.cart.length} פריטים בעגלה.` : "העגלה ריקה כרגע.";
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: cartText } }] };
    }
    if (intentData.intent === 'chat' && !session.currentProduct) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "אני איתך. איך אני יכול לעזור עם הדפסות היום?" } }] };
    }

    // 2. ניהול מוצר
    let currentProductKey = intentData.product || session.currentProduct;
    if (!currentProductKey) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה תרצה להדפיס? (פליירים, ספרים, רולאפ...)" } }] };
    }

    const productConfig = productsDB[currentProductKey];
    if (!productConfig) return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "המוצר הזה לא קיים במערכת כרגע." } }] };

    // 3. פענוח חכם (Smart Matching V4)
    let newParams = intentData.extractedParams || {};
    const userText = (newParams.raw_text || "").toLowerCase().trim();

    // רשימת התאמות פוטנציאליות
    let potentialMatches = [];

    if (productConfig.questions) {
        for (const q of productConfig.questions) {
            // התעלם משאלות שכבר נענו בטיוטה (אלא אם זו הזמנה חדשה)
            if (session.draftAttributes[q.key] && intentData.intent !== 'new_order') continue;

            if (q.options) {
                for (const opt of q.options) {
                    const val = opt.value.toLowerCase();
                    const label = opt.label.toLowerCase();
                    
                    // ניקוי אגרסיבי: מסיר סוגריים, ומנקה רווחים בקצוות
                    const cleanLabel = label.replace(/\(.*\)/g, '').trim(); 
                    
                    // בדיקות התאמה
                    let matchType = null;
                    
                    // התאמה מלאה לערך הטכני
                    if (userText.includes(val)) matchType = 'val_exact';
                    
                    // התאמה לתווית המלאה
                    else if (userText.includes(label)) matchType = 'label_exact';
                    
                    // התאמה לתווית נקייה (למשל "כריכה רכה" מתוך "כריכה רכה (הדבקה)")
                    else if (userText.includes(cleanLabel) && cleanLabel.length > 1) matchType = 'label_clean';
                    
                    // התאמה חלקית הפוכה (המשתמש כתב "מט", התווית היא "למינציה מט")
                    // התיקון: הורדתי את הרף ל-2 תווים כדי לתפוס "מט"
                    else if (label.includes(userText) && userText.length >= 2) matchType = 'user_partial'; 

                    if (matchType) {
                        potentialMatches.push({
                            key: q.key,
                            value: opt.value,
                            text: matchType === 'val_exact' ? val : (matchType === 'user_partial' ? userText : cleanLabel),
                            score: matchType === 'val_exact' ? 10 : 5
                        });
                    }
                }
            }
        }
    }

    // סינון כפילויות (De-Duplication)
    potentialMatches.sort((a, b) => b.text.length - a.text.length);
    
    const finalMatches = [];
    for (const match of potentialMatches) {
        // האם הטקסט הזה כבר נתפס ע"י התאמה "חזקה" יותר באותה הודעה?
        // למשל: אם תפסנו "מט 350", לא נרצה לתפוס גם את "מט" כשדה נפרד
        const isSubstring = finalMatches.some(approved => 
            approved.text.includes(match.text) && approved.key !== match.key
        );

        if (!isSubstring) {
            finalMatches.push(match);
            newParams[match.key] = match.value;
            console.log(`🎯 Smart Match Approved: ${match.key} = ${match.value} (Based on "${match.text}")`);
            
            // ביטול Qty שגוי שנגזר מהאופציה
            if (newParams.qty && match.text.includes(newParams.qty.toString())) {
                 console.log(`🔧 Conflict Fix: Dropping qty=${newParams.qty} (belongs to ${match.text})`);
                 delete newParams.qty;
            }
        }
    }

    // --- תיקון "מלכודת הכמות" (Quantity Trap) ---
    if (intentData.intent === 'answer' || session.currentProduct) {
        let pendingQuestion = null;
        for (const q of productConfig.questions) {
            if (!session.draftAttributes[q.key] && !newParams[q.key]) { 
                pendingQuestion = q;
                break;
            }
        }

        if (pendingQuestion && pendingQuestion.type === 'number' && pendingQuestion.key !== 'qty') {
            if (newParams.qty) {
                console.log(`🔧 Planner Fix: Remapping qty=${newParams.qty} to ${pendingQuestion.key}`);
                newParams[pendingQuestion.key] = newParams.qty;
                delete newParams.qty;
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
    
    // ברירות מחדל
    if (currentProductKey === 'sticker' && !newDraft.material) newDraft.material = 'vinyl_white';

    // 4. מה חסר?
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