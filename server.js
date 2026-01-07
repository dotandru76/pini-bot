/**
 * Pini Print Bot - Server V7 (Strategy Enabled)
 * =============================================
 * שרת חכם שיודע לא רק להגיב אלא גם ליזום מהלכים (Proactive)
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ייבוא מנועים
const { classifyMessage } = require('./engine/classifier'); 
const { routeRequest } = require('./engine/llmRouter'); 
const { calculate_custom_job } = require('./engine/calculation');
const { getSession, removeFromCart, clearCart, addToHistory } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService');
const { buildResponse, buildQuickReplies } = require('./engine/responseBuilder');
const { generateDashboard } = require('./engine/dashboardManager');
const { findOrCreateCustomer, extractPhoneFromText, extractNameFromText } = require('./engine/customerManager');
const { PRODUCT_CATALOG } = require('./engine/productCatalog');
const { detectTaskType, buildPrompt, validateResponse, fixResponse } = require('./engine/smartLLM');

dotenv.config();
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// הגדרות ברירת מחדל לאסטרטגיה
const POPULAR_DEFAULTS = {
    'bc': 500,
    'flyer': 1000,
    'invitation': 200,
    'rollup': 1,
    'sticker': 500,
    'booklet': 50
};

app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId, phone, customerName } = req.body;
        if (!message) return res.status(400).json({ error: 'Missing message' });
        
        console.log(`\n💬 User: "${message}"`);
        const session = getSession(userId);
        
        // זיהוי לקוח
        const extractedPhone = extractPhoneFromText(message);
        if (phone || extractedPhone) {
            findOrCreateCustomer(phone || extractedPhone, customerName || extractNameFromText(message));
            session.customerPhone = phone || extractedPhone;
        }

        // ניתוב
        let routerResult;
        const classification = classifyMessage(message, { cart: session.cart });
        
        if (!classification.needsLLM) {
            console.log(`⚡ Fast Path: ${classification.action}`);
            routerResult = {
                intent: mapActionToIntent(classification.action),
                strategy: 'standard', // מסלול מהיר הוא תמיד סטנדרטי
                items: [{ product: classification.data?.product, qty: classification.data?.qty }]
            };
        } else {
            console.log(`🤖 Using LLM (Strategy Engine)...`);
            routerResult = await routeRequest(message, session.cart, session.history);
        }
        
        console.log(`🧠 Intent: ${routerResult.intent} | Strategy: ${routerResult.strategy}`);

        let responseData = { content: '', quickReplies: [] };

        switch (routerResult.intent) {
            case 'quote':
                // === טיפול באסטרטגיה: הצעה יזומה (Offer Popular) ===
                if (routerResult.strategy === 'offer_popular' && routerResult.items?.[0]?.product) {
                    const product = routerResult.items[0].product;
                    const defaultQty = POPULAR_DEFAULTS[product] || 100;
                    
                    // מחשבים את ההצעה הפופולרית
                    const calc = calculate_custom_job(session.cart, {
                        product_name: product,
                        qty: defaultQty
                    });
                    
                    // לא מוסיפים לעגלה אוטומטית, רק מציגים (סימולציה)
                    responseData.content = `הכי הולך אצלנו זה ${defaultQty} יחידות ב-₪${calc.lastAdded.client_price}. זה מתאים לך, או שתרצה כמות אחרת?`;
                    responseData.quickReplies = [
                        { text: `כן, תזמין ${defaultQty}`, value: `אני רוצה ${defaultQty} ${product}` },
                        { text: 'כמות אחרת', value: 'כמות אחרת' }
                    ];
                    break;
                }

                // === טיפול באסטרטגיה: דחיפות (Check Urgency) ===
                if (routerResult.strategy === 'check_urgency') {
                    responseData.content = `אני מבין שזה דחוף! 🚀\nיש לנו מסלול אקספרס (מהיום להיום/מחר) בתוספת תשלום, או רגיל (3 ימי עסקים).\nאיך תרצה להתקדם?`;
                    responseData.quickReplies = [
                        { text: 'אקספרס (דחוף!)', value: 'אקספרס' },
                        { text: 'רגיל זה בסדר', value: 'רגיל' }
                    ];
                    break; // עוצרים כאן כדי לקבל תשובה
                }

                // === מסלול רגיל (הוספה לעגלה) ===
                const itemsToAdd = routerResult.items || [];
                const addedItems = [];

                for (const item of itemsToAdd) {
                    if (item.product && item.qty) {
                        const calc = calculate_custom_job(session.cart, {
                            product_name: item.product,
                            qty: item.qty,
                            paper_type: item.attributes?.paper
                        });
                        session.cart = calc.updatedCart;
                        addedItems.push(calc.lastAdded);
                    }
                }

                if (addedItems.length > 0) {
                    // אם ה-Strategy הוא close_deal, נוסיף משפט סגירה
                    let closingText = "";
                    if (routerResult.strategy === 'close_deal') {
                        closingText = "\n\nיש לנו את כל הפרטים. לשלוח לך לינק לתשלום וסגירה?";
                    } else if (routerResult.strategy === 'req_file') {
                        closingText = "\n\nיש לך כבר קובץ מוכן לשלוח לי?";
                    }

                    responseData.content = (addedItems.length === 1 
                        ? buildResponse('quote_added', { item: addedItems[0] })
                        : buildResponse('multi_quote_added', { items: addedItems, cart: session.cart })) + closingText;
                    
                    responseData.quickReplies = buildQuickReplies('cart_status');
                } else {
                    responseData.content = "הבנתי שאתה רוצה להזמין, מה הכמויות וסוג המוצר?";
                    responseData.quickReplies = buildQuickReplies('greeting');
                }
                break;

            case 'update':
                const updateData = routerResult.items?.[0] || {};
                const lastItem = session.cart[session.cart.length - 1];
                if (lastItem && updateData.qty) {
                    const upCalc = calculate_custom_job(session.cart, {
                        product_name: lastItem.product_name,
                        qty: updateData.qty
                    });
                    session.cart = upCalc.updatedCart;
                    responseData.content = buildResponse('quote_updated', { item: upCalc.lastAdded, oldQty: lastItem.qty });
                }
                break;

            case 'status':
                responseData.content = buildResponse('cart_status', { cart: session.cart });
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

            case 'greeting':
                responseData.content = buildResponse('greeting');
                responseData.quickReplies = buildQuickReplies('greeting');
                break;

            case 'consult':
            default:
                const llmResponse = await handleWithSmartLLM(message, session);
                responseData.content = llmResponse.content;
                break;
        }

        addToHistory(userId, 'user', message);
        addToHistory(userId, 'model', responseData.content);

        res.json({
            content: responseData.content,
            cart: session.cart,
            dashboard: generateDashboard(session, session.customerPhone),
            quickReplies: responseData.quickReplies,
            meta: { intent: routerResult.intent, strategy: routerResult.strategy }
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ content: 'תקלה בשרת, נסה שוב.' });
    }
});

function mapActionToIntent(action) {
    const map = { 'quote': 'quote', 'update_qty': 'update', 'remove': 'remove', 'greeting': 'greeting', 'send_quote': 'checkout', 'status': 'status', 'design_check': 'design_check' };
    return map[action] || 'consult';
}

async function handleWithSmartLLM(message, session) {
    const taskType = detectTaskType(message, { hasQuote: session.cart.length > 0 });
    const promptData = buildPrompt(taskType, { userMessage: message, cart: session.cart, history: session.history });
    const result = await chatModel.generateContent(promptData.system + "\n" + promptData.context);
    let text = result.response.text();
    return { content: text, quickReplies: [] };
}

// PDF Route
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
        res.status(500).send("Error generating PDF");
    }
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`🚀 Pini V7 Server (Strategy Engine) running on port ${PORT}`));