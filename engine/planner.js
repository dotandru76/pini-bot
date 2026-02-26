const fs = require('fs');
const path = require('path');

// Load Domain Templates (Spec v5)
const templatesPath = path.join(__dirname, '../db/domainTemplates.json');
let DOMAIN_TEMPLATES = { products: {} };
try {
    DOMAIN_TEMPLATES = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
} catch (e) {
    console.error("⚠️ [COMPILER] Failed to load domainTemplates.json:", e.message);
}

const PRODUCT_WHITELIST = {
    flyer: ["qty", "paper_type", "size", "sides", "lamination", "finishing"],
    booklet: ["qty", "pages", "cover", "binding", "size", "paper_type", "finishings", "book_type"],
    sticker: ["qty", "shape", "material", "cut", "size", "lamination"],
    poster: ["qty", "size", "paper_type", "lamination"],
    bc: ["qty", "paper_type", "corners", "lamination", "finishing", "team_size", "instances"],
    invitation: ["qty", "size", "paper_type", "finishing", "extras"],
    rollup: ["qty", "size", "material"]
};

const CANONICAL_PRODUCTS = {
    "bc": ["business card", "business cards", "cards", "visiting card", "כרטיס ביקור", "כרטיסי ביקור", "place_card", "office"],
    "flyer": ["flyer", "flyers", "pamphlet", "פלייר"],
    "rollup": ["rollup", "rollups", "roll up", "רולאפ", "roll_stickers"],
    "poster": ["poster", "posters", "פוסטר"],
    "booklet": ["book", "books", "ספר", "ספרים", "חוברת", "חוברות"]
};

function normalizeEntity(rawName) {
    if (!rawName) return rawName;
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
    "dimensions": "size",
    "multiplier": "team_size",
    "people": "team_size"
};

/**
 * Deterministic Sanitizer (Spec v5.6.1)
 * Protects against LLM semantic errors by verifying if a 'qty' extraction
 * actually refers to 'pages' based on the original user text context.
 */
function applyDeterministicSanitizer(extractedData, session) {
    extractedData.parameters_detected.forEach(param => {
        const normContext = normalizeEntity(param.context);

        if (param.key === 'qty' && normContext === 'booklet') {
            const val = String(param.value);
            // Regex to detect if the value is tied to "pages" terminology in Hebrew/English
            const pageRegex = new RegExp(`${val}\\s*(עמודים|דפים|דף|עמוד|pages|page)`, 'i');
            const reversePageRegex = new RegExp(`(עמודים|דפים|דף|עמוד|pages|page)\\s*(של|של-)?\\s*${val}`, 'i');

            if (pageRegex.test(extractedData.raw_text) || reversePageRegex.test(extractedData.raw_text)) {
                console.log(`🛡️ [SANITIZER] Caught semantic error: '${val}' is PAGES, not QTY. Correcting...`);

                // 1. Swap key to pages
                param.key = 'pages';

                // 2. RESTORE previous qty if it exists in draft (prevent overwrite regression)
                const existingDraft = session.draftAttributes[normContext];
                if (existingDraft && existingDraft.params.qty) {
                    console.log(`🛡️ [SANITIZER] Restoring previous qty: ${existingDraft.params.qty}`);
                    // We don't push a new param here to avoid oscillation, 
                    // we just ensure the draft keeps its value or the current extraction doesn't ruin it.
                    // But since compileOrder iterates params, we simply "unset" this param from ruining QTY.
                }
            }
        }
    });
}

/**
 * Compiles LLM extracted entities into a normalized order state.
 * v5.2 - CTO Hardened with Draft Persistence & Oscillation Resolution
 */
