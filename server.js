/**
 * Pini Print Bot - Server V5 (Universal Router)
 * =============================================
 * ארכיטקטורה: LLM Router -> Server Logic -> Response
 * שומר על כל חוקי הברזל: השרת מחשב, ה-LLM רק מבין ומנסח.
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- ייבוא מנועים ושירותים ---
const { routeRequest } = require('./engine/llmRouter'); // הראוטר החדש
const { calculate_custom_job } = require('./services/calculation'); // המחשבון (מקור האמת)
const { getSession, removeFromCart, clearCart, addToHistory } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService');
const { buildResponse, buildQuickReplies } = require('./engine/responseBuilder');
const { generateDashboard } = require('./engine/dashboardManager');
const { 
    findOrCreateCustomer, 
    extractPhoneFromText, 
    extractNameFromText 
} = require('./engine/customerManager');
const { PRODUCT_CATALOG } = require('./engine/productCatalog'); // קטלוג אמיתי לתפריטים

// --- ייבוא ה-LLM החכם לשיחות ---
const { 
    detectTaskType, 
    buildPrompt, 
    validateResponse, 
    fixResponse,
    TASK_TYPES 
} = require('./engine/smartLLM');

dotenv.config();
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

// הגדרת Gemini לשיחות (SmartLLM)
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
        
        // זיהוי לקוח (אם יש טלפון)
        const extractedPhone = extractPhoneFromText(message);
        if (phone || extractedPhone) {
            customer = findOrCreateCustomer(phone || extractedPhone, customerName || extractNameFromText(message));
            session.customerPhone = customer.phone;
        }

        // 2. הניתוב החדש (V5 Router)
        // שולחים ל-LLM הקטן שיבין מה הכוונה ויחזיר JSON
        const routerResult = await routeRequest(message, session.cart);
        console.log(`🧠 Router Intent: ${routerResult.intent} | Product: ${routerResult.product || 'N/A'}`);

        // 3. ביצוע הפעולה בשרת (Server is Source of Truth)
        let responseData = { content: '', quickReplies: [] };
        const ctx = { cart: session.cart, customer, routerResult };

        switch (routerResult.intent) {
            
            case 'quote': // בקשת מחיר / הוספה
                // חוק ברזל: השרת מחשב!
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
                    // יש מוצר אבל אין כמות ("אני צריך פליירים")
                    responseData.content = buildResponse('ask_quantity', { product: routerResult.product });
                    responseData.quickReplies = buildQuickReplies('ask_quantity');
                } else {
                    // לא ברור מה המוצר
                    responseData.content = "בשמחה! מה תרצה להדפיס? (כרטיסים, פליירים, הזמנות...)";
                    responseData.quickReplies = buildQuickReplies('greeting');
                }
                break;

            case 'update': // עדכון כמות/מוצר
                const itemToUpdate = session.cart.length > 0 ? session.cart[session.cart.length - 1] : null;
                if (itemToUpdate && routerResult.qty) {
                    const oldQty = itemToUpdate.qty;
                    const upCalc = calculate_custom_job(session.cart, {
                        product_name: itemToUpdate.product_name, // שומרים על המוצר המקורי אם לא שונה
                        qty: routerResult.qty,
                        paper_type: routerResult.attributes?.paper || itemToUpdate.paper_type
                    });
                    session.cart = upCalc.updatedCart;
                    responseData.content = buildResponse('quote_updated', { item: upCalc.lastAdded, oldQty });
                    responseData.quickReplies = buildQuickReplies('cart_status');
                } else {
                    responseData.content = "לא מצאתי מה לעדכן. מה תרצה להזמין?";
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

            case 'show_menu': // תפריט חכם (Sales Agent)
                // כאן אנחנו מראים את היכולת של איש מכירות!
                // אם הלקוח אמר "חתונה", נציג רק מוצרי חתונה
                const context = routerResult.context || routerResult.category || ''; 
                let menuText = "הנה מה שיש לנו להציע:";
                let relevantProducts = [];

                if (['wedding', 'חתונה', 'אירוע', 'invitation'].some(w => context.includes(w))) {
                    menuText = "🎉 מזל טוב! לחתונה אני ממליץ על:";
                    relevantProducts = ['invitation', 'sticker', 'booklet']; // מוצרים רלוונטיים
                } else if (['business', 'עסק', 'כנס', 'conference'].some(w => context.includes(w))) {
                    menuText = "💼 לעסקים וכנסים הולך חזק:";
                    relevantProducts = ['bc', 'flyer', 'rollup'];
                } else {
                    // תפריט כללי
                    relevantProducts = ['bc', 'flyer', 'invitation', 'rollup'];
                }

                // בניית הכפתורים מהקטלוג האמיתי
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
                
            case 'checkout':
                const total = session.cart.reduce((s, i) => s + i.client_price, 0);
                responseData.content = buildResponse('send_quote', { total, cart: session.cart });
                responseData.quickReplies = buildQuickReplies('send_quote');
                break;

            case 'consult': // שאלות פתוחות -> הולך ל-SmartLLM
            default:
                // כאן אנחנו משתמשים ב-SmartLLM שיודע לענות יפה אבל מפוקח
                const llmResponse = await handleWithSmartLLM(message, session, customer);
                responseData.content = llmResponse.content;
                responseData.quickReplies = llmResponse.quickReplies;
                break;
        }

        // 4. שמירת היסטוריה
        addToHistory(userId, 'user', message);
        addToHistory(userId, 'model', responseData.content);

        // 5. הפקת דשבורד
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

// פונקציית עזר לטיפול בשיחה חכמה (Consult)
async function handleWithSmartLLM(message, session, customer) {
    // משתמשים בלוגיקה הקיימת של smartLLM.js שיש לה כבר הגנות
    const taskType = detectTaskType(message, { hasQuote: session.cart.length > 0 });
    const promptData = buildPrompt(taskType, { 
        userMessage: message, 
        cart: session.cart, 
        customer 
    });

    try {
        const result = await chatModel.generateContent(promptData.system + "\n" + promptData.context);
        let text = result.response.text();
        
        // ולידציה (השוטר) - לוודא שאין הזיות מחיר
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