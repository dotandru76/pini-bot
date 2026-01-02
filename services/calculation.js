const fs = require('fs');
const path = require('path');

// טעינת בסיסי הנתונים
let materials, products;
try {
    materials = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/materials.json'), 'utf8'));
    products = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'));
    console.log("✅ DB Loaded successfully");
} catch (error) {
    console.error("❌ Error loading DB files:", error.message);
    materials = { papers: {}, wide_media: {}, machine_specs: { digital: {}, wide: {} } };
}

// מנוע חיפוש חכם
const findMaterialMatch = (userInput) => {
    if (!userInput) return null;
    const searchStr = userInput.toLowerCase().replace(/ /g, '_');
    
    // איחוד רשימות לחיפוש
    const allMaterials = { ...materials.papers, ...(materials.wide_media || {}) };
    
    // בדיקה ישירה
    if (allMaterials[searchStr]) {
        const isWide = materials.wide_media && materials.wide_media[searchStr];
        return { key: searchStr, category: isWide ? 'wide' : 'digital' };
    }

    // חיפוש חכם (Partial Match) - זה מה שימצא את "כותנה" בתוך "בד קנבס כותנה איכותי"
    const foundKey = Object.keys(allMaterials).find(key => {
        const item = allMaterials[key];
        return key.includes(searchStr) || 
               (item.name && item.name.toLowerCase().includes(searchStr));
    });

    if (foundKey) {
        const isWide = materials.wide_media && materials.wide_media[foundKey];
        return { 
            key: foundKey, 
            category: isWide ? 'wide' : 'digital' 
        };
    }
    return null;
};

