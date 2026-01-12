/** engine/planner.js V83.0 - Multi-Product Queue & Context Clarity */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { getMainMenu } = require('./productCatalog');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const PARAM_ALIASES = { 
    'paper': 'paper_type', 'stock': 'paper_type', 'sug_niyar': 'paper_type',
    'coating': 'lamination', 'laminatzia': 'lamination',
    'finish': 'finishing', 'haskhba': 'finishing',
    'width': 'size', 'godel': 'size',
    'amount': 'qty', 'quantity': 'qty', 'kamut': 'qty',
    'type': 'book_type', 'sug': 'book_type',
    'pages': 'pages', 'amudim': 'pages'
};

const PRODUCT_NAMES_HE = { 'bc': 'כרטיסי ביקור', 'flyer': 'פליירים', 'booklet': 'חוברות', 'rollup': 'רולאפ', 'sticker': 'מדבקות' };
const MAIN_MENU_BUTTONS = [{ label: '📋 תפריט ראשי', value: 'reset' }, { label: 'כרטיסי ביקור', value: 'bc' }, { label: 'רולאפ', value: 'rollup' }];

// מילות מפתח לזיהוי מוצרים נוספים במשפט (Queue Detection)
const PRODUCT_KEYWORDS = {
    'bc': ['כרטיס', 'ביקור', 'cards'],
    'flyer': ['פלייר', 'flyer'],
    'booklet': ['חוברות', 'ספר', 'booklet', 'קטלוג'],
    'rollup': ['רולאפ', 'rollup', 'רול'],
    'sticker': ['מדבק', 'sticker']
};

