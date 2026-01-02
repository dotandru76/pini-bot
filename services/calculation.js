const fs = require('fs');
const path = require('path');

// טעינת בסיסי הנתונים
let materials, products;
try {
    materials = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/materials.json'), 'utf8'));
    products = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'));
    console.log("DB Loaded successfully");
} catch (error) {
    console.error("Error loading DB files", error);
    materials = { papers: {}, finishing: {}, machine_specs: { digital: { click_color: 0.5, setup_cost: 20 } } };
}

// --- מנוע חיפוש דינמי לחומרי גלם ---
// פונקציה זו מחפשת התאמה בתוך ה-JSON במקום להסתמך על חוקים קבועים מראש
const findBestMatchInDB = (userInput, category) => {
    if (!userInput) return null;
    const searchStr = userInput.toLowerCase().replace(/ /g, '_'); // נרמול קלט
    const dbCategory = materials[category]; // papers, finishing, etc.

    if (!dbCategory) return null;

    // 1. ניסיון למצוא התאמה ישירה למפתח (למשל "pearl_300")
    if (dbCategory[searchStr]) return searchStr;

    // 2. חיפוש חכם: רץ על כל הפריטים ב-DB ובודק אם השם מכיל את הקלט
    const foundKey = Object.keys(dbCategory).find(key => {
        const item = dbCategory[key];
        // בדיקה: האם המפתח או השם (בעברית/אנגלית) מכילים את מה שהמשתמש ביקש?
        return key.includes(searchStr) || 
               (item.name && item.name.toLowerCase().includes(searchStr)) ||
               searchStr.includes(key.split('_')[0]); // למשל "pearl" בתוך "pearl_300"
    });

    return foundKey || null;
};

const calculate_custom_job = (currentCart = [], newItem) => {
    console.log("\n--- START GENERIC CALCULATION (V7) ---"); 
    console.log("Input:", JSON.stringify(newItem));

    // 1. זיהוי מוצר גנרי
    const productKey = Object.keys(products || {}).find(k => newItem.product_name.toLowerCase().includes(k)) || 'flyer';
    const productDef = products ? products[productKey] : null;
    
    // 2. זיהוי נייר דינמי (Generic Lookup)
    let paperKey = findBestMatchInDB(newItem.paper_type, 'papers');

    // מנגנון ברירות מחדל (Smart Defaults) - רק אם לא נמצאה התאמה
    if (!paperKey) {
        if (newItem.product_name.toLowerCase().includes('card')) paperKey = 'chromo_300';
        else if (newItem.product_name.toLowerCase().includes('flyer')) paperKey = 'chromo_135';
        else if (newItem.product_name.toLowerCase().includes('invitation')) paperKey = 'pearl_300'; // ברירת מחדל יוקרתית
        else paperKey = 'offset_80';
        console.log(`Smart Default applied: ${paperKey}`);
    } else {
        console.log(`Database Match found: ${paperKey}`);
    }
    
    // שליפת האובייקט המלא מה-DB
    const paperObj = materials.papers[paperKey] || 
                     materials.papers['chromo_300'] || 
                     { cost_sheet: 0.1, name: "Standard Paper" };
                     
    const machine = (materials.machine_specs && materials.machine_specs[productDef?.engine || 'digital']) ||
                    { click_color: 0.5, setup_cost: 20, name: "Digital Press" };

    // 3. חישוב כמויות (Imposition Logic)
    const qty = parseInt(newItem.qty) || 100;
    
    // חישוב Ups (כמה נכנסים בגיליון) - ברירת מחדל 1 אם לא ידוע
    let ups = 1;
    if (productKey === 'bc') ups = 24; 
    else if (productKey === 'flyer') ups = 4;
    else if (productKey === 'invitation') ups = 2;
    else if (productKey === 'sticker') ups = 6;

    const sheetsRequired = Math.ceil(qty / ups);
    const wasteSheets = Math.ceil(sheetsRequired * 0.05) + 15;
    const totalSheets = sheetsRequired + wasteSheets;

    // 4. חישוב גימורים דינמי
    let finishingCost = 0;
    let finishingName = "None";
    
    if (newItem.finishing) {
        // חיפוש הגימור ב-DB
        const finishKey = findBestMatchInDB(newItem.finishing, 'finishing');
        if (finishKey) {
            const fItem = materials.finishing[finishKey];
            finishingName = fItem.name;
            // לוגיקה: אם יש מחיר להרצה (run) או מחיר לצד (cost_side)
            if (fItem.run) finishingCost = fItem.run * qty;
            else if (fItem.cost_side) finishingCost = fItem.cost_side * qty; // פשטנו את החישוב לצורך הדוגמה
            else finishingCost = qty * 0.1; // Fallback
            
            // הוספת עלות Setup לגימור אם יש
            if (fItem.setup) finishingCost += fItem.setup;
        } else {
            // אם הלקוח ביקש משהו שלא ב-DB, לוקחים הערכה גסה
            finishingCost = qty * 0.2; 
            finishingName = "General Finishing";
        }
    }

    // 5. סיכום עלויות
    const costComponents = {
        paper: Number((totalSheets * (paperObj.cost_sheet || 0.1)).toFixed(2)),
        print: Number((totalSheets * (machine.click_color || 0.5)).toFixed(2)),
        setup: machine.setup_cost || 20,
        finishing: Number(finishingCost.toFixed(2))
    };

    const totalItemCost = Object.values(costComponents).reduce((a, b) => a + b, 0);
    
    // תמחור ומרווחים
    let margin = 2.5;
    if (qty > 1000) margin = 1.8;
    if (qty > 5000) margin = 1.5;
    
    const priceToClient = Math.ceil(totalItemCost * margin);
    const itemProfit = priceToClient - totalItemCost;
    const itemMargin = priceToClient > 0 ? ((itemProfit / priceToClient) * 100).toFixed(0) : 0;

    // 6. בניית הוראות ייצור
    const productionInstructions = {
        machine: machine.name,
        material: `${paperObj.name} (SRA3)`,
        setupInfo: `Imposition: ${ups} up | Finish: ${finishingName}`,
        quantityToPrint: totalSheets,
        notes: `Net Qty: ${qty}`
    };

    // 7. עדכון עגלה
    let updatedCart = [...currentCart];
    const existingIndex = updatedCart.findIndex(item => 
        item.product_name.toLowerCase().trim() === newItem.product_name.toLowerCase().trim()
    );

    const processedItem = {
        product_name: newItem.product_name,
        qty: qty,
        description: newItem.description || `${paperObj.name} + ${finishingName}`,
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

    // 8. סיכום עסקה גלובלי
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

    console.log(`GLOBAL STATS: Price=${total_deal_stats.totalPrice} | Margin=${globalMargin}%`);
    console.log("--- END CALCULATION ---");

    return { 
        updatedCart, 
        total_deal_stats, 
        lastAdded: processedItem 
    };
};

module.exports = { calculate_custom_job };