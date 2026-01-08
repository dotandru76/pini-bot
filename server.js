/** server.js - With Remove Item Capability */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { planActions } = require('./engine/planner');
const { extractParameters } = require('./engine/extractor');
const { getSession } = require('./services/sessionManager');

const app = express();
const PORT = process.env.PORT || 7860;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    const session = getSession(userId || 'default_user');

    console.log(`\n🔵 INCOMING MSG [${userId}]: "${message}"`);

    try {
        const extraction = extractParameters(message);
        let intent = 'chat';
        let candidateProduct = null;

        if (extraction.isReset) intent = 'reset';
        else if (extraction.isRemove) intent = 'remove_item'; // <--- כוונה חדשה
        else if (extraction.isCartStatus) intent = 'show_cart';
        
        else if (session.currentProduct) {
            if (extraction.products.length > 0) {
                if (extraction.products.includes(session.currentProduct)) {
                    intent = 'answer';
                } else {
                    intent = 'new_order';
                    candidateProduct = extraction.products[0];
                    session.draftAttributes = {};
                }
            } else {
                intent = 'answer';
            }
        }
        else if (extraction.products.length > 0) {
            intent = 'new_order';
            candidateProduct = extraction.products[0];
            if (extraction.qty) session.draftAttributes = { qty: extraction.qty };
            else session.draftAttributes = {};
        }

        const plan = planActions({ 
            intent, 
            extractedParams: extraction, 
            product: candidateProduct || session.currentProduct 
        }, session);
        
        let responseText = "";
        let quickReplies = [];

        for (const action of plan.actions) {
            if (action.type === 'PRESENT_OPTIONS') {
                session.currentProduct = action.product; 
                session.draftAttributes = action.saveDraft;
                responseText = action.question;
                quickReplies = action.options;
            }
            
            if (action.type === 'CALCULATE_AND_ADD') {
                session.cart.push(action.payload);
                responseText = `✅ הוספתי לעגלה: ${action.payload.qty} יח' ${getHebrewName(action.payload.product)}.`;
            }

            // --- לוגיקת מחיקה ---
            if (action.type === 'REMOVE_FROM_CART') {
                const targetIndex = action.payload.index;
                const targetProduct = action.payload.product;
                
                let removedItem = null;

                // אופציה א: מחיקה לפי אינדקס (1, 2, 3...)
                if (targetIndex && targetIndex > 0 && targetIndex <= session.cart.length) {
                    removedItem = session.cart.splice(targetIndex - 1, 1)[0];
                } 
                // אופציה ב: מחיקה לפי שם (האחרון ברשימה שמתאים לשם)
                else if (targetProduct) {
                    const idx = session.cart.findLastIndex(item => item.product === targetProduct);
                    if (idx !== -1) {
                        removedItem = session.cart.splice(idx, 1)[0];
                    }
                }

                if (removedItem) {
                    responseText = `🗑️ מחקתי את ה${getHebrewName(removedItem.product)} מהעגלה.`;
                } else {
                    responseText = `לא מצאתי את הפריט הזה בעגלה. נסה להגיד "מחק את פריט 1".`;
                }
            }
            // --------------------
            
            if (action.type === 'CHECK_QUEUE') {
                if (session.pendingProducts && session.pendingProducts.length > 0) {
                    const nextProduct = session.pendingProducts.shift();
                    const nextPlan = planActions({ intent: 'new_order', product: nextProduct }, session);
                    if (nextPlan.actions[0]?.type === 'PRESENT_OPTIONS') {
                        session.currentProduct = nextProduct;
                        session.draftAttributes = {};
                        responseText += `\n\nעוברים ל-${getHebrewName(nextProduct)}. ${nextPlan.actions[0].question}`;
                        quickReplies = nextPlan.actions[0].options;
                    }
                } else {
                    session.currentProduct = null;
                    responseText += `\n\nסיימנו! מה תרצה לעשות?`;
                    quickReplies = [{ label: 'הצג עגלה', value: 'show_cart' }, { label: 'הוסף עוד', value: 'menu' }];
                }
            }
            
            if (action.type === 'GENERATE_RESPONSE') {
                responseText = action.payload.text;
                if (action.payload.quickReplies) quickReplies = action.payload.quickReplies;
            }
            
            if (action.type === 'CLEAR_SESSION_CONTEXT') {
                session.currentProduct = null;
                session.draftAttributes = {};
                session.pendingProducts = [];
                if (intent === 'reset') session.cart = [];
            }
        }

        res.json({ text: responseText, options: quickReplies, cart: session.cart });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ text: "אופס, שגיאה בשרת." });
    }
});

app.post('/api/pdf', async (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=quote.pdf');
    res.send(Buffer.from('%PDF-1.4...'));
});

function getHebrewName(key) {
    try {
        const db = require('./db/products.json');
        return db[key]?.name || key;
    } catch (e) { return key; }
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));