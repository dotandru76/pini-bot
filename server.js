/**
 * Pini Print Bot - Server V3.9
 * ===========================
 * ארכיטקטורה: Server-Heavy, LLM-Light
 * תיקונים:
 * - באג היסטוריה ל-Gemini API
 * - טיפול משופר בשגיאות LLM
 * - ולידציה של מבנה ההיסטוריה
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
// HELPER: וולידציה ותיקון היסטוריה
// ============================================================
function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];
    
    return history.filter(item => {
        // בדיקה שיש role תקין
        if (!item || !item.role || !['user', 'model'].includes(item.role)) {
            return false;
        }
        // בדיקה שיש parts תקין
        if (!item.parts || !Array.isArray(item.parts) || item.parts.length === 0) {
            return false;
        }
        // בדיקה שכל part הוא אובייקט עם text
        return item.parts.every(part => 
            part && typeof part === 'object' && typeof part.text === 'string' && part.text.length > 0
        );
    });
}

function createHistoryEntry(role, text) {
    // יוצר entry תקין להיסטוריה
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return null;
    }
    return {
        role: role,
        parts: [{ text: text.trim() }]
    };
}

// ============================================================
// MAIN CHAT ENDPOINT
// ============================================================
app.post('/api/chat', async (req, res) => {
    const startTime = Date.now();
    stats.totalRequests++;
    
    try {
        const { message, userId, phone, customerName } = req.body;
        
        // ולידציה בסיסית
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Missing message', content: 'לא קיבלתי הודעה 🤔' });
        }
        
        const cleanMessage = message.trim();
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`💬 [Request #${stats.totalRequests}] User: "${cleanMessage}"`);
        
        // 1. ניהול סשן
        const session = getSession(userId);
        if (!session.history) session.history = [];
        
        // ניקוי היסטוריה פגומה (אם יש)
        session.history = sanitizeHistory(session.history);
        
        // 2. זיהוי לקוח
        let customer = null;
        if (phone) {
            customer = findOrCreateCustomer(phone, customerName);
            session.customerPhone = phone;
        } else if (session.customerPhone) {
            customer = getCustomerByPhone(session.customerPhone);
        } else {
            const extractedPhone = extractPhoneFromText(cleanMessage);
            if (extractedPhone) {
                customer = findOrCreateCustomer(extractedPhone, extractNameFromText(cleanMessage));
                session.customerPhone = extractedPhone;
                console.log(`   📱 Phone extracted: ${extractedPhone}`);
            }
        }

        // 3. זיהוי מצב רוח וסיווג
        const mood = detectMood(cleanMessage);
        const classification = classifyMessage(cleanMessage, { 
            cart: session.cart,
            pendingProduct: session.pendingProduct
        });
        
        console.log(`📊 Class: ${classification.action} | LLM: ${classification.needsLLM}`);
        
        // 4. טיפול בבקשה
        let responseData;
        
        if (!classification.needsLLM) {
            responseData = await handleDirectly(classification, session, userId, customer, mood);
            stats.directHandled++;
            stats.savings += 0.003;
            console.log(`⚡ Direct handling`);
        } else {
            responseData = await handleWithLLM(cleanMessage, session, userId, customer);
            stats.llmCalls++;
            console.log(`🤖 LLM handling`);
        }
        
        // 5. עדכון היסטוריה (רק אם יש תוכן תקין)
        const userEntry = createHistoryEntry('user', cleanMessage);
        const modelEntry = createHistoryEntry('model', responseData.content);
        
        if (userEntry && modelEntry) {
            session.history.push(userEntry);
            session.history.push(modelEntry);
            
            // שמירה על מקסימום 20 הודעות
            if (session.history.length > 20) {
                session.history = session.history.slice(-20);
            }
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
                mood,
                duration
            }
        });
        
    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({ 
            error: 'Internal error', 
            content: 'אופס, קרתה תקלה רגעית. נסה שוב! 🔄' 
        });
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
            const calc = calculate_custom_job(session.cart, {
                product_name: data.product,
                qty: data.qty,
                paper_type: data.material,
                finishing: data.finishing?.join(',')
            });
            session.cart = calc.updatedCart;
            
            const rec = generateSmartRecommendation(data.product, data.qty, { customer, cart: session.cart });
            
            content = buildResponse('quote_added', { item: calc.lastAdded, recommendation: rec });
            quickReplies = buildQuickReplies('quote_added');
            break;
            
        case 'update_qty':
            const itemToUpdate = session.cart.find(i => i.product_name === data.product) || session.cart[session.cart.length-1];
            if (itemToUpdate) {
                const oldQty = itemToUpdate.qty;
                const upCalc = calculate_custom_job(session.cart, {
                    product_name: itemToUpdate.product_name,
                    qty: data.qty,
                    paper_type: itemToUpdate.paper_type
                });
                session.cart = upCalc.updatedCart;
                content = buildResponse('quote_updated', { item: upCalc.lastAdded, oldQty });
            } else {
                content = "לא מצאתי את הפריט לעדכון. מה תרצה לשנות?";
            }
            quickReplies = buildQuickReplies('cart_status');
            break;
            
        case 'remove':
            const removed = removeFromCart(userId, data.product);
            content = removed 
                ? buildResponse('item_removed', { productName: data.product }) 
                : "לא מצאתי את הפריט למחיקה. תבדוק מה יש בעגלה?";
            quickReplies = buildQuickReplies('cart_status');
            break;
            
        case 'clear':
            clearCart(userId);
            content = buildResponse('cart_cleared');
            quickReplies = buildQuickReplies('greeting');
            break;
            
        case 'status':
            content = buildResponse('cart_status', ctx);
            quickReplies = buildQuickReplies('cart_status');
            break;
            
        case 'send_quote':
            const total = session.cart.reduce((s, i) => s + (i.client_price || 0), 0);
            content = buildResponse('send_quote', { cart: session.cart, total });
            quickReplies = buildQuickReplies('send_quote');
            break;
            
        case 'quote_incomplete':
            // שמירת המוצר הממתין
            session.pendingProduct = data.product;
            content = buildResponse('ask_quantity', { product: data.product });
            quickReplies = buildQuickReplies('ask_quantity');
            break;
            
        case 'design_check':
            content = buildResponse('design_check');
            quickReplies = buildQuickReplies('design_check');
            break;
        
        case 'catalog':
            content = buildResponse('catalog', ctx);
            quickReplies = []; // לא צריך כפתורים - הלקוח יכתוב מה הוא רוצה
            break;
        
        case 'faq':
            content = buildResponse('faq', ctx);
            quickReplies = buildQuickReplies('faq');
            break;
        
        case 'contact':
            content = buildResponse('contact', ctx);
            quickReplies = buildQuickReplies('greeting');
            break;
        
        case 'order_status':
            content = buildResponse('order_status', ctx);
            quickReplies = buildQuickReplies('greeting');
            break;
            
        default:
            content = "לא הבנתי בדיוק, אפשר לנסח אחרת? 🤔";
            quickReplies = buildQuickReplies('greeting');
    }
    
    return { content, quickReplies };
}

// ============================================================
// LLM HANDLER (עם טיפול משופר בשגיאות)
// ============================================================
async function handleWithLLM(message, session, userId, customer) {
    // בניית system prompt
    let systemPrompt;
    try {
        systemPrompt = generateSystemPrompt(userId);
    } catch (e) {
        systemPrompt = getDefaultSystemPrompt();
    }
    
    // ניקוי היסטוריה לפני שליחה ל-API
    const cleanHistory = sanitizeHistory(session.history);
    
    // בניית היסטוריה ל-Gemini
    const chatHistory = [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "הבנתי! אני פיני, הבוט של דפוס בית יצחק. אשמח לעזור ללקוחות שלנו. 😊" }] },
        ...cleanHistory.slice(-6) // רק 6 הודעות אחרונות
    ];
    
    try {
        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(message);
        const responseText = result.response.text();
        
        if (!responseText || responseText.trim().length === 0) {
            throw new Error('Empty response from LLM');
        }
        
        const quickReplies = buildQuickReplies('chat');
        return { content: responseText.trim(), quickReplies };
        
    } catch (e) {
        console.error("LLM Error:", e.message || e);
        
        // תשובה חלופית חכמה
        const fallbackResponse = generateFallbackResponse(message);
        return { 
            content: fallbackResponse, 
            quickReplies: buildQuickReplies('greeting') 
        };
    }
}

// תשובה חלופית כשה-LLM נכשל
function generateFallbackResponse(message) {
    const lowerMsg = message.toLowerCase();
    
    // זיהוי בסיסי של כוונה
    if (lowerMsg.includes('מחיר') || lowerMsg.includes('עולה')) {
        return "אשמח לתת לך הצעת מחיר! ספר לי מה תרצה להדפיס וכמה עותקים. 📋";
    }
    if (lowerMsg.includes('שאל') || lowerMsg.includes('שאלה')) {
        return "בטח! שאל אותי מה שתרצה על שירותי הדפוס שלנו. 💬";
    }
    if (lowerMsg.includes('עזר') || lowerMsg.includes('עזרה')) {
        return "אני כאן לעזור! אפשר להזמין פליירים, כרטיסי ביקור, רולאפים, הזמנות ועוד. במה להתחיל?";
    }
    if (lowerMsg.includes('קטלוג') || lowerMsg.includes('מוצר')) {
        return "יש לנו מגוון רחב: פליירים, כרטיסי ביקור, הזמנות לאירועים, רולאפים, מדבקות, חוברות ועוד! מה מעניין אותך?";
    }
    
    // ברירת מחדל
    return "אני פיני מדפוס בית יצחק! 🖨️ איך אפשר לעזור לך היום? אפשר להזמין הדפסות, לקבל הצעת מחיר או לשאול שאלות.";
}

// System prompt ברירת מחדל
function getDefaultSystemPrompt() {
    return `אתה פיני, נציג שירות לקוחות של דפוס בית יצחק.
תפקידך: לעזור ללקוחות להזמין הדפסות ולקבל הצעות מחיר.
סגנון: ידידותי, מקצועי, ישראלי. תשובות קצרות וברורות.
מוצרים: פליירים, כרטיסי ביקור, הזמנות, רולאפים, מדבקות, חוברות, פוסטרים.
חשוב: אל תמציא מחירים! תמיד תבקש פרטים (כמות, גודל, סוג נייר) לפני הצעת מחיר.`;
}

// ============================================================
// API ROUTES
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        version: '3.9',
        stats: {
            totalRequests: stats.totalRequests,
            directHandled: stats.directHandled,
            llmCalls: stats.llmCalls,
            directRate: stats.totalRequests > 0 
                ? Math.round((stats.directHandled / stats.totalRequests) * 100) + '%'
                : '0%'
        }
    });
});

// PDF Generation
app.post('/api/pdf', async (req, res) => {
    try {
        const { cart, customer } = req.body;
        
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ error: 'Empty cart' });
        }
        
        const pdf = await generateQuotePDF(cart, customer || { name: 'לקוח' });
        res.set({ 
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="Pini_Quote.pdf"'
        });
        res.send(pdf);
    } catch (e) {
        console.error('PDF Error:', e);
        res.status(500).json({ error: 'PDF generation failed' });
    }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
    res.json({
        ...stats,
        directRate: stats.totalRequests > 0 
            ? ((stats.directHandled / stats.totalRequests) * 100).toFixed(1) + '%'
            : '0%',
        estimatedSavings: `$${stats.savings.toFixed(2)}`
    });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Pini Bot Server V3.9`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Mode: Server-Heavy, LLM-Light`);
    console.log(`${'='.repeat(50)}\n`);
});
