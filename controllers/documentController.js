const { getSession } = require('../services/sessionManager');
const { generateQuotePDF } = require('../services/pdfService');
const { generateSignedUploadUrl } = require('../services/storageService');
const { validateImageSize } = require('../engine/imageProcessor');

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

/**
 * Generates a signed URL for direct GCP upload.
 * Validates session and file size (client-reported) before granting URL.
 */
async function handleSignedUrl(req, res) {
    const { userId, fileName, fileSize } = req.body;

    if (!userId || !fileName || !fileSize) {
        return res.status(400).json({ error: "Missing required parameters (userId, fileName, fileSize)" });
    }

    // 10MB Gatekeeper (Technical size check before granting storage access)
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (fileSize > MAX_SIZE_BYTES) {
        console.warn(`[IMAGE GATEKEEPER] Rejected ${fileName} due to size: ${fileSize}`);
        return res.status(413).json({
            error: "FILE_TOO_LARGE",
            message: "קובץ גדול מדי. מקסימום 10MB."
        });
    }

    try {
        const result = await generateSignedUploadUrl(userId, fileName);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to generate signed URL" });
    }
}

/**
 * Technical validator for buffers (for local processing if needed).
 */
async function handleImageValidation(req, res) {
    const { buffer } = req.body; // Assuming small metadata/preview buffer for now
    const check = validateImageSize(buffer);
    if (!check.valid) {
        return res.status(400).json(check);
    }
    res.json({ valid: true });
}

module.exports = {
    handlePdfQuote,
    handleSignedUrl,
    handleImageValidation
};
