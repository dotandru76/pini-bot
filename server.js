/** server.js - Pini Expert Mode */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { planActions } = require('./engine/planner');
const { extractParameters } = require('./engine/extractor');
const { getSession } = require('./services/sessionManager');
// const { generateQuotePDF } = require('./services/pdfService'); // Uncomment if PDF service exists

const app = express();
const PORT = process.env.PORT || 7860;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    const session = getSession(userId || 'default');

    console.log(`💬 ${userId}: ${message}`);

    try {
        const extraction = extractParameters(message);
        let intent = 'chat';

        // סדר עדיפויות לכוונות
        if (extraction.isReset) intent = 'reset';
        else if (extraction.isCartStatus) intent = 'show_cart'; // תיקון באג
        else if (session.currentProduct) intent = 'answer';
        else if (extraction.products.length > 0) {
            intent = 'new_order';
            session.currentProduct = extraction.products[0];
            session.pendingProducts = extraction.products.slice(1);
            if (extraction.qty) session.draftAttributes = { qty: extraction.qty };
            else session.draftAttributes = {};
        }

        const plan = planActions(intent, session, message);
        
        let responseText = "";
        let quickReplies = [];

        for (const action of plan.actions) {
            if (action.type === 'PRESENT_OPTIONS') {
                responseText = action.question;
                quickReplies = action.options;
                if (action.saveDraft) session.draftAttributes = { ...session.draftAttributes, ...action.saveDraft };
            }
            if (action.type === 'CALCULATE_AND_ADD') {
                session.cart.push(action.payload);
                responseText = `✅ הוספתי ${action.payload.qty} יח' ${getHebrewName(action.payload.product)} לעגלה.`;
            }
            if (action.type === 'CHECK_QUEUE') {
                if (session.pendingProducts && session.pendingProducts.length > 0) {
                    const nextProduct = session.pendingProducts.shift();
                    session.currentProduct = nextProduct;
                    session.draftAttributes = {};
                    const nextPlan = planActions('new_order', session, "");
                    if (nextPlan.actions[0]?.type === 'PRESENT_OPTIONS') {
                        responseText += `\n\nעוברים ל-${getHebrewName(nextProduct)}. ${nextPlan.actions[0].question}`;
                        quickReplies = nextPlan.actions[0].options;
                    }
                } else {
                    session.currentProduct = null;
                    responseText += `\n\nסיימנו! מה תרצה לעשות עכשיו?`;
                    quickReplies = [
                        { label: 'הצג עגלה', value: 'show_cart' },
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

        res.json({ text: responseText, options: quickReplies, cart: session.cart });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ text: "סליחה, הייתה שגיאה קטנה." });
    }
});

// PDF Endpoint - קריטי!
app.post('/api/pdf', async (req, res) => {
    try {
        // Mock PDF generation if service missing
        // const pdfBuffer = await generateQuotePDF(req.body.cart, req.body.customer || {});
        
        // יצירת PDF דמה פשוט אם אין ספריה
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=quote.pdf');
        res.send(Buffer.from('%PDF-1.4... (Mock PDF Data for Testing)'));
    } catch (e) {
        console.error(e);
        res.status(500).send("Error");
    }
});

function getHebrewName(key) {
    try {
        const db = require('./db/products.json');
        return db[key]?.name || key;
    } catch (e) { return key; }
}

app.listen(PORT, () => console.log(`🚀 Pini Server Port ${PORT}`));