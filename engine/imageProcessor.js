/**
 * Pini Print Bot - Deterministic Image Processor
 * AI Governance Law v1.0: CODE IS JUDGE.
 * * module: engine/imageProcessor.js
 * purpose: Physical measurement of image buffers, bypassing all LLM hallucinations.
 */

const sharp = require('sharp');

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Validates file size and extracts physical dimensions deterministically.
 * @param {Buffer} fileBuffer - The image file buffer.
 * @returns {Promise<Object>} - The deterministic technical payload.
 */
async function processImageUpload(fileBuffer) {
    // 1. Gatekeeper: File Size Limits
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
        throw new Error(`FILE_TOO_LARGE: הקובץ חורג מהגבלת ${MAX_FILE_SIZE_MB}MB.`);
    }

    try {
        // 2. The Physical Judge: Read metadata headers via sharp
        const metadata = await sharp(fileBuffer).metadata();

        // Extract raw physical properties
        const widthPx = metadata.width;
        const heightPx = metadata.height;
        const format = metadata.format;

        // Extract DPI (Density). If missing in EXIF, assume standard web 72 DPI.
        const dpi = metadata.density || 72;

        // 3. Mathematical Conversion: Pixels to Millimeters
        // Formula: (pixels * 25.4) / DPI
        const widthMm = Math.round((widthPx * 25.4) / dpi);
        const heightMm = Math.round((heightPx * 25.4) / dpi);

        // 4. Construct the Governance Payload
        // This object goes STRAIGHT to the Decision Kernel.
        const technicalPayload = {
            dpi: dpi,
            width_mm: widthMm,
            height_mm: heightMm,
            format: format,
            is_deterministic: true, // Audit flag
            status: "ANALYZED_BY_CODE"
        };

        console.log(`[GOVERNANCE] Deterministic extraction success: ${widthMm}x${heightMm}mm @ ${dpi}DPI`);
        return technicalPayload;

    } catch (error) {
        console.error("[IMAGE PROCESSOR] Fatal error analyzing physical file:", error);
        throw new Error("INVALID_IMAGE_FORMAT: לא ניתן לפענח את הנתונים הטכניים של התמונה.");
    }
}

module.exports = {
    processImageUpload
};
