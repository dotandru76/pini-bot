const { classifyMessage } = require('../engine/classifier');
const { planActions } = require('../engine/planner');
const { getSession } = require('../services/sessionManager');

/**
 * Handles incoming chat messages from the user.
 * Connects the router payload to the engine logic.
 */
async function handleChat(req, res) {
    const { message, userId } = req.body;

    // Default fallback if a user doesn't provide an ID
    const sessionID = userId || 'default_user';
    const session = getSession(sessionID);

    console.log(`\n🔵 [${sessionID}] User: "${message}"`);

    try {
        // 1. Comprehension (Classifier)
        const classification = await classifyMessage(message, session);

        // 2. Planning (Planner)
        const plan = planActions(classification, session);

        // 3. Execution & Workflow Management
        let responseText = "";
        let quickReplies = [];

        // This loop logic is currently living in the controller but should ideally be moved 
        // entirely to a workflowManager in the future. For now, it stays here to ensure functionality parity.
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

        // Return final payload to the client
        res.json({
            text: responseText,
            options: quickReplies,
            cart: session.cart
        });

    } catch (error) {
        console.error("💥 Controller Error handling chat:", error);
        res.status(500).json({ text: "אופס, נתקלתי בבעיה. נסה שוב." });
    }
}

module.exports = {
    handleChat
};
