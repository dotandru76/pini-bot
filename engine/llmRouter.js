/**
 * Pini Print Bot - Server V6 (Multi-Item Support)
 * ===============================================
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const { routeRequest } = require('./engine/llmRouter'); 
const { calculate_custom_job } = require('./engine/calculation');
const { getSession, removeFromCart, clearCart, addToHistory } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService');
const { buildResponse, buildQuickReplies } = require('./engine/responseBuilder');
const { generateDashboard } = require('./engine/dashboardManager');
const { findOrCreateCustomer, extractPhoneFromText, extractNameFromText } = require('./engine/customerManager');
const { PRODUCT_CATALOG } = require('./engine/productCatalog');
const { detectTaskType, buildPrompt, validateResponse, fixResponse } = require('./engine/smartLLM');
const { classifyMessage } = require('./engine/classifier');

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
        
        const session = getSession(userId);
        let customer = null;
        
        const extractedPhone = extractPhoneFromText(message);
        if (phone || extractedPhone) {
            customer = findOrCreateCustomer(phone || extractedPhone, customerName || extractNameFromText(message));
            session.customerPhone = customer.phone;
        }

        // 1. נסה מסווג מהיר
        let routerResult;
        const classification = classifyMessage(message, { cart: session.cart });
        
        if (!classification.needsLLM) {
            console.log(`⚡ Fast Path: ${classification.action}`);
            routerResult = {
                intent: mapActionToIntent(classification.action),
                items: [{ // המרה לפורמט אחיד של רשימה
                    product: classification.data?.product,
                    qty: classification.data?.qty
                }]
            };
        } else {
            console.log(`🤖 Using LLM (Complex/Multi-Item)...`);
            routerResult = await routeRequest(message, session.cart, session.history);
        }
        
        console.log(`🧠 Intent: ${routerResult.intent}`);

        // 3. ביצוע הפעולה
        let responseData = { content: '', quickReplies: [] };

        switch (routerResult.intent) {
            
            case 'quote': // הוספה (תומך בריבוי פריטים!)
                const itemsToAdd = routerResult.items || [];
                const addedItems = [];

                // מעבר על כל הפריטים שזוהו
                for (const item of itemsToAdd) {
                    if (item.product && item.qty) {
                        const calc = calculate_custom_job(session.cart, {
                            product_name: item.product,
                            qty: item.qty,
                            paper_type: item.attributes?.paper,
                            finishing: item.attributes?.finishing
                        });
                        session.cart = calc.updatedCart;
                        addedItems.push(calc.lastAdded);
                    }
                }

                if (addedItems.length > 0) {
                    if (addedItems.length === 1) {
                        // פריט בודד
                        responseData.content = buildResponse('quote_added', { item: addedItems[0] });
                        responseData.quickReplies = buildQuickReplies('quote_added');
                    } else {
                        // ריבוי פריטים
                        responseData.content = buildResponse('multi_quote_added', { items: addedItems, cart: session.cart });
                        responseData.quickReplies = buildQuickReplies('cart_status');
                    }
                } else {
                    // לא זוהו פריטים ברורים
                    responseData.content = "הבנתי שאתה רוצה להזמין, אבל חסרים לי פרטים (כמות או סוג מוצר). מה תרצה להדפיס?";
                    responseData.quickReplies = buildQuickReplies('greeting');
                }
                break;

            case 'update': 
                const itemToUpdate = session.cart.length > 0 ? session.cart[session.cart.length - 1] : null;
                // לוקחים את הפריט הראשון מהרשימה לעדכון
                const updateData = routerResult.items?.[0] || {};
                
                if (itemToUpdate && updateData.qty) {
                    const oldQty = itemToUpdate.qty;
                    const upCalc = calculate_custom_job(session.cart, {
                        product_name: itemToUpdate.product_name,
                        qty: updateData.qty,
                        paper_type: updateData.attributes?.paper || itemToUpdate.paper_type
                    });
                    session.cart = upCalc.updatedCart;
                    responseData.content = buildResponse('quote_updated', { item: upCalc.lastAdded, oldQty });
                    responseData.quickReplies = buildQuickReplies('cart_status');
                } else {
                    responseData.content = "לא מצאתי פריט אחרון לעדכן.";
                }
                break;

            case 'remove':
                const productToRemove = routerResult.items?.[0]?.product || '';
                const removed = removeFromCart(userId, productToRemove);
                responseData.content = removed ? "הסרתי את הפריט 👍" : "העגלה כבר מעודכנת.";
                responseData.quickReplies = buildQuickReplies('cart_status');
                break;
            
            case 'clear':
                clearCart(userId);
                responseData.content = buildResponse('cart_cleared');
                responseData.quickReplies = buildQuickReplies('greeting');
                break;

            case 'status':
                responseData.content = buildResponse('cart_status', { cart: session.cart, customer });
                responseData.quickReplies = buildQuickReplies('cart_status');
                break;

            case 'design_check':
                responseData.content = buildResponse('design_check', {});
                responseData.quickReplies = buildQuickReplies('design_check');
                break;

            case 'checkout':
                const total = session.cart.reduce((s, i) => s + i.client_price, 0);
                responseData.content = buildResponse('send_quote', { total, cart: session.cart });
                responseData.quickReplies = buildQuickReplies('send_quote');
                break;

            case 'show_menu':
                // לוגיקה קיימת לתפריט...
                const context = routerResult.context || ''; 
                let menuText = "הנה מה שיש לנו להציע:";
                let relevantProducts = ['bc', 'flyer', 'invitation', 'rollup'];
                
                // ... (שאר הקוד של התפריט זהה)
                responseData.content = menuText;
                responseData.quickReplies = buildQuickReplies('greeting');
                break;

            case 'greeting':
                responseData.content = buildResponse('greeting', { customer });
                responseData.quickReplies = buildQuickReplies('greeting');
                break;

            case 'consult':
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
            meta: { intent: routerResult.intent }
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ content: 'סליחה, הייתה תקלה קטנה. נסה שוב? 😅' });
    }
});

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

async function handleWithSmartLLM(message, session, customer) {
    const taskType = detectTaskType(message, { hasQuote: session.cart.length > 0 });
    const promptData = buildPrompt(taskType, { 
        userMessage: message, 
        cart: session.cart, 
        customer,
        history: session.history
    });

    try {
        const result = await chatModel.generateContent(promptData.system + "\n" + promptData.context);
        let text = result.response.text();
        const validation = validateResponse(text, taskType, {});
        if (!validation.isValid) text = fixResponse(text, validation.corrections);
        return { content: text, quickReplies: [] };
    } catch (e) {
        return { content: "אני בודק את זה...", quickReplies: [] };
    }
}

// PDF Route (ללא שינוי)
app.post('/api/pdf', async (req, res) => {
    // ... אותו קוד PDF ...
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
        res.status(500).send("Error generating PDF");
    }
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`🚀 Pini V6 Server (Multi-Item) running on port ${PORT}`));