/** engine/planner.js V11.5 - Recommendation & Stability Engine */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

function planActions(intentData, session) {
    
    // --- 1. THE SUPERVISOR (תיקון כוונות) ---
    const hasParams = intentData.extractedParams && Object.keys(intentData.extractedParams).length > 0;
    
    // ANTI-HALLUCINATION: מניעת קפיצה לרולאפ בגלל המילה "סטנדרטי"
    // אם אנחנו באמצע מוצר (למשל הזמנה) והמשתמש רק נתן פרמטר (גודל/כמות)
    // וה-LLM החליט פתאום לשנות מוצר בלי סיבה טובה -> נתעלם משינוי המוצר
    if (session.currentProduct && intentData.product && intentData.product !== session.currentProduct) {
        // אם המשתמש לא אמר את שם המוצר החדש במפורש, נשארים עם הישן
        // (בדיקה פשוטה: האם הטקסט שזוהה ב-LLM כסיכום מכיל את שם המוצר החדש?)
        // כאן אנחנו עושים 'Hard Lock': אם זה Update, אל תחליף מוצר!
        if (intentData.intent === 'update') {
            console.log(`🛡️ Supervisor: Blocked implicit switch from ${session.currentProduct} to ${intentData.product}`);
            intentData.product = session.currentProduct;
        }
    }

    // Downgrade empty updates to chat
    if ((intentData.intent === 'update' || intentData.intent === 'consult') && !hasParams && !intentData.product) {
        intentData.intent = 'consult'; // שונה ל-consult כדי לתפוס המלצות
    }

    // --- 2. ACTION HANDLERS ---
    const actions = [];

    // System Actions
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

    // === RECOMMENDATION ENGINE (מנוע ההמלצות) ===
    if (intentData.intent === 'consult' || intentData.intent === 'chat') {
        const text = (intentData.summary || "").toLowerCase(); // או להשתמש בטקסט המקורי אם הועבר
        
        // זיהוי מילות מפתח להמלצה (זה פתרון זמני עד שה-LLM יעשה את זה מושלם)
        // אבל זה סופר מהיר ויעיל
        if (intentData.intent === 'consult' && !intentData.product && !session.currentProduct) {
             // אם המשתמש שאל על חתונה/אירוע
             // הערה: במערכת מלאה היינו מעבירים את ה-Message המקורי ל-Planner
             // כאן נשתמש בתשובה גנרית חכמה
             
             return { 
                actions: [{ 
                    type: 'GENERATE_RESPONSE', 
                    payload: { text: "לחתונה ואירועים אני ממליץ על:\n💌 הזמנות (מנייר פנינה/מט)\n🔖 כרטיסי הושבה\n📜 תפריטים לשולחן\n🥡 מדבקות למזכרות\n\nעם מה נתחיל?" } 
                }] 
            };
        }

        // CHAT BARRIER
        if (intentData.intent === 'chat') {
            return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "נשמע טוב! אני בוט דפוס 🤖. תרצה להוסיף משהו לעגלה?" } }] };
        }
    }
    // ==========================================

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
    
    // נרמול "סטנדרטי"
    if (newParams.size && (newParams.size === 'standard' || newParams.size === 'סטנדרטי')) {
        if (currentProductKey === 'invitation') newParams.size = '12x17';
        if (currentProductKey === 'bc') newParams.size = '9x5';
        if (currentProductKey === 'rollup') newParams.size = '85x200';
    }

    if (productConfig.engine === 'wide' && newParams.paper_type) newParams.material = newParams.paper_type;

    const validNewParams = {};
    Object.keys(newParams).forEach(key => {
        if (newParams[key] !== null && newParams[key] !== undefined) validNewParams[key] = newParams[key];
    });

    const newDraft = (intentData.intent === 'quote') 
        ? validNewParams 
        : { ...session.draftAttributes, ...validNewParams };
    
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