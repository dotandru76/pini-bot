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
        credentials = JSON.parse(tryContent);
    } catch (parseError) {
        console.warn(`[STORAGE] JSON.parse failed (${parseError.message}), using ULTRA SURGICAL extraction...`);

        // --- STEP 3: ULTRA SURGICAL Extraction ---
        // Pluck fields using greedy matching to ignore escaping mess
        const pluck = (key) => {
            const regex = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`);
            const match = tryContent.match(regex);
            return match ? match[1] : null;
        };

        let project_id = pluck('project_id');
        let client_email = pluck('client_email');

        // Private Key is special: It's long and full of \n
        // We look for everything between the known PEM markers
        const pkRegex = /-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/;
        let rawKeyMatch = tryContent.match(pkRegex);
        let private_key;

        if (rawKeyMatch) {
            private_key = rawKeyMatch[0]
                .replace(/\\n/g, '\n')
                .replace(/\\\\n/g, '\n')
                .replace(/\\r/g, '')
                .replace(/\\/g, ''); // Clear residual shell slashes
        } else {
            // Fallback for non-headered key string
            private_key = pluck('private_key');
            if (private_key) {
                private_key = `-----BEGIN PRIVATE KEY-----\n${private_key.replace(/\\n/g, '\n').replace(/\\\\n/g, '\n')}\n-----END PRIVATE KEY-----\n`;
            }
        }

        if (private_key && client_email && project_id) {
            credentials = {
                type: 'service_account',
                project_id,
                client_email,
                private_key: private_key.trim() + '\n'
            };
            console.log(`[STORAGE] SUCCESS via ULTRA SURGICAL extraction for ${project_id}`);
        } else {
            console.error(`🛑 [STORAGE] ULTRA SURGICAL FAILED.`, {
                pid: !!project_id,
                ce: !!client_email,
                pk: !!private_key
            });
            throw new Error("Unable to reconstruct GCP credentials from corrupted environment string.");
        }
    }

    storage = new Storage({
        credentials,
        projectId: credentials.project_id || 'pini-print-bot'
    });
    console.log(`[STORAGE] SUCCESSFULLY initialized GCP client for ${credentials.project_id}`);
} catch (e) {
    console.error("🛑 [STORAGE] CRITICAL INITIALIZATION ERROR:", e.message);
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
