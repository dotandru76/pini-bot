// services/calculation.js
const fs = require('fs');
const path = require('path');

// טעינת בסיסי הנתונים
let materials, products;
try {
    materials = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/materials.json'), 'utf8'));
    products = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'));
    console.log("✅ DB Loaded successfully");
} catch (error) {
    console.error("❌ Error loading DB files", error);
    materials = { papers: {}, machine_specs: { digital: { click_color: 0.5, setup_cost: 20 } } };
}

const calculate_custom_job = (currentCart = [], newItem) => {
    console.log("--- 🖩 V4 Calculation ---"); 

    // 1. קביעת ברירות מחדל
    const productKey = Object.keys(products || {}).find(k => newItem.product_name.toLowerCase().includes(k)) || 'flyer';
    const productDef = products ? products[productKey] : null;
    
    let paperKey = newItem.paper_type;
    if (!paperKey) {
        if (newItem.product_name.includes('Business Card')) paperKey = 'chromo_300';
        else if (newItem.product_name.includes('Flyer')) paperKey = 'chromo_135';
        else paperKey = 'offset_80';
    }
    
    const paperObj = (materials.papers && materials.papers[paperKey]) || 
                     (materials.papers && materials.papers['chromo_300']) || 
                     { cost_sheet: 0.1, name: "Standard" };
                     
    const machine = (materials.machine_specs && materials.machine_specs[productDef?.engine || 'digital']) ||
                    { click_color: 0.5, setup_cost: 20, name: "Generic Digital" };

    // 2. חישוב עלויות
    const qty = parseInt(newItem.qty) || 100;
    
    let ups = 1;
    if (productKey === 'bc') ups = 24; 
    else if (productKey === 'flyer') ups = 4;
    else if (productKey === 'invitation') ups = 2;

    const sheetsRequired = Math.ceil(qty / ups);
    const wasteSheets = Math.ceil(sheetsRequired * 0.05) + 15; 
    const totalSheets = sheetsRequired + wasteSheets;

    const costComponents = {
        paper: Number((totalSheets * (paperObj.cost_sheet || 0.1)).toFixed(2)),
        print: Number((totalSheets * (machine.click_color || 0.5)).toFixed(2)),
        setup: machine.setup_cost || 20,
        finishing: newItem.finishing ? (qty * 0.2) : 0
    };

    const totalItemCost = Object.values(costComponents).reduce((a, b) => a + b, 0);
    
    let margin = 2.5;
    if (qty > 1000) margin = 1.8;
    if (qty > 5000) margin = 1.5;
    
    const priceToClient = Math.ceil(totalItemCost * margin);

    // 3. הוראות למפעיל
    const productionInstructions = {
        machine: machine.name || "Digital Press",
        material: `${paperObj.name} (SRA3)`,
        setupInfo: `Imposition: ${ups} up`,
        quantityToPrint: totalSheets,
        notes: `Net Qty: ${qty} units`
    };

    // 4. עדכון העגלה
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
        isDefaultUsed: !newItem.paper_type
    };

    if (existingIndex > -1) {
        updatedCart[existingIndex] = processedItem;
    } else {
        updatedCart.push(processedItem);
    }

    // 5. חישוב רווחיות
    const total_deal_stats = updatedCart.reduce((acc, item) => {
        acc.totalPrice += item.client_price;
        acc.totalCost += (item.cost || 0);
        return acc;
    }, { totalPrice: 0, totalCost: 0 });

    total_deal_stats.profitAmount = total_deal_stats.totalPrice - total_deal_stats.totalCost;
    
    // תיקון קריטי לדשבורד: שיניתי את השם ל-profit_margin כדי שיוצג נכון ב-UI
    total_deal_stats.profit_margin = total_deal_stats.totalPrice > 0 
        ? ((total_deal_stats.profitAmount / total_deal_stats.totalPrice) * 100).toFixed(0) 
        : 0;

    console.log("💰 Deal Stats:", total_deal_stats);

    return { 
        updatedCart, 
        total_deal_stats, 
        lastAdded: processedItem 
    };
};

module.exports = { calculate_custom_job };