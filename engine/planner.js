/**
 * Pini Print Bot - Conversational Order Compiler (Planner v4.2)
 * CTO Mandate: The Smart Gateway Architecture
 */

const PRODUCT_WHITELIST = {
    flyer: ["qty", "paper_type", "size", "sides", "lamination", "finishing"],
    booklet: ["qty", "pages", "cover", "binding", "size", "paper_type", "finishings"],
    sticker: ["qty", "shape", "material", "cut", "size", "lamination"],
    poster: ["qty", "size", "paper_type", "lamination"],
    bc: ["qty", "paper_type", "corners", "lamination", "finishing"],
    invitation: ["qty", "size", "paper_type", "finishing", "extras"],
    rollup: ["qty", "size", "material"]
};

// Expanded to catch common hallucinations seen in Chaos Test
const CANONICAL_PRODUCTS = {
    "bc": ["business card", "business cards", "cards", "visiting card", "כרטיס ביקור", "כרטיסי ביקור", "place_card", "office"],
    "flyer": ["flyer", "flyers", "pamphlet", "פלייר"],
    "rollup": ["rollup", "rollups", "roll up", "רולאפ", "roll_stickers"],
    "poster": ["poster", "posters", "פוסטר"]
};

function normalizeEntity(rawName) {
    if (!rawName) return rawName;
    // Replace underscores with spaces and trim
    const cleanName = rawName.toLowerCase().trim().replace(/_/g, " ");
    for (const [canonical, synonyms] of Object.entries(CANONICAL_PRODUCTS)) {
        if (synonyms.some(s => s.toLowerCase() === cleanName) || canonical === cleanName) {
            return canonical;
        }
    }
    return cleanName;
}

const PARAM_MAPPING = {
    "quantity": "qty",
    "amount": "qty",
    "paper_weight": "paper_type",
    "paper": "paper_type",
    "material_type": "material",
    "dimensions": "size"
};

/**
 * Compiles LLM extracted entities into a normalized order state.
 */
function compileOrder(extractedData) {
    try {
        console.log("🧩 [COMPILER] Processing turn (v4.2 - Smart Gateway)...");

        let unassignedParams = [];
        let buckets = {};
        let clarificationBlocks = [];

        // 1. Partial Commit Model (State Isolation)
        // Note: Global Mixed Confidence Rejection REMOVED per CTO mandate.
        extractedData.products_detected.forEach(item => {
            const normProduct = normalizeEntity(item.product);

            if (item.confidence >= 0.6) {
                buckets[normProduct] = {
                    status: "READY_FOR_INTEGRITY",
                    params: {},
                    history: {},
                    unstable: false
                };
            } else if (item.confidence >= 0.3) {
                buckets[normProduct] = {
                    status: "PENDING_CONFIRMATION",
                    params: {},
                    history: {},
                    unstable: false
                };
                clarificationBlocks.push(`זיהיתי שביקשת ${normProduct}, האם לאשר ולתמחר?`);
            }
        });

        // 2. Param Isolation & Oscillation Detection
        extractedData.parameters_detected.forEach(param => {
            if (PARAM_MAPPING[param.key]) {
                param.key = PARAM_MAPPING[param.key];
            }

            const contextKey = normalizeEntity(param.context);
            const targetBucket = buckets[contextKey];

            if (targetBucket) {
                const allowedParams = PRODUCT_WHITELIST[contextKey] || [];
                if (!allowedParams.includes(param.key)) {
                    console.log(`🛡️ [COMPILER] Dropping invalid param: ${param.key} for ${contextKey}`);
                    return;
                }

                if (!targetBucket.history[param.key]) targetBucket.history[param.key] = [];
                targetBucket.history[param.key].push(param.value);

                if (targetBucket.history[param.key].length > 1) {
                    const uniqueValues = new Set(targetBucket.history[param.key]);
                    if (uniqueValues.size > 1) {
                        targetBucket.unstable = true;
                    }
                }
                targetBucket.params[param.key] = param.value;
            } else {
                unassignedParams.push(param);
            }
        });

        // 3. Bucket-Scoped Ambiguity Rule
        const isQtyGlobal = unassignedParams.some(p => (p.key === "qty" || p.key === "quantity"));
        const anyBucketHasQty = Object.values(buckets).some(b => b.params.qty);

        if (isQtyGlobal && !anyBucketHasQty) {
            console.log("🚨 [COMPILER] HARD_FAIL: Ambiguous Quantity.");
            return { status: "HARD_FAIL", reason: "AMBIGUOUS_QUANTITY" };
        }

        // Push clarification for significant unassigned params
        if (unassignedParams.length > 0) {
            const significantKeys = [...new Set(unassignedParams.filter(p => p.confidence > 0.6).map(p => p.key))];
            if (significantKeys.length > 0) {
                clarificationBlocks.push(`יש לי כמה פרטים (${significantKeys.join(", ")}) שאני לא בטוח לאיזה מוצר הם שייכים.`);
            }
        }

        // 4. Final Validation & Stability Check
        let validatedItems = [];
        let specificInstability = null;

        console.log("   Final Buckets Check:", JSON.stringify(buckets, null, 2));

        for (const [product, data] of Object.entries(buckets)) {
            if (data.unstable) {
                console.log(`🚨 [COMPILER] Instability detected for ${product}`);
                specificInstability = product;
                clarificationBlocks.push(`שמתי לב לשינוי בנתונים עבור ${product}. תוכל לאשר מה הכמות המדויקת?`);
                continue; // Skip this item but allow others
            }

            // ONLY READY_FOR_INTEGRITY items are eligible for processing
            if (data.status === "READY_FOR_INTEGRITY") {
                console.log(`✅ [COMPILER] Validating READY item: ${product}`);
                validatedItems.push({
                    product,
                    params: data.params
                });
            } else {
                console.log(`⏳ [COMPILER] Item ${product} is ${data.status}`);
            }
        }

        console.log("   Final Validated Items Count:", validatedItems.length);

        let status = "READY";
        if (clarificationBlocks.length > 0) {
            status = validatedItems.length > 0 ? "PARTIAL_READY" : "CLARIFICATION_REQUIRED";
        }

        return {
            status,
            items: validatedItems,
            clarification_blocks: clarificationBlocks,
            reason: specificInstability ? "PARAMETER_INSTABILITY" : null
        };

    } catch (error) {
        console.error("❌ [COMPILER] Error:", error);
        return { status: "ERROR", message: error.message };
    }
}

module.exports = { compileOrder };