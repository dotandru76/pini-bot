const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// ייבוא הפונקציה החדשה removeFromCart
const { getSession, updateCart, removeFromCart, clearCart, generateSystemPrompt } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService');

dotenv.config();
const app = express();

app.use(cors()); 
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- כלי 1: חישוב והוספה/עדכון ---
const calculateJobTool = {
    name: "calculate_custom_job",
    description: "Calculate price and ADD or UPDATE an item in the cart.",
    parameters: {
        type: "OBJECT",
        properties: {
            product_name: { type: "STRING", description: "Product name (Flyer, Business Card, Book, Invitation)" },
            description: { type: "STRING", description: "Specs (default to standard if missing)" },
            qty: { type: "NUMBER", description: "Quantity" },
            paper_type: { type: "STRING", description: "Paper (default: chrome_135 for flyers, matte_300 for cards)" },
            print_sides: { type: "STRING", description: "simplex or duplex" },
            finishing: { type: "STRING", description: "Finishing (Lamination, Folding)" }
        },
        required: ["product_name", "qty"]
    }
};

// --- כלי 2 (חדש): מחיקת פריט ---
const deleteItemTool = {
    name: "remove_item_from_cart",
    description: "Remove a specific item from the cart (or 'ALL' to clear cart)",
    parameters: {
        type: "OBJECT",
        properties: {
            product_name: { type: "STRING", description: "The product name to remove (e.g., 'Business Card')" }
        },
        required: ["product_name"]
    }
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    // הוספנו את הכלי החדש לרשימה
    tools: [{ functionDeclarations: [calculateJobTool, deleteItemTool] }]
});

// לוגיקת מחירים (אותה לוגיקה שעבדה קודם)
function calculatePrice(args) {
    let basePrice = 0;
    if (args.product_name === 'Business Card') basePrice = 0.4;
    else if (args.product_name === 'Invitation') basePrice = 1.5;
    else if (args.product_name === 'Book') basePrice = 15;
    else if (args.product_name === 'Stickers') basePrice = 0.5;
    else basePrice = 0.5;

    if (args.finishing && args.finishing.includes('Fold')) basePrice += 0.5;
    
    let total = basePrice * args.qty;
    if (args.qty > 1000) total *= 0.8; 

    return {
        ...args,
        client_price: Math.ceil(total),
        profit_margin: 30,
        manager_log: [`חישוב: ${args.product_name}, כמות ${args.qty}, מחיר ${Math.ceil(total)}`]
    };
}

// --- Routes ---

app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId } = req.body;
        console.log(`💬 [Chat] ${userId}: "${message}"`);

        const session = getSession(userId);
        const systemPrompt = generateSystemPrompt(userId);

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "System initialized. Ready for print jobs." }] },
                ...session.history
            ]
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const functionCalls = response.functionCalls();

        let finalResponseText = "";
        let quotes = [];
        
        // --- טיפול בכלים (Tools) ---
        if (functionCalls && functionCalls.length > 0) {
            console.log(`🛠️ Triggered ${functionCalls.length} tools`);
            const functionResponses = [];
            
            for (const call of functionCalls) {
                // מקרה 1: חישוב / עדכון
                if (call.name === 'calculate_custom_job') {
                    const args = call.args;
                    console.log(`🖩 Calc/Update: ${args.product_name}`);
                    const calculation = calculatePrice(args);
                    updateCart(userId, calculation); // מעדכן את הזיכרון
                    quotes.push(calculation); // שולח ללקוח להצגה
                    
                    functionResponses.push({
                        functionResponse: {
                            name: 'calculate_custom_job',
                            response: { result: "Updated", price: calculation.client_price }
                        }
                    });
                }
                
                // מקרה 2: מחיקה (החדש!)
                else if (call.name === 'remove_item_from_cart') {
                    const prodName = call.args.product_name;
                    console.log(`🗑️ Delete Request: ${prodName}`);
                    
                    if (prodName === 'ALL') {
                        clearCart(userId);
                        functionResponses.push({
                            functionResponse: { name: 'remove_item_from_cart', response: { result: "Cart Cleared" } }
                        });
                    } else {
                        const success = removeFromCart(userId, prodName);
                        functionResponses.push({
                            functionResponse: { 
                                name: 'remove_item_from_cart', 
                                response: { result: success ? "Item Removed" : "Item Not Found" } 
                            }
                        });
                    }
                }
            }

            const finalStep = await chat.sendMessage(functionResponses);
            finalResponseText = finalStep.response.text();
            
        } else {
            finalResponseText = response.text();
        }

        // שמירת היסטוריה
        session.history.push({ role: 'user', parts: [{ text: message }] });
        session.history.push({ role: 'model', parts: [{ text: finalResponseText }] });

        // שליחת תשובה ללקוח עם העגלה המעודכנת
        res.json({
            content: finalResponseText,
            quotes: quotes,
            fullCart: session.cart // שולחים את המצב העדכני ביותר של העגלה
        });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

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