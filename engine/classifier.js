/** engine/classifier.js V98.0 - Data Integrity Fix */
const { validateLLMResult } = require('./validator');
const { routeWithLLM } = require('../services/llmService');
const { downloadFile } = require('../services/storageService');

const KEYWORDS = {
    reset: ['reset', 'התחל', 'איפוס', 'ריסט', 'תפריט'],
    cart: ['עגלה', 'סיכום', 'כמה זה יוצא', 'כמה יצא'],
    checkout: ['תארוז', 'הצעת מחיר', 'לשלם', 'חשבון', 'צ\'ק אאוט', 'checkout'],
    greeting: ['היי', 'שלום', 'הי', 'אהלן', 'בוקר טוב', 'ערב טוב'],
    bye: ['ביי', 'להתראות', 'תודה', 'יום טוב'],
    remove: ['מחק', 'תסיר', 'להוריד', 'remove']
};

async function classify(text, session) {
    // 1. Crash Proofing: המרה בטוחה לטקסט
    const safeText = String(text || "");
    const t = safeText.toLowerCase().trim();

    // 2. SUPER FAST PATH: Technical Codes (Buttons & System Actions)
    if (t.startsWith('system_remove_item_')) {
        const index = parseInt(t.replace('system_remove_item_', ''));
        console.log(`🚀 [CLASSIFIER] Fast Path: Remove Item ${index}`);
        return { intent: 'remove_specific', payload: { index } };
    }

    if (t.startsWith('system_update_qty_')) {
        const parts = t.replace('system_update_qty_', '').split('_');
        const index = parseInt(parts[0]);
        const qty = parseInt(parts[1]);
        console.log(`🚀 [CLASSIFIER] Fast Path: Update Qty Item ${index} to ${qty}`);
        return { intent: 'update_qty', payload: { index, qty } };
    }

    if (/^[a-z]+_[a-z0-9_]+$/.test(t)) {
        console.log(`🚀 [CLASSIFIER] Fast Path (Button Click): ${t}`);
        return {
            intent: 'update',
            raw_text: safeText, // ✅ יש פה raw_text
            mapped_params: {}
        };
    }

    // --- PHASE 1.3 Anti-Hallucination: Hybrid Detection (Regex Fast Path) ---
    // Bypass LLM completely for common structural requests like "1000 פליירים"
    // CRITICAL FIX: Skip this if update keywords are present to avoid duplication.
    const updateKeywords = ["תשנה", "תחליף", "עדכן", "כמות", "ל-", "למעלה", "למטה", "במקום", "update", "qty", "change", "replace", "fix"];
    const isUpdateIntent = updateKeywords.some(k => t.includes(k));

    const regexMatch = !isUpdateIntent && t.match(/(\d+)\s*(פליירים|פלייר|מדבקות|מדבקה|חוברת|חוברות|קטלוג)/);
    if (regexMatch) {
        let qty = parseInt(regexMatch[1]);
        let prodTerm = regexMatch[2];
        let detectedProduct = 'flyer';

        if (prodTerm.includes('מדבק')) detectedProduct = 'sticker';
        if (prodTerm.includes('חובר') || prodTerm.includes('קטלוג')) detectedProduct = 'booklet';

        console.log(`\x1b[35m🔍 [X-RAY CLASSIFIER] Intent: quote (Hybrid Regex Fast Path) | Product: ${detectedProduct} | Qty: ${qty}\x1b[0m`);
        return {
            intent: 'quote',
            product: detectedProduct,
            mapped_params: { qty },
            raw_text: safeText,
            confidence: 1.0,
            _debug: { source: "Regex Fast-Path", cost: "₪0" }
        };
    }

    // --- PHASE 1.3: UAT Hotfix Alucobond Bypass ---
    if (t.includes('אלוקובונד') || t.includes('alucobond')) {
        console.log(`\x1b[35m🔍 [X-RAY CLASSIFIER] Intent: quote (Alucobond Fast Path)\x1b[0m`);
        let fastPathObj = {
            intent: 'quote',
            product: 'alucobond',
            mapped_params: { qty: 1 }, // Default qty to 1 for Alucobond if missing
            raw_text: safeText,
            confidence: 1.0,
            _debug: { source: "Regex Fast-Path", cost: "₪0" }
        };
        // העברת האובייקט בוולידטור כדי לדלות מידות (לדוגמה 10x10) דרך ה-Regex של הוולידטור
        return validateLLMResult(fastPathObj, safeText, session);
    }
    // ------------------------------------------------------------------------

    // 3. Fast Path - מילות מפתח
    if (KEYWORDS.reset.some(k => t.includes(k))) {
        console.log(`\x1b[35m🔍 [X-RAY CLASSIFIER] Intent: reset (Keyword Fast Path)\x1b[0m`);
        return { intent: 'reset' };
    }
    if (KEYWORDS.cart.some(k => t.includes(k))) {
        console.log(`\x1b[35m🔍 [X-RAY CLASSIFIER] Intent: show_cart (Keyword Fast Path)\x1b[0m`);
        return { intent: 'show_cart' };
    }

    if (session.cart && session.cart.length > 0) {
        if (KEYWORDS.checkout.some(k => t.includes(k))) return { intent: 'show_cart' };
    }

    if (KEYWORDS.greeting.some(k => t.startsWith(k)) && t.length < 20) {
        return { intent: 'chat', aiResponse: 'היי! אני פיני 👨‍🎨, מה נדפיס היום?' };
    }

    if (KEYWORDS.bye.some(k => t.includes(k))) {
        return { intent: 'chat', aiResponse: 'בשמחה! מוזמן לחזור מתי שתרצה.' };
    }

    if (KEYWORDS.remove.some(k => t.includes(k))) {
        console.log(`\x1b[35m🔍 [X-RAY CLASSIFIER] Intent: remove (Keyword Fast Path)\x1b[0m`);
        return { intent: 'remove' };
    }

    // 4. LLM Pipeline (למלל חופשי כמו "500")
    try {
        let imageBuffer = null;

        // --- PHASE 2.2: Vision Attachment Handling ---
        if (safeText.includes('[IMAGE_UPLOADED:')) {
            const match = safeText.match(/\[IMAGE_UPLOADED:\s*([^\]]+)\]/);
            if (match) {
                const remotePath = match[1].trim();
                console.log(`📸 [CLASSIFIER] Vision Request detected. Fetching: ${remotePath}`);
                try {
                    imageBuffer = await downloadFile(remotePath);
                } catch (e) {
                    console.error("Failed to fetch vision buffer:", e);
                    return { intent: 'chat', aiResponse: 'הקובץ עלה אך לא הצלחתי לנתח אותו טכנית. תוכל לשלוח שוב?' };
                }
            }
        }

        const llmResult = await routeWithLLM(safeText, session, imageBuffer);
        console.log(`\x1b[35m🔍 [X-RAY CLASSIFIER] Intent: ${llmResult.intent || 'chat'} (${imageBuffer ? 'Vision-Layer2' : 'LLM-Structured'})\x1b[0m`);

        // --- GOVERNANCE FIX: Preserve Raw Text for Planner ---
        llmResult.raw_text = safeText;

        const validated = validateLLMResult(llmResult, safeText, session);
        return validated;
    } catch (e) {
        console.error("Classifier Error:", e);
        return { intent: 'chat', aiResponse: 'סליחה, הייתה תקלה רגעית. נסה שוב?' };
    }
}

module.exports = { classifyMessage: classify };