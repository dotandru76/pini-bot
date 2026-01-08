/** server.js V31.0 - Full PDF & Chat Support */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// ייבוא המנועים
const { classifyMessage } = require('./engine/classifier');
const { planActions } = require('./engine/planner');
const { getSession } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService'); // חובה לקיום ה-PDF!

const app = express();
const PORT = process.env.PORT || 7860;

app.use(cors());
app.use(bodyParser.json());

// === נתיב הצ'אט ===
app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    const sessionID = userId || 'default_user';
    const session = getSession(sessionID);

    console.log(`\n🔵 [${sessionID}] User: "${message}"`);

    try {
        // 1. הבנה (Classifier)
        const classification = await classifyMessage(message, session);
        
        // 2. תכנון (Planner)
        const plan = planActions(classification, session);
        
        // 3. ביצוע (Execution)
        let responseText = "";
        let quickReplies = [];

        for (const action of plan.actions) {
            if (action.type === 'PRESENT_OPTIONS') {
                session.currentProduct = action.product; 
                session.draftAttributes = action.saveDraft;
                responseText = action.question;
                quickReplies = action.options;
            }
            else if (action.type === 'CALCULATE_AND_ADD') {
                session.cart.push(action.payload);
            }
            else if (action.type === 'REMOVE_FROM_CART') {
                if (session.cart.length > 0) session.cart.pop();
            }
            else if (action.type === 'GENERATE_RESPONSE') {
                responseText = action.payload.text || action.template;
                if (action.payload.quickReplies) quickReplies = action.payload.quickReplies;
            }
            else if (action.type === 'CLEAR_SESSION_CONTEXT') {
                session.currentProduct = null;
                session.draftAttributes = {};
            }
        }

        // שליחת התשובה
        res.json({ 
            text: responseText, 
            options: quickReplies,
            cart: session.cart 
        });

    } catch (error) {
        console.error("💥 Server Error:", error);
        res.status(500).json({ text: "אופס, נתקלתי בבעיה. נסה שוב." });
    }
});

// === נתיב ה-PDF (התיקון!) ===
app.post('/api/pdf', async (req, res) => {
    const { userId, cart: clientCart } = req.body;
    
    // שליפת העגלה (מהבקשה או מהסשן)
    let cart = clientCart;
    if (!cart && userId) {
        const session = getSession(userId);
        cart = session.cart;
    }

    if (!cart || cart.length === 0) {
        return res.status(400).send("העגלה ריקה");
    }

    try {
        console.log("📄 Generating PDF Quote...");
        // הנחה שקיים שירות PDF תקין ב-services
        const pdfBuffer = await generateQuotePDF(cart, { name: "לקוח יקר" });
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'attachment; filename="quote.pdf"'
        });
        
        res.send(pdfBuffer);
        console.log("✅ PDF sent successfully");

    } catch (error) {
        console.error("❌ PDF Generation Error:", error);
        res.status(500).json({ error: "Failed to generate PDF" });
    }
});

app.listen(PORT, () => console.log(`🚀 SERVER running on port ${PORT}`));