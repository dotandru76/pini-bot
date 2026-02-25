const { isBudgetExceeded, recordInferenceCost, DAILY_LIMIT_USD } = require('../services/budgetManager');
const fs = require('fs');
const path = require('path');

const USAGE_FILE = path.join(__dirname, '../db/usage.json');

async function testBudgetFlow() {
    console.log("🧪 Testing Budget Manager Flow...");

    // 1. Reset file for testing
    fs.writeFileSync(USAGE_FILE, JSON.stringify({ dailyCost: 0, lastReset: "2026-02-25" }));

    // 2. Initial check
    let exceeded = isBudgetExceeded();
    console.log(`Initial Check (Should be false): ${exceeded}`);

    // 3. Log some costs
    recordInferenceCost(1.5);
    recordInferenceCost(2.0);
    console.log(`Current Check (Should be false, total 3.5): ${isBudgetExceeded()}`);

    // 4. Hit limit
    recordInferenceCost(1.6); // Total 5.1
    exceeded = isBudgetExceeded();
    console.log(`Final Check (Should be true, total 5.1): ${exceeded}`);

    if (exceeded && DAILY_LIMIT_USD === 5.0) {
        console.log("✅ Budget Kill Switch Verified.");
    } else {
        console.error("❌ Budget Kill Switch Failure.");
        process.exit(1);
    }
}

testBudgetFlow();
