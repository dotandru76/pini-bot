/**
 * Pini Print Bot - Conversational Order Compiler (Planner v4.0)
 * CTO Mandate: Phase 4 Rewrite
 * Dual Threshold, Weighted Ambiguity, Oscillation, Strict Contract
 */

const PRODUCT_WHITELIST = {
    flyer: ["qty", "paper_type", "size", "sides"],
    booklet: ["qty", "pages", "cover", "binding"],
    sticker: ["qty", "shape", "material"],
    poster: ["qty", "size", "paper_type"],
    bc: ["qty", "paper_type", "corners"]
};

/**
 * Compiles LLM extracted entities into a normalized order state.
 * Enforces strict CTO logic for stability and ambiguity.
 */
function compileOrder(extractedData) {
    try {
        let unassignedParams = [];
        let buckets = {};
        let clarificationBlocks = [];

        // 1. Dual Confidence Threshold (CTO Correction #2)
        // Mixed Confidence Rule: If any product is marginal, reject the turn for clarification.
        const isMixedConfidence = extractedData.products_detected.some(item => item.confidence < 0.85 && item.confidence >= 0.75);

        if (isMixedConfidence) {
            return {
                status: "CLARIFICATION_REQUIRED",
                clarification_blocks: ["שמתי לב לכמה פריטים שאני לא בטוח לגביהם. תוכל לאשר מה בדיוק אתה רוצה להזמין?"],
                reason: "MIXED_CONFIDENCE_REJECTION"
            };
        }

        extractedData.products_detected.forEach(item => {
            if (item.confidence >= 0.85) {
                // Initialize entity bucket
                // If same product exists, this supports split lines if we add ID, 
                // but for now we follow the "Replace/Don't merge" turn-based rule.
                buckets[item.product] = {
                    params: {},
                    history: {},
                    unstable: false
                };
            }
        });

        // 2. Param Isolation & Oscillation Detection (CTO Correction #4)
        extractedData.parameters_detected.forEach(param => {
            // Find target bucket or assign to global if missing/unassigned
            const targetBucket = buckets[param.context];

            if (targetBucket) {
                // Whitelist Enforcement
                const allowedParams = PRODUCT_WHITELIST[param.context] || [];
                if (!allowedParams.includes(param.key)) {
                    console.log(`🛡️ [COMPILER] Dropping invalid param: ${param.key} for ${param.context}`);
                    return;
                }

                // Formal Oscillation Logic
                if (!targetBucket.history[param.key]) targetBucket.history[param.key] = [];
                targetBucket.history[param.key].push(param.value);

                if (targetBucket.history[param.key].length > 1) {
                    const uniqueValues = new Set(targetBucket.history[param.key]);
                    if (uniqueValues.size > 1) {
                        targetBucket.unstable = true;
                    }
                }

                // Always take latest value as current, but mark instability
                targetBucket.params[param.key] = param.value;
            } else {
                unassignedParams.push(param);
            }
        });

        // 3. Weighted Ambiguity Rule (CTO Correction #3)
        const isQtyAmbiguous = unassignedParams.some(p => p.key === "qty");
        const totalParamsInput = extractedData.parameters_detected.length;
        const ambiguityRatio = totalParamsInput > 0 ? (unassignedParams.length / totalParamsInput) : 0;

        // Tiered Ambiguity Response
        if (isQtyAmbiguous) {
            return { status: "HARD_FAIL", reason: "AMBIGUOUS_QUANTITY" };
        }
        if (ambiguityRatio > 0.60) {
            return { status: "HARD_FAIL", reason: "EXTREME_AMBIGUITY" };
        }
        if (ambiguityRatio > 0.40) {
            return {
                status: "CLARIFICATION_REQUIRED",
                clarification_blocks: ["יש לי כמה פרטים שאני לא בטוח לאיזה מוצר הם שייכים. תוכל לעשות סדר?"],
                reason: "WEIGHTED_AMBIGUITY_WARNING"
            };
        }

        // 4. Final Validation & Stability Check
        let validatedItems = [];

        for (const [product, data] of Object.entries(buckets)) {
            if (data.unstable) {
                clarificationBlocks.push(`שמתי לב לשינוי בנתונים עבור ${product}. מה הכמות או המפרט הסופיים?`);
                continue;
            }

            // Entity Completeness (Minimum requirement: qty)
            if (!data.params.qty) {
                clarificationBlocks.push(`לגבי ה-${product}, חסרה לי כמות. כמה להזמין?`);
            } else {
                validatedItems.push({
                    product: product,
                    mapped_params: data.params,
                    _compiler: { stability: "HIGH" }
                });
            }
        }

        // 5. Strict Status Contract
        if (clarificationBlocks.length > 0) {
            return {
                status: "CLARIFICATION_REQUIRED",
                clarification_blocks: clarificationBlocks,
                reason: buckets && Object.values(buckets).some(b => b.unstable) ? "PARAMETER_INSTABILITY" : "MISSING_SLOTS"
            };
        }

        if (validatedItems.length === 0) {
            return { status: "HARD_FAIL", reason: "NO_VALID_ENTITIES_CONSTRUCTED" };
        }

        return {
            status: "READY",
            data: validatedItems
        };

    } catch (error) {
        console.error("💥 [COMPILER FATAL]:", error);
        return { status: "HARD_FAIL", reason: "COMPILER_CRASH" };
    }
}

module.exports = { compileOrder };