/** services/storageService.js V2.0 - GCP Direct Bucket Upload */
const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize GCP Storage using credentials parsed directly from ENV
let storage;
try {
    const creds = process.env.GCP_SERVICE_ACCOUNT_KEY;
    if (!creds) throw new Error("GCP_SERVICE_ACCOUNT_KEY is missing from environment");

    // ULTRA-ROBUST FIX: Some environments escape newlines or use single quotes.
    // We clean the string aggressively before parsing.
    let cleanCreds = creds.trim();
    if (cleanCreds.startsWith("'") && cleanCreds.endsWith("'")) cleanCreds = cleanCreds.slice(1, -1);
    if (cleanCreds.startsWith('"') && cleanCreds.endsWith('"')) cleanCreds = cleanCreds.slice(1, -1);
    cleanCreds = cleanCreds.replace(/\\n/g, '\n');

    const credentials = JSON.parse(cleanCreds);

    storage = new Storage({
        credentials,
        projectId: credentials.project_id || 'pini-print-bot'
    });
    console.log(`[STORAGE] SUCCESSFULLY initialized GCP for ${credentials.project_id}`);
} catch (e) {
    console.error("🛑 [STORAGE] CRITICAL ERROR:", e.message);
    storage = new Storage();
}

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

/**
 * Downloads a file from GCP bucket as a Buffer.
 */
async function downloadFile(remotePath) {
    try {
        const file = storage.bucket(BUCKET_NAME).file(remotePath);
        const [buffer] = await file.download();
        console.log(`[STORAGE] Downloaded file buffer: ${remotePath}`);
        return buffer;
    } catch (error) {
        console.error("Error downloading file from GCP:", error);
        throw error;
    }
}

module.exports = {
    generateSignedUploadUrl,
    downloadFile
};
