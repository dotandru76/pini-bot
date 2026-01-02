const PRICING = {
    input: 0.075, // $ למיליון טוקנים
    output: 0.30, // $ למיליון טוקנים
    ils_rate: 3.6 
};

let sessionTotalCost = 0;

function trackCost(usageMetadata) {
    if (!usageMetadata) return;
    
    // הגנה מפני ערכים ריקים
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;

    const inputCost = (inputTokens / 1000000) * PRICING.input;
    const outputCost = (outputTokens / 1000000) * PRICING.output;
    const totalUsd = inputCost + outputCost;
    const totalIls = totalUsd * PRICING.ils_rate;

    if (!isNaN(totalIls)) {
        sessionTotalCost += totalIls;
    }

    console.log(`\n💰 --- מונה עלויות ---`);
    console.log(`Input Tokens: ${inputTokens} | Output Tokens: ${outputTokens}`);
    console.log(`עלות תור נוכחי: ₪${totalIls.toFixed(6)}`);
    console.log(`סה"כ סשן נוכחי: ₪${sessionTotalCost.toFixed(6)}`);
    console.log(`-----------------------\n`);
}

module.exports = { trackCost };