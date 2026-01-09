/** engine/validator.js V37.1 - Safe Guard */
const fs = require('fs');

const PRODUCT_KEYWORDS = {
    'כרטיס': 'bc', 'ביקור': 'bc', 'פלייר': 'flyer', 'עלון': 'flyer',
    'הזמנ': 'invitation', 'רולאפ': 'rollup', 'מדבק': 'sticker', 'סטיקר': 'sticker',
    'חוברת': 'booklet', 'ספר': 'booklet', 'קטלוג': 'booklet', 'ברכון': 'booklet',
    'פולדר': 'folder', 'מעטפ': 'envelope'
};

function validateLLMResult(llmResult, rawText, session) {
    console.log(`🛡️ [VALIDATOR] Input Intent: "${llmResult.intent}"`);
    
    const text = rawText.toLowerCase().trim();
    let validated = { ...llmResult };
    validated.mapped_params = validated.mapped_params || {};

    // 1. זיהוי נייר ספציפי
    if (text.includes('כרומו')) {
        if (text.includes('300') || text.includes('עבה')) validated.mapped_params.paper_type = 'chromo_300';
        if (text.includes('130') || text.includes('דק')) validated.mapped_params.paper_type = 'chromo_130';
        if (text.includes('170')) validated.mapped_params.paper_type = 'chromo_170';
        if (validated.intent === 'chat') validated.intent = 'update';
    }

    // 2. זיהוי פרידה (התיקון: רק פרידה מפורשת מוחקת הקשר!)
    const byeWords = ['ביי', 'להתראות', 'יאללה ביי', 'נדבר מחר', 'סיימנו'];
    if (byeWords.some(w => text === w || text.includes(' ' + w) || text.startsWith(w + ' '))) {
        console.log(`🛡️ [VALIDATOR] Explicit Goodbye -> Clearing context`);
        validated.intent = 'chat';
        validated.product = null;
        validated.answer_text = "שמחתי לעזור! אני כאן אם תצטרך עוד משהו. 👋";
    }

    // 3. הגנת שלילה
    if (validated.intent === 'remove') {
        const negationWords = ['לא', 'בלי', 'ללא', 'none'];
        const featureWords = ['הדפסה', 'למינציה', 'צבע', 'עיצוב', 'גימור'];
        const hasProductKeyword = Object.keys(PRODUCT_KEYWORDS).some(k => text.includes(k));

        if (negationWords.some(w => text.includes(w)) && featureWords.some(w => text.includes(w)) && !hasProductKeyword) {
            console.log(`🛡️ [VALIDATOR] Blocked Remove -> Converting to Update`);
            validated.intent = 'update';
            if (text.includes('הדפסה')) validated.mapped_params.print = 'none';
            if (text.includes('למינציה')) validated.mapped_params.lamination = 'none';
            if (text.includes('עיצוב')) validated.mapped_params.design = 'none';
            if (text.includes('גימור')) validated.mapped_params.finishing = 'none';
        }
    }

    // 4. זיהוי מטרים
    const meterMatch = text.match(/(\d+)\s*מטר/);
    if (meterMatch) {
        validated.mapped_params.qty = parseInt(meterMatch[1]);
        if (validated.intent === 'chat') validated.intent = 'update';
    }

    // 5. ניתוב קשיח (Hard Routing)
    for (const [key, val] of Object.entries(PRODUCT_KEYWORDS)) {
        if (text.includes(key)) {
            if (validated.product !== val) {
                console.log(`🛡️ [VALIDATOR] Fixed Product: "${key}" -> ${val}`);
                validated.product = val;
                
                const numMatch = text.match(/(\d+)/);
                if (numMatch && parseInt(numMatch[0]) > 0 && !text.includes('מחק')) {
                    validated.intent = 'quote';
                    validated.mapped_params.qty = parseInt(numMatch[0]);
                } else if (validated.intent === 'chat') {
                    validated.intent = 'quote';
                }
            }
        }
    }

    return validated;
}

module.exports = { validateLLMResult };