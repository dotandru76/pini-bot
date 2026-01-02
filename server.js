const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ייבוא המנועים והשירותים
const { calculate_custom_job } = require('./services/calculation'); // המנוע החכם החדש (V7)
const { getSession, removeFromCart, clearCart, generateSystemPrompt } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService');

dotenv.config();
const app = express();

// --- אבטחה: הגדרת CORS ---
const corsOptions = {
    // בפרודקשן: החלף את הכוכבית בכתובת האתר שלך, למשל: 'https://my-print-shop.com'
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// הגדרת הכלים ל-Gemini
const calculateJobTool = {
    name: "calculate_custom_job",
    description: "Calculate price for print jobs. Use smart defaults if specs are missing.",
    parameters: {
        type: "OBJECT",
        properties: {
            product_name: { type: "STRING", description: "Product (Flyer, Business Card, etc.)" },
            qty: { type: "NUMBER", description: "Quantity" },
            paper_type: { type: "STRING", description: "Optional: Paper type (e.g., 'pearl', 'matte')" },
            finishing: { type: "STRING", description: "Optional: Finishing (e.g., 'lamination')" },
            description: { type: "STRING", description: "Extra details" }
        },
        required: ["product_name", "qty"]
    }
};

const deleteItemTool = {
    name: "remove_item_from_cart",
    description: "Remove item from cart or clear all.",
    parameters: {
        type: "OBJECT",
        properties: { product_name: { type: "STRING" } },
        required: ["product_name"]
    }
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ functionDeclarations: [calculateJobTool, deleteItemTool] }]
});

// --- Routes ---

app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId } = req.body;
        console.log(`💬 [Chat] User ${userId.substring(0,5)}... asks: "${message}"`);

        const session = getSession(userId);
        
        // טעינת הפרומפט הדינמי (שקורא את pini_rules_v4)
        const systemPrompt = generateSystemPrompt(userId);

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                ...session.history
            ]
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const functionCalls = response.functionCalls();

        let finalResponseText = "";
        let quotes = [];
        let dashboardStats = null;
        
        if (functionCalls && functionCalls.length > 0) {
            const functionResponses = [];
            
            for (const call of functionCalls) {
                if (call.name === 'calculate_custom_job') {
                    // הפעלת מנוע החישוב החכם (V7 Generic)
                    const calcResult = calculate_custom_job(session.cart, call.args);
                    
                    session.cart = calcResult.updatedCart;
                    quotes.push(calcResult.lastAdded);
                    dashboardStats = calcResult.total_deal_stats;

                    functionResponses.push({
                        functionResponse: {
                            name: 'calculate_custom_job',
                            response: { 
                                status: "ok", 
                                price: calcResult.lastAdded.client_price,
                                margin: calcResult.lastAdded.profit_margin 
                            }
                        }
                    });
                }
                else if (call.name === 'remove_item_from_cart') {
                    const prodName = call.args.product_name;
                    if (prodName === 'ALL') {
                        clearCart(userId);
                        functionResponses.push({ functionResponse: { name: 'remove_item_from_cart', response: { result: "Cart Cleared" } } });
                    } else {
                        const success = removeFromCart(userId, prodName);
                        functionResponses.push({ functionResponse: { name: 'remove_item_from_cart', response: { result: success ? "Removed" : "Not Found" } } });
                    }
                }
            }
            // שליחת תוצאות הכלים חזרה לבוט
            const finalStep = await chat.sendMessage(functionResponses);
            finalResponseText = finalStep.response.text();
        } else {
            finalResponseText = response.text();
        }

        // ניהול היסטוריה מקוצר (שמירת 20 הודעות אחרונות בלבד למניעת עומס)
        session.history.push({ role: 'user', parts: [{ text: message }] });
        session.history.push({ role: 'model', parts: [{ text: finalResponseText }] });
        if (session.history.length > 20) session.history = session.history.slice(-20);

        res.json({
            content: finalResponseText,
            quotes: quotes, 
            cart: session.cart, 
            dashboard: dashboardStats
        });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// PDF Endpoint (Puppeteer based)
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

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
    console.log(`🚀 Pini Print Server running on port ${PORT}`);
});