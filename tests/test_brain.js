/**
 * Test Pini's Brain & Menus
 * =========================
 * בדיקה שהידע העסקי מוזרק לפרומפט ושנוצרים תפריטים
 */

const { generateSystemPrompt } = require('../services/sessionManager');
const { buildResponse } = require('../engine/responseBuilder');

// 1. נדמה סשן של משתמש
const userId = "test_user_123";
const mockSession = {
    id: userId,
    cart: [{ product_name: 'flyer', qty: 1000, client_price: 500 }]
};

// 2. בדיקת הזרקת ידע (RAG)
console.log("\n🧠 --- Testing Knowledge Injection (System Prompt) ---");
const prompt = generateSystemPrompt(userId);

if (prompt.includes("דפוס בית יצחק") && prompt.includes("איפה אתם יושבים?")) {
    console.log("✅ SUCCESS: Business info & FAQ injected into prompt.");
} else {
    console.log("❌ FAIL: System prompt is missing business info.");
    console.log("Preview:", prompt.substring(0, 200));
}

// 3. בדיקת תפריטים (Menus)
console.log("\n🔘 --- Testing Dynamic Menus ---");

// מקרה א': המשתמש קיבל הצעת מחיר לפלייר
const response1 = buildResponse(mockSession, { action: 'quote', data: { product: 'flyer' } }, "הנה המחיר", {});
console.log("Scenario: Quote for Flyer");
console.log("Buttons:", response1.meta.quick_replies);

if (response1.meta.quick_replies.includes("נייר 135 גרם (דק)")) {
    console.log("✅ SUCCESS: Correct chips for Flyer displayed.");
} else {
    console.log("❌ FAIL: Wrong menu for Flyer.");
}

// מקרה ב': המשתמש רק אמר שלום
const response2 = buildResponse(mockSession, { action: 'greeting', data: {} }, "שלום", {});
console.log("\nScenario: Greeting");
console.log("Buttons:", response2.meta.quick_replies);

if (response2.meta.quick_replies.includes("כרטיסי ביקור 💳")) {
    console.log("✅ SUCCESS: Main menu displayed.");
} else {
    console.log("❌ FAIL: Wrong menu for Greeting.");
}

console.log("\n------------------------------------------------");