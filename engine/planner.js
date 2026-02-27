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

// Load Domain Knowledge (Spec v5.7)
let DOMAIN_KNOWLEDGE = {};
try {
    DOMAIN_KNOWLEDGE = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/domainKnowledge.json'), 'utf8'));
} catch (e) {
    console.warn("⚠️ [COMPILER] No domainKnowledge.json found.");
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
 */
function applyDeterministicSanitizer(extractedData, session) {
    extractedData.parameters_detected.forEach(param => {
        const normContext = normalizeEntity(param.context);
        if (param.key === 'qty' && normContext === 'booklet') {
            const val = String(param.value);
            const pageRegex = new RegExp(`${val}\\s*(עמודים|דפים|דף|עמוד|pages|page)`, 'i');
            const reversePageRegex = new RegExp(`(עמודים|דפים|דף|עמוד|pages|page)\\s*(של|של-)?\\s*${val}`, 'i');
            if (pageRegex.test(extractedData.raw_text) || reversePageRegex.test(extractedData.raw_text)) {
                console.log(`🛡️ [SANITIZER] Caught semantic error: '${val}' is PAGES, not QTY. Correcting...`);
                param.key = 'pages';
            }
        }
    });
}

/**
 * Spec v5.7: Structured Session State Builder
 */
function buildSessionStateContext(session) {
    const product = session.currentProduct || "unknown";
    const activeProduct = (session.active_products || []).find(p => p.type === product && p.status !== 'confirmed') || { attributes: {} };
    let missing = [];
    const template = DOMAIN_TEMPLATES.products[product];
    if (template && template.mandatory) {
        missing = template.mandatory.filter(p => !activeProduct.attributes[p]);
    }
    return {
        current_intent: session.lastIntent || "unknown",
        active_product: product,
        extracted_slots: activeProduct.attributes,
        missing_mandatory_slots: missing,
        conversation_phase: missing.length > 0 ? "slot_filling" : (product !== "unknown" ? "ready_for_quote" : "discovery"),
        last_bot_question: session.lastBotMessage || "None"
    };
}

/**
 * Spec v5.7: JIT Knowledge Lookup (Mini-RAG)
 * Enhanced to support intent-aware proactive injection.
 */
function getJITKnowledge(text, extraction = null) {
    let snippetsSet = new Set();
    const cleanText = text.toLowerCase();

    // 1. Keyword-based matching
    const isComparisonQuery = ["הבדל", "הבדלים", "שוני", "מה עדיף", "איזה עדיף", "מה ההבדל"].some(k => cleanText.includes(k));

    for (const category in DOMAIN_KNOWLEDGE) {
        for (const itemKey in DOMAIN_KNOWLEDGE[category]) {
            const item = DOMAIN_KNOWLEDGE[category][itemKey];
            if (item.keywords && item.keywords.some(k => cleanText.includes(k.toLowerCase()))) {
                snippetsSet.add(`${itemKey.toUpperCase()}: ${item.description}`);

                // If comparison, pull siblings in the same category
                if (isComparisonQuery) {
                    for (const siblingKey in DOMAIN_KNOWLEDGE[category]) {
                        const sibling = DOMAIN_KNOWLEDGE[category][siblingKey];
                        snippetsSet.add(`${siblingKey.toUpperCase()}: ${sibling.description}`);
                    }
                }
            }
        }
    }

    // 2. Intent-driven proactive injection (CTO Directive)
    if (extraction) {
        const products = (extraction.products_detected || []).map(p => normalizeEntity(p.product));
        const isAdviceRequest = ["איך", "כיצד", "המלצה", "הצעה", "מה כדאי", "מה מומלץ", "איך אפשר"].some(k => cleanText.includes(k));

        // Helper to inject entire category
        const injectCategory = (cat) => {
            if (DOMAIN_KNOWLEDGE[cat]) {
                for (const key in DOMAIN_KNOWLEDGE[cat]) {
                    snippetsSet.add(`${key.toUpperCase()}: ${DOMAIN_KNOWLEDGE[cat][key].description}`);
                }
            }
        };

        // Targeting logic
        if (products.includes('bc')) {
            injectCategory('paper_types');
            injectCategory('laminations');
        }
        if (products.includes('booklet')) {
            injectCategory('paper_types');
            injectCategory('bindings');
        }
        if (isComparisonQuery || extraction.intent === 'consult' || isAdviceRequest) {
            injectCategory('finishes');
        }
    }

    return Array.from(snippetsSet).slice(0, 8).join("\n");
}

/**
 * Compiles LLM extracted entities into a normalized order state.
 */
function compileOrder(extractedData, session) {
    try {
        console.log("🧩 [COMPILER] Processing turn (v5.7.1 - Unified Product State)...");
        if (!session.active_products) session.active_products = [];
        applyDeterministicSanitizer(extractedData, session);

        let buckets = {};
        let fallbackGuidance = [];

        // Update currentProduct from extraction if found
        if (extractedData.products_detected.length > 0) {
            const firstProduct = normalizeEntity(extractedData.products_detected[0].product);
            if (DOMAIN_TEMPLATES.products[firstProduct]) {
                session.currentProduct = firstProduct;
            }
        }

        const deletionSignals = ["מחק", "בטל", "תוריד", "delete", "remove", "cancel"];
        const isDeleteIntent = extractedData.intent === 'cancel' || deletionSignals.some(s => extractedData.raw_text.includes(s));
        let deletedItems = [];

        extractedData.products_detected.forEach(item => {
            const normProduct = normalizeEntity(item.product);
            if (!DOMAIN_TEMPLATES.products[normProduct]) return;

            let activeItem = session.active_products.find(p => p.type === normProduct && p.status !== 'confirmed');
            if (!activeItem) {
                activeItem = { type: normProduct, status: 'draft', attributes: {}, history: {} };
                session.active_products.push(activeItem);
            }

            if (item.confidence >= 0.6 && activeItem.status === 'draft') activeItem.status = 'extracted';

            if (isDeleteIntent && (extractedData.raw_text.includes(normProduct) || extractedData.raw_text.includes(DOMAIN_TEMPLATES.products[normProduct]?.label))) {
                session.active_products = session.active_products.filter(p => p !== activeItem);
                if (session.cart) session.cart = session.cart.filter(c => c.product !== normProduct);
                deletedItems.push(normProduct);
            }
        });

        extractedData.parameters_detected.forEach(param => {
            if (PARAM_MAPPING[param.key]) param.key = PARAM_MAPPING[param.key];
            const contextKey = normalizeEntity(param.context);
            if (contextKey === 'global') return;
            if (!DOMAIN_TEMPLATES.products[contextKey]) return;

            let activeItem = session.active_products.find(p => p.type === contextKey && p.status !== 'confirmed');
            if (!activeItem) {
                activeItem = { type: contextKey, status: 'draft', attributes: {}, history: {} };
                session.active_products.push(activeItem);
            }

            const allowedParams = PRODUCT_WHITELIST[contextKey] || [];
            if (allowedParams.includes(param.key)) {
                if (!activeItem.history[param.key]) activeItem.history[param.key] = [];
                activeItem.history[param.key].push(param.value);
                activeItem.attributes[param.key] = param.value;
                session.lastSpecChangeTime = Date.now();
            }
        });

        for (const activeItem of session.active_products) {
            if (activeItem.status === 'confirmed') continue;

            let itemUnstable = false;
            for (const [key, history] of Object.entries(activeItem.history || {})) {
                const uniqueValues = new Set(history.map(v => String(v)));
                if (uniqueValues.size > 1) itemUnstable = true;
            }
            let finalParams = { ...activeItem.attributes };
            buckets[activeItem.type] = {
                status: activeItem.status === 'extracted' ? "READY_FOR_INTEGRITY" : "PENDING_CONFIRMATION",
                params: finalParams,
                unstable: itemUnstable
            };
        }

        for (const [product, data] of Object.entries(buckets)) {
            const template = DOMAIN_TEMPLATES.products[product];
            if (template && template.mandatory) {
                const missing = template.mandatory.filter(p => !data.params[p]);
                if (missing.length > 0) {
                    data.status = "NEEDS_SPECIFICATION";
                    // Change: This is now explicitly 'fallback'
                    if (!fallbackGuidance.includes(template.guidance)) fallbackGuidance.push(template.guidance);
                }
            }
        }

        let validatedItems = [];
        let specificInstability = null;
        for (const [product, data] of Object.entries(buckets)) {
            if (data.unstable) { specificInstability = product; continue; }
            if (data.status === "READY_FOR_INTEGRITY") validatedItems.push({ product, params: data.params });
        }

        return {
            status: fallbackGuidance.length > 0 ? "CONSULTATIVE_ACTIVE" : "READY",
            items: validatedItems,
            deleted_items: deletedItems,
            fallback_guidance: fallbackGuidance,
            reason: specificInstability ? "PARAMETER_INSTABILITY" : null
        };
    } catch (error) {
        console.error("❌ [COMPILER] Error:", error);
        return { status: "ERROR", message: error.message };
    }
}

module.exports = { compileOrder, buildSessionStateContext, getJITKnowledge, normalizeEntity };