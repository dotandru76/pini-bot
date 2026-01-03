/**
 * Calculation Engine V10 - Pini Print Bot
 * ========================================
 * מנוע חישוב משופר עם אינטגרציה לאופטימייזר
 * 
 * חידושים בגרסה זו:
 * - אופטימיזציית אימפוזיציה
 * - Upsell אוטומטי
 * - תמיכה בסטטוס עיצוב
 * - הוראות ייצור מפורטות
 */

const fs = require('fs');
const path = require('path');

// טעינת בסיסי נתונים
let materials, products;
try {
    materials = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/materials.json'), 'utf8'));
    products = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'));
    console.log("✅ DB Loaded successfully");
} catch (error) {
    console.error("❌ Error loading DB:", error.message);
    // Fallback defaults
    materials = {
        papers: {
            chromo_135: { name: "כרומו 135", cost_sheet: 0.15 },
            chromo_300: { name: "כרומו 300", cost_sheet: 0.45 },
            pearl_300: { name: "פנינה 300", cost_sheet: 1.50 }
        },
        machine_specs: {
            digital: { click_color: 0.35, setup_cost: 20 },
            wide: { ink_cost_sqm: 15, setup_cost: 40 }
        },
        wide_media: {
            rollup_film: { name: "פילם רולאפ", cost_sqm: 25 },
            canvas_polyester: { name: "קנבס", cost_sqm: 35 }
        },
        finishing: {}
    };
}

// === טבלת אימפוזיציה מוכנה ===
const IMPOSITION_LOOKUP = {
    'bc': { ups: 24, sheetSize: 'SRA3', defaultPaper: 'chromo_300' },
    'place_card': { ups: 16, sheetSize: 'SRA3', defaultPaper: 'chromo_300' }, // כרטיסי הושבה - קצת יותר גדולים
    'flyer': { ups: 4, sheetSize: 'SRA3', defaultPaper: 'chromo_135' },
    'invitation': { ups: 4, sheetSize: 'SRA3', defaultPaper: 'pearl_300' },
    'sticker': { ups: 6, sheetSize: 'SRA3', defaultPaper: 'sticker_paper' },
    'folder': { ups: 1, sheetSize: 'SRA3', defaultPaper: 'chromo_300' },
    'booklet': { ups: 4, sheetSize: 'SRA3', defaultPaper: 'chromo_135' } // pages per sheet
};

// === טבלת מוצרי פורמט רחב ===
const WIDE_FORMAT_PRODUCTS = ['rollup', 'canvas', 'banner', 'poster_large', 'sign'];

// === מיפוי מילים לקטגוריות ===
const PRODUCT_MAP = {
    // כרטיסים
    'כרטיס': 'bc', 'כרטיסים': 'bc', 'כרטיסי ביקור': 'bc', 'ביזנס': 'bc',
    // כרטיסי הושבה
    'הושבה': 'place_card', 'כרטיסי הושבה': 'place_card',
    // פליירים
    'פלייר': 'flyer', 'פליירים': 'flyer', 'פלאייר': 'flyer', 'עלון': 'flyer',
    // הזמנות
    'הזמנה': 'invitation', 'הזמנות': 'invitation',
    // רולאפ
    'רולאפ': 'rollup', 'באנר': 'rollup', 'שמשונית': 'banner',
    // קנבס
    'קנבס': 'canvas', 'תמונה': 'canvas',
    // מדבקות
    'מדבקה': 'sticker', 'מדבקות': 'sticker',
    // חוברות
    'חוברת': 'booklet', 'קטלוג': 'booklet',
    // פולדרים
    'פולדר': 'folder', 'תיקייה': 'folder'
};

/**
 * זיהוי סוג מוצר מהשם
 */
function identifyProduct(productName) {
    const name = (productName || '').toLowerCase();
    
    for (const [keyword, category] of Object.entries(PRODUCT_MAP)) {
        if (name.includes(keyword)) {
            return category;
        }
    }
    
    return 'flyer'; // ברירת מחדל
}

/**
 * האם מוצר בפורמט רחב?
 */
function isWideFormat(productCategory) {
    return WIDE_FORMAT_PRODUCTS.includes(productCategory);
}

/**
 * חיפוש חומר
 */
function findMaterial(userInput, category) {
    if (!userInput) return null;
    
    const searchStr = userInput.toLowerCase().replace(/ /g, '_');
    
    // חיפוש בניירות
    if (materials.papers) {
        for (const [key, paper] of Object.entries(materials.papers)) {
            if (key.includes(searchStr) || searchStr.includes(key) || 
                (paper.name && paper.name.toLowerCase().includes(searchStr))) {
                return { key, data: paper, type: 'paper' };
            }
        }
    }
    
    // חיפוש במדיה רחבה
    if (materials.wide_media) {
        for (const [key, media] of Object.entries(materials.wide_media)) {
            if (key.includes(searchStr) || searchStr.includes(key) ||
                (media.name && media.name.toLowerCase().includes(searchStr))) {
                return { key, data: media, type: 'wide' };
            }
        }
    }
    
    return null;
}

