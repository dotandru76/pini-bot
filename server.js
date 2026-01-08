/** server.js - Verbose Logging Edition */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { classifyMessage } = require('./engine/classifier');
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
        // 1. Extractor - חילוץ נתונים
        const extraction = extractParameters(message);
        console.log(`🔍 Extractor Found: Products=${JSON.stringify(extraction.products)}, Qty=${extraction.qty}, Reset=${extraction.isReset}`);

        let intent = 'chat';

        // סדר עדיפויות לכוונות
        if (extraction.isReset) intent = 'reset';
        else if (extraction.isCartStatus) intent = 'show_cart';
        else if (session.currentProduct) {
            intent = 'answer';
            console.log(`🔄 Continuing conversation about: ${session.currentProduct}`);
        }
        else if (extraction.products.length > 0) {
            intent = 'new_order';
            session.currentProduct = extraction.products[0];
            session.pendingProducts = extraction.products.slice(1);
            
            console.log(`✨ New Product Identified: ${session.currentProduct}`);
            if (session.pendingProducts.length > 0) console.log(`📋 Queue: ${JSON.stringify(session.pendingProducts)}`);

            if (extraction.qty) session.draftAttributes = { qty: extraction.qty };
            else session.draftAttributes = {};
        }

        console.log(`🎯 Determined Intent: ${intent}`);

        // 2. Planner
        const plan = planActions(intent, session, message);
        console.log(`📋 Planned Actions: ${plan.actions.map(a => a.type).join(' -> ')}`);
        
        let responseText = "";
        let quickReplies = [];

        // 3. Execution
        for (const action of plan.actions) {
            if (action.type === 'PRESENT_OPTIONS') {
                session.currentProduct = action.product;
                session.draftAttributes = action.saveDraft; // איחוד תשובות קודמות עם חדשות
                responseText = action.question;
                quickReplies = action.options;
                console.log(`❓ Asking: "${action.question}"`);
            }
            if (action.type === 'CALCULATE_AND_ADD') {
                session.cart.push(action.payload);
                responseText = `✅ הוספתי ${action.payload.qty} יח' ${getHebrewName(action.payload.product)} לעגלה.`;
                console.log(`💰 Added to cart: ${action.payload.product} (${action.payload.qty})`);
            }
            if (action.type === 'CHECK_QUEUE') {
                if (session.pendingProducts && session.pendingProducts.length > 0) {
                    const nextProduct = session.pendingProducts.shift();
                    session.currentProduct = nextProduct;
                    session.draftAttributes = {};
                    console.log(`⏭️ Moving to next in queue: ${nextProduct}`);
                    
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
                    console.log(`🏁 Queue finished.`);
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
                if (intent === 'reset') {
                    session.cart = [];
                    console.log(`🧹 Session Reset`);
                }
            }
        }

        console.log(`📤 Sending Response: "${responseText.substring(0, 50)}..."`);

        res.json({ text: responseText, options: quickReplies, cart: session.cart });

    } catch (error) {
        console.error("💥 Server Critical Error:", error);
        res.status(500).json({ text: "סליחה, קרתה שגיאה בשרת." });
    }
});

app.post('/api/pdf', async (req, res) => {
    console.log(`📄 PDF Generation Requested`);
    try {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=quote.pdf');
        res.send(Buffer.from('%PDF-1.4... (Mock PDF Data)'));
        console.log(`✅ PDF Sent`);
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

app.listen(PORT, () => console.log(`🚀 Server Log Mode running on port ${PORT}`));