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

    // Replace REAL newlines with escaped ones for JSON.parse, then fix double-escaping of backslashes if present
    cleanCreds = cleanCreds.replace(/\r?\n/g, '\\n').replace(/\\\\n/g, '\\n');

    let credentials;
    let tryContent = cleanCreds;

    // --- STEP 1: Aggressive Unquoting ---
    // Handle cases where the key is wrapped in multiple layers of escaped quotes
    for (let i = 0; i < 3; i++) {
        tryContent = tryContent.trim();
        if (tryContent.startsWith('\\"') && tryContent.endsWith('\\"')) {
            tryContent = tryContent.slice(2, -2);
        } else if (tryContent.startsWith('"') && tryContent.endsWith('"')) {
            tryContent = tryContent.slice(1, -1);
        } else if (tryContent.startsWith("'") && tryContent.endsWith("'")) {
            tryContent = tryContent.slice(1, -1);
        } else {
            break;
        }
    }

    // --- STEP 2: Multi-Stage Parsing ---
    try {
        // Try direct parse
        credentials = JSON.parse(tryContent);
    } catch (parseError) {
        console.warn(`[STORAGE] Direct JSON parse failed (${parseError.message}), attempting normalization...`);

        // Handle literal newlines and internal escape corruption
        let normalized = tryContent
            .replace(/\r?\n/g, '\\n') // Escape real newlines
            .replace(/\\\\n/g, '\\n') // Fix double-escaped newlines
            .replace(/\\"/g, '"');    // Unescape internal quotes if they were escaped globally

        // Final sanity check: if it starts with "{" but ends with "}" and still fails, 
        // it might have escaped control characters.
        try {
            credentials = JSON.parse(normalized);
        } catch (e2) {
            console.warn(`🛑 [STORAGE] Normalization failed. Attempting surgical extraction...`);

            // --- STEP 3: Surgical Extraction (The "Nuclear" Fallback) ---
            // This is immune to most escaping/newline issues as it targets specific field patterns
            const extract = (field) => {
                const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`);
                const match = tryContent.match(regex) || normalized.match(regex);
                return match ? match[1] : null;
            };

            const private_key = extract('private_key');
            const client_email = extract('client_email');
            const project_id = extract('project_id');

            if (private_key && client_email && project_id) {
                credentials = {
                    type: 'service_account',
                    project_id: project_id,
                    private_key: private_key.replace(/\\n/g, '\n').replace(/\\\\n/g, '\n'),
                    client_email: client_email
                };
                console.log(`[STORAGE] SUCCESS via surgical extraction for ${project_id}`);
            } else {
                console.error(`🛑 [STORAGE] SURGICAL EXTRACTION FAILED. Missing fields:`, {
                    pk: !!private_key,
                    ce: !!client_email,
                    pid: !!project_id
                });
                throw new Error(`Unable to parse GCP_SERVICE_ACCOUNT_KEY. Error: ${e2.message}`);
            }
        }
    }

    storage = new Storage({
        credentials,
        projectId: credentials.project_id || 'pini-print-bot'
    });
    console.log(`[STORAGE] SUCCESSFULLY initialized GCP for ${credentials.project_id}`);
} catch (e) {
    console.error("🛑 [STORAGE] CRITICAL ERROR during initialization:", e.message);
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
