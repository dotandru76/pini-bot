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
    description: "Calculate price for print jobs. Use smart defaults if specs are missing. ALWAYS use this tool when user asks for a price quote.",
    parameters: {
        type: "OBJECT",
        properties: {
            product_name: { type: "STRING", description: "Product type: Flyer, Business Card, Invitation, Poster, etc." },
            qty: { type: "NUMBER", description: "Quantity requested" },
            paper_type: { type: "STRING", description: "Optional: Paper type (chromo_135, chromo_300, pearl_300, matte_300, offset_80)" },
            finishing: { type: "STRING", description: "Optional: Finishing (lamination, fold, round_corners)" },
            description: { type: "STRING", description: "Any extra details from the user" }
        },
        required: ["product_name", "qty"]
    }
};

const deleteItemTool = {
    name: "remove_item_from_cart",
    description: "Remove item from cart. Use 'ALL' to clear entire cart.",
    parameters: {
        type: "OBJECT",
        properties: { 
            product_name: { type: "STRING", description: "Product name to remove, or 'ALL' to clear cart" } 
        },
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
        console.log(`\n💬 [Chat] User ${userId.substring(0,8)}... asks: "${message}"`);

        const session = getSession(userId);
        
        // טעינת הפרומפט הדינמי (שקורא את pini_rules_v4)
        const systemPrompt = generateSystemPrompt(userId);

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "מובן! אני פיני, הבוט של דפוס בית יצחק. אשמח לעזור לך עם הצעות מחיר לדפוס. מה תרצה להזמין?" }] },
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
            console.log(`🔧 [Function Call] Gemini wants to call: ${functionCalls.map(c => c.name).join(', ')}`);
            
            const functionResponses = [];
            
            for (const call of functionCalls) {
                console.log(`   📋 Args: ${JSON.stringify(call.args)}`);
                
                if (call.name === 'calculate_custom_job') {
                    // הפעלת מנוע החישוב החכם (V7 Generic)
                    const calcResult = calculate_custom_job(session.cart, call.args);
                    
                    session.cart = calcResult.updatedCart;
                    quotes.push(calcResult.lastAdded);
                    dashboardStats = calcResult.total_deal_stats;

                    // פורמט תשובה מפורט יותר ל-Gemini
                    functionResponses.push({
                        functionResponse: {
                            name: 'calculate_custom_job',
                            response: { 
                                success: true,
                                product: calcResult.lastAdded.product_name,
                                quantity: calcResult.lastAdded.qty,
                                price: calcResult.lastAdded.client_price,
                                profit_margin: calcResult.lastAdded.profit_margin + "%",
                                paper_used: calcResult.lastAdded.description,
                                message: `הפריט נוסף לסל בהצלחה. המחיר הוא ${calcResult.lastAdded.client_price} ש"ח.`
                            }
                        }
                    });
                    
                    console.log(`   ✅ Calculated: ${calcResult.lastAdded.product_name} = ₪${calcResult.lastAdded.client_price}`);
                }
                else if (call.name === 'remove_item_from_cart') {
                    const prodName = call.args.product_name;
                    let resultMsg = "";
                    
                    if (prodName === 'ALL') {
                        clearCart(userId);
                        resultMsg = "העגלה רוקנה בהצלחה";
                        console.log(`   🗑️ Cart cleared`);
                    } else {
                        const success = removeFromCart(userId, prodName);
                        resultMsg = success ? `${prodName} הוסר מהעגלה` : `לא נמצא ${prodName} בעגלה`;
                        console.log(`   🗑️ Remove ${prodName}: ${success ? 'OK' : 'Not found'}`);
                    }
                    
                    functionResponses.push({ 
                        functionResponse: { 
                            name: 'remove_item_from_cart', 
                            response: { success: true, message: resultMsg } 
                        } 
                    });
                }
            }
            
            // שליחת תוצאות הכלים חזרה לבוט
            console.log(`📤 Sending ${functionResponses.length} function response(s) back to Gemini...`);
            
            try {
                const finalStep = await chat.sendMessage(functionResponses);
                finalResponseText = finalStep.response.text();
                console.log(`📥 Gemini responded: "${finalResponseText.substring(0, 80)}..."`);
            } catch (geminiError) {
                console.error(`❌ Gemini error on function response:`, geminiError.message);
                // Fallback - יצירת תשובה ידנית אם Gemini נכשל
                if (quotes.length > 0) {
                    finalResponseText = `המחיר הוא ${quotes[0].client_price} ש"ח.`;
                } else {
                    finalResponseText = "הפעולה בוצעה בהצלחה.";
                }
            }
        } else {
            finalResponseText = response.text();
            console.log(`📥 Gemini responded (no function): "${finalResponseText.substring(0, 80)}..."`);
        }

        // ניהול היסטוריה מקוצר (שמירת 20 הודעות אחרונות בלבד)
        session.history.push({ role: 'user', parts: [{ text: message }] });
        session.history.push({ role: 'model', parts: [{ text: finalResponseText }] });
        if (session.history.length > 20) session.history = session.history.slice(-20);

        console.log(`✅ Response sent to client\n`);
        
        res.json({
            content: finalResponseText,
            quotes: quotes, 
            cart: session.cart, 
            dashboard: dashboardStats
        });

    } catch (error) {
        console.error("❌ Server Error:", error.message);
        console.error(error.stack);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
    console.log(`\n===== Application Startup at ${new Date().toISOString().replace('T', ' ').substring(0, 19)} =====`);
    console.log(`🚀 Pini Print Server running on port ${PORT}`);
});
