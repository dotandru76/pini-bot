const { classifyMessage } = require('../engine/classifier');
const { planActions } = require('../engine/planner');
const { getSession, checkAndLockRequest, cacheCompletedRequest, releaseFailedRequest } = require('../services/sessionManager');

/**
 * Handles incoming chat messages from the user.
 * Connects the router payload to the engine logic.
 */
async function handleChat(req, res) {
    const { message, userId, requestId } = req.body; // <--- requestId is now expected from Client

    // --- PHASE 1.2: Hardening - Strict UUID Validation ---
    if (!requestId) {
        console.error(`💥 [API ERROR] 400 Bad Request: Missing requestId in payload for User: ${userId}`);
        return res.status(400).json({ text: "Bad Request: Missing requestId UUID." });
    }
    if (!/^[0-9a-fA-F-]{36}$/.test(requestId)) {
        console.error(`💥 [API ERROR] 400 Bad Request: Malformed requestId UUID '${requestId}' for User: ${userId}`);
        return res.status(400).json({ text: "Bad Request: Invalid requestId UUID format." });
    }

    // Default fallback if a user doesn't provide an ID
    const sessionID = userId || 'default_user';
    const session = getSession(sessionID);

    console.log(`\n🔵 [${sessionID}] User: "${message}"`);

    // --- PHASE 1.2: Idempotency & Double Submit Guard ---
    // פעולה סינכרונית - בדיקה ונעילה לפני כל גישה ל-AI או לוגיקה כבדה
    const lockResult = checkAndLockRequest(session, requestId, message);

    if (lockResult.status === 'MISMATCH_ERROR') {
        return res.status(400).json({ text: "שגיאת אבטחה: אי ההתאמה בתוכן הבקשה." });
    }
    if (lockResult.status === 'PROCESSING_ERROR') {
        return res.status(429).json({ text: "אני כבר מעבד את הבקשה הזו, רק רגע..." });
    }
    if (lockResult.status === 'COMPLETED') {
        // מתן תשובה מהדיקט בזיכרון (Idempotent Hit)
        return res.json(lockResult.cachedResponse);
    }
    // ----------------------------------------------------

    try {
        // 1. Comprehension (Classifier)
        const classification = await classifyMessage(message, session);

        // 2. Planning (Planner)
        const plan = planActions(classification, session);

        // 3. Execution & Workflow Management
        let responseText = "";
        let quickReplies = [];

        // --- PHASE 1.3 Anti-Hallucination: The Governance Bug Fix ---
        // רשימה מורשית קשיחה המונעת מה-LLM להמציא פקודות ביצוע שאינן קיימות
        const ALLOWED_ACTIONS = new Set(['PRESENT_OPTIONS', 'CALCULATE_AND_ADD', 'REMOVE_FROM_CART', 'GENERATE_RESPONSE', 'CLEAR_SESSION_CONTEXT']);

        for (const action of plan.actions) {
            if (!ALLOWED_ACTIONS.has(action.type)) {
                console.error(`🛡️ [GOVERNANCE] Unauthorized LLM action rejected: ${action.type}`);
                continue;
            }

            else if (action.type === 'PRESENT_OPTIONS') {
                session.currentProduct = action.product;
                session.draftAttributes = action.saveDraft;
                responseText = action.question;
                quickReplies = action.options || [];
            }
            else if (action.type === 'CALCULATE_AND_ADD') {
                session.cart.push(action.payload);
            }
            else if (action.type === 'REMOVE_FROM_CART') {
                if (session.cart.length > 0) session.cart.pop();
            }
            else if (action.type === 'GENERATE_RESPONSE') {
                responseText = action.payload.text || action.template;
                quickReplies = action.payload.quickReplies || [];
            }
            else if (action.type === 'CLEAR_SESSION_CONTEXT') {
                session.currentProduct = null;
                session.draftAttributes = {};
            }
        }

        const finalResponse = {
            text: responseText,
            options: quickReplies,
            cart: session.cart,
            debug: classification._debug // <-- Routing Debug Metadata
        };

        // --- PHASE 1.2: שמירת התשובה במטמון ושחרור הנעילה בהצלחה ---
        cacheCompletedRequest(session, requestId, finalResponse);
        // ------------------------------------------------------------

        // Return final payload to the client
        res.json(finalResponse);

    } catch (error) {
        console.error("💥 Controller Error handling chat:", error);

        // --- PHASE 1.2: CLEANUP ON ERROR ---
        // שחרור הנעילה במקרה של קריסה כדי למנוע דדלוק על הבקשה הזו
        releaseFailedRequest(session, requestId);
        // -----------------------------------

        res.status(500).json({ text: "אופס, נתקלתי בבעיה. נסה שוב." });
    }
}

module.exports = {
    handleChat
};
