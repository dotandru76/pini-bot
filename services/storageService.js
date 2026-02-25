/** services/storageService.js V2.0 - GCP Direct Bucket Upload */
const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize GCP Storage. In production, credentials should be in environment variables (GCP_SERVICE_ACCOUNT_KEY)
// or use the server's default service account metadata.
const storage = new Storage();
const BUCKET_NAME = process.env.GCP_STORAGE_BUCKET || 'pini-print-uploads';

/**
 * Generates a signed URL for direct client upload to GCP.
 * Strictly limited to 5 minutes (300 seconds).
 * Files are path-isolated by session ID.
 */
async function generateSignedUploadUrl(sessionId, fileName) {
    if (!sessionId) throw new Error("SessionID required for storage isolation.");

    // Naming Policy: /uploads/sessions/{sessionId}/{fileName}
    const destination = `uploads/sessions/${sessionId}/${Date.now()}_${fileName}`;
    const file = storage.bucket(BUCKET_NAME).file(destination);

    const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes TTL
        contentType: 'application/octet-stream',
    };

    try {
        const [url] = await file.getSignedUrl(options);
        console.log(`[STORAGE] Generated Signed URL (Expires 5m): ${destination}`);

        return {
            uploadUrl: url,
            fileName: fileName,
            remotePath: destination
        };
    } catch (error) {
        console.error("Error generating signed URL:", error);
        throw error;
    }
}

module.exports = {
    generateSignedUploadUrl
};
