/** services/storageService.js V2.0 - GCP Direct Bucket Upload */
const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize GCP Storage using credentials parsed directly from ENV
let storage;
try {
    const creds = process.env.GCP_SERVICE_ACCOUNT_KEY;
    if (!creds) throw new Error("GCP_SERVICE_ACCOUNT_KEY is missing from environment");

    // ULTRA-ROBUST FIX: Handle missing quotes, double escaping, and literal newlines.
    let cleanCreds = creds.trim();
    if (cleanCreds.startsWith("'") && cleanCreds.endsWith("'")) cleanCreds = cleanCreds.slice(1, -1);
    if (cleanCreds.startsWith('"') && cleanCreds.endsWith('"')) cleanCreds = cleanCreds.slice(1, -1);

    // Replace literal newlines with escaped ones, then convert escaped ones to real ones for the RSA key
    cleanCreds = cleanCreds.replace(/\n/g, '\\n').replace(/\\n/g, '\n');

    try {
        const credentials = JSON.parse(cleanCreds);
        storage = new Storage({
            credentials,
            projectId: credentials.project_id || 'pini-print-bot'
        });
        console.log(`[STORAGE] SUCCESSFULLY initialized GCP for ${credentials.project_id}`);
    } catch (parseError) {
        console.error(`🛑 [STORAGE] JSON Parse Error at pos ${parseError.message.match(/\d+/)?.[0]}:`, parseError.message);
        // Attempt to show a snippet around the error position if available
        const errorPosMatch = parseError.message.match(/\d+/);
        const errorPos = errorPosMatch ? parseInt(errorPosMatch[0], 10) : -1;
        if (errorPos !== -1) {
            const snippetStart = Math.max(0, errorPos - 20);
            const snippetEnd = Math.min(cleanCreds.length, errorPos + 20);
            console.error(`🛑 [STORAGE] Snippet: ...${cleanCreds.substring(snippetStart, snippetEnd)}...`);
        } else {
            console.error(`🛑 [STORAGE] Full string (first 200 chars): ${cleanCreds.substring(0, 200)}...`);
        }
        storage = new Storage(); // Fallback to default storage initialization
    }
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
