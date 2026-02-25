/**
 * engine/integrity.js - Order Security & Traceability
 */
const crypto = require('crypto');

/**
 * Generates a UUID v7 (Time-ordered UUID)
 * Simplified implementation for Node.js
 */
function generateUUIDv7() {
    const timestamp = Date.now();
    const entropy = crypto.randomBytes(10);

    const timeHex = timestamp.toString(16).padStart(12, '0');
    const entropyHex = entropy.toString('hex');

    // Format: 8-4-4-4-12
    return `${timeHex.substring(0, 8)}-${timeHex.substring(8)}-7${entropyHex.substring(0, 3)}-a${entropyHex.substring(3, 6)}-${entropyHex.substring(6)}`;
}

/**
 * Creates a SHA-256 hash of the order payload for deterministic integrity.
 */
function createIntegrityHash(payload) {
    const data = JSON.stringify(payload);
    return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
    generateUUIDv7,
    createIntegrityHash
};