const calculate_custom_job = (currentCart = [], newItem) => {
    console.log("\n--- START HYBRID CALCULATION (V8) ---"); 
    console.log(`   Input: ${JSON.stringify(newItem)}`);

    // 1. זיהוי סוג המוצר
    let productKey = 'flyer'; 
    const name = (newItem.product_name || "").toLowerCase();

    if (name.includes('roll') || name.includes('banner') || name.includes('רולאפ')) productKey = 'rollup';
    else if (name.includes('canvas') || name.includes('קנבס') || name.includes('תמונה')) productKey = 'canvas';
    else if (name.includes('sticker') || name.includes('מדבק')) productKey = 'sticker';
    else if (name.includes('card') || name.includes('ביקור')) productKey = 'bc';
    else if (name.includes('invitation') || name.includes('הזמנ')) productKey = 'invitation';

    // 2. זיהוי מנוע דפוס
    const userMaterial = findMaterialMatch(newItem.paper_type);
    let engineType = 'digital'; 
    
    if (productKey === 'rollup' || productKey === 'canvas') engineType = 'wide';
    if (userMaterial && userMaterial.category === 'wide') engineType = 'wide';

    // 3. בחירת חומר וברירות מחדל
    let materialKey = userMaterial ? userMaterial.key : null;
    let usedDefault = false;

    if (!materialKey) {
        usedDefault = true;
        if (productKey === 'rollup') materialKey = 'rollup_film';
        else if (productKey === 'canvas') materialKey = 'canvas_polyester';
        else if (productKey === 'bc') materialKey = 'chromo_300';
        else if (productKey === 'invitation') materialKey = 'pearl_300';
        else materialKey = 'chromo_135';
        console.log(`🤖 Smart Default Applied: ${materialKey} (${engineType})`);
    } else {
        console.log(`📄 User Selection: ${materialKey} (${engineType})`);
    }

    const matData = (materials.papers && materials.papers[materialKey]) || 
                    (materials.wide_media && materials.wide_media[materialKey]) || 
                    { cost_sheet: 0.1, cost_sqm: 20, name: "Standard Material" };
                    
    const machine = (materials.machine_specs && materials.machine_specs[engineType]) || 
                    { click_color: 0.5, ink_cost_sqm: 15, setup_cost: 20, name: "Generic Machine" };

    // 4. חישוב עלויות
    const qty = parseInt(newItem.qty) || 1;
    let costComponents = {};
    let productionInstructions = {};

    if (engineType === 'wide') {
        // === מנוע פורמט רחב ===
        let width = 1.0, height = 1.0;
        if (productKey === 'rollup') { width = 0.85; height = 2.0; }
        if (productKey === 'canvas') { width = 0.50; height = 0.70; }

        const areaSqm = width * height * qty;
        const inkCostSqm = machine.ink_cost_sqm || 15;
        const mediaCostSqm = matData.cost_sqm || 20;

        costComponents = {
            material: Number((areaSqm * mediaCostSqm).toFixed(2)),
            print: Number((areaSqm * inkCostSqm).toFixed(2)),
            setup: machine.setup_cost || 40,
            finishing: 0
        };

        productionInstructions = {
            machine: machine.name,
            material: matData.name,
            setupInfo: `Size: ${Math.round(width*100)}x${Math.round(height*100)} cm | Total: ${areaSqm.toFixed(2)} sqm`,
            quantityToPrint: qty,
            notes: "Wide Format Job"
        };
    } else {
        // === מנוע דיגיטלי ===
        let ups = 1;
        if (productKey === 'bc') ups = 24;
        else if (productKey === 'flyer') ups = 4;
        else if (productKey === 'invitation') ups = 2;

        const sheetsRequired = Math.ceil(qty / ups);
        const wasteSheets = Math.ceil(sheetsRequired * 0.05) + 15;
        const totalSheets = sheetsRequired + wasteSheets;

        costComponents = {
            paper: Number((totalSheets * (matData.cost_sheet || 0.1)).toFixed(2)),
            print: Number((totalSheets * (machine.click_color || 0.5)).toFixed(2)),
            setup: machine.setup_cost || 20,
            finishing: 0
        };

        productionInstructions = {
            machine: machine.name,
            material: `${matData.name} (SRA3)`,
            setupInfo: `Imposition: ${ups} up`,
            quantityToPrint: totalSheets,
            notes: `Net Qty: ${qty}`
        };
    }

    // 5. חישוב גימורים
    if (newItem.finishing) {
        const finishKey = Object.keys(materials.finishing || {}).find(k => 
            newItem.finishing.toLowerCase().includes(k) || materials.finishing[k].name.includes(newItem.finishing)
        );

        if (finishKey) {
            const fItem = materials.finishing[finishKey];
            let fCost = 0;
            if (fItem.run) fCost = fItem.run * qty;
            else if (fItem.setup) fCost = fItem.setup;
            else if (fItem.cost_side) fCost = fItem.cost_side * qty;
            costComponents.finishing = Number(fCost.toFixed(2));
        } else {
            costComponents.finishing = Number((qty * 0.5).toFixed(2)); 
        }
    }

    const totalItemCost = Object.values(costComponents).reduce((a, b) => a + b, 0);
    
    // 6. תמחור
    let margin = 2.5; 
    if (engineType === 'wide') margin = 2.2;
    if (qty > 1000) margin = 1.8;
    if (qty > 5000) margin = 1.5;

    const priceToClient = Math.ceil(totalItemCost * margin);
    const itemProfit = priceToClient - totalItemCost;
    const itemMargin = priceToClient > 0 ? ((itemProfit / priceToClient) * 100).toFixed(0) : 0;

    // 7. עדכון עגלה
    let updatedCart = [...currentCart];
    const existingIndex = updatedCart.findIndex(item => 
        item.product_name.toLowerCase().trim() === newItem.product_name.toLowerCase().trim()
    );

    const processedItem = {
        product_name: newItem.product_name,
        qty: qty,
        description: `${matData.name} ${usedDefault ? '(Default)' : ''}`,
        client_price: priceToClient,
        cost: Number(totalItemCost.toFixed(2)),
        breakdown: costComponents,
        instructions: productionInstructions,
        isDefaultUsed: usedDefault,
        profit_margin: itemMargin
    };

    if (existingIndex > -1) {
        console.log(`   🔄 Updating: ${newItem.product_name}`);
        updatedCart[existingIndex] = processedItem;
    } else {
        console.log(`   ➕ Adding: ${newItem.product_name}`);
        updatedCart.push(processedItem);
    }

    // 8. סיכום גלובלי
    const total_deal_stats = updatedCart.reduce((acc, item) => {
        acc.totalPrice += item.client_price;
        acc.totalCost += (item.cost || 0);
        return acc;
    }, { totalPrice: 0, totalCost: 0 });

    const globalMargin = total_deal_stats.totalPrice > 0 
        ? (((total_deal_stats.totalPrice - total_deal_stats.totalCost) / total_deal_stats.totalPrice) * 100).toFixed(0) 
        : 0;

    total_deal_stats.profit_margin = globalMargin;
    total_deal_stats.profitPercent = globalMargin;

    console.log(`💰 Stats: Total=₪${total_deal_stats.totalPrice} | Margin=${globalMargin}%`);

    return { updatedCart, total_deal_stats, lastAdded: processedItem };
};

module.exports = { calculate_custom_job };