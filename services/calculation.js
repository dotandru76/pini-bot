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

// פונקציית עזר לתרגום שמות נייר (למשל "Chrome 135g" -> "chromo_135")
const normalizePaperKey = (inputKey) => {
    if (!inputKey) return null;
    const cleanKey = inputKey.toLowerCase().replace(/ /g, '_'); // הופך רווחים לקו תחתון
    
    // מיפוי חכם למקרים נפוצים
    if (cleanKey.includes('135')) return 'chromo_135';
    if (cleanKey.includes('pearl')) return 'pearl_300';
    if (cleanKey.includes('matte') && cleanKey.includes('300')) return 'matte_300';
    if (cleanKey.includes('business') || cleanKey.includes('card')) return 'chromo_300';
    
    return cleanKey; // מחזיר את המקור אם לא מצא התאמה
};

const calculate_custom_job = (currentCart = [], newItem) => {
    console.log("\n📦 ---------------- START NEW CALCULATION ----------------"); 
    console.log("📥 Input Received:", JSON.stringify(newItem));

    // 1. קביעת ברירות מחדל וזיהוי מוצר
    const productKey = Object.keys(products || {}).find(k => newItem.product_name.toLowerCase().includes(k)) || 'flyer';
    const productDef = products ? products[productKey] : null;
    
    // נירמול מפתח הנייר (תיקון הבאג מהלוגים)
    let paperKey = normalizePaperKey(newItem.paper_type);
    
    // אם עדיין אין נייר, נקבע ברירת מחדל
    if (!paperKey || !materials.papers[paperKey]) {
        if (newItem.product_name.toLowerCase().includes('card')) paperKey = 'chromo_300';
        else if (newItem.product_name.toLowerCase().includes('flyer')) paperKey = 'chromo_135';
        else if (newItem.product_name.toLowerCase().includes('invitation')) paperKey = 'pearl_300'; // ברירת מחדל יוקרתית להזמנות
        else paperKey = 'offset_80';
        console.log(`🤖 Smart Default: Auto-selected paper '${paperKey}'`);
    } else {
        console.log(`👤 User Selection: Paper '${paperKey}' identified`);
    }
    
    // שליפת נתונים מה-DB
    const paperObj = materials.papers[paperKey] || 
                     materials.papers['chromo_300'] || 
                     { cost_sheet: 0.1, name: "Standard (Fallback)" };
                     
    const machine = (materials.machine_specs && materials.machine_specs[productDef?.engine || 'digital']) ||
                    { click_color: 0.5, setup_cost: 20, name: "Generic Digital" };

    console.log(`📄 Material Data: ${paperObj.name} (Cost: ${paperObj.cost_sheet})`);

    // 2. חישוב עלויות טכני (Imposition)
    const qty = parseInt(newItem.qty) || 100;
    
    let ups = 1;
    if (productKey === 'bc') ups = 24; 
    else if (productKey === 'flyer') ups = 4; // A5 ב-SRA3
    else if (productKey === 'invitation') ups = 2;

    const sheetsRequired = Math.ceil(qty / ups);
    const wasteSheets = Math.ceil(sheetsRequired * 0.05) + 15; // פחת
    const totalSheets = sheetsRequired + wasteSheets;

    // רכיבי העלות
    const costComponents = {
        paper: Number((totalSheets * (paperObj.cost_sheet || 0.1)).toFixed(2)),
        print: Number((totalSheets * (machine.click_color || 0.5)).toFixed(2)),
        setup: machine.setup_cost || 20,
        finishing: newItem.finishing ? (qty * 0.2) : 0
    };

    const totalItemCost = Object.values(costComponents).reduce((a, b) => a + b, 0);
    
    // תמחור ללקוח
    let margin = 2.5;
    if (qty > 1000) margin = 1.8;
    if (qty > 5000) margin = 1.5;
    
    const priceToClient = Math.ceil(totalItemCost * margin);

    // חישוב רווח ספציפי לפריט
    const itemProfit = priceToClient - totalItemCost;
    const itemMargin = priceToClient > 0 ? ((itemProfit / priceToClient) * 100).toFixed(0) : 0;

    // 3. הוראות למפעיל
    const productionInstructions = {
        machine: machine.name || "Digital Press",
        material: `${paperObj.name} (SRA3)`,
        setupInfo: `Imposition: ${ups} up`,
        quantityToPrint: totalSheets,
        notes: `Net Qty: ${qty} units`
    };

    // 4. בניית הפריט לעגלה
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

    // 5. חישוב רווחיות גלובלית
    const total_deal_stats = updatedCart.reduce((acc, item) => {
        acc.totalPrice += item.client_price;
        acc.totalCost += (item.cost || 0);
        return acc;
    }, { totalPrice: 0, totalCost: 0 });

    total_deal_stats.profitAmount = total_deal_stats.totalPrice - total_deal_stats.totalCost;
    
    const globalMargin = total_deal_stats.totalPrice > 0 
        ? ((total_deal_stats.profitAmount / total_deal_stats.totalPrice) * 100).toFixed(0) 
        : 0;

    // תאימות מלאה לדשבורד
    total_deal_stats.profit_margin = globalMargin;
    total_deal_stats.profitPercent = globalMargin;

    console.log(`💰 GLOBAL STATS: Price=${total_deal_stats.totalPrice} | Margin=${globalMargin}%`);
    console.log("📦 ---------------- END CALCULATION ----------------\n");

    return { 
        updatedCart, 
        total_deal_stats, 
        lastAdded: processedItem 
    };
};

module.exports = { calculate_custom_job };