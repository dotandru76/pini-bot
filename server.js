/** server.js - Queue Mode Enabled */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { classifyMessage } = require('./engine/classifier'); // נשאר פשוט
const { planActions } = require('./engine/planner');
const { extractParameters } = require('./engine/extractor'); // החדש
const { getSession } = require('./services/sessionManager');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/chat', async (req, res) => {
    const { message, sessionId = 'default_user' } = req.body;
    const session = getSession(sessionId);

    console.log(`\n💬 User (${sessionId}): "${message}"`);

    try {
        // === שלב 1: הבנת הבקשה וניהול התור ===
        const extraction = extractParameters(message);
        let intent = 'chat';

        // אם המשתמש ביקש איפוס
        if (extraction.isReset) {
            intent = 'reset';
        }
        // אם אנחנו כבר באמצע מוצר -> זו כנראה תשובה לשאלה
        else if (session.currentProduct) {
            intent = 'answer';
        }
        // אם זיהינו מוצרים חדשים -> מוסיפים לתור!
        else if (extraction.products.length > 0) {
            intent = 'new_order';
            // אם זו בקשה ראשונה, המוצר הראשון הופך לנוכחי, השאר לתור
            session.currentProduct = extraction.products[0];
            session.pendingProducts = extraction.products.slice(1);
            
            // אם זיהינו כמות גלובלית ("1000 פליירים וכרטיסים")
            if (extraction.qty) {
                session.draftAttributes = { qty: extraction.qty };
            } else {
                session.draftAttributes = {};
            }
        } 
        // לא זיהינו כלום ואין מוצר פעיל -> שיחה כללית
        else {
            intent = 'chat';
        }

        // === שלב 2: תכנון הצעד הבא ===
        // שולחים ל-Planner את הנתונים ואת המידע שחילצנו
        const plan = planActions(intent, session, message);
        
        // === שלב 3: ביצוע ===
        let responseText = "";
        let quickReplies = [];

        for (const action of plan.actions) {
            
            if (action.type === 'PRESENT_OPTIONS') {
                responseText = action.question;
                quickReplies = action.options;
                // עדכון טיוטה אם יש מידע חדש מההודעה עצמה (למשל כמות)
                if (action.saveDraft) {
                    session.draftAttributes = { ...session.draftAttributes, ...action.saveDraft };
                }
            }
            
            if (action.type === 'CALCULATE_AND_ADD') {
                session.cart.push(action.payload);
                responseText = `✅ הוספתי ${action.payload.qty} יח' ${getHebrewName(action.payload.product)} לעגלה.`;
            }

            if (action.type === 'CHECK_QUEUE') {
                // בדיקה אם יש עוד מוצרים בתור
                if (session.pendingProducts && session.pendingProducts.length > 0) {
                    const nextProduct = session.pendingProducts.shift(); // מוציא את הבא בתור
                    session.currentProduct = nextProduct;
                    session.draftAttributes = {}; // מאפס טיוטה למוצר החדש
                    
                    // מריץ מיד תכנון למוצר החדש (רקורסיה קטנה)
                    const nextPlan = planActions('new_order', session, "");
                    // לוקח את השאלה הראשונה של המוצר החדש
                    if (nextPlan.actions[0] && nextPlan.actions[0].type === 'PRESENT_OPTIONS') {
                        responseText += `\n\nעכשיו נעבור ל-${getHebrewName(nextProduct)}. ${nextPlan.actions[0].question}`;
                        quickReplies = nextPlan.actions[0].options;
                    }
                } else {
                    // התור נגמר!
                    session.currentProduct = null;
                    responseText += `\n\nסיימנו עם הכל! מה תרצה לעשות?`;
                    quickReplies = [
                        { label: 'הצג סיכום עגלה', value: 'show_cart' },
                        { label: 'הוסף עוד מוצר', value: 'menu' }
                    ];
                }
            }

            if (action.type === 'GENERATE_RESPONSE') {
                responseText = action.payload.text;
                if (action.payload.quickReplies) quickReplies = action.payload.quickReplies;
            }
            
            if (action.type === 'CLEAR_SESSION_CONTEXT') {
                session.currentProduct = null;
                session.pendingProducts = [];
                session.draftAttributes = {};
                if (intent === 'reset') session.cart = [];
            }
        }

        res.json({ 
            text: responseText, 
            options: quickReplies, // ה-Frontend מצפה לזה
            cart: session.cart 
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ text: "אופס, נתקעתי. בוא נתחיל מחדש." });
    }
});

function getHebrewName(key) {
    const productsDB = require('./db/products.json'); // טעינה פשוטה
    return productsDB[key]?.name || key;
}

app.listen(PORT, () => {
    console.log(`🚀 Pini Queue Server running on port ${PORT}`);
});