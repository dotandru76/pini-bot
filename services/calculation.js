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
    // Minimal Fallback to prevent crash
    materials = { papers: {}, finishing: {}, machine_specs: { digital: { click_color: 0.5, setup_cost: 20 } } };
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

    // 1. זיהוי מוצר
    const productKey = Object.keys(products || {}).find(k => newItem.product_name.toLowerCase().includes(k)) || 'flyer';
    const productDef = products ? products[productKey] : null;
    
    // 2. זיהוי נייר (כולל ברירות מחדל)
    let paperKey = findBestMatchInDB(newItem.paper_type, 'papers');

    if (!paperKey) {
        if (newItem.product_name.toLowerCase().includes('card')) paperKey = 'chromo_300';
        else if (newItem.product_name.toLowerCase().includes('flyer')) paperKey = 'chromo_135';
        else if (newItem.product_name.toLowerCase().includes('invitation')) paperKey = 'pearl_300';
        else paperKey = 'offset_80';
        console.log(`🤖 Smart Default Applied: ${paperKey}`);
    }
    
    const paperObj = (materials.papers && materials.papers[paperKey]) || 
                     { cost_sheet: 0.1, name: "Standard Paper" };
                     
    const machine = (materials.machine_specs && materials.machine_specs[productDef?.engine || 'digital']) ||
                    { click_color: 0.5, setup_cost: 20, name: "Digital Press" };

    // 3. חישוב טכני (Imposition)
    const qty = parseInt(newItem.qty) || 100;
    let ups = 1;
    if (productKey === 'bc') ups = 24; 
    else if (productKey === 'flyer') ups = 4;
    else if (productKey === 'invitation') ups = 2;

    const sheetsRequired = Math.ceil(qty / ups);
    const wasteSheets = Math.ceil(sheetsRequired * 0.05) + 15;
    const totalSheets = sheetsRequired + wasteSheets;

    // 4. חישוב עלויות (Breakdown)
    let finishingCost = 0;
    if (newItem.finishing) {
        const finishKey = findBestMatchInDB(newItem.finishing, 'finishing');
        if (finishKey && materials.finishing[finishKey]) {
            const fItem = materials.finishing[finishKey];
            if (fItem.run) finishingCost = fItem.run * qty;
            else if (fItem.cost_side) finishingCost = fItem.cost_side * qty;
            if (fItem.setup) finishingCost += fItem.setup;
        } else {
            finishingCost = qty * 0.2; // Fallback estimate
        }
    }

    const costComponents = {
        paper: Number((totalSheets * (paperObj.cost_sheet || 0.1)).toFixed(2)),
        print: Number((totalSheets * (machine.click_color || 0.5)).toFixed(2)),
        setup: machine.setup_cost || 20,
        finishing: Number(finishingCost.toFixed(2))
    };

    const totalItemCost = Object.values(costComponents).reduce((a, b) => a + b, 0);
    
    // תמחור
    let margin = 2.5;
    if (qty > 1000) margin = 1.8;
    if (qty > 5000) margin = 1.5;
    
    const priceToClient = Math.ceil(totalItemCost * margin);
    const itemProfit = priceToClient - totalItemCost;
    const itemMargin = priceToClient > 0 ? ((itemProfit / priceToClient) * 100).toFixed(0) : 0;

    // 5. הוראות למפעיל
    const productionInstructions = {
        machine: machine.name,
        material: `${paperObj.name} (SRA3)`,
        setupInfo: `Imposition: ${ups} up`,
        quantityToPrint: totalSheets,
        notes: `Net Qty: ${qty}`
    };

    // 6. ניהול עגלה
    let updatedCart = [...currentCart];
    const existingIndex = updatedCart.findIndex(item => 
        item.product_name.toLowerCase().trim() === newItem.product_name.toLowerCase().trim()
    );

    const processedItem = {
        product_name: newItem.product_name,
        qty: qty,
        description: newItem.description || `${paperObj.name}`,
        client_price: priceToClient,
        cost: Number(totalItemCost.toFixed(2)),
        breakdown: costComponents,
        instructions: productionInstructions,
        isDefaultUsed: !newItem.paper_type,
        profit_margin: itemMargin
    };

    if (existingIndex > -1) {
        updatedCart[existingIndex] = processedItem;
    } else {
        updatedCart.push(processedItem);
    }

    // 7. חישוב גלובלי (Dashboard)
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

    console.log(`💰 Stats: Price=${total_deal_stats.totalPrice} | Margin=${globalMargin}%`);

    return { 
        updatedCart, 
        total_deal_stats, 
        lastAdded: processedItem 
    };
};

module.exports = { calculate_custom_job };