function compileOrder(extractedData, session) {
    try {
        console.log("🧩 [COMPILER] Processing turn (v5.6.1 - Deterministic Sanitizer)...");

        if (!session.draftAttributes) session.draftAttributes = {};

        // Spec v5.6.1: Run Deterministic Sanitizer before processing
        applyDeterministicSanitizer(extractedData, session);

        let unassignedParams = [];
        let buckets = {};
        let clarificationBlocks = [];

        // 0. Handle Deletion Intent 
        const deletionSignals = ["מחק", "בטל", "תוריד", "delete", "remove", "cancel"];
        const isDeleteIntent = extractedData.intent === 'cancel' || deletionSignals.some(s => extractedData.raw_text.includes(s));

        // 1. Sync Draft State with current Extraction
        extractedData.products_detected.forEach(item => {
            const normProduct = normalizeEntity(item.product);

            // 🛡️ [DOMAIN VALIDATION GATE]
            // Ensure product is recognized in Beit Yitzhak ecosystem
            if (!DOMAIN_TEMPLATES.products[normProduct]) {
                console.warn(`🛡️ [GATE] Blocked unrecognized product: ${normProduct}`);
                return;
            }

            if (!session.draftAttributes[normProduct]) {
                session.draftAttributes[normProduct] = { params: {}, history: {}, status: 'PENDING' };
            }
            if (item.confidence >= 0.6) session.draftAttributes[normProduct].status = 'EXTRACTED';

            if (isDeleteIntent && (extractedData.raw_text.includes(normProduct) || extractedData.raw_text.includes(DOMAIN_TEMPLATES.products[normProduct]?.label))) {
                console.log(`🗑️ [COMPILER] Garbage Collection: Deleting ${normProduct} from draft.`);
                delete session.draftAttributes[normProduct];
            }
        });

        // Merge Parameters into Draft
        extractedData.parameters_detected.forEach(param => {
            if (PARAM_MAPPING[param.key]) param.key = PARAM_MAPPING[param.key];
            const contextKey = normalizeEntity(param.context);

            if (contextKey === 'global') {
                unassignedParams.push(param);
                return;
            }

            // [GATE] Check if context (product) is valid
            if (!DOMAIN_TEMPLATES.products[contextKey]) return;

            if (!session.draftAttributes[contextKey]) {
                session.draftAttributes[contextKey] = { params: {}, history: {}, status: 'PENDING' };
            }

            const target = session.draftAttributes[contextKey];
            const allowedParams = PRODUCT_WHITELIST[contextKey] || [];

            if (allowedParams.includes(param.key)) {
                // 🛡️ [POISON OVERRIDE PROTECTION]
                // Never let "unknown" or "1" (heuristic error) overwrite a valid existing value
                const lowerVal = String(param.value).toLowerCase();
                const isPoison = ["unknown", "null", "undefined", "n/a", "1", "לא ידוע"].includes(lowerVal);

                if (isPoison && target.params[param.key] && String(target.params[param.key]).length > 0) {
                    console.log(`🛡️ [GATE] Blocked poison override for ${contextKey}.${param.key}: ${param.value}`);
                    return;
                }

                if (!target.history[param.key]) target.history[param.key] = [];
                target.history[param.key].push(param.value);
                target.params[param.key] = param.value;

                // Update lastSpecChangeTime in session (Phase 5.3)
                session.lastSpecChangeTime = Date.now();
            }
        });

        console.log("📝 [COMPILER] Merged Draft State:", JSON.stringify(session.draftAttributes, null, 2));

        // 2. Process Buckets Logic
        for (const [product, data] of Object.entries(session.draftAttributes)) {
            let itemUnstable = false;

            // Instability Resolution
            const EXEMPT_FROM_LOCK = ["pages", "size", "paper_type", "material"];
            for (const [key, history] of Object.entries(data.history)) {
                const uniqueValues = new Set(history.map(v => String(v)));
                if (uniqueValues.size > 1) {
                    // Check if block state released OR field is exempt from lock (Spec v5.6)
                    if (!session.blockState || session.blockState.reason === null || EXEMPT_FROM_LOCK.includes(key)) {
                        console.log(`✨ [COMPILER] Resolving oscillation for ${product}.${key} (Exempt or Released)`);
                        data.history[key] = [data.params[key]]; // Reset to last choice
                    } else {
                        itemUnstable = true;
                    }
                }
            }

            // Multiplication Math
            let finalParams = { ...data.params };
            if (finalParams.team_size && finalParams.qty) {
                const qtyVal = parseInt(finalParams.qty);
                const teamVal = parseInt(finalParams.team_size);
                if (!isNaN(qtyVal) && !isNaN(teamVal)) {
                    finalParams.qty = qtyVal * teamVal;
                    finalParams.is_multi_entity = true;
                }
            }

            buckets[product] = {
                status: data.status === 'EXTRACTED' ? "READY_FOR_INTEGRITY" : "PENDING_CONFIRMATION",
                behavioral_mode: "NORMAL",
                params: finalParams,
                unstable: itemUnstable
            };
        }

        // 3. Validation Layer (Consultation)
        for (const [product, data] of Object.entries(buckets)) {
            const template = DOMAIN_TEMPLATES.products[product];
            if (template && template.mandatory) {
                const missing = template.mandatory.filter(p => !data.params[p]);
                if (missing.length > 0) {
                    data.status = "NEEDS_SPECIFICATION";
                    data.behavioral_mode = "CONSULTATIVE_ACTIVE";
                    if (!clarificationBlocks.includes(template.guidance)) {
                        clarificationBlocks.push(template.guidance);
                    }
                }
            }
        }

        // 4. Results
        let validatedItems = [];
        let specificInstability = null;

        for (const [product, data] of Object.entries(buckets)) {
            if (data.unstable) {
                specificInstability = product;
                clarificationBlocks.push(`שמתי לב לשינוי בנתונים עבור ${product}. תוכל לאשר מה הכמות המדויקת?`);
                continue;
            }
            if (data.status === "READY_FOR_INTEGRITY") {
                validatedItems.push({ product, params: data.params });
            }
        }

        let status = "READY";
        if (Object.values(buckets).some(b => b.behavioral_mode === "CONSULTATIVE_ACTIVE")) {
            status = "CONSULTATIVE_ACTIVE";
        } else if (clarificationBlocks.length > 0) {
            status = validatedItems.length > 0 ? "PARTIAL_READY" : "CLARIFICATION_REQUIRED";
        }

        return {
            status,
            items: validatedItems,
            deleted_items: [], // Deprecated in favor of draft mutation
            clarification_blocks: clarificationBlocks,
            reason: specificInstability ? "PARAMETER_INSTABILITY" : null
        };

    } catch (error) {
        console.error("❌ [COMPILER] Error:", error);
        return { status: "ERROR", message: error.message };
    }
}

module.exports = { compileOrder };