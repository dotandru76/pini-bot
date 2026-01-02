const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getSession, updateCart, clearCart, generateSystemPrompt } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService');

// טעינת משתני סביבה
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public')); // הגשת קבצי ה-Frontend

// --- הגדרת Gemini והכלים ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// הגדרת הכלי (Tool) שמאפשר לפיני לחשב ולעדכן את העגלה
const calculateJobTool = {
    name: "calculate_custom_job",
    description: "Calculate print job price and add/update item in cart",
    parameters: {
        type: "OBJECT",
        properties: {
            product_name: { type: "STRING", description: "Product name in English (Invitation, Business Card, Book, etc.)" },
            description: { type: "STRING", description: "Full technical specs (size, paper, folding)" },
            qty: { type: "NUMBER", description: "Quantity to print" },
            paper_type: { type: "STRING", description: "Paper type code (matte_300, chrome_135, etc.)" },
            print_sides: { type: "STRING", description: "simplex or duplex" },
            finishing: { type: "STRING", description: "Finishing options (Folded, Lamination, etc.)" }
        },
        required: ["product_name", "qty"]
    }
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash", // מודל מהיר וחכם
    tools: [{ functionDeclarations: [calculateJobTool] }]
});

// --- לוגיקת מחירים בסיסית (לצורך החישוב של הבוט) ---
function calculatePrice(args) {
    let basePrice = 0;
    // מחירון בסיסי לדוגמה (אפשר לשכלל בעתיד)
    if (args.product_name === 'Business Card') basePrice = 0.4;
    else if (args.product_name === 'Invitation') basePrice = 1.5;
    else if (args.product_name === 'Book') basePrice = 15;
    else if (args.product_name === 'Stickers') basePrice = 0.5;
    else basePrice = 0.5; // ברירת מחדל

    if (args.finishing && args.finishing.includes('Fold')) basePrice += 0.5;
    
    // חישוב כמותי (הנחה לכמויות גדולות)
    let total = basePrice * args.qty;
    if (args.qty > 1000) total *= 0.8; 

    return {
        ...args,
        client_price: Math.ceil(total),
        profit_margin: 30, // סתם דוגמה לתצוגה
        manager_log: [`חישוב בסיסי עבור ${args.product_name}: ${total} ש"ח`]
    };
}

// --- Routes ---

// 1. נתיב הצ'אט הראשי
app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId } = req.body;
        console.log(`💬 [Chat] Incoming message from ${userId}: "${message}"`);

        // 1. קבלת ההיסטוריה וההנחיות
        const session = getSession(userId);
        const systemPrompt = generateSystemPrompt(userId);

        // 2. בניית השיחה למודל
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "הבנתי, אני פיני. מוכן לעבודה." }] },
                ...session.history // הוספת היסטוריית השיחה הקודמת
            ]
        });

        // 3. שליחת ההודעה למודל
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const functionCalls = response.functionCalls();

        let finalResponseText = "";
        let quotes = [];
        let fullCart = session.cart;

        // 4. בדיקה אם המודל רוצה להפעיל כלי (לחשב מחיר)
        if (functionCalls && functionCalls.length > 0) {
            console.log(`🛠️ Gemini triggered ${functionCalls.length} tool(s)`);
            
            // עיבוד כל הקריאות לפונקציות (במקרה של מספר מוצרים יחד)
            const functionResponses = [];
            
            for (const call of functionCalls) {
                if (call.name === 'calculate_custom_job') {
                    const args = call.args;
                    console.log(`🖩 Calculating: ${args.product_name} (${args.qty})`);
                    
                    // ביצוע החישוב
                    const calculation = calculatePrice(args);
                    
                    // עדכון העגלה החכם (מונע כפילויות)
                    fullCart = updateCart(userId, calculation);
                    quotes.push(calculation);

                    // הכנת התשובה למודל
                    functionResponses.push({
                        functionResponse: {
                            name: 'calculate_custom_job',
                            response: { result: "Success", price: calculation.client_price, item: calculation }
                        }
                    });
                }
            }

            // 5. החזרת תוצאות הכלים למודל כדי שינסח תשובה סופית
            const finalStep = await chat.sendMessage(functionResponses);
            finalResponseText = finalStep.response.text();
            
        } else {
            // אם אין הפעלת כלי, פשוט לוקחים את הטקסט
            finalResponseText = response.text();
        }

        // שמירת ההודעה בהיסטוריה המקומית (לא חובה אם מסתמכים על המודל, אבל טוב לגיבוי)
        session.history.push({ role: 'user', parts: [{ text: message }] });
        session.history.push({ role: 'model', parts: [{ text: finalResponseText }] });

        // טיפול במקרה של ניקוי עגלה (אם המודל זיהה בקשת מחיקה בטקסט)
        if (message.includes("מחק") || message.includes("אפס")) {
            // לוגיקה פשוטה לגיבוי - המודל בד"כ יטפל בזה דרך הפרומפט
             if (finalResponseText.includes("מחקתי")) clearCart(userId);
        }

        res.json({
            content: finalResponseText,
            quotes: quotes, // רשימת הכרטיסים להצגה
            fullCart: fullCart // העגלה המלאה המעודכנת
        });

    } catch (error) {
        console.error("❌ Error in chat endpoint:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// 2. נתיב יצירת ה-PDF
app.post('/api/pdf', async (req, res) => {
    try {
        console.log("📄 [PDF Request] Generating PDF...");
        const cart = req.body;
        const customerProfile = { name: "לקוח יקר" }; // אפשר להרחיב בעתיד

        if (!cart || cart.length === 0) {
            return res.status(400).send("Cart is empty");
        }

        const pdfBuffer = await generateQuotePDF(cart, customerProfile);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'attachment; filename=quote.pdf'
        });
        
        res.send(pdfBuffer);
        console.log("✅ PDF sent to client");

    } catch (error) {
        console.error("❌ PDF Generation failed:", error);
        res.status(500).send("Error generating PDF");
    }
});

// --- הפעלת השרת ---
// Hugging Face מחייב פורט 7860
const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Ready for Hugging Face Spaces!`);
});