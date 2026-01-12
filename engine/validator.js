/** engine/validator.js V94.1 - Syntax Fixed */
const PRODUCT_KEYWORDS_MAP = {
    'כרטיס': 'bc', 'ביקור': 'bc', 'cards': 'bc',
    'רולאפ': 'rollup', 'רול': 'rollup', 'rollup': 'rollup',
    'פוסטר': 'poster', 'poster': 'poster',
    'פלייר': 'flyer', 'flyer': 'flyer',
    'חובר': 'booklet', 'ספר': 'booklet', 'קטלוג': 'booklet', 'booklet': 'booklet',
    'מדבק': 'sticker', 'sticker': 'sticker'
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
    if (text.includes("תשנה") || text.includes("תחליף")) {
        result.intent = 'update';
    }
    
    const sizeMatch = text.match(/(\d+)\s*(?:x|X|\*|על)\s*(\d+)/);
    if (sizeMatch) {
        result.mapped_params.size = `${sizeMatch[1]}x${sizeMatch[2]}`;
        if (result.intent === 'chat') result.intent = 'update'; 
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
    
    return result;
}

module.exports = { validateLLMResult };