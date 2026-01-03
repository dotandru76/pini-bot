/**
 * Imposition Optimizer - Pini Print Bot
 * ======================================
 * מנוע אופטימיזציה לחישוב הסידור האופטימלי בגיליון
 * 
 * הרעיון: במקום לשלם על 500 קליקים, נחשב כמה באמת נכנסים בגיליון
 * ונמצא את הדרך הזולה ביותר להדפיס.
 */

// === הגדרות גדלי גיליון ===
const SHEET_SIZES = {
    'SRA3': { 
        width: 32, 
        height: 45, 
        name: 'SRA3 (32×45)',
        clickCost: 0.35,
        paperCost: 0.15
    },
    'SRA4': { 
        width: 22.5, 
        height: 32, 
        name: 'SRA4 (22.5×32)',
        clickCost: 0.25,
        paperCost: 0.10
    },
    'A3': { 
        width: 29.7, 
        height: 42, 
        name: 'A3',
        clickCost: 0.30,
        paperCost: 0.12
    },
    'A4': { 
        width: 21, 
        height: 29.7, 
        name: 'A4',
        clickCost: 0.20,
        paperCost: 0.08
    }
};

// === הגדרות מוצרים וגדלים ===
const PRODUCT_SIZES = {
    // כרטיסי ביקור
    'bc': { 
        width: 9, 
        height: 5, 
        name: 'כרטיס ביקור',
        bleed: 0.3,  // 3mm bleed
        defaultSheet: 'SRA3'
    },
    'bc_square': { 
        width: 5.5, 
        height: 5.5, 
        name: 'כרטיס ריבועי',
        bleed: 0.3,
        defaultSheet: 'SRA3'
    },
    
    // פליירים
    'flyer_a5': { 
        width: 14.8, 
        height: 21, 
        name: 'פלייר A5',
        bleed: 0.3,
        defaultSheet: 'SRA3'
    },
    'flyer_a6': { 
        width: 10.5, 
        height: 14.8, 
        name: 'פלייר A6',
        bleed: 0.3,
        defaultSheet: 'SRA3'
    },
    'flyer_a4': { 
        width: 21, 
        height: 29.7, 
        name: 'פלייר A4',
        bleed: 0.3,
        defaultSheet: 'SRA3'
    },
    'flyer_dl': { 
        width: 10, 
        height: 21, 
        name: 'פלייר DL',
        bleed: 0.3,
        defaultSheet: 'SRA3'
    },
    
    // הזמנות
    'invitation': { 
        width: 13, 
        height: 18, 
        name: 'הזמנה',
        bleed: 0.3,
        defaultSheet: 'SRA3'
    },
    'invitation_a5': { 
        width: 14.8, 
        height: 21, 
        name: 'הזמנה A5',
        bleed: 0.3,
        defaultSheet: 'SRA3'
    },
    
    // פולדרים
    'folder': { 
        width: 22, 
        height: 31, 
        name: 'פולדר A4',
        bleed: 0.3,
        defaultSheet: 'SRA3'
    },
    
    // פוסטרים
    'poster_a3': { 
        width: 29.7, 
        height: 42, 
        name: 'פוסטר A3',
        bleed: 0.3,
        defaultSheet: 'SRA3'
    },
    'poster_a2': { 
        width: 42, 
        height: 59.4, 
        name: 'פוסטר A2',
        bleed: 0.3,
        defaultSheet: null  // Wide format
    }
};

