// services/calculation.js
const fs = require('fs');
const path = require('path');

// טעינת בסיסי הנתונים עם הגנה
let materials, products;
try {
    materials = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/materials.json'), 'utf8'));
    products = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'));
    console.log("✅ DB Loaded successfully");
} catch (error) {
    console.error("❌ Error loading DB files:", error.message);
    // Fallback defaults
    materials = { 
        papers: {
            chromo_135: { cost_sheet: 0.15, name: "כרומו 135 גרם" },
            chromo_300: { cost_sheet: 0.35, name: "כרומו 300 גרם" },
            offset_80: { cost_sheet: 0.08, name: "נייר רגיל 80 גרם" },
            pearl_300: { cost_sheet: 0.50, name: "נייר פנינה 300 גרם" }
        }, 
        finishing: {
            lamination: { run: 0.15, setup: 30, name: "למינציה" },
            fold: { run: 0.05, setup: 20, name: "קיפול" }
        }, 
        machine_specs: { 
            digital: { click_color: 0.5, setup_cost: 20, name: "דפוס דיגיטלי" } 
        } 
    };
    products = {
        flyer: { default_paper: "chromo_135", engine: "digital" },
        bc: { default_paper: "chromo_300", engine: "digital" },
        invitation: { default_paper: "pearl_300", engine: "digital" }
    };
}

// מנוע חיפוש גנרי (לנייר וגימורים)
const findBestMatchInDB = (userInput, category) => {
    if (!userInput) return null;
    const searchStr = userInput.toLowerCase().replace(/ /g, '_');
    const dbCategory = materials[category];

    if (!dbCategory) return null;
    if (dbCategory[searchStr]) return searchStr; // התאמה ישירה

    // חיפוש חכם (Partial Match)
    return Object.keys(dbCategory).find(key => {
        const item = dbCategory[key];
        return key.includes(searchStr) || 
               (item.name && item.name.toLowerCase().includes(searchStr)) ||
               searchStr.includes(key.split('_')[0]);
    }) || null;
};

