/** services/budgetManager.js V1.0 - Enterprise Kill Switch */
const fs = require('fs');
const path = require('path');

const USAGE_FILE = path.join(__dirname, '../db/usage.json');
const DAILY_LIMIT_USD = 5.0;

/**
 * Checks if the daily budget has been reached or exceeded.
 */
function isBudgetExceeded() {
    try {
        const usage = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
        const today = new Date().toISOString().split('T')[0];

        // Reset logic if dates don't match
        if (usage.lastReset !== today) {
            usage.dailyCost = 0;
            usage.lastReset = today;
            fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
        }

        return usage.dailyCost >= DAILY_LIMIT_USD;
    } catch (e) {
        console.error("Budget Check Error:", e);
        return false; // Fail open to not block production on disk issues, but log it.
    }
}

/**
 * Logs the cost of a request and updates the daily total.
 * @param {number} cost - Cost in USD
 */
function recordInferenceCost(cost) {
    try {
        const usage = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
        usage.dailyCost += parseFloat(cost || 0);
        fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));

        console.log(`[BUDGET] Logged cost: $${cost}. Daily Total: $${usage.dailyCost.toFixed(4)} / $${DAILY_LIMIT_USD}`);
    } catch (e) {
        console.error("Budget Update Error:", e);
    }
}

module.exports = {
    isBudgetExceeded,
    recordInferenceCost,
    DAILY_LIMIT_USD
};
