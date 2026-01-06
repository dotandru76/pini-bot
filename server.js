/**
 * Pini Print Bot - Server V5 (Hybrid: Classifier + LLM)
 * =====================================================
 * ארכיטקטורה משולבת:
 * 1. בדיקה מהירה (Classifier) - חינם ומהיר (80% מהמקרים)
 * 2. בדיקה חכמה (LLM Router) - למקרים מורכבים
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- ייבוא מנועים ושירותים ---
const { classifyMessage } = require('./engine/classifier'); // המנוע המהיר החדש
const { routeRequest } = require('./engine/llmRouter');     // הראוטר החכם
const { calculate_custom_job } = require('./engine/calculation'); // המחשבון
const { getSession, removeFromCart, clearCart, addToHistory } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService');
const { buildResponse, buildQuickReplies } = require('./engine/responseBuilder');
const { generateDashboard } = require('./engine/dashboardManager');
const { findOrCreateCustomer, extractPhoneFromText, extractNameFromText } = require('./engine/customerManager');
const { PRODUCT_CATALOG } = require('./engine/productCatalog');
const { 
    detectTaskType, 
    buildPrompt, 
    validateResponse, 
    fixResponse
} = require('./engine/smartLLM');

dotenv.config();
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ============================================================
// MAIN CHAT ENDPOINT
// ============================================================
app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId, phone, customerName } = req.body;
        
        if (!message) return res.status(400).json({ error: 'Missing message' });
        
        console.log(`\n💬 User: "${message}"`);
        
        // 1. ניהול סשן ולקוח
        const session = getSession(userId);
        let customer = null;
        
        const extractedPhone = extractPhoneFromText(message);
        if (phone || extractedPhone) {
            customer = findOrCreateCustomer(phone || extractedPhone, customerName || extractNameFromText(message));
            session.customerPhone = customer.phone;
        }

        // 2. הניתוב החדש והחכם (Hybrid Router: Rules + LLM)
        let routerResult;
        
        // קודם כל ננסה את המסווג המהיר (חינם!)
        const classification = classifyMessage(message, { cart: session.cart });
        
        if (!classification.needsLLM) {
            console.log(`⚡ Fast Path Triggered: ${classification.action}`);
            
            // מיפוי מהמסווג לפורמט שהשרת מכיר
            routerResult = {
                intent: mapActionToIntent(classification.action),
                product: classification.data?.product,
                qty: classification.data?.qty,
                attributes: {}
            };
        } else {
            // רק אם המסווג לא הצליח - נפנה ל-LLM (עולה כסף)
            console.log(`🤖 Using LLM for complex request...`);
            routerResult = await routeRequest(message, session.cart);
        }
        
        console.log(`🧠 Final Intent: ${routerResult.intent} | Product: ${routerResult.product || 'N/A'}`);

        // 3. ביצוע הפעולה בשרת
        let responseData = { content: '', quickReplies: [] };

        switch (routerResult.intent) {
            
            case 'quote': // בקשת מחיר / הוספה
                if (routerResult.product && routerResult.qty) {
                    const calc = calculate_custom_job(session.cart, {
                        product_name: routerResult.product,
                        qty: routerResult.qty,
                        paper_type: routerResult.attributes?.paper,
                        finishing: routerResult.attributes?.finishing
                    });
                    session.cart = calc.updatedCart;
                    responseData.content = buildResponse('quote_added', { item: calc.lastAdded });
                    responseData.quickReplies = buildQuickReplies('quote_added');
                } else if (routerResult.product) {
                    // יש מוצר אבל אין כמות
                    responseData.content = buildResponse('ask_quantity', { product: routerResult.product });
                    responseData.quickReplies = buildQuickReplies('ask_quantity');
                } else {
                    responseData.content = "בשמחה! מה תרצה להדפיס? (כרטיסים, פליירים, הזמנות...)";
                    responseData.quickReplies = buildQuickReplies('greeting');
                }
                break;

            case 'update': // עדכון כמות
                const itemToUpdate = session.cart.length > 0 ? session.cart[session.cart.length - 1] : null;
                if (itemToUpdate && routerResult.qty) {
                    const oldQty = itemToUpdate.qty;
                    const upCalc = calculate_custom_job(session.cart, {
                        product_name: itemToUpdate.product_name,
                        qty: routerResult.qty,
                        paper_type: routerResult.attributes?.paper || itemToUpdate.paper_type
                    });
                    session.cart = upCalc.updatedCart;
                    responseData.content = buildResponse('quote_updated', { item: upCalc.lastAdded, oldQty });
                    responseData.quickReplies = buildQuickReplies('cart_status');
                } else {
                    // אם אין מה לעדכן, נתייחס לזה כהוספה חדשה אם אפשר
                    responseData.content = "לא מצאתי פריט אחרון לעדכן. מה תרצה להזמין?";
                }
                break;

            case 'remove': // הסרה
                const removed = removeFromCart(userId, routerResult.product || '');
                responseData.content = removed ? "הסרתי את הפריט 👍" : "העגלה כבר מעודכנת.";
                responseData.quickReplies = buildQuickReplies('cart_status');
                break;
            
            case 'clear': // איפוס
                clearCart(userId);
                responseData.content = buildResponse('cart_cleared');
                responseData.quickReplies = buildQuickReplies('greeting');
                break;

            case 'status': // סטטוס עגלה (חדש!)
                responseData.content = buildResponse('cart_status', { cart: session.cart, customer });
                responseData.quickReplies = buildQuickReplies('cart_status');
                break;

            case 'design_check': // בדיקת עיצוב (חדש!)
                responseData.content = buildResponse('design_check', {});
                responseData.quickReplies = buildQuickReplies('design_check');
                break;

            case 'checkout': // סיום
                const total = session.cart.reduce((s, i) => s + i.client_price, 0);
                responseData.content = buildResponse('send_quote', { total, cart: session.cart });
                responseData.quickReplies = buildQuickReplies('send_quote');
                break;

            case 'show_menu':
                const context = routerResult.context || ''; 
                let menuText = "הנה מה שיש לנו להציע:";
                let relevantProducts = ['bc', 'flyer', 'invitation', 'rollup'];

                if (['wedding', 'חתונה'].some(w => context.includes(w))) {
                    menuText = "🎉 מזל טוב! לחתונה אני ממליץ על:";
                    relevantProducts = ['invitation', 'sticker', 'booklet'];
                }

                const menuButtons = relevantProducts.map(key => {
                    const prod = PRODUCT_CATALOG[key];
                    return { text: prod ? prod.name : key, value: prod ? prod.name : key };
                });

                responseData.content = menuText;
                responseData.quickReplies = menuButtons;
                break;

            case 'greeting':
                responseData.content = buildResponse('greeting', { customer });
                responseData.quickReplies = buildQuickReplies('greeting');
                break;

            case 'consult': // שאלות פתוחות -> SmartLLM
            default:
                const llmResponse = await handleWithSmartLLM(message, session, customer);
                responseData.content = llmResponse.content;
                responseData.quickReplies = llmResponse.quickReplies;
                break;
        }

        addToHistory(userId, 'user', message);
        addToHistory(userId, 'model', responseData.content);

        const dashboard = generateDashboard(session, session.customerPhone);

        res.json({
            content: responseData.content,
            cart: session.cart,
            dashboard: dashboard,
            quickReplies: responseData.quickReplies,
            meta: { intent: routerResult.intent, fastPath: !classification.needsLLM }
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ content: 'סליחה, הייתה תקלה קטנה. נסה שוב? 😅' });
    }
});

// מיפוי פעולות מהמסווג המהיר לכוונות של השרת
function mapActionToIntent(action) {
    const map = {
        'quote': 'quote',
        'update_qty': 'update',
        'remove': 'remove',
        'clear': 'clear',
        'greeting': 'greeting',
        'send_quote': 'checkout',
        'status': 'status',
        'quote_incomplete': 'quote',
        'design_check': 'design_check'
    };
    return map[action] || 'consult';
}

// פונקציית עזר לטיפול בשיחה חכמה
async function handleWithSmartLLM(message, session, customer) {
    const taskType = detectTaskType(message, { hasQuote: session.cart.length > 0 });
    const promptData = buildPrompt(taskType, { 
        userMessage: message, 
        cart: session.cart, 
        customer 
    });

    try {
        const result = await chatModel.generateContent(promptData.system + "\n" + promptData.context);
        let text = result.response.text();
        
        const validation = validateResponse(text, taskType, {});
        if (!validation.isValid) {
            text = fixResponse(text, validation.corrections);
        }
        
        return { content: text, quickReplies: [] };
    } catch (e) {
        return { content: "אני בודק את זה...", quickReplies: [] };
    }
}

// PDF Generation Route
app.post('/api/pdf', async (req, res) => {
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
app.listen(PORT, () => console.log(`🚀 Pini V5 Router Server running on port ${PORT}`));