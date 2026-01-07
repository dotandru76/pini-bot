/**
 * Pini Server V10 (Interactive Flow)
 * ==================================
 * שרת שתומך בדיאלוג מונחה (Guided Flow) ושומר הקשר בין שאלות.
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { classifyMessage } = require('./engine/classifier');
const { extractParameters } = require('./engine/extractor');
const { planActions } = require('./engine/planner');
const { calculate_custom_job } = require('./engine/calculation');
const { generateDashboard } = require('./engine/dashboardManager');
const { buildResponse, buildQuickReplies } = require('./engine/responseBuilder');
const { getSession, removeFromCart, clearCart, addToHistory } = require('./services/sessionManager');
const { findOrCreateCustomer, extractPhoneFromText, extractNameFromText } = require('./engine/customerManager');
const { handleWithSmartLLM } = require('./engine/smartLLM');

dotenv.config();
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

// === לוגים ===
const LOG = {
    action: (msg) => console.log(`\x1b[34m⚙️  ${msg}\x1b[0m`),
    success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
    error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`)
};

app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId, phone, customerName } = req.body;
        if (!message) return res.status(400).json({ error: 'Missing message' });

        console.log(`\n--- New Message: "${message}" ---`);

        // 1. ניהול סשן ולקוח
        const session = getSession(userId);
        
        // אתחול זיכרון טיוטה אם לא קיים
        if (!session.draftAttributes) session.draftAttributes = {};
        
        // זיהוי לקוח (אם יש פרטים)
        let customer = null;
        const extractedPhone = extractPhoneFromText(message);
        if (phone || extractedPhone) {
            customer = findOrCreateCustomer(phone || extractedPhone, customerName || extractNameFromText(message));
            session.customerPhone = customer.phone;
        }

        // 2. סיווג וחילוץ
        const classification = classifyMessage(message, { cart: session.cart });
        let intent = classification.intent;
        let params = {};

        // אם המשתמש בתוך תהליך (יש מוצר פעיל בסשן), ננסה לפרש את ההודעה כפרמטר לתהליך
        // אלא אם כן הוא אמר מילת מפתח חזקה כמו "בטל" או "נקה"
        if (session.currentProduct && intent === 'consult' && !classification.needsLLM) {
             // הנחה: אם אנחנו באמצע תהליך והמשתמש שולח משהו קצר, זה כנראה תשובה לשאלה
             // נעביר את הטקסט הגולמי ל-Planner שינסה להתאים אותו
             intent = 'quote'; // ממשיכים את תהליך ההצעה
             params = { raw_text: message };
        } else if (!classification.needsLLM) {
            params = extractParameters(message);
            // אם יש טקסט גולמי שהאקסטרטור לא תפס (כמו "כרומו"), נעביר גם אותו
            params.raw_text = message; 
        } else {
            // LLM Logic (Fallback)
            // ... (קוד LLM קיים) ...
        }

        // 3. תכנון (Planner)
        const plan = planActions(intent, params, session);
        
        // 4. ביצוע (Execution)
        let executionResults = {
            responses: [],
            lastItem: null,
            cartTotal: 0,
            customText: null,
            quickReplies: [] // כאן ייכנסו הכפתורים הדינמיים
        };

        for (const action of plan.actions) {
            LOG.action(`Executing: ${action.type}`);
            
            switch (action.type) {
                // --- פעולות אינטראקטיביות ---
                case 'PRESENT_OPTIONS':
                    executionResults.customText = action.question;
                    executionResults.quickReplies = action.options;
                    // שמירת טיוטה: מעדכנים את מה שאספנו עד כה בסשן
                    if (action.saveDraft) {
                        session.draftAttributes = { ...session.draftAttributes, ...action.saveDraft };
                    }
                    break;

                case 'SET_SESSION_CONTEXT':
                    session.currentProduct = action.product;
                    break;

                case 'CLEAR_SESSION_CONTEXT':
                    session.currentProduct = null;
                    session.draftAttributes = {};
                    break;

                // --- פעולות חישוב ועגלה ---
                case 'CALCULATE_AND_ADD':
                    const calcResult = calculate_custom_job(session.cart, action.payload);
                    session.cart = calcResult.updatedCart;
                    executionResults.lastItem = calcResult.lastAdded;
                    break;

                case 'UPDATE_CART_ITEM':
                    // לוגיקה לעדכון (פישוט: מחשב מחדש ומחליף)
                    const updateResult = calculate_custom_job(session.cart, action.payload);
                    session.cart = updateResult.updatedCart;
                    executionResults.lastItem = updateResult.lastAdded;
                    break;

                case 'REMOVE_FROM_CART':
                    removeFromCart(userId, action.product);
                    break;

                case 'CLEAR_CART':
                    clearCart(userId);
                    break;

                case 'SUMMARIZE_CART':
                    executionResults.cartTotal = session.cart.reduce((sum, item) => sum + item.client_price, 0);
                    break;

                case 'GENERATE_RESPONSE':
                    executionResults.responseTemplate = action.template;
                    break;
                
                case 'CHECK_URGENCY_OPTIONS':
                    executionResults.urgencyOption = { canExpress: true, cost: 50 };
                    break;

                case 'CALL_LLM_CONSULTANT':
                    const llmRes = await handleWithSmartLLM(message, session, customer);
                    executionResults.customText = llmRes.content;
                    break;
            }
        }

        // 5. בניית תשובה סופית
        let finalResponse = '';
        let finalQuickReplies = executionResults.quickReplies;

        if (executionResults.customText) {
            // אם ה-Planner ייצר טקסט מותאם (שאלה), נשתמש בו
            finalResponse = executionResults.customText;
        } else if (executionResults.responseTemplate) {
            // אחרת, נשתמש בתבנית הקבועה
            const context = {
                item: executionResults.lastItem,
                cart: session.cart,
                total: executionResults.cartTotal,
                customer: customer,
                urgency: executionResults.urgencyOption
            };
            finalResponse = buildResponse(executionResults.responseTemplate, context);
            
            // אם אין כפתורים דינמיים, ניקח כפתורים סטטיים מהתבנית
            if (!finalQuickReplies || finalQuickReplies.length === 0) {
                finalQuickReplies = buildQuickReplies(executionResults.responseTemplate);
            }
        }

        // 6. שליחה
        const dashboard = generateDashboard(session, session.customerPhone);
        res.json({
            content: finalResponse,
            cart: session.cart,
            dashboard: dashboard,
            quickReplies: finalQuickReplies
        });

    } catch (error) {
        LOG.error(error.message);
        res.status(500).json({ content: 'שגיאה במערכת. נסה שוב.' });
    }
});

// PDF Route (חשוב!)
app.post('/api/pdf', async (req, res) => {
    try {
        const { generateQuotePDF } = require('./services/pdfService');
        const pdfBuffer = await generateQuotePDF(req.body.cart, req.body.customer || { name: 'לקוח' });
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfBuffer);
    } catch (e) {
        res.status(500).send('Error generating PDF');
    }
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`🚀 Pini V10 (Interactive) running on port ${PORT}`));