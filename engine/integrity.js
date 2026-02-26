/**
 * engine/integrity.js - Order Security & Traceability (v1.0 CTO Hardened)
 * FIXED: Using official 'uuid' library. Homebrew polyfills strictly forbidden.
 */
const crypto = require('crypto');
const { v7: uuidv7 } = require('uuid');

/**
 * Canonicalizes the payload by removing dynamic fields and sorting keys.
 * Required for deterministic hashing.
 */
function canonicalizePayload(payload) {
    const clean = { ...payload };
    delete clean.traceId;
    delete clean.integrityHash;
    delete clean.timestamp;
    delete clean.production_cost;

    // Sort keys alphabetically for deterministic output
    const sortedKeys = Object.keys(clean).sort();
    const canonical = {};
    for (const key of sortedKeys) {
        const val = clean[key];
        // Recursive for nested objects
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            canonical[key] = canonicalizePayload(val);
        } else {
            canonical[key] = val;
        }
    }
    return canonical;
}

/**
 * Creates a SHA-256 hash of the canonicalized payload.
 */
function createIntegrityHash(payload) {
    const canonical = canonicalizePayload(payload);
    const data = JSON.stringify(canonical);
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Recursively freezes an object to ensure absolute immutability.
 */
function deepFreeze(obj) {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(prop => {
        if (obj.hasOwnProperty(prop) &&
            obj[prop] !== null &&
            (typeof obj[prop] === "object" || typeof obj[prop] === "function") &&
            !Object.isFrozen(obj[prop])) {
            deepFreeze(obj[prop]);
        }
    });
    return obj;
}

/**
 * Domain Orchestrator: Assembles a hardened production item.
 */
function assembleProductionItem(calcResult, originalParams) {
    const item = {
        product: calcResult.product,
        validated_params: { ...originalParams },
        pricing_snapshot: {
            client_price: calcResult.client_price,
            unit_price: calcResult.unit_price,
            production_cost: calcResult.production_cost
        },
        routing_snapshot: {
            engine: calcResult.engine || 'digital',
            timestamp: new Date().toISOString()
        },
        schema_version: "4.0.0"
    };

    // 1. Generate deterministic ID using official library
    const traceId = uuidv7();

    // 2. Hash (Canonicalized internally)
    const hash = createIntegrityHash(item);

    // 3. Assemble final object BEFORE freezing
    const productionItem = {
        traceId,
        integrityHash: hash,
        ...item
    };

    // 4. Deep Freeze
    return deepFreeze(productionItem);
}

module.exports = {
    generateUUIDv7: uuidv7, // Exported for backwards compatibility with existing tests
    createIntegrityHash,
    canonicalizePayload,
    deepFreeze,
    assembleProductionItem
};
