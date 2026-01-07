/** server.js - Pini Print Bot Server */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// ייבוא נכון מהמנוע (Engine)
const { classifyMessage } = require('./engine/classifier');
const { planActions } = require('./engine/planner');
const { getSession } = require('./services/sessionManager');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// נתיב ראשי לצ'אט
app.post('/api/chat', async (req, res) => {
    const { message, sessionId = 'default_user' } = req.body;
    const session = getSession(sessionId);

    console.log(`\n💬 User (${sessionId}): "${message}"`);

    try {
        // 1. סיווג (Classifier)
        const classification = await classifyMessage(message, session);
        console.log(`🤖 Intent: ${classification.intent}, Product: ${classification.product || 'None'}`);

        // 2. תכנון (Planner)
        const plan = planActions(classification, session);
        
        // 3. ביצוע ועדכון הזיכרון (Execution)
        let responseText = "מצטער, לא הבנתי.";
        
        for (const action of plan.actions) {
            // שמירת טיוטה ושאלת שאלות
            if (action.type === 'PRESENT_OPTIONS') {
                session.currentProduct = action.product;
                session.draftAttributes = action.saveDraft;
                responseText = action.question;
            }
            
            // הוספה לעגלה
            if (action.type === 'CALCULATE_AND_ADD') {
                session.cart.push(action.payload);
                // חישוב סכום כולל לתצוגה
                const total = session.cart.reduce((sum, item) => sum + item.client_price, 0);
                responseText = `הוספתי את זה לעגלה! 🛒\nסה"כ ביניים: ${total} ₪.\nתרצה להוסיף עוד משהו או לסיים?`;
            }
            
            // יצירת תשובה כללית (צ'אט, שגיאות, ברכות)
            if (action.type === 'GENERATE_RESPONSE') {
                responseText = action.payload.text || action.template;
            }
            
            // ניקוי הקשר (אחרי סיום מוצר או איפוס)
            if (action.type === 'CLEAR_SESSION_CONTEXT') {
                session.currentProduct = null;
                session.draftAttributes = {};
                // אם זו מחיקת עגלה
                if (classification.intent === 'remove' || classification.intent === 'reset') {
                    session.cart = [];
                }
            }
        }

        // החזרת תשובה ללקוח
        res.json({ 
            text: responseText, 
            cartSize: session.cart.length,
            currentContext: session.currentProduct 
        });

    } catch (error) {
        console.error("💥 Server Error:", error);
        res.status(500).json({ text: "אופס, הייתה שגיאה במערכת. נסה שוב." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});