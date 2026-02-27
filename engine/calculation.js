/** engine/calculation.js - V10.6 Final Fix */
const fs = require('fs');
const path = require('path');
const { calculateImposition } = require('./optimizer');

let materials = {}, productsDB = {}, pricesDB = {}, DOMAIN_TEMPLATES = { products: {} };
try {
    materials = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/materials.json'), 'utf8'));
    productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'));
    pricesDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/prices.json'), 'utf8'));
    DOMAIN_TEMPLATES = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/domainTemplates.json'), 'utf8'));
} catch (e) {
    console.error("Failed loading DB files in calculation.js", e);
}

// Fallbacks if prices.json is missing or corrupted
const PRICES = pricesDB.digital_base ? pricesDB : {
    digital_base: { cost_per_click_color: 0.35, setup_fee: 20, min_price: 50 },
    wide_base: { cost_per_sqm: 50, min_price: 100 },
    margins: { digital_multiplier: 2.5, wide_multiplier: 3.0, waste_factor: 0.05, min_waste_sheets: 10, profit_warning_threshold: 0.30 }
};

function parseSize(sizeStr) {
    if (!sizeStr) return { w: 210, h: 297 };
    const sizes = { 'A4': { w: 210, h: 297 }, 'A5': { w: 148, h: 210 }, 'bc': { w: 90, h: 50 }, '13x18': { w: 130, h: 180 } };
    if (sizes[sizeStr]) return sizes[sizeStr];
    if (sizeStr.includes('x')) {
        const parts = sizeStr.split('x');
        return { w: parseFloat(parts[0]) * 10, h: parseFloat(parts[1]) * 10 };
    }
    return sizes['A4'];
}

function calculate_custom_job(cart, params) {
    const productKey = params.product || 'flyer';
    const productConfig = productsDB[productKey] || {};

    // --- FORCE FIX: זיהוי מוחלט של פורמט רחב ---
    const WIDE_PRODUCTS = ['rollup', 'canvas', 'sticker', 'banner', 'sign', 'shimson'];
    let engineType = productConfig.engine;

    if (WIDE_PRODUCTS.includes(productKey)) {
        engineType = 'wide';
    }

    if (!engineType) engineType = 'digital';
    // -------------------------------------------

    if (engineType === 'wide') {
        return calculateWideFormat(cart, params, productKey);
    } else {
        return calculateDigital(cart, params, productKey);
    }
}

function calculateDigital(cart, params, productKey) {
    console.log(`\n🧮 [CALCULATION] Starting Digital Calc for: ${productKey}`);
    const qty = parseInt(params.qty) || 100;
    const sizeObj = parseSize(params.size);
    const paperKey = params.paper_type || 'offset_80';

    let safePaperKey = paperKey;
    if (productKey === 'bc' && paperKey.includes('matte')) safePaperKey = 'matte_350';

    const paperData = materials.papers[safePaperKey] || materials.papers['offset_80'];
    const impResult = calculateImposition(sizeObj.w, sizeObj.h);

    console.log(`📐 [CALCULATION] Size: ${sizeObj.w}x${sizeObj.h}mm, Paper: ${safePaperKey} (Cost/Sheet: ₪${paperData.cost_sheet})`);
    console.log(`⚙️ [CALCULATION] Imposition: ${impResult.ups} ups (Yield: ${impResult.efficiency})`);

    if (impResult.ups === 0) throw new Error("מוצר גדול מדי למכונה");

    const pages = parseInt(params.pages) || 1;
    const clicksPerPage = 2; // Duplex assumption

    const rawSheets = Math.ceil((qty * (pages / 2)) / impResult.ups);
    const wasteSheets = Math.max(PRICES.margins.min_waste_sheets, Math.ceil(rawSheets * PRICES.margins.waste_factor));
    const totalSheets = rawSheets + wasteSheets;

    // Core Costs
    const costPaper = totalSheets * paperData.cost_sheet;
    const costClicks = (totalSheets * 2) * PRICES.digital_base.cost_per_click_color;
    const totalCost = costPaper + costClicks + PRICES.digital_base.setup_fee;

    console.log(`💵 [CALCULATION] Sheets Needed: ${totalSheets} (Includes waste). Raw Paper Cost: ₪${costPaper.toFixed(2)}`);
    console.log(`💵 [CALCULATION] Total Production Cost (w/ clicks & setup): ₪${totalCost.toFixed(2)}`);

    const finalPrice = Math.max(PRICES.digital_base.min_price, Math.ceil(totalCost * PRICES.margins.digital_multiplier));
    console.log(`💎 [CALCULATION] Final Client Price (x${PRICES.margins.digital_multiplier} Markup): ₪${finalPrice}\n`);

    return buildResult(cart, productKey, params, finalPrice, qty, `${qty} יח', ${paperData.name}`, totalCost);
}

