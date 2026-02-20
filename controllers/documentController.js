const { getSession } = require('../services/sessionManager');
const { generateQuotePDF } = require('../services/pdfService');

/**
 * Handles requests for generating a PDF quote based on a user's cart.
 */
async function handlePdfQuote(req, res) {
    const { userId, cart: clientCart } = req.body;

    // Fetch cart from body, or fallback to server session state
    let cart = clientCart;
    if (!cart && userId) {
        const session = getSession(userId);
        cart = session.cart;
    }

    if (!cart || cart.length === 0) {
        return res.status(400).send("העגלה ריקה");
    }

    try {
        console.log("📄 Generating PDF Quote via DocumentController...");

        // Build PDF Buffer
        const pdfBuffer = await generateQuotePDF(cart, { name: "לקוח יקר" });

        // Define headers for file download
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'attachment; filename="quote.pdf"'
        });

        // Send file
        res.send(pdfBuffer);
        console.log("✅ PDF sent successfully to client");

    } catch (error) {
        console.error("❌ DocumentController Error:", error);
        res.status(500).json({ error: "Failed to generate PDF" });
    }
}

module.exports = {
    handlePdfQuote
};