/**
 * פונקציה ראשית: חישוב עבודה
 */
function calculate_custom_job(currentCart = [], newItem) {
    console.log("\n--- START CALCULATION ENGINE V10 ---");
    console.log(`   Input: ${JSON.stringify(newItem)}`);
    
    // 1. זיהוי מוצר
    const productCategory = identifyProduct(newItem.product_name);
    const isWide = isWideFormat(productCategory);
    
    console.log(`   Product: ${productCategory} (${isWide ? 'Wide Format' : 'Digital'})`);
    
    // 2. חיפוש/בחירת חומר
    let materialKey = null;
    let materialData = null;
    let usedDefault = false;
    
    const userMaterial = findMaterial(newItem.paper_type, productCategory);
    
    if (userMaterial) {
        materialKey = userMaterial.key;
        materialData = userMaterial.data;
        console.log(`   📄 User Material: ${materialKey}`);
    } else {
        // Smart defaults
        usedDefault = true;
        const lookup = IMPOSITION_LOOKUP[productCategory] || IMPOSITION_LOOKUP['flyer'];
        materialKey = lookup.defaultPaper;
        
        if (isWide) {
            materialKey = productCategory === 'canvas' ? 'canvas_polyester' : 'rollup_film';
            materialData = materials.wide_media?.[materialKey] || { cost_sqm: 25 };
        } else {
            materialData = materials.papers?.[materialKey] || { cost_sheet: 0.15 };
        }
        
        console.log(`   🤖 Default Material: ${materialKey}`);
    }
    
    // 3. כמות
    const qty = parseInt(newItem.qty) || 1;
    
    // 4. חישוב עלויות
    let costBreakdown = {};
    let productionInstructions = {};
    let upsellSuggestion = null;
    
    if (isWide) {
        // === חישוב פורמט רחב ===
        const result = calculateWideFormat(productCategory, qty, materialKey, materialData, newItem);
        costBreakdown = result.costs;
        productionInstructions = result.instructions;
    } else {
        // === חישוב דיגיטלי עם אופטימיזציה ===
        const result = calculateDigitalOptimized(productCategory, qty, materialKey, materialData, newItem);
        costBreakdown = result.costs;
        productionInstructions = result.instructions;
        upsellSuggestion = result.upsell;
    }
    
    // 5. חישוב גימורים
    if (newItem.finishing) {
        const finishCost = calculateFinishing(newItem.finishing, qty, isWide);
        costBreakdown.finishing = finishCost;
    } else {
        costBreakdown.finishing = 0;
    }
    
    // 6. סכום עלויות
    const totalCost = Object.values(costBreakdown).reduce((a, b) => a + b, 0);
    
    // 7. תמחור (מרווח רווח)
    let margin = 2.5;
    if (qty > 1000) margin = 2.0;
    if (qty > 5000) margin = 1.6;
    if (isWide) margin = 2.2;
    
    let clientPrice = Math.ceil(totalCost * margin);
    
    // עיגול יפה
    if (clientPrice > 100) {
        clientPrice = Math.ceil(clientPrice / 10) * 10 - 1; // 199, 299, etc.
    }
    if (clientPrice < 50) clientPrice = 50; // מינימום
    
    const profit = clientPrice - totalCost;
    const profitMargin = Math.round((profit / clientPrice) * 100);
    
    console.log(`   💰 Cost: ₪${totalCost.toFixed(2)} → Price: ₪${clientPrice} (${profitMargin}% margin)`);
    
    // 8. יצירת אובייקט התוצאה
    const processedItem = {
        product_name: newItem.product_name,
        product_category: productCategory,
        qty: qty,
        description: `${materialData?.name || materialKey}${usedDefault ? ' (ברירת מחדל)' : ''}`,
        client_price: clientPrice,
        cost: Math.round(totalCost * 100) / 100,
        breakdown: costBreakdown,
        instructions: productionInstructions,
        profit_margin: profitMargin + '%',
        isDefaultUsed: usedDefault,
        upsell: upsellSuggestion
    };
    
    // 9. עדכון עגלה
    let updatedCart = [...currentCart];
    const existingIndex = updatedCart.findIndex(item =>
        item.product_name.toLowerCase().trim() === newItem.product_name.toLowerCase().trim()
    );
    
    if (existingIndex > -1) {
        console.log(`   🔄 Updating: ${newItem.product_name}`);
        updatedCart[existingIndex] = processedItem;
    } else {
        console.log(`   ➕ Adding: ${newItem.product_name}`);
        updatedCart.push(processedItem);
    }
    
    // 10. סטטיסטיקות עגלה
    const total_deal_stats = updatedCart.reduce((acc, item) => {
        acc.totalPrice += item.client_price;
        acc.totalCost += item.cost;
        return acc;
    }, { totalPrice: 0, totalCost: 0 });
    
    total_deal_stats.profit_margin = total_deal_stats.totalPrice > 0
        ? Math.round(((total_deal_stats.totalPrice - total_deal_stats.totalCost) / total_deal_stats.totalPrice) * 100)
        : 0;
    
    console.log(`   📊 Cart Total: ₪${total_deal_stats.totalPrice} (${total_deal_stats.profit_margin}% margin)`);
    console.log("--- END CALCULATION ---\n");
    
    return {
        updatedCart,
        total_deal_stats,
        lastAdded: processedItem
    };
}

