/**
 * Pini Print Bot - The Silent Engine (V9 - Fully Synced)
 * ======================================================
 * תוקן: סנכרון מלא מול ה-Planner. מטפל בכל סוגי הפעולות האפשריות.
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// --- ייבוא המנועים ---
const { classifyMessage } = require('./engine/classifier');
const { extractParameters } = require('./engine/extractor');
const { planActions } = require('./engine/planner');
const { calculate_custom_job } = require('./engine/calculation');
const { generateDashboard } = require('./engine/dashboardManager');
const { buildResponse, buildQuickReplies } = require('./engine/responseBuilder');
const { getSession, removeFromCart, clearCart, addToHistory } = require('./services/sessionManager');
const { findOrCreateCustomer, extractPhoneFromText, extractNameFromText } = require('./engine/customerManager');
const { generateQuotePDF } = require('./services/pdfService');

// --- Fallbacks ---
const { routeRequest } = require('./engine/llmRouter');
const { handleWithSmartLLM } = require('./engine/smartLLM');

dotenv.config();
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

// === לוגים ===
const LOG = {
    info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
    success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
    warning: (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
    error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`),
    brain: (msg) => console.log(`\x1b[35m🧠 ${msg}\x1b[0m`),
    action: (msg) => console.log(`\x1b[34m⚙️  ${msg}\x1b[0m`)
};

app.post('/api/chat', async (req, res) => {
    const startTime = Date.now();
    try {
        const { message, userId, phone, customerName } = req.body;
        if (!message) return res.status(400).json({ error: 'Missing message' });

        console.log('\n' + '='.repeat(60));
        LOG.info(`New Message from ${userId}: "${message}"`);

        const session = getSession(userId);
        let customer = null;
        
        const extractedPhone = extractPhoneFromText(message);
        if (phone || extractedPhone) {
            customer = findOrCreateCustomer(phone || extractedPhone, customerName || extractNameFromText(message));
            session.customerPhone = customer.phone;
        }

        // 1. Perception
        const classification = classifyMessage(message, { cart: session.cart });
        LOG.brain(`Classifier: [${classification.intent}] (Confidence: ${classification.confidence})`);

        let intent = classification.intent;
        let params = {};
        let strategy = 'standard';

        if (!classification.needsLLM) {
            LOG.success(`⚡ Fast Path Triggered`);
            params = extractParameters(message);
            LOG.brain(`Extracted Params: ${JSON.stringify(params)}`);
        } else {
            LOG.warning(`🤖 Complex Request -> Calling LLM Planner...`);
            const llmResult = await routeRequest(message, session.cart, session.history);
            intent = llmResult.intent;
            strategy = llmResult.strategy || 'standard';
            if (llmResult.items && llmResult.items.length > 0) {
                params = llmResult.items[0];
                // מיפוי שדות מה-LLM ל-Extractor
                if (params.product) params.product_name = params.product; 
            }
            LOG.brain(`LLM Decided: Intent=${intent}, Strategy=${strategy}`);
        }

        // דחיפות יכולה להגיע מה-Extractor או מה-LLM
        if (params.attributes?.urgency === 'high') strategy = 'check_urgency';

        // 2. Planning
        const plan = planActions(intent, params, session);
        LOG.brain(`Action Plan: ${plan.actions.map(a => a.type).join(' -> ')}`);

        // 3. Execution
        let executionResults = {
            responses: [],
            actionsTaken: [],
            lastItem: null,
            cartTotal: 0,
            urgencyOption: null,
            responseTemplate: null,
            customText: null
        };

        for (const action of plan.actions) {
            LOG.action(`Executing: ${action.type}...`);
            
            try {
                switch (action.type) {
                    case 'CALCULATE_AND_ADD':
                    case 'UPDATE_CART_ITEM':
                        // מוודאים שיש לנו שם מוצר תקין
                        const productKey = action.payload.product_name || action.payload.product;
                        if (!productKey) throw new Error("Missing product name for calculation");

                        const calcResult = calculate_custom_job(session.cart, {
                            product_name: productKey,
                            qty: action.payload.qty,
                            ...action.payload.attributes // מעביר נייר, גימור וכו'
                        });
                        session.cart = calcResult.updatedCart;
                        executionResults.lastItem = calcResult.lastAdded;
                        executionResults.actionsTaken.push('item_processed');
                        LOG.success(`Item Processed: ${calcResult.lastAdded.product_name}`);
                        break;

                    case 'REMOVE_FROM_CART':
                        const removed = removeFromCart(userId, action.product);
                        if (removed) LOG.success(`Removed ${action.product}`);
                        else LOG.warning(`Item not found to remove`);
                        break;
                    
                    case 'CLEAR_CART':
                        clearCart(userId);
                        session.cart = [];
                        LOG.success(`Cart cleared`);
                        break;

                    case 'CHECK_URGENCY_OPTIONS':
                        executionResults.urgencyOption = { canExpress: true, cost: 50 }; // סימולציה
                        LOG.info(`Urgency Check: OK`);
                        break;
                    
                    case 'SUMMARIZE_CART':
                        const total = session.cart.reduce((sum, item) => sum + item.client_price, 0);
                        executionResults.cartTotal = total;
                        LOG.info(`Cart Total Calculated: ${total}`);
                        break;

                    case 'CHECK_DESIGN_STATUS':
                        // כאן נבדוק בעתיד אם הועלו קבצים. כרגע סימולציה.
                        executionResults.hasFiles = false; 
                        break;

                    case 'ASK_QUESTION':
                        if (action.question === 'quantity') {
                            executionResults.responseTemplate = 'ask_quantity';
                            // שומרים את שם המוצר כדי שהשאלה תהיה ספציפית
                            executionResults.lastItem = { product_name: action.product };
                        } else {
                            executionResults.responseTemplate = 'ask_general';
                        }
                        break;

                    case 'ASK_CLARIFICATION':
                        executionResults.responseTemplate = 'ask_clarification';
                        break;

                    case 'GENERATE_RESPONSE':
                        executionResults.responseTemplate = action.template;
                        break;
                        
                    case 'UPDATE_DASHBOARD':
                        // יבוצע בסוף
                        break;
                        
                    case 'CALL_LLM_CONSULTANT':
                        const llmResponse = await handleWithSmartLLM(message, session, customer);
                        executionResults.customText = llmResponse.content;
                        executionResults.quickReplies = llmResponse.quickReplies;
                        break;

                    default:
                        LOG.warning(`Unknown action type: ${action.type}`);
                }
            } catch (err) {
                LOG.error(`Action Failed (${action.type}): ${err.message}`);
            }
        }

        // 4. Response Generation
        let finalResponse = '';
        let quickReplies = [];

        if (executionResults.customText) {
            finalResponse = executionResults.customText;
            quickReplies = executionResults.quickReplies || [];
        } 
        else if (executionResults.responseTemplate) {
            // הכנת הקונטקסט המלא לתבנית
            const context = {
                item: executionResults.lastItem,
                cart: session.cart,
                total: executionResults.cartTotal, // קריטי ל-Checkout
                customer: customer,
                userMessage: message,
                urgency: executionResults.urgencyOption
            };
            
            finalResponse = buildResponse(executionResults.responseTemplate, context);
            quickReplies = buildQuickReplies(executionResults.responseTemplate);
            
            // תוספת דינמית לדחיפות
            if (strategy === 'check_urgency' && executionResults.urgencyOption) {
                finalResponse += `\n\n🚀 ראיתי שזה דחוף. רוצה להוסיף אקספרס ב-₪${executionResults.urgencyOption.cost}?`;
                quickReplies = [
                    { text: 'כן, אקספרס', value: 'אשר אקספרס' },
                    { text: 'לא, רגיל', value: 'משלוח רגיל' }
                ];
            }
        } 
        else {
            // Fallback אמיתי למקרה שהכול נכשל
            finalResponse = "קיבלתי, אבל משהו התפקשש לי בחישוב. תוכל לנסח מחדש?";
            LOG.error("No response template selected - Logic Gap!");
        }

        addToHistory(userId, 'user', message);
        addToHistory(userId, 'model', finalResponse);

        const dashboard = generateDashboard(session, session.customerPhone);
        
        const processTime = Date.now() - startTime;
        LOG.info(`Done in ${processTime}ms`);

        res.json({
            content: finalResponse,
            cart: session.cart,
            dashboard: dashboard,
            quickReplies: quickReplies,
            meta: { intent, strategy, processTime }
        });

    } catch (error) {
        LOG.error(`Critical Server Error: ${error.message}`);
        console.error(error);
        res.status(500).json({ content: 'תקלה מערכתית. הצוות בודק את זה.' });
    }
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`🚀 Pini V9 (Fully Synced) running on port ${PORT}`));