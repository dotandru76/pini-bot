/** engine/calculation.js - V10.6 Final Fix */
const fs = require('fs');
const path = require('path');
const { calculateImposition } = require('./optimizer');

let materials = {}, productsDB = {};
try {
    materials = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/materials.json'), 'utf8'));
    productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'));
} catch (e) {}

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
    const qty = parseInt(params.qty) || 100;
    const sizeObj = parseSize(params.size);
    const paperKey = params.paper_type || 'offset_80';
    
    let safePaperKey = paperKey;
    if (productKey === 'bc' && paperKey.includes('matte')) safePaperKey = 'matte_350';
    
    const paperData = materials.papers[safePaperKey] || materials.papers['offset_80'];
    const impResult = calculateImposition(sizeObj.w, sizeObj.h);
    
    if (impResult.ups === 0) throw new Error("מוצר גדול מדי למכונה");

    const rawSheets = Math.ceil(qty / impResult.ups);
    const totalSheets = rawSheets + Math.max(10, Math.ceil(rawSheets * 0.05));
    const costPaper = totalSheets * paperData.cost_sheet;
    const totalCost = costPaper + (totalSheets * 0.35) + 20; 
    const finalPrice = Math.max(50, Math.ceil(totalCost * 2.5));

    return buildResult(cart, productKey, params, finalPrice, qty, `${qty} יח', ${paperData.name}`);
}

function calculateWideFormat(cart, params, productKey) {
    const qty = parseInt(params.qty) || 1;
    let totalSqm = 0;
    
    if (productKey === 'sticker' && !params.size) {
        totalSqm = qty; 
    } else {
        const sizeObj = parseSize(params.size);
        totalSqm = (sizeObj.w * sizeObj.h / 1000000) * qty;
    }
    
    let costPerSqm = 50; 
    let finalPrice = Math.max(100, Math.ceil(totalSqm * costPerSqm * 3));

    return buildResult(cart, productKey, params, finalPrice, qty, `${qty} יח' פורמט רחב`);
}

function buildResult(cart, product, params, price, qty, desc) {
    const item = { product, description: desc, qty, client_price: price, unit_price: (price/qty).toFixed(2) };
    return { updatedCart: [...(cart||[]), item], lastAdded: item };
}

module.exports = { calculate_custom_job };