function planActions(intentData, session) {
    const actions = [];
    let rawInput = intentData.raw_text ? intentData.raw_text.trim() : "";
    
    // --- 1. פעולות מערכת ---
    if (intentData.intent === 'reset') return { actions: [{ type: 'CLEAR_SESSION_CONTEXT' }, { type: 'GENERATE_RESPONSE', payload: { text: getMainMenu(), quickReplies: MAIN_MENU_BUTTONS } }] };
    
    if (intentData.intent === 'show_cart') {
        const total = session.cart.reduce((sum, i) => sum + (i.client_price || 0), 0);
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: `🛒 סה"כ בעגלה: ₪${total.toLocaleString()}`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }
    
    if (intentData.intent === 'remove') {
        return { actions: [{ type: 'REMOVE_FROM_CART', payload: { index: session.cart.length - 1 } }, { type: 'GENERATE_RESPONSE', payload: { text: `🗑️ מחקתי.`, quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    // --- 2. ניהול מוצר ותור (Queue Logic) ---
    let currentProductKey = session.currentProduct;
    
    // זיהוי התחלתי או החלפת נושא
    if (intentData.intent === 'quote' && intentData.product) {
        if (intentData.product !== session.currentProduct) {
            
            // --- V83: Multi-Product Detection ---
            // אם זו ההתחלה, נסרוק את הטקסט כדי לראות אם יש עוד מוצרים שמחכים
            const foundProducts = [];
            Object.keys(PRODUCT_KEYWORDS).forEach(key => {
                const keywords = PRODUCT_KEYWORDS[key];
                if (keywords.some(kw => rawInput.toLowerCase().includes(kw))) {
                    foundProducts.push(key);
                }
            });

            // המוצר הראשי שה-LLM זיהה הוא הנוכחי
            session.currentProduct = intentData.product;
            session.draftAttributes = {}; 
            currentProductKey = intentData.product;

            // כל שאר המוצרים שנמצאו נכנסים לתור (אם הם לא הנוכחי)
            session.productQueue = foundProducts.filter(p => p !== currentProductKey);
        }
    }

    // אם אנחנו במצב "בין לבין" (אין מוצר נוכחי אבל יש משהו בתור)
    if (!currentProductKey && session.productQueue && session.productQueue.length > 0) {
        currentProductKey = session.productQueue.shift();
        session.currentProduct = currentProductKey;
        session.draftAttributes = {};
    }

    if (!currentProductKey) {
        return { actions: [{ type: 'GENERATE_RESPONSE', payload: { text: "מה נדפיס היום?", quickReplies: MAIN_MENU_BUTTONS } }] };
    }

    // --- 3. המוח ההיברידי ---
    const productConfig = productsDB[currentProductKey];
    let draft = session.draftAttributes || {};

    // שלב 0: קליטה חכמה
    if (intentData.extractedParams) {
        Object.keys(intentData.extractedParams).forEach(key => {
            const normalizedKey = PARAM_ALIASES[key] || key;
            const val = intentData.extractedParams[key];
            if (val !== null && val !== undefined && val !== '') {
                draft[normalizedKey] = val;
            }
        });
    }

    // שלב א': השלמה "טיפשה"
    let questionAskedLastTime = null;
    for (const q of productConfig.questions) {
        if (draft[q.key] == null) { 
            questionAskedLastTime = q;
            break; 
        }
    }

    if (questionAskedLastTime && draft[questionAskedLastTime.key] == null && rawInput) {
        let valueToSave = null;
        if (questionAskedLastTime.type === 'number') {
            const numMatch = rawInput.match(/(\d+)/);
            if (numMatch) valueToSave = parseInt(numMatch[0]);
        }
        if (questionAskedLastTime.options) {
            const match = questionAskedLastTime.options.find(opt => 
                rawInput === opt.value || 
                rawInput.includes(opt.label) || 
                opt.label.includes(rawInput)
            );
            if (match) valueToSave = match.value;
            if (!valueToSave && (rawInput.includes('בלי') || rawInput.includes('ללא') || rawInput === 'none')) {
                valueToSave = 'none';
            }
        }
        if (valueToSave !== null) draft[questionAskedLastTime.key] = valueToSave;
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

    if (nextQuestion) {
        // --- V83: Clarity Update ---
        // מוסיפים הקשר לשאלה ("לגבי הרולאפ: ...")
        const productNameHE = PRODUCT_NAMES_HE[currentProductKey] || currentProductKey;
        const prefix = `📌 **לגבי ה${productNameHE}:** `; // הדגשה ברורה
        
        return { 
            actions: [{ 
                type: 'PRESENT_OPTIONS', 
                question: prefix + nextQuestion.question_he, // הוספת הפרפיקס
                options: nextQuestion.options || [], 
                product: currentProductKey, 
                saveDraft: draft 
            }] 
        };
    } else {
        // סיימנו מוצר זה -> חישוב
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
            
            // הוספה לעגלה
            actions.push({ type: 'CALCULATE_AND_ADD', payload: item });

            // --- V83: Queue Transition Logic ---
            // האם יש עוד מוצרים בתור?
            if (session.productQueue && session.productQueue.length > 0) {
                // שולפים את הבא בתור
                const nextProduct = session.productQueue.shift();
                session.currentProduct = nextProduct;
                session.draftAttributes = {}; // איפוס לשלב הבא
                
                const nextNameHE = PRODUCT_NAMES_HE[nextProduct] || nextProduct;

                // הודעת מעבר
                actions.push({ 
                    type: 'GENERATE_RESPONSE', 
                    payload: { 
                        text: `✅ הוספתי את ה${hebrewName} לעגלה (₪${item.client_price}).\n\n🔄 **עובר מיד ל${nextNameHE}...**`, 
                        quickReplies: [] // בלי כפתורים, כי אנחנו ממשיכים מיד
                    } 
                });
                
                // טריק: קריאה רפוקרסיבית (או דמוי) כדי לייצר את השאלה הראשונה של המוצר הבא *באותו תור*
                // כדי לפשט, אנחנו נסמוך על זה שבקליק הבא (או בגלל שאין כפתורים המשתמש יגיב) זה ימשיך,
                // אבל כדי להיות ממש חכמים, אפשר להחזיר את השאלה הראשונה כבר עכשיו.
                
                // בגרסה פשוטה: המשתמש יראה "עובר ל..." ואז הבוט יחכה לקלט.
                // כדי שזה יהיה מושלם, ה-Frontend צריך לתמוך בזה, או שפשוט נחכה לקלט כלשהו מהמשתמש.
                // אבל רגע, אם המשתמש לא אומר כלום, זה נעצר.
                
                // הפתרון האלגנטי: נשרשר את השאלה הראשונה של המוצר הבא לתגובה!
                const nextConfig = productsDB[nextProduct];
                const firstQ = nextConfig.questions[0];
                
                // עדכון התגובה האחרונה שתכלול את השאלה
                actions[actions.length - 1].payload.text += `\n\n❓ ${firstQ.question_he}`;
                actions[actions.length - 1].payload.quickReplies = firstQ.options || [];
                // עדכון ה-Session כדי שהתשובה הבאה תלך למוצר החדש
                // (כבר עשינו session.currentProduct = nextProduct למעלה)
                
            } else {
                // סיימנו הכל - צ'ק אאוט רגיל
                actions.push({ 
                    type: 'GENERATE_RESPONSE', 
                    payload: { 
                        text: `✅ הוספתי לעגלה: ${item.productName}\n📝 מפרט: ${item.description}\n💵 סה"כ: ₪${item.client_price}`, 
                        quickReplies: [{label:'סיום וצ\'ק אאוט', value:'checkout'}, {label:'הוסף עוד פריט', value:'reset'}] 
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