/** server.js - Final Stable Version */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path'); // הוספתי
require('dotenv').config();

const { classifyMessage } = require('./engine/classifier');
const { planActions } = require('./engine/planner');
const { getSession } = require('./services/sessionManager');

const app = express();
const PORT = process.env.PORT || 7860;

app.use(cors());
app.use(bodyParser.json());

// === קריטי: הגדרת תיקיית Public לקבצים סטטיים (כולל pini.png) ===
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    const session = getSession(userId || 'default_user');

    console.log(`💬 User (${userId}): "${message}"`);

    try {
        const classification = await classifyMessage(message, session);
        const plan = planActions(classification, session);
        
        let responseText = "מצטער, לא הבנתי.";
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
                const total = session.cart.reduce((sum, item) => sum + item.client_price, 0);
                responseText = `הוספתי לעגלה! 🛒\nסה"כ ביניים: ${total} ₪.\nמה תרצה לעשות עכשיו?`;
                quickReplies = [{label: 'הוסף עוד מוצר', value: 'menu'}, {label: 'סיים הזמנה', value: 'show_cart'}];
            }
            if (action.type === 'GENERATE_RESPONSE') {
                responseText = action.payload.text || action.template;
                if (action.payload.quickReplies) quickReplies = action.payload.quickReplies;
            }
            if (action.type === 'CLEAR_SESSION_CONTEXT') {
                session.currentProduct = null;
                session.draftAttributes = {};
                if (classification.intent === 'remove' || classification.intent === 'reset') {
                    session.cart = [];
                }
            }
        }

        res.json({ 
            text: responseText, 
            options: quickReplies,
            cart: session.cart,
            cartSize: session.cart.length
        });

    } catch (error) {
        console.error("💥 Server Error:", error);
        res.status(500).json({ text: "אופס, הייתה שגיאה במערכת." });
    }
});

// PDF Endpoint - יצירת קובץ דמה במידה ואין מחולל אמיתי
app.post('/api/pdf', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=quote.pdf');
        // שולחים באפר ריק או טקסט פשוט כדי לא לקבל 404
        res.send(Buffer.from('%PDF-1.4... (Mock PDF Data)'));
    } catch (e) {
        res.status(500).send("Error");
    }
});

function getHebrewName(key) {
    try {
        const db = require('./db/products.json');
        return db[key]?.name || key;
    } catch (e) { return key; }
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});