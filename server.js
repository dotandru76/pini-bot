const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ייבוא המנועים והשירותים
const { calculate_custom_job } = require('./services/calculation'); // המנוע ההיברידי V8
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

// --- הגדרת הכלים ל-Gemini (החלק המתוקן) ---
const calculateJobTool = {
    name: "calculate_custom_job",
    description: "Calculate OR Update price. Use this for ANY change: Quantity, Material, Finishing, or New Item. Do not answer price questions without calling this.",
    parameters: {
        type: "OBJECT",
        properties: {
            product_name: { type: "STRING", description: "Product type: Flyer, Business Card, Rollup, Canvas, etc." },
            qty: { type: "NUMBER", description: "Quantity requested" },
            // הרחבנו את התיאור כדי שיבין שזה המקום לשנות חומרים (כותנה, ויניל וכו')
            paper_type: { type: "STRING", description: "Material type. Examples: 'chromo', 'matte', 'cotton canvas', 'vinyl', 'sticker', 'pearl', 'wood frame'." },
            finishing: { type: "STRING", description: "Optional: Finishing (lamination, fold, gold foil)" },
            description: { type: "STRING", description: "Extra details" }
        },
        required: ["product_name"] 
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
        
        // טעינת הפרומפט הדינמי (שקורא את pini_rules_v6)
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
                    // הפעלת מנוע החישוב החכם (V8)
                    const calcResult = calculate_custom_job(session.cart, call.args);
                    
                    session.cart = calcResult.updatedCart;
                    quotes.push(calcResult.lastAdded);
                    dashboardStats = calcResult.total_deal_stats;

                    functionResponses.push({
                        functionResponse: {
                            name: 'calculate_custom_job',
                            response: { 
                                success: true,
                                product: calcResult.lastAdded.product_name,
                                quantity: calcResult.lastAdded.qty,
                                price: calcResult.lastAdded.client_price,
                                description: calcResult.lastAdded.description,
                                message: `הפריט עודכן/נוסף. מחיר: ${calcResult.lastAdded.client_price} ש"ח.`
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
            } catch (geminiError) {
                console.error(`❌ Gemini error on function response:`, geminiError.message);
                finalResponseText = "הפעולה בוצעה, אך הייתה בעיה בניסוח התשובה הסופית. העגלה מעודכנת.";
            }
        } else {
            finalResponseText = response.text();
        }

        // ניהול היסטוריה
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
        console.error("❌ Server Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// PDF Endpoint
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