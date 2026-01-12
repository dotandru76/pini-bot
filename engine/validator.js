/** engine/validator.js V72.0 - Less Aggressive */
function validateLLMResult(llmResult, userText, session) {
    let result = { ...llmResult };
    const text = userText.toLowerCase();

    // 1. זיהוי עריכה/שינוי
    if (text.includes("תשנה") || text.includes("תחליף") || text.includes("במקום") || text.includes("עדכן")) {
        result.intent = 'update';
    }

    // 2. טיפול ב"בלי" / "ללא"
    if (text.includes("בלי") || text.includes("ללא") || text.includes("לא רוצה")) {
        if (!result.mapped_params) result.mapped_params = {};
        
        // Specific mapping
        if (text.includes("למינציה")) result.mapped_params.lamination = 'none';
        if (text.includes("השבחה") || text.includes("זהב") || text.includes("פויל")) result.mapped_params.finishing = 'none';
        
        // REMOVED: The aggressive auto-fill block for finishing=none
        // This allows the planner to ask about finishing later if it wasn't mentioned.
    }

    // 3. הצגת עגלה
    if (text.includes("כמה זה") || text.includes("בינתיים") || text.includes("יוצא לי")) {
        result.intent = 'show_cart';
    }

    return result;
}

module.exports = { validateLLMResult };