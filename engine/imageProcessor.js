/** engine/imageProcessor.js V2.0 - Quality & Security Gatekeeper */

/**
 * Validates file size before any processing or LLM inference.
 * Rejects files larger than 10MB to prevent resource exhaustion/cost bombs.
 */
function validateImageSize(fileBuffer) {
    if (!fileBuffer) return { valid: false, error: 'NO_FILE' };

    const MAX_SIZE_MB = 10;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    console.log(`[IMAGE KERNEL] Validating file size: ${fileBuffer.length} bytes`);

    if (fileBuffer.length > MAX_SIZE_BYTES) {
        console.warn(`[IMAGE KERNEL] REJECTED: File size ${fileBuffer.length} exceeds ${MAX_SIZE_MB}MB limit.`);
        return {
            valid: false,
            error: 'FILE_TOO_LARGE',
            message: `קובץ גדול מדי. המערכת מקבלת קבצים עד ${MAX_SIZE_MB}MB בלבד.`
        };
    }

    return { valid: true };
}

module.exports = {
    validateImageSize
};
