const { classifyMessage } = require('../engine/classifier');
const { compileOrder } = require('../engine/planner');
const { getSession, checkAndLockRequest, cacheCompletedRequest, releaseFailedRequest, pushToSessionCart } = require('../services/sessionManager');
const { processImageUpload } = require('../engine/imageProcessor');
const { analyzePrintReadyStatus } = require('../engine/decisionKernel');
const { calculate_custom_job } = require('../engine/calculation');

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
        // 0. Security Layer: Check for existing Block State
        if (session.blockState && session.blockState.reason === "PARAMETER_INSTABILITY") {
            const blockRefusal = `אני עדיין מחכה שתבצע סדר בבלגן. תוכל לאשר כמות אחת מדויקת עבור המוצר ששינית? (חסימה תשתחרר בעוד ${session.blockState.ttl} הודעות)`;
            return res.json({ text: blockRefusal, cart: session.cart });
        }

        // 1. Comprehension (Extractor)
        const extraction = await classifyMessage(message, session);
        console.log("🧩 [EXTRACTION DATA]:", JSON.stringify(extraction, null, 2));

        let finalResponse = { text: "שגיאה פנימית.", options: [], cart: session.cart };

        // --- LAYER 1: Deterministic Vision Rejection ---
        if (extraction.technicalMetadata) {
            const kernelVerdict = analyzePrintReadyStatus(extraction.technicalMetadata, session);
            if (kernelVerdict.status === 'REJECT_LOW_RES') {
                const refusal = `עצור! המערכת זיהתה שהקובץ ברזולוציה נמוכה מדי להדפסה (${extraction.technicalMetadata.dpi} DPI). נדרש לפחות 150 DPI לתוצאה איכותית.\n\n[הערה סמנטית]: ${extraction.answer_text}`;
                finalResponse.text = refusal;
                finalResponse.status = 'REJECTED';
                finalResponse.debug = extraction._debug;
                cacheCompletedRequest(session, requestId, finalResponse);
                return res.json(finalResponse);
            }
        }

        // 2. Handle System Intent vs Compiler Flow
        if (extraction.intent === 'reset') {
            session.cart = [];
            session.currentProduct = null;
            session.blockState = { reason: null, ttl: 0 };
            finalResponse.text = "המערכת אופסה. מה תרצה להזמין?";
        }
        else if (extraction.intent === 'show_cart') {
            finalResponse.text = session.cart.length > 0 ? "זה מה שיש לנו בינתיים:" : "העגלה ריקה.";
        }
        else {
            // 3. Planning (Conversational Compiler v4.2 - The Smart Gateway)
            const compilation = compileOrder(extraction);

            if (compilation.status === 'READY' || (compilation.items && compilation.items.length > 0)) {
                // Process READY items
                compilation.items.forEach(item => {
                    const productionItem = calculate_custom_job(session.cart, {
                        product: item.product,
                        ...item.params
                    });

                    // Secure Push
                    pushToSessionCart(session, productionItem);
                });

                let responseMsg = extraction.answer_text;
                if (compilation.clarification_blocks && compilation.clarification_blocks.length > 0) {
                    responseMsg += "\n\n" + compilation.clarification_blocks.join("\n");
                }

                finalResponse.text = responseMsg;
                finalResponse.cart = session.cart;
            }
            else if (compilation.status === 'CLARIFICATION_REQUIRED') {
                // Handle Security Block for Instability
                if (compilation.reason === 'PARAMETER_INSTABILITY') {
                    session.blockState = { reason: "PARAMETER_INSTABILITY", ttl: 2 };
                }
                finalResponse.text = compilation.clarification_blocks.join("\n");
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
        if (!res.headersSent) {
            res.status(500).json({ text: "אופס, נתקלתי בבעיה. נסה שוב." });
        }
    }
}

async function handleImageUpload(req, res) {
    const { userId } = req.body;
    const sessionID = userId || 'default_user';
    const session = getSession(sessionID);

    if (!req.file) {
        return res.status(400).json({ text: "לא הועלה קובץ." });
    }

    try {
        console.log(`📸 [${sessionID}] Image Upload Received: ${req.file.originalname}`);

        const technicalPayload = await processImageUpload(req.file.buffer);
        const kernelVerdict = analyzePrintReadyStatus(technicalPayload, session);

        if (kernelVerdict.status === 'REJECT_LOW_RES') {
            const refusal = `עצור! המערכת זיהתה שהקובץ ברזולוציה נמוכה מדי להדפסה (${technicalPayload.dpi} DPI). נדרש לפחות 150 DPI לתוצאה איכותית. אנא העלה קובץ איכותי יותר.`;
            return res.json({
                text: refusal,
                status: kernelVerdict.status,
                technical: technicalPayload
            });
        }

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