function calculateWideFormat(cart, params, productKey) {
    console.log(`\n🧮 [CALCULATION] Starting Wide Format Calc for: ${productKey}`);
    const qty = parseInt(params.qty) || 1;
    let totalSqm = 0;

    if (productKey === 'sticker' && !params.size) {
        totalSqm = qty;
    } else {
        const sizeObj = parseSize(params.size);
        totalSqm = (sizeObj.w * sizeObj.h / 1000000) * qty;
    }

    let costPerSqm = PRICES.wide_base.cost_per_sqm;
    if (productKey === 'alucobond') {
        costPerSqm = PRICES.wide_base.cost_per_sqm_alucobond;
    }

    let totalCost = (totalSqm * costPerSqm) + (PRICES.wide_base.setup_fee || 0);
    // המחיר ללקוח מבוסס תמיד על מינימום או עלות חומר מוכפלת (לא כולל המסה של סטראפ עלות ללקוח, אחרת השלט הקטן יהפוך למאות שקלים)
    let finalPrice = Math.max(PRICES.wide_base.min_price, Math.ceil((totalSqm * costPerSqm) * PRICES.margins.wide_multiplier));

    console.log(`📐 [CALCULATION] Total SQM: ${totalSqm.toFixed(2)}. Cost/SQM: ₪${costPerSqm}`);
    console.log(`💎 [CALCULATION] Final Client Price (x${PRICES.margins.wide_multiplier} Markup): ₪${finalPrice}\n`);

    return buildResult(cart, productKey, params, finalPrice, qty, `${qty} יח' פורמט רחב`, totalCost);
}

const { assembleProductionItem } = require('./integrity');

function buildResult(cart, product, params, price, qty, desc, cost) {
    // 1. Initial Calc Object (Pre-Hardening)
    const productMeta = DOMAIN_TEMPLATES.products[product] || {};
    const calcResult = {
        product,
        displayName: productMeta.label || product,
        client_price: price,
        unit_price: (price / qty).toFixed(2),
        production_cost: cost?.toFixed(2),
        description: desc,
        qty: qty, // Spec v5.7.4 Qty mapping
        engine: params.engine || 'digital' // Pass through engine type
    };

    // 2. DOMAIN PIPELINE PHASE 3: Assemble Production Item (IDs, Hashing, Normalization, Freezing)
    const hardenedItem = assembleProductionItem(calcResult, params);

    // 3. Margin Analysis (Audit Log only, logic moved to hardenedItem check if needed)
    // We still keep the console logs for debugging as per previous work
    let totalCartPrice = 0;
    let totalCartCost = 0;
    const virtualCart = [...(cart || []), hardenedItem];

    for (const c of virtualCart) {
        // Handle both production items and legacy items if any
        totalCartPrice += parseFloat(c.pricing_snapshot?.client_price || c.client_price || 0);
        totalCartCost += parseFloat(c.pricing_snapshot?.production_cost || c.production_cost || 0);
    }

    if (totalCartPrice > 0) {
        const cartMargin = (totalCartPrice - totalCartCost) / totalCartPrice;
        if (cartMargin < PRICES.margins.profit_warning_threshold) {
            console.log(`\x1b[41m\x1b[37m 🚨 TOTAL CART MARGIN WARN \x1b[0m Overall Cart Profit Margin is ${Math.round(cartMargin * 100)}%`);
        } else {
            console.log(`\x1b[32m✅ TOTAL CART MARGIN SAFE \x1b[0m Overall Cart Profit Margin is ${Math.round(cartMargin * 100)}%`);
        }
    }

    // Return the single item. The Controller will handle pushToSessionCart() to enforce uniqueness.
    return hardenedItem;
}

module.exports = { calculate_custom_job };