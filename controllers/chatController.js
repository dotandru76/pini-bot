const { classifyMessage } = require('../engine/classifier');
const { compileOrder } = require('../engine/planner');
const { getSession, checkAndLockRequest, cacheCompletedRequest, releaseFailedRequest } = require('../services/sessionManager');
const { processImageUpload } = require('../engine/imageProcessor');
const { analyzePrintReadyStatus } = require('../engine/decisionKernel');

async function handleChat(req, res) {
    const { message, userId, requestId } = req.body;
    const sessionID = userId || 'default_user';
    const session = getSession(sessionID);

    if (!requestId || !/^[0-9a-fA-F-]{36}$/.test(requestId)) {
        return res.status(400).json({ text: "Bad Request: Invalid requestId UUID." });
    }

    const lockResult = checkAndLockRequest(session, requestId, message);
    if (lockResult.status === 'PROCESSING_ERROR') return res.status(429).json({ text: "אני כבר מעבד את הבקשה הזו..." });
    if (lockResult.status === 'COMPLETED') return res.json(lockResult.cachedResponse);

    try {
        // 1. Comprehension (Extractor)
        const extraction = await classifyMessage(message, session);

        let finalResponse = { text: "שגיאה פנימית.", options: [], cart: session.cart };

        // 2. Handle System Intent vs Compiler Flow
        if (extraction.intent === 'reset') {
            session.cart = [];
            session.currentProduct = null;
            finalResponse.text = "המערכת אופסה. מה תרצה להזמין?";
        }
        else if (extraction.intent === 'show_cart') {
            finalResponse.text = session.cart.length > 0 ? "זה מה שיש לנו בינתיים:" : "העגלה ריקה.";
        }
        else {
            // 3. Planning (Conversational Compiler v4.0)
            const compilation = compileOrder(extraction);

            if (compilation.status === 'READY') {
                // Bulk Add
                compilation.data.forEach(item => session.cart.push(item));
                finalResponse.text = extraction.answer_text + (compilation.data.length > 1 ? `\n(הוספתי ${compilation.data.length} פריטים לעגלה)` : "");
            }
            else if (compilation.status === 'CLARIFICATION_REQUIRED') {
                finalResponse.text = compilation.clarification_blocks.join("\n");
                finalResponse.options = ['כן, תמשיך', 'לא, בטל']; // Basic options
            }
            else if (compilation.status === 'HARD_FAIL') {
                finalResponse.text = "משהו לא היה ברור בבקשה. " + (compilation.reason === 'AMBIGUOUS_QUANTITY' ? "לא ידעתי לאיזו כמות התכוונת לכל מוצר." : "תוכל לפרט יותר?");
            }
        }

        finalResponse.debug = extraction._debug;
        cacheCompletedRequest(session, requestId, finalResponse);
        res.json(finalResponse);

    } catch (error) {
        console.error("💥 Controller Error:", error);
        releaseFailedRequest(session, requestId);
        res.status(500).json({ text: "אופס, נתקלתי בבעיה. נסה שוב." });
    }
}

/**
 * Handles image uploads deterministically (AI Governance Layer 1).
 */
async function handleImageUpload(req, res) {
    const { userId } = req.body;
    const sessionID = userId || 'default_user';
    const session = getSession(sessionID);

    if (!req.file) {
        return res.status(400).json({ text: "לא הועלה קובץ." });
    }

    try {
        console.log(`📸 [${sessionID}] Image Upload Received: ${req.file.originalname}`);

        // 1. LAYER 1: Deterministic Extraction (Code is Judge)
        const technicalPayload = await processImageUpload(req.file.buffer);

        // 2. GOVERNANCE: Consult the Decision Kernel
        const kernelVerdict = analyzePrintReadyStatus(technicalPayload, session);

        if (kernelVerdict.status === 'REJECT_LOW_RES') {
            const refusal = `עצור! המערכת זיהתה שהקובץ ברזולוציה נמוכה מדי להדפסה (${technicalPayload.dpi} DPI). נדרש לפחות 150 DPI לתוצאה איכותית. אנא העלה קובץ איכותי יותר.`;
            return res.json({
                text: refusal,
                status: kernelVerdict.status,
                technical: technicalPayload
            });
        }

        // 3. If passed Layer 1, store metadata and proceed to Layer 2 (Semantic)
        session.lastImageMetadata = technicalPayload;

        return res.json({
            text: "הקובץ נבדק טכנית ונמצא תקין! על מה נדפיס אותו?",
            status: kernelVerdict.status,
            technical: technicalPayload,
            options: ['פליירים', 'פוסטרים', 'מדבקות']
        });

    } catch (error) {
        console.error("💥 Controller Error handling image upload:", error);
        res.status(500).json({ text: error.message || "אופס, נתקלתי בבעיה בעיבוד התמונה." });
    }
}

module.exports = {
    handleChat,
    handleImageUpload
};
