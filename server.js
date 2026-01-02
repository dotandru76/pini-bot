const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// שינוי 1: ייבוא המנוע החדש
const { calculate_custom_job } = require('./services/calculation'); 
const { getSession, removeFromCart, clearCart, generateSystemPrompt } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService');

dotenv.config();
const app = express();

app.use(cors()); 
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// הגדרת הכלי ל-Gemini
const calculateJobTool = {
    name: "calculate_custom_job",
    description: "Calculate price, update cart, and return breakdown & profit stats.",
    parameters: {
        type: "OBJECT",
        properties: {
            product_name: { type: "STRING", description: "Product name (Flyer, Business Card)" },
            qty: { type: "NUMBER", description: "Quantity" },
            paper_type: { type: "STRING", description: "Optional: paper type key from DB" },
            print_sides: { type: "STRING", description: "1 or 2" },
            finishing: { type: "STRING", description: "Finishing options" }
        },
        required: ["product_name", "qty"]
    }
};

const deleteItemTool = {
    name: "remove_item_from_cart",
    description: "Remove item or clear cart",
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

app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId } = req.body;
        console.log(`💬 [Chat] ${userId}: "${message}"`);

        const session = getSession(userId);
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
                    // שינוי 2: שימוש במנוע החדש
                    const calculationResult = calculate_custom_job(session.cart, call.args);
                    
                    // עדכון הזיכרון בשרת
                    session.cart = calculationResult.updatedCart;
                    
                    // נתונים לתגובה
                    quotes.push(calculationResult.lastAdded);
                    dashboardStats = calculationResult.total_deal_stats;

                    functionResponses.push({
                        functionResponse: {
                            name: 'calculate_custom_job',
                            response: { 
                                result: "Success", 
                                price: calculationResult.lastAdded.client_price,
                                stats: calculationResult.total_deal_stats 
                            }
                        }
                    });
                }
                else if (call.name === 'remove_item_from_cart') {
                    // לוגיקת מחיקה
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
            const finalStep = await chat.sendMessage(functionResponses);
            finalResponseText = finalStep.response.text();
        } else {
            finalResponseText = response.text();
        }

        session.history.push({ role: 'user', parts: [{ text: message }] });
        session.history.push({ role: 'model', parts: [{ text: finalResponseText }] });

        res.json({
            content: finalResponseText,
            quotes: quotes, 
            cart: session.cart, 
            dashboard: dashboardStats // שליחת נתוני המנהל לצד לקוח
        });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// מסלול PDF נשאר ללא שינוי
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
        console.error("❌ PDF Error:", error);
        res.status(500).send("Error");
    }
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});