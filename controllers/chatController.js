const { classifyMessage } = require('../engine/classifier');
const { compileOrder, buildSessionStateContext, getJITKnowledge, normalizeEntity } = require('../engine/planner');
const { getSession, checkAndLockRequest, cacheCompletedRequest, releaseFailedRequest, pushToSessionCart } = require('../services/sessionManager');
const { processImageUpload } = require('../engine/imageProcessor');
const { analyzePrintReadyStatus } = require('../engine/decisionKernel');
const { calculate_custom_job } = require('../engine/calculation');
const DOMAIN_TEMPLATES = require('../db/domainTemplates.json');

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

        // --- Spec v5.7: Stateful Advisor Preparation ---
        session.statefulContext = buildSessionStateContext(session);

        if (session.addToHistory) session.addToHistory('user', message);

        // 1. Comprehension (Extractor)
        const extraction = await classifyMessage(message, session);
        console.log("🧩 [EXTRACTION DATA]:", JSON.stringify(extraction, null, 2));

        // 2. Build JIT Knowledge (Mini-RAG) - Now Intent-Aware
        session.jitKnowledge = getJITKnowledge(message, extraction);

        let finalResponse = { text: "שגיאה פנימית.", options: [], cart: session.cart };

        // --- LAYER 1: Deterministic Vision Rejection ---
        if (extraction.technicalMetadata) {
            const kernelVerdict = analyzePrintReadyStatus(extraction.technicalMetadata, session);
            if (kernelVerdict.status === 'REJECT_LOW_RES') {
                const refusal = `עצור! המערכת זיהתה שהקובץ ברזולוציה נמוכה מדי להדפסה (${extraction.technicalMetadata.dpi} DPI). נדרש לפחות 150 DPI לתוצאה איכותית.\n\n[הערה סמנטית]: ${extraction.answer_text}`;
                finalResponse.text = refusal;
                finalResponse.status = 'REJECTED';
                finalResponse.debug = extraction._debug;

                if (session.addToHistory) session.addToHistory('assistant', refusal);
                cacheCompletedRequest(session, requestId, finalResponse);
                return res.json(finalResponse);
            }
        }

        // 2. Handle System Intent vs Compiler Flow
        if (extraction.intent === 'reset') {
            session.cart = [];
            session.currentProduct = null;
            session.blockState = { reason: null, ttl: 0 };
            session.history = [];
            finalResponse.text = "המערכת אופסה. מה תרצה להזמין?";
        }
        else if (extraction.intent === 'show_cart') {
            finalResponse.text = session.cart.length > 0 ? "זה מה שיש לנו בינתיים:" : "העגלה ריקה.";
        }
        else {
            // 3. Planning (Conversational Compiler v5.7)
            const compilation = compileOrder(extraction, session);

            // --- SMART RESPONSE SELECTION (BLOCKER FIX: Priority logic) ---
            // RULE: LLM 'answer_text' is the primary voice. Fallback guidance only if LLM fails or is too short.
            let responseMsg = extraction.answer_text || "";

            if (compilation.status === 'READY' || compilation.status === 'PARTIAL_READY' || (compilation.items && compilation.items.length > 0) || (compilation.deleted_items && compilation.deleted_items.length > 0)) {

                // A. Handle Deletions
                if (compilation.deleted_items && compilation.deleted_items.length > 0) {
                    compilation.deleted_items.forEach(product => {
                        session.cart = session.cart.filter(item => item.product !== product);
                        delete session.draftAttributes[product];
                    });
                }

                // B. Process READY items
                compilation.items.forEach(item => {
                    session.cart = session.cart.filter(c => c.product !== item.product);
                    const productionItem = calculate_custom_job(session.cart, {
                        product: item.product,
                        ...item.params
                    });
                    pushToSessionCart(session, productionItem);
                    delete session.draftAttributes[item.product];
                });

                // C. Status Updates (Only append if LLM didn't explain the status)
                const draftProducts = Object.keys(session.draftAttributes || {});
                if (draftProducts.length > 0 && !responseMsg.includes("📌") && !responseMsg.includes("חסר")) {
                    const pendingLabels = draftProducts.map(p => DOMAIN_TEMPLATES.products[p]?.label || p);
                    const readyLabels = session.cart.map(i => i.displayName);
                    if (readyLabels.length > 0) {
                        responseMsg += `\n\n📌 [עדכון סטטוס]: יש מחיר ל${readyLabels.join(' ו-')}, חסר מפרט ל${pendingLabels.join(' ו-')}.`;
                    }
                }
            }
            else if (compilation.status === 'CONSULTATIVE_ACTIVE' || compilation.status === 'CLARIFICATION_REQUIRED') {
                if (compilation.reason === 'PARAMETER_INSTABILITY') {
                    session.blockState = { reason: "PARAMETER_INSTABILITY", ttl: 2 };
                }

                // D. Advisor Priority Check
                // If LLM didn't provide a substantial response, use the static fallback guidance
                if (responseMsg.length < 10 && compilation.fallback_guidance && compilation.fallback_guidance.length > 0) {
                    responseMsg = compilation.fallback_guidance.join("\n");
                }
            }

            // Absolute Fallback
            if (!responseMsg || responseMsg.trim() === "") {
                responseMsg = (compilation.fallback_guidance && compilation.fallback_guidance.length > 0)
                    ? compilation.fallback_guidance.join("\n")
                    : "אני כאן, על מה תרצה שנדבר?";
            }

            const uiCart = [...session.cart];
            Object.keys(session.draftAttributes || {}).forEach(prodKey => {
                if (!uiCart.find(c => c.product === prodKey)) {
                    const meta = DOMAIN_TEMPLATES.products[prodKey] || {};
                    uiCart.push({
                        product: prodKey,
                        displayName: meta.label || prodKey,
                        isPending: true,
                        client_price: 0,
                        qty: session.draftAttributes[prodKey].params?.qty || 0
                    });
                }
            });

            finalResponse.text = responseMsg;
            finalResponse.cart = uiCart;
        }

        // --- Spec v5.7: Tracking Finish ---
        if (session.addToHistory) session.addToHistory('assistant', finalResponse.text);
        session.lastBotMessage = finalResponse.text;
        session.lastIntent = extraction.intent;

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

    if (!req.file) return res.status(400).json({ text: "לא הועלה קובץ." });

    try {
        const technicalPayload = await processImageUpload(req.file.buffer);
        const kernelVerdict = analyzePrintReadyStatus(technicalPayload, session);

        if (kernelVerdict.status === 'REJECT_LOW_RES') {
            const refusal = `עצור! המערכת זיהתה שהקובץ ברזולוציה נמוכה מדי (${technicalPayload.dpi} DPI). נדרש 150 DPI.`;
            return res.json({ text: refusal, status: kernelVerdict.status, technical: technicalPayload });
        }

        session.lastImageMetadata = technicalPayload;
        return res.json({
            text: "הקובץ נבדק טכנית ונמצא תקין! על מה נדפיס אותו?",
            status: kernelVerdict.status,
            technical: technicalPayload,
            options: ['פליירים', 'פוסטרים', 'מדבקות']
        });
    } catch (error) {
        console.error("💥 Upload Error:", error);
        res.status(500).json({ text: "אופס, נתקלתי בבעיה בעיבוד התמונה." });
    }
}

module.exports = { handleChat, handleImageUpload };