// === טבלת אימפוזיציה מוכנה (Lookup Table) ===
// זה חוסך חישובים בזמן אמת
const IMPOSITION_TABLE = {
    'bc': {
        'SRA3': { ups: 24, orientation: 'mixed', wastePercent: 2.5 },
        'SRA4': { ups: 12, orientation: 'mixed', wastePercent: 3.1 },
        'A4': { ups: 8, orientation: 'portrait', wastePercent: 4.2 }
    },
    'flyer_a5': {
        'SRA3': { ups: 4, orientation: 'portrait', wastePercent: 3.0 },
        'SRA4': { ups: 2, orientation: 'portrait', wastePercent: 4.5 },
        'A3': { ups: 4, orientation: 'portrait', wastePercent: 5.0 }
    },
    'flyer_a6': {
        'SRA3': { ups: 8, orientation: 'portrait', wastePercent: 2.8 },
        'SRA4': { ups: 4, orientation: 'portrait', wastePercent: 3.5 }
    },
    'flyer_a4': {
        'SRA3': { ups: 2, orientation: 'portrait', wastePercent: 4.0 }
    },
    'flyer_dl': {
        'SRA3': { ups: 6, orientation: 'portrait', wastePercent: 3.2 }
    },
    'invitation': {
        'SRA3': { ups: 4, orientation: 'portrait', wastePercent: 3.5 },
        'SRA4': { ups: 2, orientation: 'portrait', wastePercent: 5.0 }
    }
};

/**
 * חישוב כמה יחידות נכנסות בגיליון
 * @param {number} productW - רוחב מוצר (כולל bleed)
 * @param {number} productH - גובה מוצר (כולל bleed)
 * @param {number} sheetW - רוחב גיליון
 * @param {number} sheetH - גובה גיליון
 * @returns {object} - { ups, orientation, wastePercent }
 */
function calculateUps(productW, productH, sheetW, sheetH) {
    // נסה שני כיוונים
    const portrait = Math.floor(sheetW / productW) * Math.floor(sheetH / productH);
    const landscape = Math.floor(sheetW / productH) * Math.floor(sheetH / productW);
    
    const ups = Math.max(portrait, landscape);
    const orientation = portrait >= landscape ? 'portrait' : 'landscape';
    
    // חישוב פחת
    const usedArea = ups * productW * productH;
    const totalArea = sheetW * sheetH;
    const wastePercent = ((totalArea - usedArea) / totalArea) * 100;
    
    return { ups, orientation, wastePercent: Math.round(wastePercent * 10) / 10 };
}

/**
 * מציאת הסידור האופטימלי
 * @param {string} productType - סוג המוצר (bc, flyer_a5, etc.)
 * @param {number} quantity - כמות נדרשת
 * @param {object} options - אפשרויות נוספות
 * @returns {object} - תוצאת האופטימיזציה
 */
function findOptimalImposition(productType, quantity, options = {}) {
    console.log(`\n📐 [Optimizer] Product: ${productType}, Qty: ${quantity}`);
    
    // קבל הגדרות מוצר
    const product = PRODUCT_SIZES[productType] || PRODUCT_SIZES['flyer_a5'];
    const productW = product.width + (product.bleed * 2);
    const productH = product.height + (product.bleed * 2);
    
    const results = [];
    
    // בדוק כל גודל גיליון
    for (const [sheetKey, sheet] of Object.entries(SHEET_SIZES)) {
        // נסה להשתמש בטבלה מוכנה
        let imposition;
        if (IMPOSITION_TABLE[productType] && IMPOSITION_TABLE[productType][sheetKey]) {
            imposition = IMPOSITION_TABLE[productType][sheetKey];
        } else {
            imposition = calculateUps(productW, productH, sheet.width, sheet.height);
        }
        
        if (imposition.ups === 0) continue;
        
        // חישוב כמות גיליונות
        const sheetsNeeded = Math.ceil(quantity / imposition.ups);
        const wasteSheets = Math.ceil(sheetsNeeded * 0.03) + 10; // 3% פחת + 10 גיליונות setup
        const totalSheets = sheetsNeeded + wasteSheets;
        
        // חישוב עלויות
        const paperCost = totalSheets * (sheet.paperCost || 0.15);
        const sides = options.doubleSided ? 2 : 1;
        const clickCost = totalSheets * sides * (sheet.clickCost || 0.35);
        const setupCost = 20; // עלות setup קבועה
        
        const totalCost = paperCost + clickCost + setupCost;
        const costPerUnit = totalCost / quantity;
        
        // חישוב פחת יחידות
        const totalProduced = sheetsNeeded * imposition.ups;
        const wasteUnits = totalProduced - quantity;
        
        results.push({
            sheetSize: sheetKey,
            sheetName: sheet.name,
            ups: imposition.ups,
            orientation: imposition.orientation,
            sheetsNeeded,
            totalSheets,
            wastePercent: imposition.wastePercent,
            wasteUnits,
            costs: {
                paper: Math.round(paperCost * 100) / 100,
                clicks: Math.round(clickCost * 100) / 100,
                setup: setupCost,
                total: Math.round(totalCost * 100) / 100
            },
            costPerUnit: Math.round(costPerUnit * 1000) / 1000,
            totalProduced
        });
    }
    
    // מיין לפי עלות כוללת
    results.sort((a, b) => a.costs.total - b.costs.total);
    
    const optimal = results[0];
    const alternatives = results.slice(1);
    
    console.log(`   ✅ Optimal: ${optimal.sheetName} - ${optimal.ups} ups - ₪${optimal.costs.total}`);
    
    // בדוק אפשרות upsell
    const upsell = calculateUpsell(optimal, quantity);
    
    return {
        product: product.name,
        requestedQty: quantity,
        optimal,
        alternatives,
        upsell,
        productionInstructions: generateProductionInstructions(optimal, product, options)
    };
}

