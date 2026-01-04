/**
 * Pini Print Bot - Server V3.8
 * ===========================
 * ארכיטקטורה: Server-Heavy, LLM-Light
 * כולל תיקון לקריסות סשן
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ייבוא שירותים
const { calculate_custom_job } = require('./services/calculation');
const { getSession, removeFromCart, clearCart, generateSystemPrompt } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService');

// ייבוא מנועים
const { classifyMessage } = require('./engine/classifier');
const { buildResponse, buildQuickReplies } = require('./engine/responseBuilder');
const { generateDashboard } = require('./engine/dashboardManager');
const { 
    findOrCreateCustomer, 
    getCustomerByPhone, 
    saveQuoteToCustomer,
    extractPhoneFromText,
    extractNameFromText,
    getCustomerStats,
    searchCustomers
} = require('./engine/customerManager');
const { detectMood, generateSmartRecommendation } = require('./engine/personalityEngine');

dotenv.config();
const app = express();

// CORS & Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// סטטיסטיקות
const stats = { totalRequests: 0, llmCalls: 0, directHandled: 0, savings: 0 };

// ============================================================
// MAIN CHAT ENDPOINT
// ============================================================
app.post('/api/chat', async (req, res) => {
    const startTime = Date.now();
    stats.totalRequests++;
    
    try {
        const { message, userId, phone, customerName } = req.body;
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`💬 [Request #${stats.totalRequests}] User: "${message}"`);
        
        // 1. ניהול סשן (כולל תיקון היסטוריה)
        const session = getSession(userId);
        if (!session.history) session.history = []; // הגנה כפולה
        
        // 2. זיהוי לקוח
        let customer = null;
        if (phone) {
            customer = findOrCreateCustomer(phone, customerName);
            session.customerPhone = phone;
        } else if (session.customerPhone) {
            customer = getCustomerByPhone(session.customerPhone);
        } else {
            // נסיון חילוץ מהטקסט
            const extractedPhone = extractPhoneFromText(message);
            if (extractedPhone) {
                customer = findOrCreateCustomer(extractedPhone, extractNameFromText(message));
                session.customerPhone = extractedPhone;
                console.log(`   📱 Phone extracted: ${extractedPhone}`);
            }
        }

        // 3. זיהוי מצב רוח וסיווג
        const mood = detectMood(message);
        const classification = classifyMessage(message, { 
            cart: session.cart,
            pendingProduct: session.pendingProduct
        });
        
        console.log(`📊 Class: ${classification.action} | LLM: ${classification.needsLLM}`);
        
        // 4. טיפול בבקשה
        let responseData;
        
        if (!classification.needsLLM) {
            // טיפול ישיר בשרת
            responseData = await handleDirectly(classification, session, userId, customer, mood);
            stats.directHandled++;
            stats.savings += 0.003;
            console.log(`⚡ Direct handling`);
        } else {
            // העברה ל-LLM (כולל ידע עסקי)
            responseData = await handleWithLLM(message, session, userId, customer);
            stats.llmCalls++;
            console.log(`🤖 LLM handling`);
        }
        
        // 5. עדכון היסטוריה (כאן הייתה הקריסה)
        if (session.history) {
            session.history.push({ role: 'user', parts: [{ text: message }] });
            session.history.push({ role: 'model', parts: [{ text: responseData.content }] });
            if (session.history.length > 20) session.history = session.history.slice(-20);
        }

        // 6. יצירת דשבורד
        const dashboard = generateDashboard(session, session.customerPhone);
        
        // סיום
        const duration = Date.now() - startTime;
        console.log(`⏱️ ${duration}ms`);
        console.log(`${'='.repeat(60)}\n`);
        
        res.json({
            content: responseData.content,
            cart: session.cart,
            dashboard: dashboard,
            quickReplies: responseData.quickReplies || [],
            meta: {
                classification: classification.action,
                mood
            }
        });
        
    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({ error: 'Internal error', content: 'אופס, קרתה תקלה רגעית. נסה שוב.' });
    }
});

// ============================================================
// DIRECT HANDLER
// ============================================================
async function handleDirectly(classification, session, userId, customer, mood) {
    const { action, data } = classification;
    let content = '';
    let quickReplies = [];
    
    const ctx = { cart: session.cart, customer, mood };

    switch (action) {
        case 'greeting':
            content = buildResponse('greeting', ctx);
            quickReplies = buildQuickReplies('greeting');
            break;
            
        case 'quote':
            // חישוב מחיר
            const calc = calculate_custom_job(session.cart, {
                product_name: data.product,
                qty: data.qty,
                paper_type: data.material,
                finishing: data.finishing?.join(',')
            });
            session.cart = calc.updatedCart;
            
            // המלצה
            const rec = generateSmartRecommendation(data.product, data.qty, { customer, cart: session.cart });
            
            content = buildResponse('quote_added', { item: calc.lastAdded, recommendation: rec });
            quickReplies = buildQuickReplies('quote_added');
            break;
            
        case 'update_qty':
            // לוגיקה לעדכון כמות...
            const itemToUpdate = session.cart.find(i => i.product_name === data.product) || session.cart[session.cart.length-1];
            if (itemToUpdate) {
                const oldQty = itemToUpdate.qty;
                const upCalc = calculate_custom_job(session.cart, {
                    product_name: itemToUpdate.product_name,
                    qty: data.qty,
                    paper_type: itemToUpdate.paper_type // שומר על הנייר המקורי
                });
                session.cart = upCalc.updatedCart;
                content = buildResponse('quote_updated', { item: upCalc.lastAdded, oldQty });
            } else {
                content = "לא מצאתי את הפריט לעדכון.";
            }
            quickReplies = buildQuickReplies('cart_status');
            break;
            
        case 'remove':
            const removed = removeFromCart(userId, data.product);
            content = removed ? buildResponse('item_removed', { productName: data.product }) : "לא מצאתי את הפריט למחיקה.";
            break;
            
        case 'clear':
            clearCart(userId);
            content = buildResponse('cart_cleared');
            break;
            
        case 'status':
            content = buildResponse('cart_status', ctx);
            quickReplies = buildQuickReplies('cart_status');
            break;
            
        case 'send_quote':
            content = buildResponse('send_quote', { cart: session.cart, total: session.cart.reduce((s, i) => s + i.client_price, 0) });
            break;
            
        case 'quote_incomplete':
            content = buildResponse('ask_quantity', { product: data.product });
            quickReplies = buildQuickReplies('ask_quantity');
            break;
            
        case 'design_check':
            content = buildResponse('design_check');
            quickReplies = buildQuickReplies('design_check');
            break;
            
        default:
            content = "לא הבנתי בדיוק, אפשר לנסח שוב?";
    }
    
    return { content, quickReplies };
}

// ============================================================
// LLM HANDLER
// ============================================================
async function handleWithLLM(message, session, userId, customer) {
    const systemPrompt = generateSystemPrompt(userId); // שימוש בפרומפט החכם החדש
    
    const chat = model.startChat({
        history: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "הבנתי. אני פיני, הבוט של דפוס בית יצחק. אעזור ללקוח." }] },
            ...session.history.slice(-6) // הקשר אחרון
        ]
    });
    
    try {
        const result = await chat.sendMessage(message);
        const responseText = result.response.text();
        
        // בניית תשובה מסודרת דרך ה-Builder
        const finalContent = buildResponse('chat', { llmResponse: responseText });
        const quickReplies = buildQuickReplies('chat'); // כפתורי ניווט כלליים
        
        return { content: responseText, quickReplies };
    } catch (e) {
        console.error("LLM Error:", e);
        return { content: "יש לי קצת עומס כרגע, נסה שוב עוד רגע. 😅" };
    }
}

// ============================================================
// API ROUTES
// ============================================================
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '3.8' }));

// PDF
app.post('/api/pdf', async (req, res) => {
    try {
        const pdf = await generateQuotePDF(req.body.cart, req.body.customer || { name: 'לקוח' });
        res.set({ 'Content-Type': 'application/pdf' });
        res.send(pdf);
    } catch (e) {
        res.status(500).send('Error');
    }
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));