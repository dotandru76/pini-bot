/**
 * Pini Print Bot - Server V2
 * ===========================
 * ארכיטקטורה חדשה: Server-Heavy, LLM-Light
 * 
 * הזרימה:
 * 1. הודעה נכנסת → Classifier מזהה כוונה
 * 2. אם הכוונה ברורה → Server מטפל ישירות (ללא LLM)
 * 3. אם צריך → קריאה ל-LLM עם prompt מינימלי
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ייבוא המנועים
const { calculate_custom_job } = require('./services/calculation');
const { getSession, removeFromCart, clearCart, generateSystemPrompt } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService');

// === חדש: ייבוא ה-Classifier וה-Response Builder ===
const { classifyMessage, getProductHebrewName } = require('./engine/classifier');
const { buildResponse, buildQuickReplies } = require('./engine/responseBuilder');

dotenv.config();
const app = express();

// CORS
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// === כלים ל-Gemini (לשימוש רק כשצריך) ===
const calculateJobTool = {
    name: "calculate_custom_job",
    description: "Calculate price for print job",
    parameters: {
        type: "OBJECT",
        properties: {
            product_name: { type: "STRING", description: "Product type" },
            qty: { type: "NUMBER", description: "Quantity" },
            paper_type: { type: "STRING", description: "Material" },
            finishing: { type: "STRING", description: "Finishing" }
        },
        required: ["product_name"]
    }
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ functionDeclarations: [calculateJobTool] }]
});

// === סטטיסטיקות לניטור ===
const stats = {
    totalRequests: 0,
    llmCalls: 0,
    directHandled: 0,
    savings: 0 // חיסכון משוער ב-$
};

// === Main Chat Endpoint ===
app.post('/api/chat', async (req, res) => {
    const startTime = Date.now();
    stats.totalRequests++;
    
    try {
        const { message, userId } = req.body;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`💬 [Request #${stats.totalRequests}] User: "${message}"`);
        
        const session = getSession(userId);
        
        // === שלב 1: סיווג ההודעה ===
        const classification = classifyMessage(message, { 
            cart: session.cart,
            history: session.history 
        });
        
        console.log(`📊 Classification: ${classification.action} (confidence: ${classification.confidence})`);
        console.log(`🤖 Needs LLM: ${classification.needsLLM}`);
        
        let responseData;
        
        // === שלב 2: טיפול לפי סיווג ===
        if (!classification.needsLLM) {
            // 🚀 נתיב מהיר - ללא LLM
            responseData = await handleDirectly(classification, session, userId);
            stats.directHandled++;
            stats.savings += 0.003; // חיסכון משוער לבקשה
            console.log(`⚡ Direct handling (no LLM) - saved ~$0.003`);
        } else {
            // 🤖 נתיב LLM - רק כשצריך
            responseData = await handleWithLLM(message, session, userId);
            stats.llmCalls++;
            console.log(`🤖 Used LLM`);
        }
        
        // === שלב 3: עדכון היסטוריה ===
        session.history.push({ role: 'user', parts: [{ text: message }] });
        session.history.push({ role: 'model', parts: [{ text: responseData.content }] });
        if (session.history.length > 20) session.history = session.history.slice(-20);
        
        // === שלב 4: לוגים וסטטיסטיקות ===
        const duration = Date.now() - startTime;
        console.log(`⏱️ Response time: ${duration}ms`);
        console.log(`📈 Stats: ${stats.directHandled}/${stats.totalRequests} direct (${Math.round(stats.directHandled/stats.totalRequests*100)}%), saved ~$${stats.savings.toFixed(3)}`);
        console.log(`${'='.repeat(60)}\n`);
        
        // הוסף מידע על הטיפול לתשובה
        responseData.meta = {
            handledBy: classification.needsLLM ? 'llm' : 'direct',
            classification: classification.action,
            confidence: classification.confidence,
            responseTime: duration
        };
        
        res.json(responseData);
        
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ 
            error: "Internal Server Error",
            content: buildResponse('error', {})
        });
    }
});

// === טיפול ישיר (ללא LLM) ===
async function handleDirectly(classification, session, userId) {
    const { action, data } = classification;
    
    let content = "";
    let quotes = [];
    let dashboardStats = null;
    let quickReplies = [];
    
    switch (action) {
        // === הצעת מחיר חדשה ===
        case 'quote':
            const calcResult = calculate_custom_job(session.cart, {
                product_name: getProductHebrewName(data.product),
                qty: data.qty,
                paper_type: data.material,
                finishing: data.finishing?.join(', ')
            });
            
            session.cart = calcResult.updatedCart;
            quotes.push(calcResult.lastAdded);
            dashboardStats = calcResult.total_deal_stats;
            
            content = buildResponse('quote_added', { item: calcResult.lastAdded });
            break;
            
        // === עדכון כמות ===
        case 'update_qty':
            const existingItem = session.cart.find(item => 
                item.product_name.toLowerCase().includes(data.product?.toLowerCase() || '')
            );
            
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
                
                content = buildResponse('quote_updated', { 
                    item: updateResult.lastAdded, 
                    oldQty 
                });
            } else {
                content = `לא מצאתי פריט לעדכון. מה תרצה לשנות?`;
            }
            break;
            
        // === הסרת פריט ===
        case 'remove':
            if (data.product) {
                const success = removeFromCart(userId, data.product);
                content = success 
                    ? buildResponse('item_removed', { productName: data.product })
                    : buildResponse('item_not_found', { productName: data.product });
            } else {
                content = `איזה פריט להסיר? ` + session.cart.map(i => i.product_name).join(', ');
            }
            
            // עדכון סטטיסטיקות
            if (session.cart.length > 0) {
                dashboardStats = session.cart.reduce((acc, item) => {
                    acc.totalPrice = (acc.totalPrice || 0) + item.client_price;
                    acc.totalCost = (acc.totalCost || 0) + (item.cost || 0);
                    return acc;
                }, {});
            }
            break;
            
        // === ניקוי עגלה ===
        case 'clear':
            clearCart(userId);
            content = buildResponse('cart_cleared', {});
            dashboardStats = { totalPrice: 0, totalCost: 0 };
            break;
            
        // === סטטוס עגלה ===
        case 'status':
            const cartStats = session.cart.reduce((acc, item) => {
                acc.totalPrice = (acc.totalPrice || 0) + item.client_price;
                return acc;
            }, { totalPrice: 0 });
            
            content = buildResponse('cart_status', { 
                cart: session.cart, 
                stats: cartStats 
            });
            dashboardStats = cartStats;
            break;
            
        // === חסר כמות ===
        case 'quote_incomplete':
            if (data.missing === 'qty') {
                content = buildResponse('missing_quantity', { product: data.product });
                quickReplies = buildQuickReplies('quantity_options');
            }
            break;
            
        // === שאלת עיצוב ===
        case 'design_check':
            content = buildResponse('design_question', {});
            quickReplies = buildQuickReplies('design_options');
            break;
            
        default:
            // Fallback - לא אמור לקרות
            content = "איך אפשר לעזור?";
    }
    
    return {
        content,
        quotes,
        cart: session.cart,
        dashboard: dashboardStats,
        quickReplies
    };
}

// === טיפול עם LLM (רק כשצריך) ===
async function handleWithLLM(message, session, userId) {
    // Prompt מינימלי יותר
    const minimalPrompt = generateMinimalPrompt(session);
    
    const chat = model.startChat({
        history: [
            { role: "user", parts: [{ text: minimalPrompt }] },
            { role: "model", parts: [{ text: "מובן! אני פיני מדפוס בית יצחק. איך אוכל לעזור?" }] },
            ...session.history.slice(-6) // רק 6 הודעות אחרונות
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
        dashboard: dashboardStats
    };
}

// === Prompt מינימלי ===
function generateMinimalPrompt(session) {
    // סיכום עגלה קצר
    const cartSummary = session.cart.length > 0
        ? session.cart.map(i => `${i.product_name}:${i.qty}→₪${i.client_price}`).join(' | ')
        : 'ריקה';
    
    return `אתה פיני, נציג דפוס בית יצחק. עברית בלבד. קצר וענייני.

עגלה: [${cartSummary}]

כללים:
- לתמחור: קרא ל-calculate_custom_job
- אל תמציא מחירים
- תשובות קצרות`;
}

// === Stats Endpoint ===
app.get('/api/stats', (req, res) => {
    res.json({
        ...stats,
        directRate: Math.round(stats.directHandled / stats.totalRequests * 100) || 0,
        llmRate: Math.round(stats.llmCalls / stats.totalRequests * 100) || 0
    });
});

// === Health Check ===
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        version: '2.0',
        architecture: 'Server-Heavy, LLM-Light',
        stats: {
            requests: stats.totalRequests,
            directHandled: stats.directHandled,
            savings: `~$${stats.savings.toFixed(3)}`
        }
    });
});

// === PDF Endpoint ===
app.post('/api/pdf', async (req, res) => {
    try {
        const cart = req.body;
        if (!cart || cart.length === 0) return res.status(400).send("Empty cart");
        const pdfBuffer = await generateQuotePDF(cart, { name: "לקוח" });
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'attachment; filename=quote.pdf'
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error("❌ PDF Gen Error:", error);
        res.status(500).send("Error generating PDF");
    }
});

// === Start Server ===
const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Pini Print Server V2.0`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🏗️ Architecture: Server-Heavy, LLM-Light`);
    console.log(`${'='.repeat(60)}\n`);
});
