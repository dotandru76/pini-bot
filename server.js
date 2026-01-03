/**
 * Pini Print Bot - Server V3
 * ===========================
 * ארכיטקטורה: Server-Heavy, LLM-Light
 * + ניהול לקוחות + דשבורד משופר
 * 
 * הזרימה:
 * 1. זיהוי/יצירת לקוח (לפי טלפון)
 * 2. Classifier מזהה כוונה
 * 3. טיפול ישיר או LLM
 * 4. עדכון דשבורד
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ייבוא שירותים קיימים
const { calculate_custom_job } = require('./services/calculation');
const { getSession, removeFromCart, clearCart } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService');

// === ייבוא המנועים החדשים ===
const { classifyMessage, getProductHebrewName } = require('./engine/classifier');
const { buildResponse, buildQuickReplies } = require('./engine/responseBuilder');
const { generateDashboard } = require('./engine/dashboardManager');
const { 
    findOrCreateCustomer, 
    getCustomerByPhone, 
    updateCustomerAfterOrder,
    saveQuoteToCustomer,
    addNoteToCustomer,
    extractPhoneFromText,
    extractNameFromText,
    getCustomerStats,
    searchCustomers
} = require('./engine/customerManager');
const { 
    detectMood, 
    generateSmartRecommendation,
    handlePriceObjection,
    generateEmpatheticResponse 
} = require('./engine/personalityEngine');

dotenv.config();
const app = express();

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static('public'));

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const calculateJobTool = {
    name: "calculate_custom_job",
    description: "Calculate price for print job",
    parameters: {
        type: "OBJECT",
        properties: {
            product_name: { type: "STRING" },
            qty: { type: "NUMBER" },
            paper_type: { type: "STRING" },
            finishing: { type: "STRING" }
        },
        required: ["product_name"]
    }
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ functionDeclarations: [calculateJobTool] }]
});

// === סטטיסטיקות ===
const stats = {
    totalRequests: 0,
    llmCalls: 0,
    directHandled: 0,
    savings: 0
};

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
        
        // === שלב 1: קבלת/יצירת סשן ===
        const session = getSession(userId);
        
        // === שלב 2: זיהוי לקוח ===
        let customer = null;
        
        // אם יש טלפון בבקשה
        if (phone) {
            customer = findOrCreateCustomer(phone, customerName);
            session.customerPhone = phone;
        }
        // אם אין טלפון בסשן, נסה לחלץ מההודעה
        else if (!session.customerPhone) {
            const extractedPhone = extractPhoneFromText(message);
            const extractedName = extractNameFromText(message);
            
            if (extractedPhone) {
                customer = findOrCreateCustomer(extractedPhone, extractedName);
                session.customerPhone = extractedPhone;
                console.log(`   📱 Extracted phone: ${extractedPhone}`);
            }
        }
        // אם יש טלפון בסשן
        else {
            customer = getCustomerByPhone(session.customerPhone);
        }
        
        if (customer) {
            console.log(`   👤 Customer: ${customer.name || 'Anonymous'} (${customer.phone})`);
        }
        
        // === שלב 3: זיהוי מצב רוח ===
        const mood = detectMood(message);
        if (mood !== 'neutral') {
            console.log(`   😊 Mood: ${mood}`);
        }
        
        // === שלב 4: סיווג ההודעה ===
        const classification = classifyMessage(message, { 
            cart: session.cart,
            history: session.history,
            pendingProduct: session.pendingProduct
        });
        
        console.log(`📊 Classification: ${classification.action} (confidence: ${classification.confidence})`);
        console.log(`🤖 Needs LLM: ${classification.needsLLM}`);
        
        let responseData;
        
        // === שלב 5: טיפול לפי סיווג ===
        if (!classification.needsLLM) {
            responseData = await handleDirectly(classification, session, userId, customer, mood);
            stats.directHandled++;
            stats.savings += 0.003;
            console.log(`⚡ Direct handling (no LLM) - saved ~$0.003`);
        } else {
            responseData = await handleWithLLM(message, session, userId, customer, mood);
            stats.llmCalls++;
            console.log(`🤖 Used LLM`);
        }
        
        // === שלב 6: עדכון pending product ===
        if (classification.action === 'quote_incomplete') {
            session.pendingProduct = classification.data.product;
        } else if (['quote', 'update_qty'].includes(classification.action)) {
            session.pendingProduct = null; // איפוס
        }
        
        // === שלב 7: עדכון היסטוריה ===
        session.history.push({ role: 'user', parts: [{ text: message }] });
        session.history.push({ role: 'model', parts: [{ text: responseData.content }] });
        if (session.history.length > 20) session.history = session.history.slice(-20);
        
        // === שלב 8: יצירת דשבורד ===
        const dashboard = generateDashboard(session, session.customerPhone);
        
        // === שלב 9: לוגים ===
        const duration = Date.now() - startTime;
        console.log(`⏱️ Response time: ${duration}ms`);
        console.log(`📈 Stats: ${stats.directHandled}/${stats.totalRequests} direct (${Math.round(stats.directHandled/stats.totalRequests*100)}%)`);
        console.log(`${'='.repeat(60)}\n`);
        
        // === תשובה ===
        res.json({
            content: responseData.content,
            quotes: responseData.quotes || [],
            cart: session.cart,
            quickReplies: responseData.quickReplies || [],
            dashboard: dashboard,
            customer: customer ? {
                name: customer.name,
                phone: customer.phone,
                isVIP: customer.tags?.includes('VIP'),
                totalOrders: customer.stats?.totalOrders || 0
            } : null,
            meta: {
                classification: classification.action,
                confidence: classification.confidence,
                usedLLM: classification.needsLLM,
                responseTime: duration,
                mood
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            content: 'אופס, משהו השתבש. נסה שוב? 🔄'
        });
    }
});

// ============================================================
// DIRECT HANDLING (NO LLM)
// ============================================================
async function handleDirectly(classification, session, userId, customer, mood) {
    const { action, data } = classification;
    
    let content = '';
    let quotes = [];
    let dashboardStats = null;
    let quickReplies = [];
    
    // הכן context לתגובות
    const responseContext = {
        cart: session.cart,
        customer,
        mood,
        userMessage: data.rawText
    };
    
    switch (action) {
        // === ברכה ===
        case 'greeting':
            content = buildResponse('greeting', responseContext);
            quickReplies = buildQuickReplies('greeting');
            break;
            
        // === הצעת מחיר חדשה ===
        case 'quote':
            const calcResult = calculate_custom_job(session.cart, {
                product_name: data.product,
                qty: data.qty,
                paper_type: data.material,
                finishing: data.finishing?.join(', ') || ''
            });
            
            session.cart = calcResult.updatedCart;
            quotes.push(calcResult.lastAdded);
            dashboardStats = calcResult.total_deal_stats;
            
            // המלצה חכמה
            const recommendation = generateSmartRecommendation(
                data.product, 
                data.qty, 
                { 
                    customer, 
                    cart: session.cart,
                    margin: calcResult.lastAdded?.margin
                }
            );
            
            content = buildResponse('quote_added', { 
                item: calcResult.lastAdded,
                recommendation
            });
            quickReplies = buildQuickReplies('quote_added');
            break;
            
        // === הצעה לא מלאה (חסר כמות) ===
        case 'quote_incomplete':
            content = buildResponse('ask_quantity', { product: data.product });
            quickReplies = buildQuickReplies('ask_quantity');
            break;
            
        // === עדכון כמות ===
        case 'update_qty':
            const productToUpdate = data.product;
            const existingItem = session.cart.find(item => 
                item.product_name.includes(productToUpdate) ||
                item.product_category === productToUpdate
            ) || session.cart[session.cart.length - 1];
            
            if (existingItem) {
                const oldQty = existingItem.qty;
                const updateResult = calculate_custom_job(session.cart, {
                    product_name: existingItem.product_name,
                    qty: data.qty,
                    paper_type: existingItem.paper_type
                });
                
                session.cart = updateResult.updatedCart;
                quotes.push(updateResult.lastAdded);
                dashboardStats = updateResult.total_deal_stats;
                
                // המלצה על הגדלת כמות?
                const qtyRecommendation = generateSmartRecommendation(
                    existingItem.product_category,
                    data.qty,
                    { customer, cart: session.cart }
                );
                
                content = buildResponse('quote_updated', { 
                    item: updateResult.lastAdded, 
                    oldQty,
                    recommendation: qtyRecommendation
                });
            } else {
                content = 'לא מצאתי פריט לעדכון. מה תרצה לשנות?';
            }
            break;
            
        // === הסרת פריט ===
        case 'remove':
            if (data.product) {
                const success = removeFromCart(userId, data.product);
                content = success 
                    ? buildResponse('item_removed', { productName: data.product })
                    : buildResponse('item_not_found', { productName: data.product, cart: session.cart });
            } else {
                content = `איזה פריט להסיר?\n${session.cart.map((i, idx) => `${idx + 1}. ${i.product_name}`).join('\n')}`;
            }
            break;
            
        // === ניקוי עגלה ===
        case 'clear':
            clearCart(userId);
            content = buildResponse('cart_cleared');
            dashboardStats = { totalPrice: 0, totalCost: 0 };
            break;
            
        // === סטטוס עגלה ===
        case 'status':
            content = buildResponse('cart_status', responseContext);
            quickReplies = buildQuickReplies('cart_status');
            break;
            
        // === בדיקת עיצוב ===
        case 'design_check':
            content = buildResponse('design_check', responseContext);
            quickReplies = buildQuickReplies('design_check');
            break;
            
        // === שליחת הצעה ===
        case 'send_quote':
            if (session.cart.length === 0) {
                content = 'אין פריטים בעגלה עדיין 😅\n\nמה תרצה להוסיף?';
            } else {
                const total = session.cart.reduce((sum, i) => sum + i.client_price, 0);
                
                // שמור הצעה ללקוח
                if (customer) {
                    saveQuoteToCustomer(customer.phone, session.cart, total);
                }
                
                content = buildResponse('send_quote', { cart: session.cart, total });
            }
            break;
            
        default:
            content = 'איך אפשר לעזור?';
    }
    
    return {
        content,
        quotes,
        cart: session.cart,
        dashboard: dashboardStats,
        quickReplies
    };
}

// ============================================================
// LLM HANDLING (ONLY WHEN NEEDED)
// ============================================================
async function handleWithLLM(message, session, userId, customer, mood) {
    // פרומפט ממוקד לפי סוג השאלה
    const focusedPrompt = getFocusedPrompt(message, session, customer);
    
    console.log(`   📝 Using ${focusedPrompt.category} prompt`);
    
    const chat = model.startChat({
        history: [
            { role: "user", parts: [{ text: focusedPrompt.prompt }] },
            { role: "model", parts: [{ text: "מובן!" }] },
            ...session.history.slice(-4)
        ]
    });
    
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const functionCalls = response.functionCalls();
    
    let content = "";
    let quotes = [];
    let dashboardStats = null;
    
    if (functionCalls && functionCalls.length > 0) {
        const functionResponses = [];
        
        for (const call of functionCalls) {
            if (call.name === 'calculate_custom_job') {
                const calcResult = calculate_custom_job(session.cart, call.args);
                session.cart = calcResult.updatedCart;
                quotes.push(calcResult.lastAdded);
                dashboardStats = calcResult.total_deal_stats;
                
                functionResponses.push({
                    functionResponse: {
                        name: 'calculate_custom_job',
                        response: {
                            success: true,
                            price: calcResult.lastAdded.client_price,
                            message: `מחיר: ₪${calcResult.lastAdded.client_price}`
                        }
                    }
                });
            }
        }
        
        try {
            const finalStep = await chat.sendMessage(functionResponses);
            content = finalStep.response.text();
        } catch (e) {
            content = "הפעולה בוצעה בהצלחה!";
        }
    } else {
        content = response.text();
    }
    
    return {
        content,
        quotes,
        cart: session.cart,
        dashboard: dashboardStats,
        promptCategory: focusedPrompt.category
    };
}

// ============================================================
// FOCUSED PROMPT GENERATOR
// ============================================================
function getFocusedPrompt(message, session, customer) {
    const text = message.toLowerCase();
    let category = 'general';
    let prompt = '';
    
    // זיהוי קטגוריה
    if (/הבדל|כרומו|מט|מבריק|למינציה|נייר|חומר|גרם/.test(text)) {
        category = 'material';
        prompt = `מומחה חומרי דפוס. ענה קצר:
- כרומו: מבריק, צבעים חזקים
- מט: לא מבריק, אלגנטי
- למינציה מט: מגן+מט, יוקרתי
- למינציה מבריקה: מגן+ברק
- 300 גרם: עבה, כרטיסים
- 135 גרם: דק, פליירים`;
    } 
    else if (/זמן|אספקה|מתי|דחוף|מהיר|ימים/.test(text)) {
        category = 'delivery';
        prompt = `זמני אספקה בדפוס בית יצחק:
- רגיל: 5-7 ימי עסקים
- מהיר: 3 ימים (+30%)
- אקספרס: 24 שעות (+50%)
ענה קצר.`;
    }
    else if (/קובץ|פורמט|dpi|pdf|רזולוציה|שולח/.test(text)) {
        category = 'files';
        prompt = `דרישות קבצים להדפסה:
- PDF מועדף, גם AI/EPS
- 300 DPI מינימום
- CMYK (לא RGB)
- 3mm בליד
ענה קצר.`;
    }
    else if (/יקר|מחיר|הנחה|זול|עלות/.test(text)) {
        category = 'pricing';
        prompt = `נציג דפוס. מחיר תלוי בכמות, חומר וגימור. אל תמציא מספרים.`;
    }
    else {
        category = 'chitchat';
        prompt = `פיני מדפוס בית יצחק. ידידותי וקצר. הפנה לנושא הדפוס.`;
    }
    
    // הוסף context לקוח אם יש
    if (customer) {
        prompt += `\nלקוח: ${customer.name || 'אנונימי'}`;
        if (customer.stats?.totalOrders > 0) {
            prompt += ` (לקוח חוזר, ${customer.stats.totalOrders} הזמנות)`;
        }
    }
    
    // הוסף עגלה אם רלוונטי
    if (session.cart?.length > 0 && ['pricing', 'general'].includes(category)) {
        prompt += `\nעגלה: ${session.cart.map(i => i.product_name).join(', ')}`;
    }
    
    return { prompt, category };
}

// ============================================================
// CUSTOMER ENDPOINTS
// ============================================================

// חיפוש לקוח
app.get('/api/customers/search', (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    
    const results = searchCustomers(q);
    res.json(results);
});

// פרטי לקוח
app.get('/api/customers/:phone', (req, res) => {
    const customer = getCustomerByPhone(req.params.phone);
    if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
});

// הוספת הערה ללקוח
app.post('/api/customers/:phone/notes', (req, res) => {
    const { note, author } = req.body;
    const customer = addNoteToCustomer(req.params.phone, note, author);
    if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ success: true });
});

// סטטיסטיקות לקוחות
app.get('/api/customers-stats', (req, res) => {
    res.json(getCustomerStats());
});

// ============================================================
// OTHER ENDPOINTS
// ============================================================

// Stats
app.get('/api/stats', (req, res) => {
    res.json({
        ...stats,
        directRate: Math.round(stats.directHandled / stats.totalRequests * 100) || 0,
        llmRate: Math.round(stats.llmCalls / stats.totalRequests * 100) || 0,
        customers: getCustomerStats()
    });
});

// Health
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        version: '3.0',
        architecture: 'Server-Heavy, LLM-Light + Customer Management',
        stats: {
            requests: stats.totalRequests,
            directHandled: stats.directHandled,
            savings: `~$${stats.savings.toFixed(3)}`
        }
    });
});

// PDF Generation
app.post('/api/pdf', async (req, res) => {
    try {
        const { cart, customer } = req.body;
        if (!cart || cart.length === 0) {
            return res.status(400).send("Empty cart");
        }
        
        const pdfBuffer = await generateQuotePDF(cart, customer || { name: "לקוח" });
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'attachment; filename=quote.pdf'
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error("❌ PDF Error:", error);
        res.status(500).send("Error generating PDF");
    }
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Pini Print Server V3.0`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🏗️ Architecture: Server-Heavy, LLM-Light`);
    console.log(`👥 Customer Management: Enabled`);
    console.log(`📊 Dashboard: Enhanced`);
    console.log(`${'='.repeat(60)}\n`);
});