/**
 * חישוב הצעת Upsell
 */
function calculateUpsell(optimal, currentQty) {
    // כמה יחידות מיוצרות בפועל בגיליונות שממילא מודפסים
    const fullSheetQty = optimal.sheetsNeeded * optimal.ups;
    
    if (fullSheetQty > currentQty) {
        // יש יחידות "בחינם" על הגיליון
        const freeUnits = fullSheetQty - currentQty;
        const freePercent = Math.round((freeUnits / currentQty) * 100);
        
        if (freePercent >= 2) { // אם יש לפחות 2% בחינם
            return {
                suggested: true,
                type: 'free_units',
                currentQty,
                newQty: fullSheetQty,
                freeUnits,
                freePercent,
                extraCost: 0,
                message: `💡 תקבל ${freeUnits} יחידות נוספות בחינם! (${freePercent}% יותר, אותו מחיר)`
            };
        }
    }
    
    // בדוק אם הכפלת כמות משתלמת
    const doubleQty = currentQty * 2;
    const doubleSheets = Math.ceil(doubleQty / optimal.ups);
    const doubleExtraSheets = doubleSheets - optimal.sheetsNeeded;
    const extraCost = doubleExtraSheets * (SHEET_SIZES[optimal.sheetSize]?.paperCost || 0.15) + 
                      doubleExtraSheets * (SHEET_SIZES[optimal.sheetSize]?.clickCost || 0.35);
    
    const pricePerUnitNow = optimal.costs.total / currentQty;
    const pricePerUnitDouble = (optimal.costs.total + extraCost) / doubleQty;
    const savingsPercent = Math.round((1 - pricePerUnitDouble / pricePerUnitNow) * 100);
    
    if (savingsPercent >= 30) { // אם יש חיסכון של 30% ומעלה ליחידה
        return {
            suggested: true,
            type: 'volume_discount',
            currentQty,
            newQty: doubleQty,
            extraCost: Math.round(extraCost),
            savingsPercent,
            message: `💡 הכפל ל-${doubleQty.toLocaleString()} וחסוך ${savingsPercent}% למוצר!`
        };
    }
    
    return { suggested: false };
}

/**
 * יצירת הוראות ייצור
 */
function generateProductionInstructions(optimal, product, options) {
    return {
        machine: 'HP Indigo 7K',
        sheetSize: optimal.sheetName,
        imposition: `${optimal.ups} up (${optimal.orientation})`,
        totalSheets: optimal.totalSheets,
        printSides: options.doubleSided ? 'דו-צדדי (4/4)' : 'חד-צדדי (4/0)',
        notes: [
            `כמות נטו: ${optimal.totalProduced - optimal.wasteUnits}`,
            `גיליונות כולל פחת: ${optimal.totalSheets}`,
            optimal.wasteUnits > 0 ? `עודף: ${optimal.wasteUnits} יח'` : null
        ].filter(Boolean)
    };
}

/**
 * חישוב אימפוזיציה לחוברת
 * חוברת מיוחדת - גיליון אחד = כמה עמודים
 */
