/** server.js V_DEBUG */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { classifyMessage } = require('./engine/classifier');
const { planActions } = require('./engine/planner');
const { getSession } = require('./services/sessionManager');

const app = express();
const PORT = process.env.PORT || 7860;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    const sessionID = userId || 'debug_user';
    const session = getSession(sessionID);

    console.log(`\n\n🔵 --- NEW MESSAGE [${sessionID}] ---`);
    console.log(`📩 User Input: "${message}"`);

    try {
        // 1. Classifier (Calls LLM Router)
        const classification = await classifyMessage(message, session);
        
        // 2. Planner
        const plan = planActions(classification, session);
        
        // 3. Execution
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
            else if (action.type === 'GENERATE_RESPONSE') {
                responseText = action.payload.text || action.template;
                if (action.payload.quickReplies) quickReplies = action.payload.quickReplies;
            }
            else if (action.type === 'CLEAR_SESSION_CONTEXT') {
                session.currentProduct = null;
                session.draftAttributes = {};
            }
        }

        console.log(`📤 Bot Output: "${responseText}"`);
        console.log(`🏁 -------------------------------\n`);

        res.json({ text: responseText, options: quickReplies, cart: session.cart });

    } catch (error) {
        console.error("💥 CRITICAL ERROR:", error);
        res.status(500).json({ text: "תקלה בשרת. בדוק לוגים." });
    }
});

app.listen(PORT, () => console.log(`🚀 DEBUG SERVER running on port ${PORT}`));