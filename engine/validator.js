/** engine/validator.js V94.1 - Syntax Fixed */
const fs = require('fs');
const path = require('path');

let productsDB = {};
try {
    productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'));
} catch (e) {
    console.error("Failed loading products.json in validator");
}
const VALID_PRODUCTS = new Set(Object.keys(productsDB));

const PRODUCT_KEYWORDS_MAP = {
    'כרטיס': 'bc', 'ביקור': 'bc', 'cards': 'bc',
    'רולאפ': 'rollup', 'רול': 'rollup', 'rollup': 'rollup',
    'פוסטר': 'poster', 'poster': 'poster',
    'פלייר': 'flyer', 'flyer': 'flyer',
    'חובר': 'booklet', 'ספר': 'booklet', 'קטלוג': 'booklet', 'booklet': 'booklet',
    'מדבק': 'sticker', 'sticker': 'sticker',
    'סקודיקס': 'scodix', 'scodix': 'scodix', 'פויל': 'scodix',
    'אלוקובונד': 'alucobond', 'alucobond': 'alucobond', 'שלט': 'alucobond',
    'גליל': 'roll_stickers', 'roll_stickers': 'roll_stickers'
};

function validateLLMResult(llmResult, userText, session) {
    let result = { ...llmResult };
    const text = userText.toLowerCase();

    if (!result.mapped_params) result.mapped_params = {};

    // Product Detection Override
    const detectedProductsSet = new Set();
    Object.keys(PRODUCT_KEYWORDS_MAP).forEach(keyword => {
        if (text.includes(keyword)) {
            detectedProductsSet.add(PRODUCT_KEYWORDS_MAP[keyword]);
        }
    });

    const detectedProducts = Array.from(detectedProductsSet);
    const hasNumber = /\d/.test(text);

    if (detectedProducts.length > 0 && hasNumber) {
        if (result.intent !== 'quote' || !result.product) {
            console.log(`🛡️ [VALIDATOR] Force-Switching to QUOTE. Found: ${detectedProducts.join(', ')}`);  // ✅ תוקן!
            result.intent = 'quote';

            if (!result.product) {
                result.product = detectedProducts[0];
            }
        }
        result.allDetectedProducts = detectedProducts;
    }

    // שאר הקוד נשאר אותו דבר...
    const updateKeywords = ["תשנה", "תחליף", "עדכן", "כמות", "ל-", "למעלה", "למטה", "במקום"];
    if (updateKeywords.some(k => text.includes(k))) {
        result.intent = 'update';
    }

    const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:x|X|\*|על)\s*(\d+(?:\.\d+)?)/);
    if (sizeMatch) {
        result.mapped_params.size = `${sizeMatch[1]}x${sizeMatch[2]}`;
        if (result.intent === 'chat') result.intent = 'update';
    }

    // --- PHASE 1.3 UAT Hotfix: Alucobond vs Office Intercept ---
    if (text.includes('אלוקובונד') || text.includes('alucobond')) {
        if (result.product === 'office') {
            console.log(`\x1b[33m🛡️ [X-RAY VALIDATOR] Intercepted LLM hallucination: Swapped 'office' for 'alucobond'\x1b[0m`);
            result.product = 'alucobond';
            result.intent = 'quote';
        }
    }

    if (text.includes('כרומו')) {
        if (text.includes('300')) result.mapped_params.paper_type = 'chromo_300';
        else result.mapped_params.paper_type = 'chromo_130';
        if (result.intent === 'chat') result.intent = 'update';
    }

    if (text.includes('מט')) {
        result.mapped_params.paper_type = 'matte_350';
        if (result.intent === 'chat') result.intent = 'update';
    }

    if (text.includes("בלי") || text.includes("ללא")) {
        if (result.intent === 'chat') result.intent = 'update';
    }

    if (/^\d+$/.test(text.trim()) && result.intent === 'chat') {
        result.intent = 'update';
    }

    // --- PHASE 1.3 Anti-Hallucination: Confidence Gate ---
    if (result.confidence !== undefined && result.confidence < 0.85) {
        console.log(`\x1b[31m🛡️ [X-RAY VALIDATOR] Confidence Gate Blocked: ${result.confidence} is below 0.85 threshold.\x1b[0m`);
        result.intent = 'chat';
        result.product = null;
        result.answer_text = "אני לא לגמרי בטוח בכוונתך, אפשר לנסח שוב?";
    }

    // --- PHASE 1.3 Anti-Hallucination: Product Whitelist ---
    if (result.product && !VALID_PRODUCTS.has(result.product)) {
        console.log(`\x1b[31m🛡️ [X-RAY VALIDATOR] Product Whitelist Blocked: '${result.product}' does not exist in DB.\x1b[0m`);
        result.intent = 'chat';
        result.product = null;
        result.answer_text = "לצערי אין לנו את המוצר הזה כרגע במערכת. לחזור לתפריט?";
    }

    // --- PHASE 1.3 Anti-Hallucination: Quantity Clamp ---
    if (result.mapped_params && result.mapped_params.qty !== undefined) {
        const rawQty = parseInt(result.mapped_params.qty);
        if (!isNaN(rawQty)) {
            // הגבלת מינימום ומקסימום אגרסיבית (1 עד 100,000)
            const clampedQty = Math.max(1, Math.min(rawQty, 100000));
            if (rawQty !== clampedQty) {
                console.log(`\x1b[33m🛡️ [X-RAY VALIDATOR] Quantity Clamped from ${rawQty} to ${clampedQty}.\x1b[0m`);
            }
            result.mapped_params.qty = clampedQty;
        }
    }

    return result;
}

module.exports = { validateLLMResult };