/**
 * חישוב דיגיטלי עם אופטימיזציה
 */
function calculateDigitalOptimized(category, qty, materialKey, materialData, item) {
    const machine = materials.machine_specs?.digital || { click_color: 0.35, setup_cost: 20 };
    const lookup = IMPOSITION_LOOKUP[category] || { ups: 4, sheetSize: 'SRA3' };
    
    const ups = lookup.ups;
    const sheetsNeeded = Math.ceil(qty / ups);
    const wasteSheets = Math.ceil(sheetsNeeded * 0.03) + 10; // 3% + 10 setup
    const totalSheets = sheetsNeeded + wasteSheets;
    
    // עלויות
    const paperCostPerSheet = materialData?.cost_sheet || 0.15;
    const clickCost = machine.click_color || 0.35;
    const sides = 2; // Default: double-sided
    
    const costs = {
        paper: Math.round(totalSheets * paperCostPerSheet * 100) / 100,
        print: Math.round(totalSheets * sides * clickCost * 100) / 100,
        setup: machine.setup_cost || 20
    };
    
    // Upsell: בדוק אם יש יחידות "חינם"
    const totalProduced = sheetsNeeded * ups;
    const freeUnits = totalProduced - qty;
    let upsell = null;
    
    if (freeUnits > 0 && freeUnits >= qty * 0.02) { // לפחות 2%
        upsell = {
            suggested: true,
            currentQty: qty,
            newQty: totalProduced,
            freeUnits: freeUnits,
            extraCost: 0,
            message: `💡 קבל ${freeUnits} יחידות נוספות באותו מחיר!`
        };
    }
    
    const instructions = {
        machine: machine.name || 'HP Indigo 7K',
        material: materialData?.name || materialKey,
        sheetSize: lookup.sheetSize,
        imposition: `${ups} up`,
        totalSheets: totalSheets,
        printSides: 'דו-צדדי (4/4)',
        netQty: qty,
        producedQty: totalProduced
    };
    
    return { costs, instructions, upsell };
}

/**
 * חישוב פורמט רחב
 */
function calculateWideFormat(category, qty, materialKey, materialData, item) {
    const machine = materials.machine_specs?.wide || { ink_cost_sqm: 15, setup_cost: 40 };
    
    // מידות ברירת מחדל לפי מוצר
    let width = 1.0, height = 1.0;
    
    switch (category) {
        case 'rollup':
            width = 0.85; height = 2.0; // 85x200 cm
            break;
        case 'canvas':
            width = 0.50; height = 0.70; // 50x70 cm
            break;
        case 'banner':
            width = 1.0; height = 3.0; // 100x300 cm
            break;
        case 'poster_large':
            width = 0.70; height = 1.0; // 70x100 cm
            break;
    }
    
    const areaSqm = width * height * qty;
    const mediaCost = materialData?.cost_sqm || 25;
    const inkCost = machine.ink_cost_sqm || 15;
    
    const costs = {
        material: Math.round(areaSqm * mediaCost * 100) / 100,
        print: Math.round(areaSqm * inkCost * 100) / 100,
        setup: machine.setup_cost || 40
    };
    
    const instructions = {
        machine: machine.name || 'Roland SolJet',
        material: materialData?.name || materialKey,
        size: `${(width * 100).toFixed(0)}x${(height * 100).toFixed(0)} ס"מ`,
        totalArea: `${areaSqm.toFixed(2)} מ"ר`,
        quantity: qty,
        notes: 'Wide Format Print'
    };
    
    return { costs, instructions, upsell: null };
}

/**
 * חישוב גימורים
 */
function calculateFinishing(finishingStr, qty, isWide) {
    if (!finishingStr || !materials.finishing) return 0;
    
    const finishLower = finishingStr.toLowerCase();
    let totalCost = 0;
    
    for (const [key, finish] of Object.entries(materials.finishing)) {
        if (finishLower.includes(key) || (finish.name && finishLower.includes(finish.name.toLowerCase()))) {
            if (finish.run) {
                totalCost += finish.run * qty + (finish.setup || 0);
            } else if (finish.cost_side) {
                totalCost += finish.cost_side * qty;
            } else if (finish.setup) {
                totalCost += finish.setup;
            }
        }
    }
    
    return Math.round(totalCost * 100) / 100;
}

module.exports = {
    calculate_custom_job,
    identifyProduct,
    isWideFormat,
    findMaterial,
    IMPOSITION_LOOKUP,
    PRODUCT_MAP
};