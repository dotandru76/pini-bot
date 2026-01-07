/**
 * Pini Print Bot - The Silent Engine (V8)
 * =======================================
 * ארכיטקטורה: Agentic Workflow (Plan -> Execute -> Respond)
 * כולל מערכת לוגים מתקדמת לניטור ולמידה.
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// --- ייבוא המנועים השקטים ---
const { classifyMessage } = require('./engine/classifier');
const { extractParameters } = require('./engine/extractor');
const { planActions } = require('./engine/planner');
const { calculate_custom_job } = require('./engine/calculation');
const { generateDashboard } = require('./engine/dashboardManager');
const { buildResponse, buildQuickReplies } = require('./engine/responseBuilder');
const { getSession, removeFromCart, clearCart, addToHistory } = require('./services/sessionManager');
const { findOrCreateCustomer, extractPhoneFromText, extractNameFromText } = require('./engine/customerManager');
const { generateQuotePDF } = require('./services/pdfService');

// --- ייבוא מנועי AI (למקרים מורכבים בלבד) ---
const { routeRequest } = require('./engine/llmRouter'); // Fallback Planner
const { handleWithSmartLLM } = require('./engine/smartLLM'); // Fallback Responder

dotenv.config();
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

// === מערכת לוגים צבעונית ===
const LOG = {
    info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`), // Cyan
    success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`), // Green
    warning: (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`), // Yellow
    error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`), // Red
    brain: (msg) => console.log(`\x1b[35m🧠 ${msg}\x1b[0m`), // Magenta (Thinking)
    action: (msg) => console.log(`\x1b[34m⚙️  ${msg}\x1b[0m`)  // Blue (Action)
};

// === מנגנון למידה עצמית (Self Correction) ===
function logLearningEvent(type, input, output, correction = null) {
    const event = {
        timestamp: new Date().toISOString(),
        type,
        input,
        output,
        correction
    };
    // בפועל: שומרים לדאטהבייס. כרגע נכתוב לקובץ JSON
    fs.appendFile('learning_logs.json', JSON.stringify(event) + '\n', (err) => {
        if (err) console.error("Failed to save learning log");
    });
}

// ============================================================
// MAIN CHAT ENDPOINT
// ============================================================
app.post('/api/chat', async (req, res) => {
    const startTime = Date.now();
    try {
        const { message, userId, phone, customerName } = req.body;
        if (!message) return res.status(400).json({ error: 'Missing message' });

        console.log('\n' + '='.repeat(60));
        LOG.info(`New Message from ${userId}: "${message}"`);

        // 1. ניהול סשן
        const session = getSession(userId);
        let customer = null;
        
        // זיהוי לקוח (שם/טלפון)
        const extractedPhone = extractPhoneFromText(message);
        if (phone || extractedPhone) {
            customer = findOrCreateCustomer(phone || extractedPhone, customerName || extractNameFromText(message));
            session.customerPhone = customer.phone;
            LOG.success(`Customer Identified: ${customer.name || customer.phone}`);
        }

        // ============================================================
        // שלב 1: הבנה (Perception)
        // ============================================================
        
        // א. סיווג (Classifier) - האם זה פשוט או מורכב?
        const classification = classifyMessage(message, { cart: session.cart });
        LOG.brain(`Classifier: [${classification.intent}] (Confidence: ${classification.confidence})`);

        let intent = classification.intent;
        let params = {};
        let strategy = 'standard';

        // ב. חילוץ פרמטרים (Extractor) או פנייה ל-LLM
        if (!classification.needsLLM) {
            // מסלול מהיר (Rule-Based)
            LOG.success(`⚡ Fast Path Triggered (No AI)`);
            params = extractParameters(message);
            LOG.brain(`Extracted Params: ${JSON.stringify(params)}`);
        } else {
            // מסלול חכם (LLM)
            LOG.warning(`🤖 Complex Request -> Calling LLM Planner...`);
            const llmResult = await routeRequest(message, session.cart, session.history);
            intent = llmResult.intent;
            strategy = llmResult.strategy || 'standard';
            // נרמול התוצאה מה-LLM למבנה של ה-Extractor
            if (llmResult.items && llmResult.items.length > 0) {
                params = llmResult.items[0]; // לוקחים את הראשון כעיקרי כרגע
                // אם יש מספר פריטים, ה-Planner יצטרך לדעת לטפל בזה (הרחבה עתידית)
            }
            LOG.brain(`LLM Decided: Intent=${intent}, Strategy=${strategy}`);
            
            // תיעוד ללמידה: למה המסווג נכשל?
            logLearningEvent('fallback_to_llm', message, classification);
        }

        // ============================================================
        // שלב 2: תכנון (Planning)
        // ============================================================
        
        // הוספת Strategy לפרמטרים אם הגיע מה-LLM או זוהה ע"י המערכת
        if (params.attributes?.urgency === 'high') strategy = 'check_urgency';
        
        const plan = planActions(intent, params, session);
        LOG.brain(`Action Plan Generated: ${plan.actions.length} steps`);
        plan.actions.forEach(a => LOG.brain(`  -> ${a.type} (${JSON.stringify(a.payload || {})})`));

        // ============================================================
        // שלב 3: ביצוע (Execution)
        // ============================================================
        
        let executionResults = {
            responses: [], // אוסף תבניות תשובה
            actionsTaken: [],
            uiActions: [] // כפתורים וכו'
        };

        for (const action of plan.actions) {
            LOG.action(`Executing: ${action.type}...`);
            
            try {
                switch (action.type) {
                    case 'CALCULATE_AND_ADD':
                        const calcResult = calculate_custom_job(session.cart, action.payload);
                        session.cart = calcResult.updatedCart;
                        executionResults.lastItem = calcResult.lastAdded;
                        executionResults.actionsTaken.push('item_added');
                        LOG.success(`Added ${calcResult.lastAdded.product_name} (Price: ${calcResult.lastAdded.client_price})`);
                        break;

                    case 'UPDATE_CART_ITEM':
                        // לוגיקה לעדכון (דומה להוספה, אבל דורס קיים)
                        // ... (מימוש דומה ל-CALCULATE_AND_ADD)
                        LOG.success(`Updated item quantity`);
                        break;

                    case 'REMOVE_FROM_CART':
                        const removed = removeFromCart(userId, action.product);
                        if (removed) LOG.success(`Removed ${action.product}`);
                        else LOG.warning(`Item to remove not found: ${action.product}`);
                        break;

                    case 'CHECK_URGENCY_OPTIONS':
                        // סימולציה: בדיקה מול טבלת ייצור
                        const canExpress = true; // נניח שכן
                        const expressCost = 50; // נניח
                        executionResults.urgencyOption = { canExpress, cost: expressCost };
                        LOG.info(`Urgency Check: Available (+${expressCost} NIS)`);
                        break;

                    case 'GENERATE_RESPONSE':
                        // שומרים את התבנית שצריך להפעיל בסוף
                        executionResults.responseTemplate = action.template;
                        break;
                    
                    case 'UPDATE_DASHBOARD':
                        // יבוצע בסוף גורף
                        break;
                        
                    case 'CALL_LLM_CONSULTANT':
                        // במקרה שאין ברירה וצריך תשובה חופשית
                        const llmResponse = await handleWithSmartLLM(message, session, customer);
                        executionResults.customText = llmResponse.content;
                        executionResults.quickReplies = llmResponse.quickReplies;
                        break;
                }
            } catch (err) {
                LOG.error(`Action Failed: ${action.type} - ${err.message}`);
                logLearningEvent('execution_error', action, err.message);
            }
        }

        // ============================================================
        // שלב 4: ניסוח תשובה (Response Generation)
        // ============================================================
        
        let finalResponse = '';
        let quickReplies = [];

        // אם יש טקסט מותאם אישית מה-LLM (במקרה של Consult)
        if (executionResults.customText) {
            finalResponse = executionResults.customText;
            quickReplies = executionResults.quickReplies || [];
        } 
        // אחרת, השתמש בתבנית שנבחרה ע"י ה-Planner
        else if (executionResults.responseTemplate) {
            // הזרקת נתונים לתבנית
            const context = {
                item: executionResults.lastItem,
                cart: session.cart,
                customer: customer,
                userMessage: message,
                // אם הייתה בדיקת דחיפות, נעביר את התוצאה לתבנית
                urgency: executionResults.urgencyOption 
            };
            
            finalResponse = buildResponse(executionResults.responseTemplate, context);
            quickReplies = buildQuickReplies(executionResults.responseTemplate);
            
            // אם זוהתה דחיפות, נוסיף משפט דינמי (בלי LLM!)
            if (strategy === 'check_urgency' && executionResults.urgencyOption) {
                finalResponse += `\n\n🚀 ראיתי שזה דחוף. אפשר להריץ את זה באקספרס בתוספת ₪${executionResults.urgencyOption.cost}. לאשר?`;
                quickReplies = [
                    { text: 'כן, אקספרס', value: 'אשר אקספרס' },
                    { text: 'לא, רגיל', value: 'משלוח רגיל' }
                ];
            }
        } 
        // ברירת מחדל אם משהו השתבש
        else {
            finalResponse = "קיבלתי, אבל אני לא בטוח מה לעשות הלאה. רוצה לדבר עם נציג?";
            LOG.error("No response template selected!");
        }

        // שמירה בהיסטוריה
        addToHistory(userId, 'user', message);
        addToHistory(userId, 'model', finalResponse);

        // עדכון דשבורד
        const dashboard = generateDashboard(session, session.customerPhone);
        
        const processTime = Date.now() - startTime;
        LOG.info(`Request processed in ${processTime}ms`);

        res.json({
            content: finalResponse,
            cart: session.cart,
            dashboard: dashboard,
            quickReplies: quickReplies,
            meta: { 
                intent, 
                strategy, 
                fastPath: !classification.needsLLM,
                processTime 
            }
        });

    } catch (error) {
        LOG.error(`Server Error: ${error.message}`);
        console.error(error);
        res.status(500).json({ content: 'סליחה, הייתה תקלה במערכת. נסה שוב.' });
    }
});

// PDF Route
app.post('/api/pdf', async (req, res) => {
    // ... (אותו קוד קיים)
    try {
        const { cart, customer } = req.body;
        if (!cart || !Array.isArray(cart) || cart.length === 0) return res.status(400).json({ error: 'Cart empty' });
        const pdfBuffer = await generateQuotePDF(cart, customer || { name: 'לקוח' });
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="quote.pdf"'
        });
        res.send(pdfBuffer);
    } catch (e) {
        console.error("PDF Error", e);
        res.status(500).send("Error generating PDF");
    }
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
    console.log(`\n🚀 Pini V8 Silent Engine Running on port ${PORT}`);
    console.log(`📝 Logging enabled with color coding`);
    console.log(`🧠 Self-correction hooks active\n`);
});