const calculate_custom_job = (currentCart = [], newItem) => {
    console.log("\n--- START CALCULATION (V7) ---"); 
    console.log(`   Input: ${JSON.stringify(newItem)}`);

    // 1. זיהוי מוצר
    const productNameLower = (newItem.product_name || "flyer").toLowerCase();
    let productKey = 'flyer'; // default
    
    if (productNameLower.includes('card') || productNameLower.includes('כרטיס') || productNameLower.includes('ביקור')) {
        productKey = 'bc';
    } else if (productNameLower.includes('invitation') || productNameLower.includes('הזמנ')) {
        productKey = 'invitation';
    } else if (productNameLower.includes('flyer') || productNameLower.includes('פלייר') || productNameLower.includes('חלוקה')) {
        productKey = 'flyer';
    }
    
    const productDef = products[productKey] || products['flyer'];
    
    // 2. זיהוי נייר (כולל ברירות מחדל חכמות)
    let paperKey = findBestMatchInDB(newItem.paper_type, 'papers');
    let usedDefault = false;

    if (!paperKey) {
        usedDefault = true;
        if (productKey === 'bc') {
            paperKey = 'chromo_300';
        } else if (productKey === 'flyer') {
            paperKey = 'chromo_135';
        } else if (productKey === 'invitation') {
            paperKey = 'pearl_300';
        } else {
            paperKey = 'offset_80';
        }
        console.log(`🤖 Smart Default Applied: ${paperKey}`);
    } else {
        console.log(`📄 User selected paper: ${paperKey}`);
    }
    
    const paperObj = (materials.papers && materials.papers[paperKey]) || 
                     { cost_sheet: 0.15, name: "נייר סטנדרטי" };
                     
    const machine = (materials.machine_specs && materials.machine_specs[productDef?.engine || 'digital']) ||
                    { click_color: 0.5, setup_cost: 20, name: "דפוס דיגיטלי" };

    // 3. חישוב טכני (Imposition)
    const qty = parseInt(newItem.qty) || 100;
    let ups = 1;
    if (productKey === 'bc') ups = 24; 
    else if (productKey === 'flyer') ups = 4;
    else if (productKey === 'invitation') ups = 2;

    const sheetsRequired = Math.ceil(qty / ups);
    const wasteSheets = Math.ceil(sheetsRequired * 0.05) + 15;
    const totalSheets = sheetsRequired + wasteSheets;

    console.log(`   📊 Qty: ${qty} | Ups: ${ups} | Sheets: ${totalSheets} (inc. waste)`);

    // 4. חישוב עלויות (Breakdown)
    let finishingCost = 0;
    let finishingName = "";
    
    if (newItem.finishing) {
        const finishKey = findBestMatchInDB(newItem.finishing, 'finishing');
        if (finishKey && materials.finishing[finishKey]) {
            const fItem = materials.finishing[finishKey];
            finishingName = fItem.name || finishKey;
            if (fItem.run) finishingCost = fItem.run * qty;
            else if (fItem.cost_side) finishingCost = fItem.cost_side * qty;
            if (fItem.setup) finishingCost += fItem.setup;
            console.log(`   🔧 Finishing: ${finishingName} = ₪${finishingCost.toFixed(2)}`);
        } else {
            finishingCost = qty * 0.2; // Fallback estimate
            finishingName = newItem.finishing;
        }
    }

    const costComponents = {
        paper: Number((totalSheets * (paperObj.cost_sheet || 0.15)).toFixed(2)),
        print: Number((totalSheets * (machine.click_color || 0.5)).toFixed(2)),
        setup: machine.setup_cost || 20,
        finishing: Number(finishingCost.toFixed(2))
    };

    const totalItemCost = Object.values(costComponents).reduce((a, b) => a + b, 0);
    
    // תמחור דינמי לפי כמות
    let margin = 2.5;
    if (qty > 1000) margin = 1.8;
    if (qty > 5000) margin = 1.5;
    
    const priceToClient = Math.ceil(totalItemCost * margin);
    const itemProfit = priceToClient - totalItemCost;
    const itemMargin = priceToClient > 0 ? ((itemProfit / priceToClient) * 100).toFixed(0) : 0;

    console.log(`   💵 Cost: ₪${totalItemCost.toFixed(2)} | Price: ₪${priceToClient} | Margin: ${itemMargin}%`);

    // 5. הוראות למפעיל (Production)
    const productionInstructions = {
        machine: machine.name || "דפוס דיגיטלי",
        material: `${paperObj.name} (SRA3)`,
        setupInfo: `אימפוזיציה: ${ups} יחידות בגיליון`,
        quantityToPrint: totalSheets,
        notes: `כמות נטו: ${qty} יח'`
    };

    // 6. בניית תיאור המוצר
    let description = paperObj.name || "נייר סטנדרטי";
    if (finishingName) {
        description += ` + ${finishingName}`;
    }
    if (usedDefault) {
        description += " (ברירת מחדל)";
    }

    // 7. ניהול עגלה (Smart Cart - מניעת כפילויות)
    let updatedCart = [...currentCart];
    const existingIndex = updatedCart.findIndex(item => 
        item.product_name.toLowerCase().trim() === newItem.product_name.toLowerCase().trim()
    );

    const processedItem = {
        product_name: newItem.product_name,
        qty: qty,
        description: description,
        client_price: priceToClient,
        cost: Number(totalItemCost.toFixed(2)),
        breakdown: costComponents,
        instructions: productionInstructions,
        isDefaultUsed: usedDefault,
        profit_margin: itemMargin
    };

    if (existingIndex > -1) {
        console.log(`   🔄 Updating existing cart item: ${newItem.product_name}`);
        updatedCart[existingIndex] = processedItem;
    } else {
        console.log(`   ➕ Adding new item to cart: ${newItem.product_name}`);
        updatedCart.push(processedItem);
    }

    // 8. חישוב גלובלי (Dashboard Stats)
    const total_deal_stats = updatedCart.reduce((acc, item) => {
        acc.totalPrice += item.client_price;
        acc.totalCost += (item.cost || 0);
        return acc;
    }, { totalPrice: 0, totalCost: 0 });

    total_deal_stats.profitAmount = total_deal_stats.totalPrice - total_deal_stats.totalCost;
    const globalMargin = total_deal_stats.totalPrice > 0 
        ? ((total_deal_stats.profitAmount / total_deal_stats.totalPrice) * 100).toFixed(0) 
        : 0;

    total_deal_stats.profit_margin = globalMargin;
    total_deal_stats.profitPercent = globalMargin;

    console.log(`💰 Deal Stats: Total=₪${total_deal_stats.totalPrice} | Cost=₪${total_deal_stats.totalCost.toFixed(2)} | Margin=${globalMargin}%`);
    console.log("--- END CALCULATION ---\n");

    return { 
        updatedCart, 
        total_deal_stats, 
        lastAdded: processedItem 
    };
};

module.exports = { calculate_custom_job };
