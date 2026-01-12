/** engine/validator.js V91.0 - Regex & Safety Net */
function validateLLMResult(llmResult, userText, session) {
    let result = { ...llmResult };
    const text = userText.toLowerCase();

    // וודא ש-mapped_params קיים
    if (!result.mapped_params) result.mapped_params = {};

    // 1. זיהוי עריכה/שינוי (Override)
    if (text.includes("תשנה") || text.includes("תחליף") || text.includes("במקום") || text.includes("טעות")) {
        result.intent = 'update';
    }

    // 2. זיהוי גדלים (Regex חזק) - מציל מקרים שה-LLM מחזיר 'chat' על מידות
    // תופס: 85x200, 85*200, 85 על 200, 85X200
    const sizeMatch = text.match(/(\d+)\s*(?:x|X|\*|על)\s*(\d+)/);
    if (sizeMatch) {
        result.mapped_params.size = `${sizeMatch[1]}x${sizeMatch[2]}`;
        // אם ה-LLM חשב שזה סתם צ'אט, נתקן אותו כי יש פה פרמטר טכני
        if (result.intent === 'chat') result.intent = 'update'; 
    }

    // 3. זיהוי נייר (Hardcoded Safety)
    if (text.includes('כרומו')) {
        if (text.includes('300')) result.mapped_params.paper_type = 'chromo_300';
        else if (text.includes('130') || text.includes('170')) result.mapped_params.paper_type = 'chromo_130';
        else result.mapped_params.paper_type = 'chromo_300'; 
        if (result.intent === 'chat') result.intent = 'update';
    }
    if (text.includes('מט') || text.includes('נטול עץ')) {
        result.mapped_params.paper_type = 'matte_350';
        if (result.intent === 'chat') result.intent = 'update';
    }

    // 4. טיפול ב"בלי" / "ללא"
    if (text.includes("בלי") || text.includes("ללא") || text.includes("לא רוצה")) {
        if (result.intent === 'chat') result.intent = 'update';
    }

    // 5. אם זו רק כמות (מספר בלבד) וה-LLM פספס
    if (/^\d+$/.test(text.trim()) && result.intent === 'chat') {
        result.intent = 'update';
    }

    return result;
}

module.exports = { validateLLMResult };