function calculateBookletImposition(pages, pageSize, quantity, bindingType = 'saddle') {
    console.log(`\n📚 [Booklet Optimizer] Pages: ${pages}, Size: ${pageSize}, Qty: ${quantity}`);
    
    // חוברת בכריכת סיכות חייבת להיות כפולה של 4
    let actualPages = pages;
    if (bindingType === 'saddle') {
        actualPages = Math.ceil(pages / 4) * 4;
        if (actualPages !== pages) {
            console.log(`   ⚠️ Adjusted pages: ${pages} → ${actualPages} (must be multiple of 4)`);
        }
    }
    
    // חישוב כמה עמודים על כל גיליון
    // SRA3 מודפס דו-צדדי = 4 עמודים A5 (2 משני הצדדים)
    let pagesPerSheet;
    switch (pageSize) {
        case 'A5':
            pagesPerSheet = 4; // SRA3 folded = 4 pages A5
            break;
        case 'A4':
            pagesPerSheet = 2; // SRA3 = 2 pages A4
            break;
        default:
            pagesPerSheet = 4;
    }
    
    const sheetsPerBooklet = Math.ceil(actualPages / pagesPerSheet);
    const totalSheets = sheetsPerBooklet * quantity;
    const wasteSheets = Math.ceil(totalSheets * 0.05) + 20; // 5% + 20 setup
    
    // עלויות
    const paperCost = (totalSheets + wasteSheets) * 0.20; // נייר עבה יותר לחוברות
    const clickCost = (totalSheets + wasteSheets) * 2 * 0.35; // דו-צדדי
    const bindingCost = quantity * (bindingType === 'saddle' ? 2 : 4.5);
    const setupCost = 30;
    
    const totalCost = paperCost + clickCost + bindingCost + setupCost;
    
    return {
        originalPages: pages,
        actualPages,
        pageSize,
        bindingType,
        pagesPerSheet,
        sheetsPerBooklet,
        totalSheets: totalSheets + wasteSheets,
        quantity,
        costs: {
            paper: Math.round(paperCost * 100) / 100,
            clicks: Math.round(clickCost * 100) / 100,
            binding: Math.round(bindingCost * 100) / 100,
            setup: setupCost,
            total: Math.round(totalCost * 100) / 100
        },
        costPerUnit: Math.round((totalCost / quantity) * 100) / 100,
        productionInstructions: {
            machine: 'HP Indigo 7K',
            sheetSize: 'SRA3',
            imposition: `חוברת ${actualPages} עמודים, ${pagesPerSheet} עמודים לגיליון`,
            binding: bindingType === 'saddle' ? 'כריכת סיכות' : 'כריכה בדבק',
            totalSheets: totalSheets + wasteSheets,
            printSides: 'דו-צדדי (4/4)'
        }
    };
}

/**
 * פונקציה ראשית - אינטגרציה עם מנוע החישוב
 */
function optimizeAndCalculate(product, quantity, options = {}) {
    // זיהוי סוג מוצר
    let productKey = 'flyer_a5'; // ברירת מחדל
    
    const name = (product || '').toLowerCase();
    
    if (name.includes('כרטיס') || name.includes('bc') || name.includes('ביקור')) {
        productKey = 'bc';
    } else if (name.includes('a6') || name.includes('קטן')) {
        productKey = 'flyer_a6';
    } else if (name.includes('a4') || name.includes('גדול')) {
        productKey = 'flyer_a4';
    } else if (name.includes('dl') || name.includes('שליש')) {
        productKey = 'flyer_dl';
    } else if (name.includes('הזמנה') || name.includes('invitation')) {
        productKey = 'invitation';
    } else if (name.includes('פולדר') || name.includes('folder')) {
        productKey = 'folder';
    }
    
    // הרץ אופטימיזציה
    const result = findOptimalImposition(productKey, quantity, options);
    
    return {
        productKey,
        ...result
    };
}

module.exports = {
    findOptimalImposition,
    calculateUps,
    calculateBookletImposition,
    optimizeAndCalculate,
    generateProductionInstructions,
    SHEET_SIZES,
    PRODUCT_SIZES,
    IMPOSITION_TABLE
};
