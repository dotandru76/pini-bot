/** engine/upseller.js V1.0 - The Sales Engine */
const fs = require('fs');
const path = require('path');

let eventsDB = {};
try {
    eventsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/events.json'), 'utf8'));
} catch (e) {
    console.error("❌ Warning: events.json not found or malformed");
}

/**
 * Checks if we should upsell a product based on the user's active event context.
 * @param {Array} cart - The current items in the user's cart
 * @param {String} currentProductKey - The product they just finished configuring
 * @param {String} eventContext - The detected event context (e.g. 'wedding', 'exhibition')
 * @returns {Object|null} - The recommended product object with a pitch, or null if no upsell needed.
 */
function checkUpsell(cart, currentProductKey, eventContext) {
    if (!eventContext) return null; // No event detected
    if (!eventsDB[eventContext]) return null; // Unknown event type

    const bundle = eventsDB[eventContext];

    // Check if the current product is actually a trigger for this bundle
    // e.g. We only want to pitch Wedding stuff if they bought Wedding triggers
    if (!bundle.trigger_products.includes(currentProductKey)) return null;

    // See what products they already have in the cart so we don't suggest duplicates
    const cartProductKeys = cart.map(item => item.product_key || item.product); // Assuming item.product_key is stored, though we'll check against Hebrew names if needed. Ideally we store the raw key.

    // For safer checking, let's map the Hebrew names back to keys if we didn't store raw keys
    const PRODUCT_MAP_REVERSE = {
        'פליירים': 'flyer', 'חוברות': 'booklet', 'מדבקות': 'sticker', 'פוסטרים': 'poster'
    };

    const cartKeys = cart.map(item => PRODUCT_MAP_REVERSE[item.productName] || item.productName);

    // Add the current item they just finished configuring to the "already have" list
    cartKeys.push(currentProductKey);

    // Find the first recommendation they don't already have
    for (const rec of bundle.bundle_recommendations) {
        if (!cartKeys.includes(rec.product_key)) {
            console.log(`💡 [UPSELLER] Pitching ${rec.product_key} for event '${eventContext}'`);
            return rec;
        }
    }

    return null; // They bought the whole bundle already!
}

module.exports = { checkUpsell };
