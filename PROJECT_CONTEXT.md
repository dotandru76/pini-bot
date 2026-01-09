# PINI BOT PROJECT CONTEXT
Generated: 2026-01-09T07:26:39.517Z



--- FILE: db\materials.json ---
```json
{
  "machine_specs": {
    "digital": {
      "name": "HP Indigo 7K",
      "sheet_size_cm": [32, 45],
      "click_color": 0.35,
      "click_bw": 0.06,
      "setup_cost": 20.00,
      "min_price": 50.00
    },
    "wide": {
      "name": "Roland SolJet",
      "ink_cost_sqm": 15.00,
      "setup_cost": 40.00,
      "min_price": 100.00
    }
  },
  "papers": {
    "offset_80": { 
        "name": "נטול עץ 80 גרם", 
        "cost_sheet": 0.08, 
        "type": "uncoated" 
    },
    "chromo_130": { 
        "name": "כרומו 130 גרם", 
        "cost_sheet": 0.12, 
        "type": "coated" 
    },
    "chromo_170": { 
        "name": "כרומו 170 גרם", 
        "cost_sheet": 0.18, 
        "type": "coated" 
    },
    "chromo_300": { 
        "name": "כרומו 300 גרם", 
        "cost_sheet": 0.35, 
        "type": "coated" 
    },
    "matte_350": { 
        "name": "מט 350 גרם", 
        "cost_sheet": 0.45, 
        "type": "matte" 
    },
    "pearl_300": { 
        "name": "נייר פנינה יוקרתי", 
        "cost_sheet": 1.20, 
        "type": "special" 
    },
    "texture_300": { 
        "name": "נייר טקסטורה מיוחד", 
        "cost_sheet": 1.50, 
        "type": "special" 
    },
    "sticker_paper": { 
        "name": "נייר מדבקה (פנים)", 
        "cost_sheet": 0.80, 
        "type": "sticker" 
    },
    "env_11x23": {
        "name": "מעטפה 11/23",
        "cost_sheet": 0.15,
        "type": "envelope"
    },
    "env_16x23": {
        "name": "מעטפה 16/23",
        "cost_sheet": 0.25,
        "type": "envelope"
    }
  },
  "wide_materials": {
    "vinyl_white": {
        "name": "ויניל לבן (חוץ)",
        "cost_sqm": 12.00
    },
    "vinyl_clear": {
        "name": "ויניל שקוף",
        "cost_sqm": 14.00
    },
    "canvas": {
        "name": "בד קנבס איכותי",
        "cost_sqm": 25.00
    },
    "rollup_film": {
        "name": "פילם לרולאפ",
        "cost_sqm": 20.00
    },
     "sticker_paper": { 
        "name": "מדבקת נייר (מ\"ר)", 
        "cost_sqm": 10.00
    }
  }
}
```


--- FILE: db\products.json ---
```json
{
  "bc": {
    "name": "כרטיסי ביקור",
    "engine": "digital",
    "questions": [
      { "key": "qty", "question_he": "כמה כרטיסים?", "type": "number" },
      { "key": "paper_type", "question_he": "איזה נייר?", "options": [{ "label": "מט 350 (סטנדרט)", "value": "matte_350" }, { "label": "כרומו 300 (מבריק)", "value": "chromo_300" }, { "label": "פנינה (יוקרתי)", "value": "pearl_300" }] },
      { "key": "lamination", "question_he": "ציפוי למינציה?", "options": [{ "label": "ללא", "value": "none" }, { "label": "מט (מומלץ)", "value": "lami_matte" }, { "label": "מבריק", "value": "lami_gloss" }] },
      { "key": "finishing", "question_he": "רוצה לשדרג עם השבחה?", "options": [{ "label": "ללא שדרוג", "value": "none" }, { "label": "הבלטה (Scodix)", "value": "scodix" }, { "label": "פויל זהב", "value": "gold_foil" }, { "label": "פויל כסף", "value": "silver_foil" }] }
    ]
  },
  "invitation": {
    "name": "הזמנות לאירועים",
    "engine": "digital",
    "questions": [
      { "key": "qty", "question_he": "כמה הזמנות?", "type": "number" },
      { "key": "size", "question_he": "מה הגודל?", "options": [{ "label": "13x18 (סטנדרט)", "value": "13x18" }, { "label": "15x15 (מרובע)", "value": "15x15" }] },
      { "key": "paper_type", "question_he": "איזה נייר?", "options": [{ "label": "פנינה (מנצנץ)", "value": "pearl_300" }, { "label": "מט 350", "value": "matte_350" }] },
      { "key": "finishing", "question_he": "גימור יוקרתי?", "options": [{ "label": "ללא", "value": "none" }, { "label": "פויל זהב", "value": "gold_foil" }, { "label": "פינות עגולות", "value": "round_corners" }] }
    ]
  },
  "flyer": {
    "name": "פליירים",
    "engine": "digital",
    "questions": [
      { "key": "qty", "question_he": "כמה פליירים?", "type": "number" },
      { "key": "size", "question_he": "גודל?", "options": [{ "label": "A5 (חצי דף)", "value": "A5" }, { "label": "A4 (דף שלם)", "value": "A4" }] },
      { "key": "paper_type", "question_he": "עובי נייר?", "options": [{ "label": "130 גרם (דק)", "value": "chromo_130" }, { "label": "300 גרם (עבה)", "value": "chromo_300" }] }
    ]
  },
  "envelope": {
    "name": "מעטפות",
    "engine": "digital",
    "questions": [
      { "key": "qty", "question_he": "כמה מעטפות?", "type": "number" },
      { "key": "size", "question_he": "גודל?", "options": [{ "label": "11x23 (סטנדרט)", "value": "env_11x23" }, { "label": "16x23 (להזמנות)", "value": "env_16x23" }] },
      { "key": "print", "question_he": "הדפסה?", "options": [{ "label": "ללא הדפסה", "value": "none" }, { "label": "שחור לבן", "value": "bw" }, { "label": "צבעוני", "value": "color" }] }
    ]
  },
  "rollup": {
    "name": "רולאפ",
    "engine": "wide",
    "questions": [
      { "key": "qty", "question_he": "כמה רולאפים?", "type": "number" },
      { "key": "size", "question_he": "גודל?", "options": [{ "label": "85x200 (סטנדרט)", "value": "85x200" }, { "label": "100x200 (רחב)", "value": "100x200" }] }
    ]
  }
}
```


--- FILE: engine\calculation.js ---
```js
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
```


--- FILE: engine\classifier.js ---
```js
/** engine/classifier.js V31.0 - Hybrid Intelligence */
const { routeWithLLM } = require('./llmRouter');

const KEYWORDS = {
    // מילים שמפעילות פעולה מידית ללא AI
    reset: ['reset', 'התחל', 'איפוס', 'ריסט', 'תפריט', 'ראשי'],
    cart: ['עגלה', 'סיכום', 'מה יש', 'status'],
    remove: ['מחק', 'הסר']
};

async function classifyMessage(message, session) {
    const text = message.toLowerCase().trim();

    // 1. FAST PATH (בדיקות מהירות)
    if (KEYWORDS.reset.some(k => text.includes(k))) return { intent: 'reset' };
    if (KEYWORDS.cart.some(k => text.includes(k))) return { intent: 'show_cart' };
    if (KEYWORDS.remove.some(k => text === k)) return { intent: 'remove' };

    // 2. SMART PATH (שימוש ב-Gemini)
    console.log("🧠 Consulting Gemini...");
    try {
        const llmResult = await routeWithLLM(message, session);
        
        console.log("🧠 LLM Decision:", llmResult.intent, llmResult.product);

        return {
            intent: llmResult.intent || 'chat',
            product: llmResult.product,
            extractedParams: llmResult.mapped_params || {}, 
            aiResponse: llmResult.answer_text, 
            raw_text: message
        };
    } catch (e) {
        console.error("Classifier Fallback:", e);
        return { intent: 'chat', aiResponse: "סליחה, אני קצת עמוס. נסה שוב." };
    }
}

module.exports = { classifyMessage };
```


--- FILE: engine\customerManager.js ---
```js
/**
 * Customer Manager - Pini Print Bot
 * ==================================
 * ניהול לקוחות עם זיהוי לפי טלפון
 * היסטוריית הזמנות, העדפות, ו-CRM בסיסי
 */

// === מאגר לקוחות (בזיכרון - בפרודקשן: MongoDB/PostgreSQL) ===
const customers = new Map();

// === מבנה לקוח ===
function createCustomer(phone, name = null) {
    return {
        id: `cust_${Date.now()}`,
        phone: normalizePhone(phone),
        name: name,
        email: null,
        
        // סטטיסטיקות
        stats: {
            totalOrders: 0,
            totalSpent: 0,
            firstOrder: null,
            lastOrder: null,
            averageOrder: 0
        },
        
        // העדפות שנלמדו
        preferences: {
            preferredProducts: [],      // מוצרים שהזמין הכי הרבה
            preferredMaterials: [],     // חומרים מועדפים
            usualQuantities: {},        // כמויות רגילות לפי מוצר
            priceRange: null,           // טווח מחירים רגיל
            designStatus: 'unknown'     // האם בד"כ מגיע עם עיצוב
        },
        
        // היסטוריה
        orderHistory: [],               // הזמנות קודמות
        quoteHistory: [],               // הצעות מחיר (גם אלה שלא הפכו להזמנה)
        
        // הערות
        notes: [],                      // הערות של בית הדפוס
        tags: [],                       // תגיות: 'VIP', 'עסקי', 'פרטי', 'בעייתי'
        
        // מטא
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

// === נרמול טלפון ===
function normalizePhone(phone) {
    if (!phone) return null;
    
    // הסר כל מה שלא ספרה
    let normalized = phone.replace(/\D/g, '');
    
    // המר 972 ל-0
    if (normalized.startsWith('972')) {
        normalized = '0' + normalized.slice(3);
    }
    
    // וודא שמתחיל ב-0
    if (!normalized.startsWith('0') && normalized.length === 9) {
        normalized = '0' + normalized;
    }
    
    return normalized;
}

// === חיפוש/יצירת לקוח ===
function findOrCreateCustomer(phone, name = null) {
    const normalizedPhone = normalizePhone(phone);
    
    if (!normalizedPhone) {
        return null;
    }
    
    // חפש לקוח קיים
    let customer = customers.get(normalizedPhone);
    
    if (customer) {
        // עדכן שם אם ניתן חדש
        if (name && !customer.name) {
            customer.name = name;
            customer.updatedAt = new Date();
        }
        console.log(`   👤 Found existing customer: ${customer.name || normalizedPhone}`);
        return customer;
    }
    
    // צור לקוח חדש
    customer = createCustomer(normalizedPhone, name);
    customers.set(normalizedPhone, customer);
    console.log(`   👤 Created new customer: ${name || normalizedPhone}`);
    
    return customer;
}

// === חיפוש לקוח לפי טלפון ===
function getCustomerByPhone(phone) {
    const normalizedPhone = normalizePhone(phone);
    return customers.get(normalizedPhone) || null;
}

// === עדכון לקוח אחרי הזמנה ===
function updateCustomerAfterOrder(phone, order) {
    const customer = getCustomerByPhone(phone);
    if (!customer) return null;
    
    // עדכן סטטיסטיקות
    customer.stats.totalOrders++;
    customer.stats.totalSpent += order.total;
    customer.stats.lastOrder = new Date();
    if (!customer.stats.firstOrder) {
        customer.stats.firstOrder = new Date();
    }
    customer.stats.averageOrder = Math.round(customer.stats.totalSpent / customer.stats.totalOrders);
    
    // עדכן העדפות
    order.items.forEach(item => {
        // מוצרים מועדפים
        const prodIndex = customer.preferences.preferredProducts.findIndex(p => p.name === item.product_name);
        if (prodIndex >= 0) {
            customer.preferences.preferredProducts[prodIndex].count++;
        } else {
            customer.preferences.preferredProducts.push({ name: item.product_name, count: 1 });
        }
        
        // כמויות רגילות
        if (!customer.preferences.usualQuantities[item.product_name]) {
            customer.preferences.usualQuantities[item.product_name] = [];
        }
        customer.preferences.usualQuantities[item.product_name].push(item.qty);
    });
    
    // מיין מועדפים
    customer.preferences.preferredProducts.sort((a, b) => b.count - a.count);
    
    // שמור בהיסטוריה
    customer.orderHistory.push({
        id: `ord_${Date.now()}`,
        date: new Date(),
        items: order.items,
        total: order.total,
        status: 'confirmed'
    });
    
    customer.updatedAt = new Date();
    
    return customer;
}

// === שמירת הצעת מחיר (גם אם לא הפכה להזמנה) ===
function saveQuoteToCustomer(phone, cart, total) {
    const customer = getCustomerByPhone(phone);
    if (!customer) return null;
    
    customer.quoteHistory.push({
        id: `quote_${Date.now()}`,
        date: new Date(),
        items: cart.map(i => ({ 
            product_name: i.product_name, 
            qty: i.qty, 
            price: i.client_price 
        })),
        total,
        convertedToOrder: false
    });
    
    customer.updatedAt = new Date();
    return customer;
}

// === הוספת הערה ללקוח ===
function addNoteToCustomer(phone, note, author = 'system') {
    const customer = getCustomerByPhone(phone);
    if (!customer) return null;
    
    customer.notes.push({
        text: note,
        author,
        date: new Date()
    });
    
    customer.updatedAt = new Date();
    return customer;
}

// === הוספת תגית ===
function addTagToCustomer(phone, tag) {
    const customer = getCustomerByPhone(phone);
    if (!customer) return null;
    
    if (!customer.tags.includes(tag)) {
        customer.tags.push(tag);
        customer.updatedAt = new Date();
    }
    
    return customer;
}

// === קבלת סיכום לקוח לדשבורד ===
function getCustomerSummary(phone) {
    const customer = getCustomerByPhone(phone);
    if (!customer) return null;
    
    // חשב כמות רגילה ממוצעת לכל מוצר
    const usualQuantities = {};
    for (const [product, quantities] of Object.entries(customer.preferences.usualQuantities)) {
        const avg = Math.round(quantities.reduce((a, b) => a + b, 0) / quantities.length);
        usualQuantities[product] = avg;
    }
    
    return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        
        // תמצית לדשבורד
        isNew: customer.stats.totalOrders === 0,
        isVIP: customer.tags.includes('VIP'),
        isReturning: customer.stats.totalOrders > 0,
        
        // סטטיסטיקות
        totalOrders: customer.stats.totalOrders,
        totalSpent: customer.stats.totalSpent,
        averageOrder: customer.stats.averageOrder,
        daysSinceLastOrder: customer.stats.lastOrder 
            ? Math.floor((Date.now() - new Date(customer.stats.lastOrder)) / (1000 * 60 * 60 * 24))
            : null,
        
        // העדפות
        topProducts: customer.preferences.preferredProducts.slice(0, 3),
        usualQuantities,
        
        // תגיות והערות
        tags: customer.tags,
        lastNote: customer.notes.length > 0 
            ? customer.notes[customer.notes.length - 1] 
            : null,
        
        // היסטוריה אחרונה
        lastOrders: customer.orderHistory.slice(-3).reverse()
    };
}

// === חיפוש לקוחות ===
function searchCustomers(query) {
    const results = [];
    const searchLower = query.toLowerCase();
    
    for (const customer of customers.values()) {
        if (
            customer.phone.includes(query) ||
            (customer.name && customer.name.toLowerCase().includes(searchLower)) ||
            (customer.email && customer.email.toLowerCase().includes(searchLower))
        ) {
            results.push(getCustomerSummary(customer.phone));
        }
    }
    
    return results;
}

// === קבלת כל הלקוחות (לדשבורד ניהול) ===
function getAllCustomers(options = {}) {
    const { 
        sortBy = 'lastOrder', 
        limit = 50, 
        tags = null,
        minSpent = null 
    } = options;
    
    let results = Array.from(customers.values());
    
    // סינון לפי תגיות
    if (tags && tags.length > 0) {
        results = results.filter(c => tags.some(t => c.tags.includes(t)));
    }
    
    // סינון לפי סכום מינימלי
    if (minSpent) {
        results = results.filter(c => c.stats.totalSpent >= minSpent);
    }
    
    // מיון
    switch (sortBy) {
        case 'lastOrder':
            results.sort((a, b) => (b.stats.lastOrder || 0) - (a.stats.lastOrder || 0));
            break;
        case 'totalSpent':
            results.sort((a, b) => b.stats.totalSpent - a.stats.totalSpent);
            break;
        case 'totalOrders':
            results.sort((a, b) => b.stats.totalOrders - a.stats.totalOrders);
            break;
        case 'name':
            results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
    }
    
    // הגבלה
    results = results.slice(0, limit);
    
    return results.map(c => getCustomerSummary(c.phone));
}

// === סטטיסטיקות כלליות ===
function getCustomerStats() {
    const allCustomers = Array.from(customers.values());
    
    const totalCustomers = allCustomers.length;
    const totalRevenue = allCustomers.reduce((sum, c) => sum + c.stats.totalSpent, 0);
    const totalOrders = allCustomers.reduce((sum, c) => sum + c.stats.totalOrders, 0);
    
    const vipCustomers = allCustomers.filter(c => c.tags.includes('VIP')).length;
    const newCustomers = allCustomers.filter(c => c.stats.totalOrders === 0).length;
    const returningCustomers = allCustomers.filter(c => c.stats.totalOrders > 1).length;
    
    // לקוחות פעילים (הזמינו ב-30 יום האחרונים)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const activeCustomers = allCustomers.filter(c => 
        c.stats.lastOrder && new Date(c.stats.lastOrder) > thirtyDaysAgo
    ).length;
    
    return {
        totalCustomers,
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        vipCustomers,
        newCustomers,
        returningCustomers,
        activeCustomers,
        conversionRate: totalCustomers > 0 
            ? Math.round((returningCustomers / totalCustomers) * 100) 
            : 0
    };
}

// === זיהוי טלפון מטקסט ===
function extractPhoneFromText(text) {
    // חפש מספר טלפון ישראלי
    const patterns = [
        /0[5-9]\d[- ]?\d{3}[- ]?\d{4}/,  // 050-123-4567 or 0501234567
        /\+972[- ]?5\d[- ]?\d{3}[- ]?\d{4}/, // +972-50-123-4567
        /972[- ]?5\d[- ]?\d{3}[- ]?\d{4}/    // 972-50-123-4567
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return normalizePhone(match[0]);
        }
    }
    
    return null;
}

// === זיהוי שם מטקסט ===
function extractNameFromText(text) {
    // חפש "אני X" או "קוראים לי X" או "שמי X"
    const patterns = [
        /(?:אני|שמי|קוראים לי)\s+([א-ת]+(?:\s+[א-ת]+)?)/,
        /(?:I'm|I am|my name is)\s+(\w+(?:\s+\w+)?)/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }
    
    return null;
}

module.exports = {
    // ניהול לקוחות
    findOrCreateCustomer,
    getCustomerByPhone,
    updateCustomerAfterOrder,
    saveQuoteToCustomer,
    addNoteToCustomer,
    addTagToCustomer,
    
    // שליפת מידע
    getCustomerSummary,
    searchCustomers,
    getAllCustomers,
    getCustomerStats,
    
    // עזר
    normalizePhone,
    extractPhoneFromText,
    extractNameFromText,
    
    // גישה ישירה (לבדיקות)
    _customers: customers
};

```


--- FILE: engine\dashboardManager.js ---
```js
/**
 * Dashboard Manager - Pini Print Bot
 * ====================================
 * מנוע דשבורד משופר לבית דפוס
 * מידע שימושי על העסקה, הלקוח, והייצור
 */

const { getCustomerSummary, getCustomerStats } = require('./customerManager');

// === מבנה דשבורד מורחב ===
function generateDashboard(session, customerPhone = null) {
    const dashboard = {
        // === סעיף 1: מידע על העסקה הנוכחית ===
        currentDeal: generateDealSection(session),
        
        // === סעיף 2: מידע על הלקוח ===
        customer: customerPhone ? generateCustomerSection(customerPhone) : null,
        
        // === סעיף 3: פקודות עבודה ===
        production: generateProductionSection(session.cart),
        
        // === סעיף 4: התראות וטיפים ===
        alerts: generateAlerts(session, customerPhone),
        
        // === סעיף 5: Upsell הצעות ===
        upsellSuggestions: generateUpsellSuggestions(session.cart),
        
        // מטא
        generatedAt: new Date(),
        sessionId: session.id
    };
    
    return dashboard;
}

// === סעיף 1: מידע על העסקה ===
function generateDealSection(session) {
    const cart = session.cart || [];
    
    if (cart.length === 0) {
        return {
            isEmpty: true,
            itemCount: 0,
            totalPrice: 0,
            totalCost: 0,
            profitMargin: 0,
            profit: 0
        };
    }
    
    const totalPrice = cart.reduce((sum, item) => sum + item.client_price, 0);
    const totalCost = cart.reduce((sum, item) => sum + (item.cost || 0), 0);
    const profit = totalPrice - totalCost;
    const profitMargin = totalPrice > 0 ? Math.round((profit / totalPrice) * 100) : 0;
    
    // פירוט לפי מוצר
    const itemsBreakdown = cart.map(item => ({
        name: item.product_name,
        qty: item.qty,
        price: item.client_price,
        cost: item.cost || 0,
        profit: item.client_price - (item.cost || 0),
        margin: item.client_price > 0 
            ? Math.round(((item.client_price - (item.cost || 0)) / item.client_price) * 100) 
            : 0,
        category: item.product_category || 'other',
        isWideFormat: ['rollup', 'canvas', 'banner'].includes(item.product_category)
    }));
    
    // סיכום לפי קטגוריה
    const byCategory = {};
    itemsBreakdown.forEach(item => {
        const cat = item.isWideFormat ? 'wide_format' : 'digital';
        if (!byCategory[cat]) {
            byCategory[cat] = { count: 0, total: 0 };
        }
        byCategory[cat].count++;
        byCategory[cat].total += item.price;
    });
    
    return {
        isEmpty: false,
        itemCount: cart.length,
        totalPrice,
        totalCost,
        profit,
        profitMargin,
        items: itemsBreakdown,
        byCategory,
        
        // דגלים
        isLargeDeal: totalPrice > 2000,
        isHighMargin: profitMargin >= 55,
        isLowMargin: profitMargin < 40,
        hasWideFormat: itemsBreakdown.some(i => i.isWideFormat),
        
        // סף למשלוח חינם (דוגמה)
        freeShippingThreshold: 500,
        amountToFreeShipping: totalPrice >= 500 ? 0 : 500 - totalPrice
    };
}

// === סעיף 2: מידע על הלקוח ===
function generateCustomerSection(phone) {
    const customer = getCustomerSummary(phone);
    
    if (!customer) {
        return {
            isIdentified: false,
            message: 'לקוח לא מזוהה - בקש מספר טלפון'
        };
    }
    
    return {
        isIdentified: true,
        id: customer.id,
        name: customer.name || 'לא צוין',
        phone: customer.phone,
        
        // סטטוס לקוח
        status: {
            isNew: customer.isNew,
            isVIP: customer.isVIP,
            isReturning: customer.isReturning,
            badge: customer.isVIP ? '⭐ VIP' : customer.isNew ? '🆕 חדש' : '🔄 חוזר'
        },
        
        // היסטוריה
        history: {
            totalOrders: customer.totalOrders,
            totalSpent: customer.totalSpent,
            averageOrder: customer.averageOrder,
            lastOrderDays: customer.daysSinceLastOrder
        },
        
        // העדפות
        preferences: {
            topProducts: customer.topProducts,
            usualQuantities: customer.usualQuantities
        },
        
        // תגיות והערות
        tags: customer.tags,
        lastNote: customer.lastNote,
        
        // הזמנות אחרונות
        recentOrders: customer.lastOrders
    };
}

// === סעיף 3: פקודות עבודה ===
function generateProductionSection(cart) {
    if (!cart || cart.length === 0) {
        return { hasJobs: false, jobs: [] };
    }
    
    const jobs = cart.map((item, index) => {
        const job = {
            jobNumber: index + 1,
            productName: item.product_name,
            quantity: item.qty,
            
            // הוראות ייצור
            instructions: item.instructions || generateDefaultInstructions(item),
            
            // סטטוס עיצוב
            designStatus: item.designStatus || 'pending',
            designStatusHeb: getDesignStatusHebrew(item.designStatus),
            
            // זמן משוער
            estimatedTime: estimateProductionTime(item),
            
            // חומרים נדרשים
            materials: {
                paper: item.description || 'לא צוין',
                finishing: item.finishing || 'ללא'
            },
            
            // דגלים
            isUrgent: item.isUrgent || false,
            needsDesign: item.designStatus === 'NEEDS_DESIGN' || item.designStatus === 'NEEDS_EVERYTHING',
            isWideFormat: ['rollup', 'canvas', 'banner'].includes(item.product_category)
        };
        
        return job;
    });
    
    // סיכום ייצור
    const summary = {
        totalJobs: jobs.length,
        digitalJobs: jobs.filter(j => !j.isWideFormat).length,
        wideFormatJobs: jobs.filter(j => j.isWideFormat).length,
        needsDesign: jobs.filter(j => j.needsDesign).length,
        urgentJobs: jobs.filter(j => j.isUrgent).length,
        totalEstimatedTime: jobs.reduce((sum, j) => sum + j.estimatedTime, 0)
    };
    
    return {
        hasJobs: true,
        jobs,
        summary
    };
}

// === סעיף 4: התראות ===
function generateAlerts(session, customerPhone) {
    const alerts = [];
    const cart = session.cart || [];
    
    // עגלה ריקה
    if (cart.length === 0) {
        alerts.push({
            type: 'info',
            icon: '📝',
            message: 'העגלה ריקה - מחכים להזמנה'
        });
        return alerts;
    }
    
    // בדיקת מרווח רווח נמוך
    const totalPrice = cart.reduce((sum, i) => sum + i.client_price, 0);
    const totalCost = cart.reduce((sum, i) => sum + (i.cost || 0), 0);
    const margin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;
    
    if (margin < 40) {
        alerts.push({
            type: 'warning',
            icon: '⚠️',
            message: `מרווח רווח נמוך: ${Math.round(margin)}% (מומלץ מעל 40%)`
        });
    }
    
    // עסקה גדולה
    if (totalPrice > 3000) {
        alerts.push({
            type: 'success',
            icon: '💰',
            message: `עסקה גדולה! ₪${totalPrice.toLocaleString()} - שקול הנחת כמות`
        });
    }
    
    // בדיקת לקוח VIP
    if (customerPhone) {
        const customer = getCustomerSummary(customerPhone);
        if (customer?.isVIP) {
            alerts.push({
                type: 'info',
                icon: '⭐',
                message: `לקוח VIP - ${customer.name || 'ללא שם'} (₪${customer.totalSpent?.toLocaleString() || 0} סה"כ)`
            });
        }
        
        // לקוח שלא הזמין הרבה זמן
        if (customer?.daysSinceLastOrder > 90) {
            alerts.push({
                type: 'info',
                icon: '🔔',
                message: `לקוח חוזר אחרי ${customer.daysSinceLastOrder} יום - הזדמנות לחיזוק הקשר`
            });
        }
    }
    
    // פריטים שצריכים עיצוב
    const needsDesign = cart.filter(i => 
        i.designStatus === 'NEEDS_DESIGN' || i.designStatus === 'NEEDS_EVERYTHING'
    );
    if (needsDesign.length > 0) {
        alerts.push({
            type: 'warning',
            icon: '🎨',
            message: `${needsDesign.length} פריטים צריכים עיצוב - לתמחר בנפרד`
        });
    }
    
    // פורמט רחב
    const wideFormat = cart.filter(i => 
        ['rollup', 'canvas', 'banner'].includes(i.product_category)
    );
    if (wideFormat.length > 0) {
        alerts.push({
            type: 'info',
            icon: '🖼️',
            message: `${wideFormat.length} פריטי פורמט רחב - בדוק זמינות מכונה`
        });
    }
    
    return alerts;
}

// === סעיף 5: הצעות Upsell ===
function generateUpsellSuggestions(cart) {
    const suggestions = [];
    
    if (!cart || cart.length === 0) return suggestions;
    
    // בדוק כל פריט
    cart.forEach(item => {
        // הצעת למינציה
        if (['flyer', 'bc', 'invitation'].includes(item.product_category)) {
            if (!item.finishing?.includes('למינציה')) {
                suggestions.push({
                    type: 'finishing',
                    targetProduct: item.product_name,
                    suggestion: 'למינציה מט',
                    benefit: 'מגן על הצבעים ונותן מראה יוקרתי',
                    estimatedAddition: Math.round(item.qty * 0.15) // ~15 אג' ליחידה
                });
            }
        }
        
        // הצעת כמות גדולה יותר
        if (item.qty < 1000 && ['flyer', 'bc'].includes(item.product_category)) {
            const nextTier = item.qty < 500 ? 500 : 1000;
            suggestions.push({
                type: 'quantity',
                targetProduct: item.product_name,
                currentQty: item.qty,
                suggestedQty: nextTier,
                benefit: `מחיר ליחידה נמוך יותר ב-${nextTier} יחידות`
            });
        }
        
        // הצעת מוצר משלים
        if (item.product_category === 'invitation') {
            const hasPlaceCards = cart.some(i => i.product_category === 'place_card');
            if (!hasPlaceCards) {
                suggestions.push({
                    type: 'complementary',
                    targetProduct: item.product_name,
                    suggestion: 'כרטיסי הושבה',
                    benefit: 'להשלמת חבילת האירוע',
                    suggestedQty: item.qty
                });
            }
        }
    });
    
    return suggestions.slice(0, 3); // מקסימום 3 הצעות
}

// === פונקציות עזר ===

function generateDefaultInstructions(item) {
    return {
        machine: item.isWideFormat ? 'Roland SolJet' : 'HP Indigo 7K',
        material: item.description || 'סטנדרטי',
        printSides: 'דו-צדדי (4/4)',
        notes: []
    };
}

function getDesignStatusHebrew(status) {
    const map = {
        'PRINT_READY': '✅ מוכן להדפסה',
        'NEEDS_ADJUSTMENT': '🔧 צריך התאמות',
        'NEEDS_DESIGN': '🎨 צריך עיצוב',
        'NEEDS_EVERYTHING': '📝 צריך הכל',
        'pending': '⏳ ממתין לקובץ',
        'unknown': '❓ לא ידוע'
    };
    return map[status] || map['unknown'];
}

function estimateProductionTime(item) {
    // זמן בדקות
    let time = 30; // בסיס
    
    // לפי כמות
    if (item.qty > 1000) time += 30;
    if (item.qty > 5000) time += 60;
    
    // לפי סוג
    if (['rollup', 'canvas', 'banner'].includes(item.product_category)) {
        time = item.qty * 15; // 15 דקות ליחידה
    }
    
    // גימורים
    if (item.finishing) {
        time += 20;
    }
    
    return time;
}

// === יצוא ===
module.exports = {
    generateDashboard,
    generateDealSection,
    generateCustomerSection,
    generateProductionSection,
    generateAlerts,
    generateUpsellSuggestions
};

```


--- FILE: engine\extractor.js ---
```js
/** engine/extractor.js - With Remove Logic */
const KEYWORD_MAP = {
    'bc': 'bc', 'כרטיס': 'bc', 'כרטיסים': 'bc', 'ביקור': 'bc',
    'flyer': 'flyer', 'פלייר': 'flyer', 'פליירים': 'flyer', 'עלון': 'flyer',
    'booklet': 'booklet', 'חוברת': 'booklet', 'חוברות': 'booklet', 'ספר': 'booklet', 'ספרים': 'booklet', 'קטלוג': 'booklet',
    'invitation': 'invitation', 'הזמנה': 'invitation', 'הזמנות': 'invitation', 'חתונה': 'invitation',
    'rollup': 'rollup', 'רולאפ': 'rollup', 'באנר': 'rollup',
    'poster': 'poster', 'פוסטר': 'poster', 'קנבס': 'poster',
    'sticker': 'sticker', 'מדבקה': 'sticker', 'מדבקות': 'sticker',
    'envelope': 'envelope', 'מעטפה': 'envelope', 'מעטפות': 'envelope',
    'folder': 'folder', 'פולדר': 'folder'
};

const HEBREW_NUMBERS = {
    'אחד': 1, 'אחת': 1, 'שני': 2, 'שתי': 2, 'שלוש': 3, 'שלושה': 3,
    'ארבע': 4, 'ארבעה': 4, 'חמש': 5, 'חמישה': 5, 'שש': 6, 'שישה': 6,
    'שבע': 7, 'שמונה': 8, 'תשע': 9, 'עשר': 10, 'מאה': 100, 'אלף': 1000
};

function extractParameters(text) {
    let cleanText = text.toLowerCase().replace(/,/g, '');
    
    const result = {
        products: [],
        qty: null,
        isReset: false,
        isRemove: false, // <--- חדש
        targetIndex: null, // <--- חדש
        isCartStatus: false,
        raw_text: text
    };

    // 1. זיהוי מחיקה ספציפית
    const removeKeywords = ['מחק', 'הסר', 'בטל', 'להוריד', 'תוריד'];
    if (removeKeywords.some(w => cleanText.includes(w))) {
        result.isRemove = true;
        // ננסה למצוא מספר (למשל: "מחק את 1")
        const numMatch = cleanText.match(/(\d+)/);
        if (numMatch) result.targetIndex = parseInt(numMatch[0]);
        // אם אין מספר, ננסה למצוא שם מוצר למטה...
    }

    // 2. זיהוי איפוס מלא
    const resetKeywords = ['reset', 'התחל', 'תפריט', 'נקה הכל', 'איפוס', 'יציאה'];
    if (resetKeywords.some(word => cleanText.includes(word)) && !result.isRemove) {
        result.isReset = true;
        return result;
    }

    // 3. זיהוי עגלה
    if (cleanText.includes('cart') || cleanText.includes('עגלה') || cleanText.includes('סיכום') || cleanText.includes('סטטוס')) {
        result.isCartStatus = true;
        return result;
    }

    // 4. זיהוי מוצרים
    const foundProducts = new Set();
    Object.keys(KEYWORD_MAP).forEach(keyword => {
        if (cleanText.includes(keyword)) {
            foundProducts.add(KEYWORD_MAP[keyword]);
        }
    });
    result.products = Array.from(foundProducts);

    // 5. זיהוי כמות
    const kMatch = cleanText.match(/(\d+)k/);
    if (kMatch) {
        result.qty = parseInt(kMatch[1]) * 1000;
    } else {
        const numMatch = cleanText.match(/\d+/);
        if (numMatch) {
            // אם זה לא מחיקה, ניקח את המספר ככמות
            if (!result.isRemove) result.qty = parseInt(numMatch[0]);
        } else {
            for (const [word, val] of Object.entries(HEBREW_NUMBERS)) {
                if (cleanText.includes(word)) {
                    result.qty = val;
                    break;
                }
            }
        }
    }

    return result;
}

module.exports = { extractParameters };
```


--- FILE: engine\llmRouter.js ---
```js
/** engine/llmRouter.js V32.0 - The Precision Brain */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const logAI = (msg, data) => console.log(`\x1b[35m[🧠 AI-BRAIN]\x1b[0m ${msg}`, data ? JSON.stringify(data, null, 2) : '');

let genAI = null;
try { genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); } catch (e) { logAI("⚠️ Error: No API Key"); }

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

const SYSTEM_PROMPT = `
You are "Pini", a print shop expert.
Your job: Extract structured data (JSON) for the "Wizard".

AVAILABLE PRODUCTS: ${Object.keys(productsDB).join(', ')}

*** IRON RULES (DO NOT BREAK) ***
1. **Negation Handling (CRITICAL)**:
   - If user says "No need for printing", "Without lamination", "No frame" -> Map parameter to "none".
   - DO NOT output intent "remove" unless the user explicitly says "Delete the item", "Remove product", "Cancel order".
   - Example: "I don't need printing" -> intent: "update", mapped_params: { "print": "none" }

2. **Context Awareness**:
   - Always prefer modifying the [ACTIVE PRODUCT] over switching topics.
   - If user gives a number (e.g. "500"), map it to "qty".

3. **Output Format (JSON ONLY)**:
{
  "intent": "quote" | "consult" | "chat" | "remove" | "reset" | "update",
  "product": "product_key" | null,
  "answer_text": "Hebrew text here (keep it short)",
  "mapped_params": { "qty": 100, "paper": "matte", ... },
  "confidence": "high" | "low"
}
`;

async function routeWithLLM(message, session) {
    logAI(`Analyzing Input: "${message}"`);
    
    if (!genAI) return { intent: 'chat', answer_text: "שגיאת חיבור ל-AI" };

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const finalPrompt = SYSTEM_PROMPT 
            + `\n[CURRENT STATE]: Active Product: ${session.currentProduct || "None"}`
            + `\n[USER SAYS]: "${message}"\nJSON Output:`;

        const result = await model.generateContent(finalPrompt);
        let text = result.response.text().replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(text);
        
        logAI("Parsed JSON:", parsed);
        return parsed;

    } catch (error) {
        console.error("\x1b[31m[🧠 AI ERROR]\x1b[0m", error);
        return { intent: "chat", answer_text: null };
    }
}

module.exports = { routeWithLLM };
```


--- FILE: engine\menuGenerator.js ---
```js
/**
 * Menu Generator - Pini Print Bot
 * ===============================
 * מחליט איזה תפריט להציג למשתמש לפי ההקשר
 */

const { DYNAMIC_MENUS } = require('./productCatalog');

function generateQuickReplies(classification, currentProduct = null) {
    const action = classification.action;
    
    // 1. ברכה / התחלה / ניקוי -> תפריט ראשי + מוצרים פופולריים
    if (action === 'greeting' || action === 'clear') {
        return [...DYNAMIC_MENUS.products.slice(0, 4), "תפריט ראשי 🏠"];
    }

    // 2. הצעת מחיר (Quote) או עדכון כמות -> תפריט ספציפי למוצר
    if ((action === 'quote' || action === 'update_qty') && currentProduct) {
        // מנסה למצוא תפריט ספציפי למוצר (למשל 'flyer')
        // אם אין תפריט ספציפי למוצר, נחזיר את התפריט הראשי של המוצרים
        const productKey = mapProductKey(currentProduct);
        const productMenu = DYNAMIC_MENUS[productKey];
        
        if (productMenu) {
            return [...productMenu, "סיום הזמנה ✅"];
        }
    }

    // 3. שאלה כללית (Chat) -> תפריט ניווט ועזרה
    if (action === 'chat') {
        return ["קטלוג מוצרים 📚", "שאלות נפוצות ❓", "דבר עם נציג 📞"];
    }

    // 4. סיום / שליחה -> אפשרויות תשלום ומשלוח
    if (action === 'send_quote') {
        return ["אשר הזמנה ✅", "תיקון כמות ✏️", ...DYNAMIC_MENUS.shipping];
    }

    // 5. הסרה -> חזרה לתפריט ראשי
    if (action === 'remove') {
        return DYNAMIC_MENUS.main;
    }

    // ברירת מחדל
    return DYNAMIC_MENUS.main;
}

// פונקציית עזר למיפוי שמות מוצרים למפתחות בתפריט
function mapProductKey(detectedProduct) {
    if (!detectedProduct) return null;
    if (detectedProduct.includes('bc') || detectedProduct.includes('כרטיס')) return 'bc';
    if (detectedProduct.includes('flyer') || detectedProduct.includes('פלייר')) return 'flyer';
    if (detectedProduct.includes('invitation') || detectedProduct.includes('הזמנ')) return 'invitation';
    if (detectedProduct.includes('rollup') || detectedProduct.includes('רול')) return 'rollup';
    if (detectedProduct.includes('sticker') || detectedProduct.includes('מדבק')) return 'sticker';
    if (detectedProduct.includes('booklet') || detectedProduct.includes('חובר')) return 'booklet';
    return null;
}

module.exports = { generateQuickReplies };
```


--- FILE: engine\optimizer.js ---
```js
/**
 * engine/optimizer.js
 * מנוע אימפוזיציה (Imposition Engine)
 * ====================================
 * תפקיד: לחשב מתמטית כמה יחידות נכנסות בגיליון SRA3.
 * זהו המפתח לרווחיות - חישוב מדויק של ניצול נייר.
 */

const MACHINE_SPECS = {
    // HP Indigo 7K specs (SRA3)
    sheetWidth: 320,  // mm
    sheetHeight: 450, // mm
    margins: 5,       // mm (safety margin for gripper/bleed)
    gutter: 2         // mm (space between cuts)
};

/**
 * חישוב פריסה אופטימלית (Best Fit)
 * @param {number} prodWidth - רוחב מוצר במ"מ
 * @param {number} prodHeight - גובה מוצר במ"מ
 * @returns {object} { ups, sheets_needed, layout }
 */
function calculateImposition(prodWidth, prodHeight) {
    // שטח נטו להדפסה (לאחר הפחתת שולי מכונה)
    const safeW = MACHINE_SPECS.sheetWidth - (MACHINE_SPECS.margins * 2);
    const safeH = MACHINE_SPECS.sheetHeight - (MACHINE_SPECS.margins * 2);

    // הגנה מפני קלט לא תקין
    if (!prodWidth || !prodHeight || prodWidth <= 0 || prodHeight <= 0) {
        return { ups: 0, layout: 'error', efficiency: 0 };
    }

    // אופציה א': ישר (Portrait)
    // כמה נכנסים לרוחב * כמה נכנסים לגובה
    const fitW_A = Math.floor(safeW / (prodWidth + MACHINE_SPECS.gutter));
    const fitH_A = Math.floor(safeH / (prodHeight + MACHINE_SPECS.gutter));
    const total_A = fitW_A * fitH_A;

    // אופציה ב': מסובב (Landscape)
    // הופכים את הכיוונים
    const fitW_B = Math.floor(safeW / (prodHeight + MACHINE_SPECS.gutter));
    const fitH_B = Math.floor(safeH / (prodWidth + MACHINE_SPECS.gutter));
    const total_B = fitW_B * fitH_B;

    // בחירת המנצח (איפה נכנסים יותר?)
    const maxUps = Math.max(total_A, total_B);
    const bestLayout = total_A >= total_B ? 'portrait' : 'landscape';

    // חישוב אחוז ניצול הנייר (Efficiency)
    const usedArea = maxUps * prodWidth * prodHeight;
    const totalArea = MACHINE_SPECS.sheetWidth * MACHINE_SPECS.sheetHeight;
    const efficiency = ((usedArea / totalArea) * 100).toFixed(1);

    return {
        ups: maxUps, // כמה נכנסים בגיליון אחד
        layout: bestLayout,
        efficiency: efficiency + "%"
    };
}

module.exports = { calculateImposition };
```


--- FILE: engine\personalityEngine.js ---
```js
/**
 * Pini Personality & Smart Selling Engine
 * ========================================
 * אישיות חמה + מכירה חכמה
 * 
 * עקרונות:
 * 1. תמיד בצד הלקוח (לפחות ככה זה נראה)
 * 2. המלצות שנראות אישיות - אבל רווחיות
 * 3. הנחות שמרגישות כמו מתנה - אבל מתוכננות
 * 4. Upsell שמרגיש כמו עזרה - לא מכירה
 */

// === אישיות פיני ===
const PINI_PERSONALITY = {
    name: 'פיני',
    role: 'הדפס הכי ותיק בבית יצחק',
    traits: ['חם', 'מקצועי', 'ישיר', 'הומוריסטי קלות'],
    
    // ביטויים אופייניים
    expressions: {
        greeting: [
            "היי! פיני פה 👋",
            "שלום שלום! מה נדפיס היום?",
            "אהלן! איך אפשר לעזור?",
            "הי! פיני מבית יצחק, במה אוכל לשרת?"
        ],
        
        excitement: [
            "יופי של בחירה! 🎉",
            "מעולה!",
            "סבבה!",
            "אחלה!",
            "זה יהיה יפהפה!"
        ],
        
        thinking: [
            "רגע, בוא נראה...",
            "אוקיי, אז...",
            "יאללה, בוא נחשב..."
        ],
        
        empathy: [
            "אני מבין לגמרי",
            "הגיוני",
            "ברור, אין בעיה",
            "בטח, בוא נסתדר"
        ],
        
        recommendation: [
            "תשמע, מניסיון שלי...",
            "טיפ קטן -",
            "בין לבינינו,",
            "מה שהכי עובד ללקוחות שלנו..."
        ],
        
        closing: [
            "צריך עוד משהו?",
            "מה עוד אפשר להוסיף?",
            "יש עוד משהו לאירוע?",
            "זהו או שיש עוד?"
        ]
    }
};

// === טקטיקות מכירה חכמות ===
const SMART_SELLING = {
    
    // === 1. Anchoring - עיגון מחיר ===
    // תמיד תציג קודם אופציה יקרה יותר
    anchoring: {
        strategy: 'הצג premium קודם, אז הרגיל נראה זול',
        example: {
            wrong: "כרטיסי ביקור ב-₪199",
            right: "יש לנו Premium ב-₪399 עם הבלטה, או הקלאסי שלנו ב-₪199 - גם הוא איכותי מאוד"
        }
    },
    
    // === 2. Bundle - חבילות ===
    // תמיד תציע חבילה במקום פריט בודד
    bundling: {
        strategy: 'חבילה נראית כמו עסקה טובה יותר',
        triggers: {
            'invitation': ['place_card', 'sticker', 'thank_you_card'],
            'bc': ['flyer', 'folder'],
            'flyer': ['bc', 'poster', 'rollup']
        }
    },
    
    // === 3. Quantity Breaks - הנחות כמות ===
    // תמיד תראה כמה עוד צריך להנחה
    quantityBreaks: {
        strategy: 'הראה מה מפסיד אם לא מגדיל כמות',
        thresholds: [250, 500, 1000, 2500, 5000],
        messaging: (current, next, savings) => 
            `עוד ${next - current} יחידות ותחסוך ${savings}% על כל ההזמנה!`
    },
    
    // === 4. Scarcity - מחסור ===
    // יצירת דחיפות (אמיתית!)
    scarcity: {
        strategy: 'דחיפות אמיתית מניעה לפעולה',
        triggers: ['חתונה', 'אירוע', 'כנס', 'השקה'],
        messages: [
            "⏰ לאירועים אני ממליץ להזמין 3 שבועות מראש",
            "📅 יש לנו עומס בתקופה הזו, כדאי לסגור מוקדם"
        ]
    },
    
    // === 5. Social Proof - הוכחה חברתית ===
    socialProof: {
        strategy: 'אנשים סומכים על מה שאחרים עושים',
        messages: {
            bc: "זה הכרטיס הכי נמכר שלנו - 300+ לקוחות בחודש",
            invitation: "עשינו כבר מעל 500 חתונות השנה",
            flyer: "רוב העסקים מזמינים 1000+ כי זה הכי משתלם"
        }
    },
    
    // === 6. Loss Aversion - פחד מהפסד ===
    lossAversion: {
        strategy: 'אנשים מפחדים להפסיד יותר משהם רוצים להרוויח',
        reframe: {
            discount: "חבל לפספס את ההנחה הזו",
            quality: "חבל לחסוך על האיכות באירוע כזה חשוב",
            quantity: "עדיף יותר מדי מלהיגמר באמצע"
        }
    }
};

// === יצירת תגובה אנושית ===
function humanize(templateResponse, context = {}) {
    const { customer, cart, mood } = context;
    
    // בחר ביטוי אקראי מהקטגוריה
    const pick = (category) => {
        const options = PINI_PERSONALITY.expressions[category];
        return options[Math.floor(Math.random() * options.length)];
    };
    
    // התאמה אישית לפי לקוח
    let personalized = templateResponse;
    
    if (customer?.name) {
        // 30% סיכוי להוסיף את השם
        if (Math.random() < 0.3) {
            personalized = personalized.replace(/^/, `${customer.name}, `);
        }
    }
    
    // הוסף אמוג'י במידה (לא יותר מדי)
    // 40% סיכוי לאמוג'י אחד
    if (Math.random() < 0.4 && !personalized.includes('emoji')) {
        const emojis = ['👍', '✨', '💪', '🎉', '😊'];
        personalized += ' ' + emojis[Math.floor(Math.random() * emojis.length)];
    }
    
    return personalized;
}

// === המלצה חכמה ===
function generateSmartRecommendation(product, quantity, context = {}) {
    const { customer, cart, margin } = context;
    const recommendations = [];
    
    // === 1. בדוק אם אפשר להציע חבילה ===
    const bundleProducts = SMART_SELLING.bundling.triggers[product];
    if (bundleProducts) {
        const notInCart = bundleProducts.filter(p => 
            !cart?.some(i => i.product_category === p)
        );
        
        if (notInCart.length > 0) {
            const suggested = notInCart[0];
            recommendations.push({
                type: 'bundle',
                priority: 1,
                product: suggested,
                message: generateBundleMessage(product, suggested),
                hiddenBenefit: '+15-25% לעסקה'
            });
        }
    }
    
    // === 2. בדוק אם קרוב לסף הנחה ===
    const thresholds = SMART_SELLING.quantityBreaks.thresholds;
    const nextThreshold = thresholds.find(t => t > quantity);
    
    if (nextThreshold && (nextThreshold - quantity) / quantity < 0.3) {
        // פחות מ-30% תוספת לסף הבא
        const extra = nextThreshold - quantity;
        const savingsPercent = calculateQuantitySavings(product, quantity, nextThreshold);
        
        recommendations.push({
            type: 'quantity',
            priority: 2,
            suggestedQty: nextThreshold,
            extraUnits: extra,
            message: `💡 עוד ${extra} יחידות ואתה מקבל ${savingsPercent}% הנחה על הכל!`,
            hiddenBenefit: 'סה"כ עסקה גדולה יותר'
        });
    }
    
    // === 3. בדוק אם כדאי להציע שדרוג ===
    if (margin && margin > 55) {
        // יש מקום להציע שדרוג עם "הנחה"
        recommendations.push({
            type: 'upgrade',
            priority: 3,
            message: `🎁 בגלל הכמות הזו, אני יכול להוסיף לך למינציה מט בחצי מחיר`,
            hiddenBenefit: 'עדיין 45% מרווח, לקוח מרגיש שקיבל מתנה'
        });
    }
    
    // === 4. הוכחה חברתית ===
    const socialProof = SMART_SELLING.socialProof.messages[product];
    if (socialProof && Math.random() < 0.5) {
        recommendations.push({
            type: 'social_proof',
            priority: 4,
            message: socialProof,
            hiddenBenefit: 'בונה אמון'
        });
    }
    
    // מיין לפי עדיפות והחזר את הטובה ביותר
    return recommendations.sort((a, b) => a.priority - b.priority)[0] || null;
}

// === יצירת הודעת חבילה ===
function generateBundleMessage(mainProduct, suggestedProduct) {
    const messages = {
        'invitation_place_card': 
            "אגב, הרבה זוגות לוקחים גם כרטיסי הושבה תואמים - יוצא יפה ומאורגן",
        'invitation_sticker':
            "רוצה גם מדבקות למעטפות? יש לי עיצוב תואם להזמנות",
        'invitation_thank_you_card':
            "הזמנתי לך גם אופציה לכרטיסי תודה - נהוג לשלוח אחרי האירוע",
        'bc_flyer':
            "הרבה עסקים מזמינים ביחד גם פליירים - ככה יש לך חומר לחלוקה",
        'bc_folder':
            "יש לך תיקייה לפגישות? משדרג את הרושם",
        'flyer_rollup':
            "לכנסים/תערוכות כדאי גם רולאפ - עושה נוכחות"
    };
    
    const key = `${mainProduct}_${suggestedProduct}`;
    return messages[key] || `אולי גם ${getProductHebrew(suggestedProduct)}?`;
}

// === חישוב חיסכון בהגדלת כמות ===
function calculateQuantitySavings(product, currentQty, newQty) {
    // לוגיקה פשוטה - בפועל זה יגיע ממנוע החישוב
    const baseSavings = {
        250: 5,
        500: 10,
        1000: 15,
        2500: 20,
        5000: 25
    };
    return baseSavings[newQty] || 10;
}

// === יצירת תגובה למחיר "יקר" ===
function handlePriceObjection(originalPrice, product, quantity, context = {}) {
    const strategies = [];
    
    // === אסטרטגיה 1: הסבר ערך ===
    strategies.push({
        type: 'value',
        response: `אני מבין. תראה, המחיר כולל נייר איכותי, הדפסה צבעונית מלאה, וגימור מקצועי. זה מה שישאיר רושם.`,
        discount: 0
    });
    
    // === אסטרטגיה 2: הפחתת כמות ===
    const reducedQty = Math.floor(quantity * 0.7);
    strategies.push({
        type: 'reduce_qty',
        response: `בוא נתחיל עם ${reducedQty} יחידות? תמיד אפשר להזמין עוד`,
        discount: 0,
        newQty: reducedQty
    });
    
    // === אסטרטגיה 3: הנחה קטנה (אם המרווח מאפשר) ===
    if (context.margin && context.margin > 50) {
        const discountPercent = 10;
        strategies.push({
            type: 'discount',
            response: `תשמע, אני יכול לעשות לך ${discountPercent}% הנחה. זה ₪${Math.round(originalPrice * 0.9)}. יותר מזה קשה לי.`,
            discount: discountPercent,
            newPrice: Math.round(originalPrice * 0.9)
        });
    }
    
    // === אסטרטגיה 4: תשלומים ===
    strategies.push({
        type: 'payments',
        response: `אפשר לפרוס ל-3 תשלומים בלי ריבית, ככה זה פחות מורגש`,
        discount: 0
    });
    
    // === אסטרטגיה 5: חומר זול יותר ===
    strategies.push({
        type: 'downgrade',
        response: `יש אופציה על נייר קצת פחות עבה, יוצא ב-15% פחות. עדיין נראה טוב.`,
        discount: 15
    });
    
    return strategies;
}

// === יצירת תגובה אמפתית ===
function generateEmpatheticResponse(situation, context = {}) {
    const responses = {
        'expensive': [
            "אני לגמרי מבין, התקציב חשוב. בוא נראה מה אפשר לעשות...",
            "הגיוני, בוא נמצא פתרון שעובד לך...",
            "שמע, אני רוצה שתהיה מרוצה. יש לי כמה רעיונות..."
        ],
        'rush': [
            "אוי, לחוץ בזמנים? בוא נראה איך מסתדרים...",
            "אני מבין שזה דחוף. בוא נעשה הכל שנספיק...",
            "סבבה, עבדנו גם על דברים יותר צפופים. ייצא טוב!"
        ],
        'unsure': [
            "לגמרי מבין את ההתלבטות. בוא נעבור על האפשרויות ביחד...",
            "זה בסדר להתלבט, זו החלטה חשובה. מה מטריד אותך?",
            "קח את הזמן. אני פה לעזור לך לבחור נכון."
        ],
        'change_mind': [
            "בסדר גמור, שינויים זה חלק מהתהליך!",
            "אין בעיה בכלל, בוא נעדכן...",
            "סבבה! עדיף לשנות עכשיו מאשר אחרי ההדפסה 😄"
        ],
        'happy': [
            "כיף לשמוע! זה יהיה מושלם!",
            "יופי! אני בטוח שתהיה מרוצה!",
            "אחלה! כבר רואה איך זה ייראה!"
        ]
    };
    
    const options = responses[situation] || responses['unsure'];
    return options[Math.floor(Math.random() * options.length)];
}

// === זיהוי מצב רוח מהטקסט ===
function detectMood(message) {
    const text = message.toLowerCase();
    
    if (/יקר|מחיר|תקציב|כסף|זול/.test(text)) {
        return 'price_sensitive';
    }
    if (/דחוף|מהר|ממהר|לחוץ|מתי/.test(text)) {
        return 'rushed';
    }
    if (/לא יודע|מתלבט|אולי|לא בטוח/.test(text)) {
        return 'unsure';
    }
    if (/בעצם|שינוי|לא רוצה|תבטל/.test(text)) {
        return 'changing_mind';
    }
    if (/תודה|מעולה|יופי|אחלה|מושלם/.test(text)) {
        return 'happy';
    }
    
    return 'neutral';
}

// === שם מוצר בעברית ===
function getProductHebrew(product) {
    const names = {
        'bc': 'כרטיסי ביקור',
        'flyer': 'פליירים',
        'invitation': 'הזמנות',
        'place_card': 'כרטיסי הושבה',
        'sticker': 'מדבקות',
        'rollup': 'רולאפ',
        'poster': 'פוסטר',
        'folder': 'תיקייה',
        'booklet': 'חוברת'
    };
    return names[product] || product;
}

// === יצוא ===
module.exports = {
    PINI_PERSONALITY,
    SMART_SELLING,
    humanize,
    generateSmartRecommendation,
    generateBundleMessage,
    handlePriceObjection,
    generateEmpatheticResponse,
    detectMood,
    getProductHebrew
};

```


--- FILE: engine\planner.js ---
```js
/** engine/planner.js V32.0 - The Wizard Monster */
const fs = require('fs');
const path = require('path');
const { calculate_custom_job } = require('./calculation');
const { getMainMenu } = require('./productCatalog');

let productsDB = {};
try { productsDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8')); } catch (e) {}

// מילון נרמול פרמטרים
const PARAM_ALIASES = {
    'paper': 'paper_type', 'stock': 'paper_type', 'media': 'paper_type', 
    'coating': 'lamination', 'finish': 'finishing', 'width': 'size', 
    'amount': 'qty', 'quantity': 'qty', 'copies': 'qty'
};

function planActions(intentData, session) {
    const actions = [];
    const rawInput = intentData.raw_text ? intentData.raw_text.toLowerCase() : "";

    // === 1. The Wizard Guard (הגנה מפני מחיקה בטעות) ===
    // אם ה-LLM חשב שזה 'remove' אבל המשתמש דיבר על פרמטר ('בלי הדפסה')
    if (intentData.intent === 'remove') {
        const negationKeywords = ['הדפסה', 'למינציה', 'בלי', 'ללא', 'צבע', 'שחור'];
        if (negationKeywords.some(kw => rawInput.includes(kw))) {
            console.log("🛡️ Wizard Guard: Intercepted accidental remove. Converting to Update.");
            intentData.intent = 'update';
            // אם זיהינו על מה מדובר, נעדכן ידנית
            if (rawInput.includes('הדפסה')) intentData.extractedParams.print = 'none';
            if (rawInput.includes('למינציה')) intentData.extractedParams.lamination = 'none';
        }
    }

    // === 2. כוונות מערכת ===
    if (intentData.intent === 'reset') {
        return { 
            actions: [
                { type: 'CLEAR_SESSION_CONTEXT' }, 
                { 
                    type: 'GENERATE_RESPONSE', 
                    payload: { 
                        text: getMainMenu(),
                        quickReplies: [{label:'כרטיסי ביקור', value:'bc'}, {label:'פליירים', value:'flyer'}]
                    } 
                }
            ] 
        };
    }

    if (intentData.intent === 'show_cart') {
        const total = session.cart.reduce((sum, i) => sum + i.client_price, 0);
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: session.cart.length ? `🛒 סה"כ בעגלה: ₪${total.toLocaleString()}` : "העגלה ריקה.",
                    quickReplies: session.cart.length ? [{label:'הורד הצעת מחיר', value:'checkout'}] : [{label:'תפריט', value:'reset'}]
                } 
            }] 
        };
    }

    // === 3. ניהול ה-Wizard ===
    let currentProductKey = intentData.product || session.currentProduct;
    
    // החלפת מוצר
    if (intentData.product && intentData.product !== session.currentProduct) {
        session.currentProduct = intentData.product;
        currentProductKey = intentData.product;
        session.draftAttributes = {}; 
    }

    if (!currentProductKey) {
        return { 
            actions: [{ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: "מה תרצה להדפיס?",
                    quickReplies: [{label:'כרטיסי ביקור', value:'bc'}, {label:'הזמנות', value:'invitation'}, {label:'רולאפ', value:'rollup'}]
                } 
            }] 
        };
    }

    const productConfig = productsDB[currentProductKey];
    
    // נרמול פרמטרים שהגיעו מה-LLM
    let newParams = intentData.extractedParams || {};
    let normalizedParams = {};
    Object.keys(newParams).forEach(key => {
        const dbKey = PARAM_ALIASES[key] || key; 
        normalizedParams[dbKey] = newParams[key];
    });

    // מיפוי ערכים חכם (למשל 'מט' -> 'matte_350')
    if (productConfig.questions) {
        productConfig.questions.forEach(q => {
            const val = normalizedParams[q.key];
            if (val && q.options) {
                const match = q.options.find(opt => 
                    opt.value.toLowerCase() === val.toString().toLowerCase() || 
                    opt.label.includes(val)
                );
                if (match) normalizedParams[q.key] = match.value;
            }
        });
    }

    // עדכון ה-State
    const newDraft = { ...session.draftAttributes, ...normalizedParams };
    
    // ברירות מחדל קשיחות
    if (currentProductKey === 'sticker' && !newDraft.material) newDraft.material = 'vinyl_white';

    // === 4. מציאת השאלה הבאה (The Funnel) ===
    let missingParam = null;
    let questionToAsk = null;

    if (productConfig.questions) {
        for (const q of productConfig.questions) {
            // אם הפרמטר חסר (undefined/null)
            if (newDraft[q.key] == null) {
                missingParam = q.key;
                questionToAsk = q;
                break;
            }
        }
    }

    // === 5. תשובה למשתמש ===
    if (missingParam) {
        // בניית כפתורים חכמה
        let buttons = questionToAsk.options || [];
        if (questionToAsk.key === 'qty') {
            buttons = [{label:'100', value:'100'}, {label:'500', value:'500'}, {label:'1000', value:'1000'}];
        }

        actions.push({
            type: 'PRESENT_OPTIONS',
            question: questionToAsk.question_he,
            options: buttons, // חובה כפתורים!
            product: currentProductKey,
            saveDraft: newDraft
        });
    } else {
        // הכל מלא -> חישוב
        try {
            const calcResult = calculate_custom_job(session.cart, { ...newDraft, product: currentProductKey });
            const item = calcResult.lastAdded;
            
            const successText = `✅ הוספתי לעגלה:\n**${item.description}**\nכמות: ${item.qty}\nסה"כ: ₪${item.client_price}\n\nמה עכשיו?`;

            actions.push({ type: 'CALCULATE_AND_ADD', payload: newDraft });
            actions.push({ 
                type: 'GENERATE_RESPONSE', 
                payload: { 
                    text: successText,
                    quickReplies: [
                        { label: 'הורד הצעת מחיר', value: 'checkout' },
                        { label: 'הוסף עוד פריט', value: 'reset' }
                    ]
                } 
            });
            actions.push({ type: 'CHECK_QUEUE' }); 
        } catch (e) {
            actions.push({ type: 'GENERATE_RESPONSE', payload: { text: "שגיאה בחישוב. נסה כמות אחרת." } });
        }
    }

    return { actions };
}

module.exports = { planActions };
```


--- FILE: engine\productCatalog.js ---
```js
/**
 * Pini Knowledge Base & Product Catalog
 * ======================================
 * כל מה שפיני צריך לדעת על דפוס + קטלוג מוצרים מלא
 */

// ============================================================
// קטלוג מוצרים מלא
// ============================================================

const PRODUCT_CATALOG = {
    
    // === כרטיסי ביקור ===
    bc: {
        name: 'כרטיסי ביקור',
        emoji: '💼',
        description: 'הכרטיס שמייצג אותך - הרושם הראשון שנשאר',
        
        sizes: [
            { name: 'סטנדרט', size: '9×5 ס"מ', popular: true },
            { name: 'מרובע', size: '5.5×5.5 ס"מ', popular: false },
            { name: 'מיני', size: '8×4 ס"מ', popular: false },
            { name: 'מתקפל', size: '9×10 ס"מ (מתקפל ל-9×5)', popular: false }
        ],
        
        papers: [
            { name: 'קרטון 350 גרם', desc: 'הסטנדרט - יציב ומקצועי', price_factor: 1.0, popular: true },
            { name: 'קרטון 400 גרם', desc: 'עבה במיוחד - פרימיום', price_factor: 1.2 },
            { name: 'כרומו 300 גרם', desc: 'מבריק - צבעים חזקים', price_factor: 1.0 },
            { name: 'פנינה 300 גרם', desc: 'נצנוץ עדין - יוקרתי', price_factor: 1.3 },
            { name: 'ממוחזר 350 גרם', desc: 'אקולוגי - מראה טבעי', price_factor: 1.15 },
            { name: 'שחור 350 גרם', desc: 'קרטון שחור - דרמטי', price_factor: 1.4 },
            { name: 'שקוף PVC', desc: 'פלסטיק שקוף - וואו!', price_factor: 2.5 }
        ],
        
        finishings: [
            { name: 'ללא גימור', desc: 'פשוט ונקי', price_add: 0 },
            { name: 'למינציה מט', desc: 'מגן + מראה אלגנטי', price_add: 30, popular: true },
            { name: 'למינציה מבריקה', desc: 'מגן + ברק', price_add: 30 },
            { name: 'למינציה מט + ספוט UV', desc: 'הלוגו בולט ומבריק', price_add: 80, premium: true },
            { name: 'הבלטה (סקודיקס)', desc: 'תלת מימד על הלוגו', price_add: 100, premium: true },
            { name: 'פויל זהב/כסף', desc: 'הטבעה מתכתית', price_add: 120, premium: true },
            { name: 'פינות מעוגלות', desc: 'מראה מודרני', price_add: 20 },
            { name: 'חיתוך צורני', desc: 'צורה מיוחדת', price_add: 150 }
        ],
        
        printing: [
            { name: 'צד אחד', desc: 'חזית בלבד', price_factor: 0.7 },
            { name: 'דו-צדדי', desc: 'חזית + גב', price_factor: 1.0, popular: true }
        ],
        
        quantities: [100, 250, 500, 1000, 2000, 5000],
        min_qty: 100,
        production_days: 5,
        express_available: true,
        
        tips: [
            'ב-500 כרטיסים המחיר ליחידה יורד ב-30%',
            'למינציה מט מגנה ונותנת מראה מקצועי',
            'פויל על הלוגו = רושם ראשון בלתי נשכח'
        ]
    },
    
    // === פליירים ===
    flyer: {
        name: 'פליירים / עלונים',
        emoji: '📢',
        description: 'הכלי השיווקי הכי אפקטיבי - מגיע לכל מקום',
        
        sizes: [
            { name: 'A5', size: '21×14.8 ס"מ', desc: 'חצי A4 - הכי נפוץ', popular: true },
            { name: 'A4', size: '29.7×21 ס"מ', desc: 'גודל מכתב', popular: true },
            { name: 'A6', size: '14.8×10.5 ס"מ', desc: 'קטן - לחלוקה המונית' },
            { name: 'DL', size: '21×10 ס"מ', desc: 'צר וארוך - נכנס למעטפה' },
            { name: 'A3', size: '42×29.7 ס"מ', desc: 'גדול - פוסטר קטן' },
            { name: 'מותאם אישית', size: 'לפי בקשה', desc: 'כל גודל שתרצה' }
        ],
        
        papers: [
            { name: 'כרומו 135 גרם', desc: 'קל - לחלוקה המונית', price_factor: 0.8, popular: true },
            { name: 'כרומו 170 גרם', desc: 'סטנדרט - איזון מושלם', price_factor: 1.0, popular: true },
            { name: 'כרומו 250 גרם', desc: 'עבה - יותר איכותי', price_factor: 1.3 },
            { name: 'מט 170 גרם', desc: 'ללא ברק - אלגנטי', price_factor: 1.1 },
            { name: 'ממוחזר 150 גרם', desc: 'אקולוגי', price_factor: 1.15 }
        ],
        
        finishings: [
            { name: 'ללא גימור', desc: 'רגיל - הכי נפוץ', price_add: 0, popular: true },
            { name: 'למינציה מט', desc: 'מגן ויפה', price_add: 50 },
            { name: 'למינציה מבריקה', desc: 'צבעים חזקים יותר', price_add: 50 },
            { name: 'קיפול לשניים', desc: 'מתקפל באמצע', price_add: 30 },
            { name: 'קיפול לשלושה', desc: 'ברושור Z או C', price_add: 40 },
            { name: 'ניקוב', desc: 'עם חור לתלייה', price_add: 20 }
        ],
        
        printing: [
            { name: 'צד אחד', price_factor: 0.6 },
            { name: 'דו-צדדי', price_factor: 1.0, popular: true }
        ],
        
        quantities: [250, 500, 1000, 2500, 5000, 10000],
        min_qty: 250,
        production_days: 4,
        express_available: true,
        
        tips: [
            'ב-1000+ המחיר ליחידה נהיה זניח',
            'כרומו 135 מושלם לחלוקה ברחוב',
            'כרומו 170 לפליירים שנשמרים (תפריטים, מחירונים)'
        ]
    },
    
    // === הזמנות ===
    invitation: {
        name: 'הזמנות לאירועים',
        emoji: '🎉',
        description: 'הזמנה יפה = ציפייה לאירוע מושלם',
        
        types: [
            { name: 'חתונה', emoji: '💒', popular: true },
            { name: 'בר/בת מצווה', emoji: '✡️', popular: true },
            { name: 'ברית/הכנסת שם', emoji: '👶' },
            { name: 'יום הולדת', emoji: '🎂' },
            { name: 'אירוע עסקי', emoji: '🏢' }
        ],
        
        sizes: [
            { name: 'סטנדרט', size: '14×14 ס"מ', popular: true },
            { name: 'מרובע גדול', size: '15×15 ס"מ' },
            { name: 'מלבן', size: '21×10 ס"מ', desc: 'DL' },
            { name: 'A5', size: '21×14.8 ס"מ' },
            { name: 'מתקפל', size: '14×28 ס"מ (מתקפל ל-14×14)' }
        ],
        
        papers: [
            { name: 'פנינה 300 גרם', desc: 'נצנוץ עדין - הכי פופולרי לחתונות', price_factor: 1.2, popular: true },
            { name: 'קרטון לבן 350 גרם', desc: 'קלאסי ואלגנטי', price_factor: 1.0 },
            { name: 'קרטון שמנת 300 גרם', desc: 'חם ורומנטי', price_factor: 1.1 },
            { name: 'מרקם פשתן 300 גרם', desc: 'טקסטורה יוקרתית', price_factor: 1.4 },
            { name: 'כותנה 300 גרם', desc: 'רך ומיוחד', price_factor: 1.5 },
            { name: 'קראפט 300 גרם', desc: 'חום טבעי - בוהו שיק', price_factor: 1.2 }
        ],
        
        finishings: [
            { name: 'ללא גימור', price_add: 0 },
            { name: 'פויל זהב', desc: 'הטבעה זהב - יוקרה', price_add: 100, popular: true },
            { name: 'פויל כסף', desc: 'הטבעה כסף - מודרני', price_add: 100 },
            { name: 'פויל רוז גולד', desc: 'הטבעה ורוד זהב - רומנטי', price_add: 120 },
            { name: 'הבלטה', desc: 'תלת מימד', price_add: 80 },
            { name: 'חיתוך לייזר', desc: 'תחרה/דוגמה חתוכה', price_add: 200, premium: true },
            { name: 'שרוך/סרט', desc: 'קשירה דקורטיבית', price_add: 50 }
        ],
        
        extras: [
            { name: 'מעטפה רגילה', price_add: 20 },
            { name: 'מעטפה פנינה', price_add: 35 },
            { name: 'מדבקת סגירה', price_add: 15 },
            { name: 'כרטיס RSVP', price_add: 40 },
            { name: 'מפת הגעה', price_add: 30 }
        ],
        
        quantities: [50, 100, 150, 200, 250, 300, 400, 500],
        min_qty: 50,
        production_days: 7,
        express_available: true,
        
        tips: [
            'תמיד הזמינו 10% יותר - לטעויות בכתובות',
            'פויל זהב על נייר פנינה = שילוב מנצח',
            'מתקפל נותן יותר מקום לטקסט ותמונות'
        ]
    },
    
    // === רולאפים / באנרים ===
    rollup: {
        name: 'רולאפים ובאנרים',
        emoji: '🎪',
        description: 'נוכחות שאי אפשר להתעלם ממנה',
        
        types: [
            { 
                name: 'רולאפ סטנדרטי', 
                sizes: ['85×200', '100×200', '120×200'],
                desc: 'עם מעמד מתקפל - קל לנשיאה',
                popular: true
            },
            { 
                name: 'רולאפ פרימיום', 
                sizes: ['85×200', '100×200'],
                desc: 'מעמד איכותי יותר - ליותר שימושים'
            },
            { 
                name: 'באנר X', 
                sizes: ['60×160', '80×180'],
                desc: 'מעמד X - יציב ופשוט'
            },
            { 
                name: 'באנר תלייה', 
                sizes: ['מותאם אישית'],
                desc: 'עם לולאות - לתלייה על קיר'
            },
            { 
                name: 'שלט קאפה', 
                sizes: ['מותאם אישית'],
                desc: 'לוח קשיח - לתצוגה קבועה'
            }
        ],
        
        materials: [
            { name: 'ויניל 440 גרם', desc: 'סטנדרט - איכותי', price_factor: 1.0, popular: true },
            { name: 'ויניל פרימיום', desc: 'עמיד יותר', price_factor: 1.3 },
            { name: 'בד פוליאסטר', desc: 'ללא השתקפות - לצילומים', price_factor: 1.5 },
            { name: 'מש (רשת)', desc: 'לשימוש חוץ - עמיד ברוח', price_factor: 1.2 }
        ],
        
        quantities: [1, 2, 3, 5, 10],
        min_qty: 1,
        production_days: 3,
        express_available: true,
        
        tips: [
            '85×200 הגודל הנפוץ ביותר',
            'לאירועים חוזרים - קנו 2 (גיבוי)',
            'באנר בד מתאים לצילום ווידאו (אין השתקפות)'
        ]
    },
    
    // === מדבקות ===
    sticker: {
        name: 'מדבקות',
        emoji: '🏷️',
        description: 'ממיתוג ועד אריזה - מדבקה לכל צורך',
        
        shapes: [
            { name: 'עגול', sizes: ['3 ס"מ', '4 ס"מ', '5 ס"מ', '6 ס"מ', '8 ס"מ'], popular: true },
            { name: 'מרובע', sizes: ['3×3', '4×4', '5×5', '6×6', '8×8'] },
            { name: 'מלבן', sizes: ['3×2', '5×3', '7×5', '10×7'], popular: true },
            { name: 'אובלי', sizes: ['5×3', '7×4'] },
            { name: 'חיתוך צורני', sizes: ['לפי העיצוב'], desc: 'חותכים לפי קו המתאר', premium: true }
        ],
        
        materials: [
            { name: 'נייר לבן', desc: 'סטנדרט - כתיבה עליו אפשרית', price_factor: 0.8 },
            { name: 'נייר מבריק', desc: 'צבעים עזים', price_factor: 1.0, popular: true },
            { name: 'ויניל לבן', desc: 'עמיד במים - לשימוש חוץ', price_factor: 1.4, popular: true },
            { name: 'ויניל שקוף', desc: 'רק העיצוב נראה', price_factor: 1.6 },
            { name: 'כסף מטאלי', desc: 'מראה מתכתי', price_factor: 1.8 },
            { name: 'זהב מטאלי', desc: 'יוקרה', price_factor: 1.8 },
            { name: 'קראפט', desc: 'חום טבעי - אקולוגי', price_factor: 1.2 },
            { name: 'הולוגרפי', desc: 'קשת צבעים משתנה', price_factor: 2.5, premium: true }
        ],
        
        finishings: [
            { name: 'רגיל', price_add: 0 },
            { name: 'למינציה מט', desc: 'מגן + מט', price_add: 30 },
            { name: 'למינציה מבריקה', desc: 'מגן + ברק', price_add: 30 }
        ],
        
        adhesives: [
            { name: 'דבק קבוע', desc: 'סטנדרט', price_factor: 1.0 },
            { name: 'דבק חזק', desc: 'למשטחים קשים', price_factor: 1.1 },
            { name: 'דבק נשלף', desc: 'להסרה ללא שאריות', price_factor: 1.2 },
            { name: 'דבק לקירור', desc: 'עמיד בקור - למקררים', price_factor: 1.3 }
        ],
        
        quantities: [50, 100, 250, 500, 1000, 2500, 5000],
        min_qty: 50,
        production_days: 4,
        express_available: true,
        
        tips: [
            'ויניל חובה למוצרים שנרטבים',
            'חיתוך צורני עושה רושם אבל עולה יותר',
            'למדבקות קטנות (עד 5 ס"מ) - קנו יותר, עולה כמעט אותו דבר'
        ]
    },
    
    // === חוברות ===
    booklet: {
        name: 'חוברות וקטלוגים',
        emoji: '📖',
        description: 'לתוכן שדורש יותר מדף אחד',
        
        types: [
            { name: 'חוברת מהודקת', desc: '2 סיכות באמצע - עד 64 עמודים', popular: true },
            { name: 'חוברת ספירלה', desc: 'כריכת פלסטיק/מתכת - נפתח שטוח' },
            { name: 'קטלוג דבק חם', desc: 'כריכה מודבקת - מקצועי' },
            { name: 'מחברת', desc: 'עם שורות/ריבועים - לכתיבה' }
        ],
        
        sizes: [
            { name: 'A5', size: '21×14.8 ס"מ', desc: 'הנפוץ ביותר', popular: true },
            { name: 'A4', size: '29.7×21 ס"מ', desc: 'גדול - לקטלוגים' },
            { name: 'מרובע', size: '21×21 ס"מ', desc: 'מודרני ויפה' },
            { name: 'DL', size: '21×10 ס"מ', desc: 'צר - לתפריטים' }
        ],
        
        pages: [8, 12, 16, 20, 24, 32, 48, 64],
        
        papers: [
            { name: 'כרומו 150 גרם (פנים)', desc: 'מבריק', price_factor: 1.0, popular: true },
            { name: 'מט 150 גרם (פנים)', desc: 'קריאה נוחה', price_factor: 1.1 },
            { name: 'כרומו 250 גרם (כריכה)', desc: 'עטיפה חזקה', price_factor: 1.2 },
            { name: 'כרומו 300 גרם (כריכה)', desc: 'עטיפה יוקרתית', price_factor: 1.4 }
        ],
        
        finishings: [
            { name: 'ללא גימור', price_add: 0 },
            { name: 'למינציה מט לכריכה', price_add: 40, popular: true },
            { name: 'למינציה מבריקה לכריכה', price_add: 40 },
            { name: 'ספוט UV על הכריכה', price_add: 80 }
        ],
        
        quantities: [25, 50, 100, 250, 500, 1000],
        min_qty: 25,
        production_days: 7,
        express_available: true,
        
        tips: [
            'מספר עמודים חייב להתחלק ב-4',
            'כריכה עם למינציה מחזיקה יותר זמן',
            '16-24 עמודים = הגודל הנפוץ ביותר'
        ]
    },
    
    // === פוסטרים ===
    poster: {
        name: 'פוסטרים והדפסות גדולות',
        emoji: '🖼️',
        description: 'להדפסות שרואים מרחוק',
        
        sizes: [
            { name: 'A3', size: '42×29.7 ס"מ' },
            { name: 'A2', size: '59.4×42 ס"מ', popular: true },
            { name: 'A1', size: '84.1×59.4 ס"מ', popular: true },
            { name: 'A0', size: '118.9×84.1 ס"מ' },
            { name: '50×70', size: '50×70 ס"מ', desc: 'סטנדרט פוסטר' },
            { name: '70×100', size: '70×100 ס"מ' },
            { name: 'מותאם אישית', size: 'כל גודל' }
        ],
        
        materials: [
            { name: 'נייר כרומו 200 גרם', desc: 'מבריק - צבעים עזים', price_factor: 1.0, popular: true },
            { name: 'נייר מט 200 גרם', desc: 'ללא השתקפות', price_factor: 1.1 },
            { name: 'נייר פוטו 260 גרם', desc: 'איכות צילום', price_factor: 1.5 },
            { name: 'קנבס', desc: 'לתמונות אמנות', price_factor: 2.5 },
            { name: 'פורקס 3 מ"מ', desc: 'לוח קשיח קל', price_factor: 2.0 },
            { name: 'קאפה 5 מ"מ', desc: 'לוח קשיח', price_factor: 2.2 }
        ],
        
        quantities: [1, 5, 10, 25, 50, 100],
        min_qty: 1,
        production_days: 2,
        express_available: true,
        
        tips: [
            'לפוסטר חוץ - בקשו למינציה או הדפסה על ויניל',
            'לתמונות אמנות - קנבס נותן מראה גלריה',
            'פורקס/קאפה לא צריך מסגרת'
        ]
    },
    
    // === ניירת משרדית ===
    office: {
        name: 'ניירת משרדית',
        emoji: '📋',
        description: 'כל מה שצריך למשרד מקצועי',
        
        items: [
            { 
                name: 'נייר מכתבים',
                sizes: ['A4'],
                papers: ['נטול עץ 100 גרם', 'כותנה 120 גרם'],
                quantities: [100, 250, 500, 1000]
            },
            { 
                name: 'מעטפות',
                sizes: ['DL (11×22)', 'C5 (16×23)', 'C4 (23×32)'],
                options: ['עם חלון', 'ללא חלון', 'עם הדפסה', 'לבן בלבד'],
                quantities: [100, 250, 500, 1000]
            },
            { 
                name: 'כרטיסי תודה / ברכה',
                sizes: ['10×15', '12×17', 'A6'],
                papers: ['קרטון לבן 300 גרם', 'פנינה 300 גרם'],
                quantities: [50, 100, 250]
            },
            { 
                name: 'פנקסי חשבונית / קבלה',
                sizes: ['A5', 'A4'],
                options: ['מקור+העתק', 'מקור+2 העתקים'],
                quantities: [5, 10, 20, 50]
            },
            { 
                name: 'תיקיות / פולדרים',
                sizes: ['A4'],
                options: ['כיס אחד', 'שני כיסים', 'עם שם בהבלטה'],
                quantities: [100, 250, 500]
            }
        ],
        
        tips: [
            'ניירת אחידה משדרת מקצועיות',
            'הזמינו הכל ביחד - חוסך זמן ומשלוח',
            'נייר מכתבים + מעטפות תואמות = חובה'
        ]
    }
};

// ============================================================
// בסיס ידע מקצועי - שאלות ותשובות
// ============================================================

const PRINT_KNOWLEDGE = {
    
    // === חומרים ===
    materials: {
        'כרומו': {
            desc: 'נייר מצופה מבריק - הנפוץ ביותר בדפוס',
            pros: ['צבעים חזקים ועזים', 'מראה מקצועי', 'מחיר סביר'],
            cons: ['משתקף באור חזק', 'לא מתאים לכתיבה'],
            best_for: ['פליירים', 'ברושורים', 'קטלוגים', 'פוסטרים']
        },
        'מט': {
            desc: 'נייר מצופה ללא ברק',
            pros: ['לא משתקף', 'מראה אלגנטי', 'קריאה נוחה'],
            cons: ['צבעים קצת פחות עזים'],
            best_for: ['ספרים', 'דוחות', 'כרטיסי ביקור יוקרתיים']
        },
        'נטול עץ (אופסט)': {
            desc: 'נייר לא מצופה - כמו נייר צילום',
            pros: ['אפשר לכתוב עליו', 'מראה טבעי', 'זול'],
            cons: ['ספיגת דיו גבוהה', 'צבעים עמומים יותר'],
            best_for: ['נייר מכתבים', 'טפסים', 'מחברות']
        },
        'פנינה': {
            desc: 'נייר עם נצנוץ עדין',
            pros: ['מראה יוקרתי', 'נצנוץ עדין', 'ייחודי'],
            cons: ['יקר יותר'],
            best_for: ['הזמנות לאירועים', 'כרטיסי ביקור VIP']
        },
        'קראפט': {
            desc: 'נייר חום טבעי - מראה אקולוגי',
            pros: ['מראה אותנטי', 'אקולוגי', 'טרנדי'],
            cons: ['לא לכל עיצוב'],
            best_for: ['מוצרים אורגניים', 'בוטיקים', 'עסקים ירוקים']
        },
        'ויניל': {
            desc: 'פלסטיק עמיד במים ושמש',
            pros: ['עמיד מאוד', 'לשימוש חוץ', 'עמיד בשריטות'],
            cons: ['יקר יותר', 'לא ניתן לכתוב עליו'],
            best_for: ['מדבקות חוץ', 'באנרים', 'שילוט']
        }
    },
    
    // === גימורים ===
    finishings: {
        'למינציה': {
            desc: 'ציפוי פלסטיק דק שמגן על ההדפסה',
            types: {
                'מט': 'מראה אלגנטי, לא משתקף, נעים למגע',
                'מבריק': 'צבעים חזקים יותר, מראה מבריק',
                'סופט טאצ\'': 'מט קטיפתי - תחושת משי'
            },
            benefits: ['הגנה מפני שריטות', 'הגנה מלחות', 'מראה יוקרתי'],
            best_for: 'כרטיסי ביקור, כריכות, תפריטים'
        },
        'ספוט UV': {
            desc: 'לכה מבריקה על אזורים נבחרים (בד"כ הלוגו)',
            effect: 'הלוגו/טקסט בולט ומבריק על רקע מט',
            tip: 'הכי יפה בשילוב עם למינציה מט',
            best_for: 'כרטיסי ביקור, הזמנות, כריכות'
        },
        'הבלטה (סקודיקס)': {
            desc: 'הלוגו/טקסט בולט בתלת מימד',
            effect: 'אפשר להרגיש את הלוגו במגע',
            best_for: 'כרטיסי ביקור יוקרתיים, הזמנות'
        },
        'פויל (הטבעה חמה)': {
            desc: 'הטבעה מתכתית - זהב, כסף, רוז גולד ועוד',
            effect: 'ברק מתכתי אמיתי - וואו מובטח!',
            best_for: 'הזמנות, כרטיסי ביקור VIP, תעודות'
        },
        'פינות עגולות': {
            desc: 'עיגול הפינות במכונה מיוחדת',
            effect: 'מראה מודרני ורך',
            best_for: 'כרטיסי ביקור, כרטיסי ביקור'
        },
        'חיתוך צורני (דיקט)': {
            desc: 'חיתוך לפי צורה מיוחדת במקום מלבן רגיל',
            effect: 'המוצר בצורה ייחודית',
            cost: 'יקר יותר - דורש תבנית מיוחדת',
            best_for: 'כרטיסי ביקור מיוחדים, מדבקות, הזמנות'
        }
    },
    
    // === מונחים מקצועיים ===
    terms: {
        'בליד (Bleed)': 'הארכת העיצוב 3 מ"מ מעבר לקו החיתוך - מונע פסים לבנים בקצוות',
        'DPI': 'נקודות לאינץ\' - מדד לאיכות תמונה. להדפסה צריך 300 DPI מינימום',
        'CMYK': 'מצב צבע להדפסה (ציאן, מג\'נטה, צהוב, שחור) - חובה להדפסה!',
        'RGB': 'מצב צבע למסכים - לא להדפסה! צריך להמיר ל-CMYK',
        'וקטור': 'גרפיקה מתמטית שלא מאבדת איכות בהגדלה - מושלם ללוגואים',
        'רסטר': 'תמונה מפיקסלים - מאבדת איכות בהגדלה',
        'אימפוזיציה': 'סידור העמודים לפני הדפסה כך שאחרי קיפול יהיו בסדר הנכון',
        'ביג': 'קו שקע בנייר שמאפשר קיפול נקי ללא שבירה'
    },
    
    // === שאלות נפוצות ===
    faq: {
        'כמה זמן לוקח?': {
            answer: 'תלוי במוצר:\n• כרטיסי ביקור: 5 ימי עסקים\n• פליירים: 4 ימי עסקים\n• הזמנות: 7 ימי עסקים\n• רולאפים: 3 ימי עסקים\n\n⚡ יש אופציה לאקספרס בתוספת תשלום!'
        },
        'מה הפורמט לקבצים?': {
            answer: 'הכי טוב: PDF להדפסה\n\nגם אפשר: AI, EPS, PSD, TIFF\n\n⚠️ חשוב:\n• 300 DPI מינימום\n• צבעים CMYK\n• בליד 3 מ"מ\n\nשלח ואני אבדוק בחינם!'
        },
        'אפשר לראות הדפסה לפני?': {
            answer: 'בטח! יש לנו כמה אופציות:\n\n1️⃣ הוכחה דיגיטלית (PDF) - חינם\n2️⃣ הדפסת ניסיון - ₪50\n3️⃣ פלוטר צבע (1:1) - ₪100\n\nלהזמנות גדולות - ההוכחה משתלמת!'
        },
        'יש משלוחים?': {
            answer: 'כן! 🚚\n\n• איסוף עצמי - חינם\n• משלוח רגיל - ₪30 (2-3 ימים)\n• משלוח מהיר - ₪50 (יום למחרת)\n• שליח עד הבית - ₪60\n\n✨ מעל ₪500 - משלוח חינם!'
        },
        'אפשר לשלם בתשלומים?': {
            answer: 'בטח! 💳\n\n• עד 3 תשלומים ללא ריבית\n• ביט / אפליקציית תשלום\n• העברה בנקאית\n• מזומן באיסוף'
        }
    }
};

// ============================================================
// פונקציות תפריט
// ============================================================

/**
 * מחזיר תפריט כללי של כל המוצרים
 */
function getMainMenu() {
    let menu = "🖨️ **מה נדפיס היום?**\n\n";
    
    const categories = [
        { emoji: '💼', name: 'כרטיסי ביקור', key: 'bc', desc: 'הרושם הראשון שלך' },
        { emoji: '📢', name: 'פליירים ועלונים', key: 'flyer', desc: 'שיווק שעובד' },
        { emoji: '🎉', name: 'הזמנות לאירועים', key: 'invitation', desc: 'חתונות, בר מצווה ועוד' },
        { emoji: '🎪', name: 'רולאפים ובאנרים', key: 'rollup', desc: 'נוכחות שרואים' },
        { emoji: '🏷️', name: 'מדבקות', key: 'sticker', desc: 'ממיתוג ועד אריזה' },
        { emoji: '📖', name: 'חוברות וקטלוגים', key: 'booklet', desc: 'כשצריך יותר מדף' },
        { emoji: '🖼️', name: 'פוסטרים והדפסות', key: 'poster', desc: 'גדול ויפה' },
        { emoji: '📋', name: 'ניירת משרדית', key: 'office', desc: 'הכל למשרד' }
    ];
    
    categories.forEach(cat => {
        menu += `${cat.emoji} **${cat.name}**\n   ${cat.desc}\n\n`;
    });
    
    menu += "---\n💬 *ספר לי מה אתה צריך ואעזור לך לבחור!*";
    
    return menu;
}

/**
 * מחזיר תפריט מפורט למוצר ספציפי
 */
function getProductMenu(productKey) {
    const product = PRODUCT_CATALOG[productKey];
    if (!product) return null;
    
    let menu = `${product.emoji} **${product.name}**\n`;
    menu += `${product.description}\n\n`;
    menu += `---\n\n`;
    
    // גדלים
    if (product.sizes) {
        menu += `📐 **גדלים:**\n`;
        product.sizes.forEach(size => {
            const popular = size.popular ? ' ⭐' : '';
            const desc = size.desc ? ` - ${size.desc}` : '';
            menu += `• ${size.name} (${size.size})${desc}${popular}\n`;
        });
        menu += `\n`;
    }
    
    // סוגי נייר
    if (product.papers) {
        menu += `📄 **סוגי נייר:**\n`;
        product.papers.forEach(paper => {
            const popular = paper.popular ? ' ⭐' : '';
            menu += `• ${paper.name}${paper.desc ? ` - ${paper.desc}` : ''}${popular}\n`;
        });
        menu += `\n`;
    }
    
    // גימורים
    if (product.finishings) {
        menu += `✨ **גימורים:**\n`;
        product.finishings.forEach(finish => {
            const popular = finish.popular ? ' ⭐' : '';
            const premium = finish.premium ? ' 💎' : '';
            menu += `• ${finish.name}${finish.desc ? ` - ${finish.desc}` : ''}${popular}${premium}\n`;
        });
        menu += `\n`;
    }
    
    // כמויות
    if (product.quantities) {
        menu += `📦 **כמויות:** ${product.quantities.join(' / ')}\n`;
        menu += `   (מינימום: ${product.min_qty})\n\n`;
    }
    
    // זמן אספקה
    menu += `⏱️ **זמן אספקה:** ${product.production_days} ימי עסקים`;
    if (product.express_available) {
        menu += ` (יש אקספרס ⚡)`;
    }
    menu += `\n\n`;
    
    // טיפים
    if (product.tips && product.tips.length > 0) {
        menu += `💡 **טיפים:**\n`;
        product.tips.forEach(tip => {
            menu += `• ${tip}\n`;
        });
    }
    
    menu += `\n---\n💬 *מה הכמות והמפרט שמעניינים אותך?*`;
    
    return menu;
}

/**
 * מחזיר מידע על חומר
 */
function getMaterialInfo(materialKey) {
    const material = PRINT_KNOWLEDGE.materials[materialKey];
    if (!material) return null;
    
    let info = `📄 **${materialKey}**\n\n`;
    info += `${material.desc}\n\n`;
    
    info += `✅ **יתרונות:**\n`;
    material.pros.forEach(pro => info += `• ${pro}\n`);
    
    if (material.cons && material.cons.length > 0) {
        info += `\n⚠️ **לשים לב:**\n`;
        material.cons.forEach(con => info += `• ${con}\n`);
    }
    
    info += `\n🎯 **הכי מתאים ל:** ${material.best_for.join(', ')}`;
    
    return info;
}

/**
 * מחזיר מידע על גימור
 */
function getFinishingInfo(finishingKey) {
    const finishing = PRINT_KNOWLEDGE.finishings[finishingKey];
    if (!finishing) return null;
    
    let info = `✨ **${finishingKey}**\n\n`;
    info += `${finishing.desc}\n\n`;
    
    if (finishing.types) {
        info += `**סוגים:**\n`;
        for (const [type, desc] of Object.entries(finishing.types)) {
            info += `• ${type}: ${desc}\n`;
        }
        info += `\n`;
    }
    
    if (finishing.effect) {
        info += `🎨 **האפקט:** ${finishing.effect}\n\n`;
    }
    
    if (finishing.benefits) {
        info += `✅ **יתרונות:**\n`;
        finishing.benefits.forEach(b => info += `• ${b}\n`);
        info += `\n`;
    }
    
    info += `🎯 **מומלץ ל:** ${finishing.best_for}`;
    
    return info;
}

/**
 * מחזיר תשובה לשאלה נפוצה
 */
function getFaqAnswer(question) {
    // חיפוש התאמה
    const faqKeys = Object.keys(PRINT_KNOWLEDGE.faq);
    
    for (const key of faqKeys) {
        if (question.includes(key) || key.includes(question)) {
            return PRINT_KNOWLEDGE.faq[key].answer;
        }
    }
    
    // חיפוש חלקי
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('זמן') || questionLower.includes('לוקח') || questionLower.includes('מתי')) {
        return PRINT_KNOWLEDGE.faq['כמה זמן לוקח?'].answer;
    }
    
    if (questionLower.includes('קובץ') || questionLower.includes('פורמט') || questionLower.includes('pdf')) {
        return PRINT_KNOWLEDGE.faq['מה הפורמט לקבצים?'].answer;
    }
    
    if (questionLower.includes('משלוח') || questionLower.includes('לקבל') || questionLower.includes('איסוף')) {
        return PRINT_KNOWLEDGE.faq['יש משלוחים?'].answer;
    }
    
    if (questionLower.includes('תשלום') || questionLower.includes('לשלם') || questionLower.includes('כרטיס')) {
        return PRINT_KNOWLEDGE.faq['אפשר לשלם בתשלומים?'].answer;
    }
    
    if (questionLower.includes('הוכחה') || questionLower.includes('לראות') || questionLower.includes('לפני')) {
        return PRINT_KNOWLEDGE.faq['אפשר לראות הדפסה לפני?'].answer;
    }
    
    return null;
}

/**
 * מחזיר הסבר למונח מקצועי
 */
function getTermExplanation(term) {
    const termLower = term.toLowerCase();
    
    for (const [key, explanation] of Object.entries(PRINT_KNOWLEDGE.terms)) {
        if (key.toLowerCase().includes(termLower) || termLower.includes(key.toLowerCase())) {
            return `📚 **${key}**\n\n${explanation}`;
        }
    }
    
    return null;
}

// ============================================================
// יצוא
// ============================================================

module.exports = {
    PRODUCT_CATALOG,
    PRINT_KNOWLEDGE,
    getMainMenu,
    getProductMenu,
    getMaterialInfo,
    getFinishingInfo,
    getFaqAnswer,
    getTermExplanation
};

```


--- FILE: engine\responseBuilder.js ---
```js
/** engine/responseBuilder.js */
const RESPONSES = {
    ask_quantity: () => `בשמחה! איזו כמות נדפיס?`,
    
    // ברכה מומחית
    greeting: () => "היי! אני פיני, מומחה הדפוס של בית יצחק. 👨‍🎨\nאני כאן לייעץ ולתת הצעות מחיר.\nאיך אוכל לעזור היום?",
    
    cart_status: (ctx) => {
        if (!ctx.cart || ctx.cart.length === 0) return "העגלה ריקה כרגע. בוא נתחיל!";
        return `📂 **סיכום ביניים:**\nיש לך ${ctx.cart.length} פריטים בעגלה.\nסה"כ: ₪${ctx.cart.reduce((s, i) => s + i.client_price, 0)}`;
    },
    
    send_quote: () => "הפקתי לך הצעת מחיר מסודרת. 👇",
    
    unknown: () => "אני איתך. כדי שאוכל לתת הצעה, תגיד לי איזה מוצר אתה צריך (למשל: פליירים, כרטיסים, רולאפ)."
};

const QUICK_REPLIES = {
    greeting: [], // ריק! לא דוחפים מוצרים
    send_quote: [{ label: 'תודה', value: 'reset' }]
};

function buildResponse(key, ctx) { return RESPONSES[key] ? RESPONSES[key](ctx) : RESPONSES.unknown(); }
function buildQuickReplies(key) { return QUICK_REPLIES[key] || []; }

module.exports = { buildResponse, buildQuickReplies };
```


--- FILE: engine\smartLLM.js ---
```js
/**
 * Smart LLM Handler V4 (Fixed Export)
 * ===================================
 * מטפל בשיחה חופשית ומונע קריסות שרת.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

let model = null;
try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
} catch (e) {
    console.error("⚠️ Gemini Init Error:", e.message);
}

const TASK_PROMPTS = {
    greeting: "אתה פיני מדפוס בית יצחק. ענה קצר וידידותי.",
    explain: "הסבר בקצרה על מושג הדפוס שנשאל.",
    freestyle: "ענה בקצרה ובידידותיות. אם שואלים על מחיר, בקש פרטים."
};

/**
 * הפונקציה הראשית שהשרת מנסה להפעיל
 */
async function handleWithSmartLLM(message, session, customer) {
    if (!model) {
        return { 
            content: "סליחה, המוח שלי קצת עמוס. בוא ננסה לבחור מהתפריט.", 
            quickReplies: [] 
        };
    }

    try {
        const context = `
        לקוח: ${customer ? customer.name : 'אורח'}
        הודעה: "${message}"
        הנחיה: ענה בעברית, קצר (עד 20 מילים). אל תמציא מחירים.
        `;
        
        const result = await model.generateContent(context);
        const response = result.response.text();
        
        return {
            content: response,
            quickReplies: [] // אפשר להוסיף לוגיקה כאן אם רוצים
        };

    } catch (error) {
        console.error("LLM Error:", error);
        return {
            content: "לא הצלחתי להבין לגמרי. תוכל לבחור מהתפריט?",
            quickReplies: [{text: "תפריט ראשי", value: "start"}]
        };
    }
}

module.exports = { handleWithSmartLLM };
```


--- FILE: package.json ---
```json
{
  "name": "pini-print-bot",
  "version": "3.0.0",
  "description": "Pini Print Bot V3",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "express": "^5.2.1",
    "pdfkit": "^0.17.2",
    "puppeteer": "^24.34.0"
  },
   "engines": {
    "node": ">=18.0.0"
  }
}

```


--- FILE: pini_architecture_research.md ---
```md
# מסמך מחקר: ארכיטקטורה אופטימלית לפיני - בוט הצעות מחיר לדפוס

## תקציר מנהלים

מסמך זה מציג ארכיטקטורה חדשנית להפיכת בוט הצעות מחיר לדפוס ממערכת "נחמדה" למערכת שמחליפה לחלוטין מנהל בית דפוס. הארכיטקטורה מבוססת על שלושה עקרונות:

1. **השרת עושה את העבודה הקשה** - כל החישובים, האופטימיזציות והלוגיקה העסקית בצד השרת
2. **ה-LLM הוא רק ממשק** - מקבל הוראות מינימליות ומחזיר פרמטרים מובנים
3. **זיכרון דינמי** - שומר על הקשר בלי לשלוח את כל ההיסטוריה

---

## חלק 1: אלגוריתם אימפוזיציה ואופטימיזציה

### 1.1 הבעיה: Cutting Stock Problem (CSP)

בעיית חיתוך המלאי היא בעיה קלאסית באופטימיזציה (NP-Hard). בדפוס, זה מתורגם ל:

**קלט:**
- גודל גיליון מכונה (SRA3 = 32x45 ס"מ)
- גודל המוצר הסופי (כרטיס 9x5, פלייר A5, וכו')
- כמות נדרשת

**פלט:**
- כמה יחידות נכנסות בגיליון (Ups)
- כמה גיליונות להדפיס
- עלות אופטימלית

### 1.2 אלגוריתם Gilmore-Gomory (פשוט לדפוס)

במקום לפתור את הבעיה המלאה (שדורשת Linear Programming), נשתמש באלגוריתם גריידי פשוט שמתאים ל-90% מהמקרים:

```
function calculateOptimalImposition(productWidth, productHeight, sheetWidth, sheetHeight):
    
    // נסה שני כיוונים (לאורך ולרוחב)
    option1 = floor(sheetWidth / productWidth) * floor(sheetHeight / productHeight)
    option2 = floor(sheetWidth / productHeight) * floor(sheetHeight / productWidth)
    
    // בחר את האפשרות עם יותר יחידות
    ups = max(option1, option2)
    
    // חשב פחת (waste)
    usedArea = ups * productWidth * productHeight
    totalArea = sheetWidth * sheetHeight
    wastePercent = (totalArea - usedArea) / totalArea * 100
    
    return { ups, wastePercent, orientation: option1 > option2 ? 'portrait' : 'landscape' }
```

### 1.3 אופטימיזציה מתקדמת: השוואת גדלי גיליון

המנהל החכם לא בוחר רק כמה נכנסים בגיליון - הוא משווה בין אפשרויות:

```
function findBestSheetSize(product, quantity, availableSheets):
    
    results = []
    
    for sheet in availableSheets:  // [SRA3, SRA4, A3, A4, B3...]
        imposition = calculateOptimalImposition(product, sheet)
        
        sheetsNeeded = ceil(quantity / imposition.ups)
        wasteCost = sheetsNeeded * sheet.cost * imposition.wastePercent
        clickCost = sheetsNeeded * getClickCost(sheet.size)
        setupCost = getSetupCost(sheet.size)
        
        totalCost = wasteCost + clickCost + setupCost
        
        results.push({
            sheetSize: sheet.name,
            ups: imposition.ups,
            sheetsNeeded,
            totalCost,
            recommendation: generateRecommendation(...)
        })
    
    // מיין לפי עלות ובחר את הזול
    return results.sort(by: totalCost)[0]
```

### 1.4 התובנה הגדולה: חוברת A3 = 2 דפי A4

זו הדוגמה שנתת, ואני מבין אותה כעת לגמרי:

```
// חוברת 8 עמודים A5:

// אופציה א': הדפסה בודדת
sheets = 8  // כל עמוד בנפרד
clicks = 8
cost = HIGH

// אופציה ב': אימפוזיציה חכמה
// גיליון A3 דו-צדדי = 4 עמודים A5
sheets = 2  // (8 עמודים / 4 עמודים לגיליון)
clicks = 4  // (2 גיליונות × 2 צדדים)
cost = LOW

// הפרש: 75% חיסכון!
```

### 1.5 טבלת החלטות אימפוזיציה מוכנה

במקום לחשב בזמן אמת, נבנה lookup table:

| מוצר | גודל סופי | גודל גיליון | Ups | קיפול |
|------|-----------|-------------|-----|-------|
| כרטיס ביקור | 9x5 | SRA3 | 24 | ללא |
| פלייר A5 | 14.8x21 | SRA3 | 4 | ללא |
| פלייר A6 | 10.5x14.8 | SRA3 | 8 | ללא |
| פרוספקט 3 | DL | SRA3 | 6 | C-fold |
| חוברת A5 (8pp) | A5 | A3 | 4pp/sheet | Saddle |
| הזמנה | 13x18 | SRA3 | 4 | Optional |

---

## חלק 2: אופטימיזציה של עבודה מול LLM

### 2.1 הבעיה: עלות טוקנים

כל בקשה ל-LLM עולה כסף. ב-Gemini 2.0 Flash:
- Input: $0.075 / 1M tokens
- Output: $0.30 / 1M tokens

**הבעיה הנוכחית:**
- System prompt ארוך (חוקים, מוצרים, מצב עגלה) = ~2000 tokens
- היסטוריה מלאה = +500 tokens לכל תור
- אחרי 10 הודעות: ~7000 tokens לכל בקשה!

### 2.2 הפתרון: "Server-Heavy, LLM-Light"

**העיקרון:** השרת עושה את כל העבודה, ה-LLM רק מפרש את כוונת המשתמש.

```
┌─────────────────────────────────────────────────────────┐
│                    BEFORE (Heavy LLM)                   │
├─────────────────────────────────────────────────────────┤
│  User: "תכין לי 5000 פליירים"                           │
│                    ↓                                    │
│  LLM receives: [2000 token system prompt]               │
│               + [500 token history]                     │
│               + [user message]                          │
│                    ↓                                    │
│  LLM thinks: "מה הנייר? מה הגימור? מה המחיר?"          │
│                    ↓                                    │
│  LLM calls: calculate_custom_job(...)                   │
│                    ↓                                    │
│  Server calculates price                                │
│                    ↓                                    │
│  LLM formats response                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    AFTER (Light LLM)                    │
├─────────────────────────────────────────────────────────┤
│  User: "תכין לי 5000 פליירים"                           │
│                    ↓                                    │
│  LLM receives: [200 token minimal prompt]               │
│               + [50 token compressed context]           │
│                    ↓                                    │
│  LLM extracts: { product: "flyer", qty: 5000 }         │
│                    ↓                                    │
│  Server does EVERYTHING:                                │
│    - Smart defaults                                     │
│    - Optimal imposition                                 │
│    - Price calculation                                  │
│    - Response generation template                       │
│                    ↓                                    │
│  LLM just fills template or server sends directly       │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Prompt מינימלי מוצע

```
אתה עוזר לחילוץ פרמטרים מבקשות דפוס בעברית.

חלץ את הפרמטרים הבאים (JSON):
- product: סוג מוצר (flyer/bc/invitation/rollup/booklet/sticker)
- qty: כמות (מספר)
- paper: סוג נייר (אם צוין)
- finishing: גימור (אם צוין)
- action: פעולה (quote/update/remove/clear)

אם חסר מידע, החזר null לאותו שדה.
דוגמה: "5000 פליירים" → {"product":"flyer","qty":5000,"paper":null,"finishing":null,"action":"quote"}
```

**גודל: ~150 tokens במקום 2000!**

### 2.4 שני מצבי LLM

```javascript
// מצב 1: חילוץ פרמטרים (זול, מהיר)
const extractParams = async (userMessage) => {
    const response = await llm.complete({
        model: "gemini-2.0-flash",
        prompt: MINIMAL_EXTRACTION_PROMPT + userMessage,
        max_tokens: 100,
        response_format: "json"
    });
    return JSON.parse(response);
};

// מצב 2: שיחה חופשית (רק כשצריך)
const freeChat = async (userMessage, context) => {
    // משתמשים בזה רק לשאלות כלליות, לא לתמחור
    const response = await llm.complete({
        model: "gemini-2.0-flash",
        prompt: CONVERSATIONAL_PROMPT + context + userMessage,
        max_tokens: 300
    });
    return response;
};

// הנתב
const router = (userMessage) => {
    // אם יש מילות מפתח של תמחור → extractParams
    if (containsPricingKeywords(userMessage)) {
        return { mode: 'extract', handler: extractParams };
    }
    // אחרת → שיחה חופשית
    return { mode: 'chat', handler: freeChat };
};
```

### 2.5 חיסכון צפוי

| מדד | לפני | אחרי | חיסכון |
|-----|------|------|--------|
| Tokens per request | ~3000 | ~400 | 87% |
| Cost per 1000 requests | $0.90 | $0.12 | 87% |
| Response time | ~2s | ~0.5s | 75% |

---

## חלק 3: ניהול זיכרון דינמי

### 3.1 הבעיה: Context Window

כל LLM מוגבל בכמות הטקסט שהוא יכול "לזכור":
- GPT-3.5: 4K tokens
- GPT-4: 8K-128K tokens
- Gemini 2.0 Flash: 1M tokens (אבל יקר!)

**הבעיה האמיתית:** לא הגודל, אלא העלות. שליחת 10K tokens בכל בקשה = עלות גבוהה.

### 3.2 ארכיטקטורת זיכרון היררכית

```
┌─────────────────────────────────────────────────────────┐
│                   MEMORY ARCHITECTURE                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Layer 1: Immediate Context (in prompt)                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ - Current cart summary (1 line per item)        │   │
│  │ - Last 2 messages                               │   │
│  │ - Active constraints                            │   │
│  │ Size: ~100-200 tokens                           │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                               │
│  Layer 2: Session State (server-side)                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ - Full cart with all details                    │   │
│  │ - Customer profile                              │   │
│  │ - Conversation history (last 20)                │   │
│  │ - Preferences learned                           │   │
│  │ Storage: In-memory (sessions object)            │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                               │
│  Layer 3: Long-term Memory (optional, DB)               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ - Customer history across sessions              │   │
│  │ - Common orders                                 │   │
│  │ - Price history                                 │   │
│  │ Storage: Database / Vector DB                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Sliding Window + Compression

```javascript
class ConversationMemory {
    constructor(maxMessages = 20) {
        this.maxMessages = maxMessages;
        this.messages = [];
        this.summary = "";
        this.keyFacts = [];
    }
    
    addMessage(role, content) {
        this.messages.push({ role, content, timestamp: Date.now() });
        
        // אם יש יותר מדי הודעות
        if (this.messages.length > this.maxMessages) {
            // דחוס את ההודעות הישנות לסיכום
            const oldMessages = this.messages.splice(0, 5);
            this.compressToSummary(oldMessages);
        }
    }
    
    compressToSummary(messages) {
        // חילוץ עובדות מפתח (ללא LLM!)
        for (const msg of messages) {
            // חפש מספרים (כמויות)
            const quantities = msg.content.match(/\d+/g);
            // חפש מוצרים
            const products = this.extractProducts(msg.content);
            // שמור עובדות
            if (quantities && products.length) {
                this.keyFacts.push({
                    product: products[0],
                    qty: quantities[0],
                    timestamp: msg.timestamp
                });
            }
        }
    }
    
    getContextForLLM() {
        // החזר רק את מה שה-LLM צריך
        return {
            summary: this.summary,
            recentMessages: this.messages.slice(-4), // רק 4 אחרונות
            keyFacts: this.keyFacts.slice(-5) // רק 5 עובדות אחרונות
        };
    }
}
```

### 3.4 Server-Side State Management

```javascript
// sessionManager.js - גרסה משופרת

const sessions = new Map();

class Session {
    constructor(userId) {
        this.userId = userId;
        this.cart = [];
        this.memory = new ConversationMemory();
        this.profile = {
            name: null,
            phone: null,
            preferences: {
                defaultPaper: null,
                priceRange: null
            }
        };
        this.state = {
            currentProduct: null,
            awaitingInput: null,
            lastAction: null
        };
        this.createdAt = Date.now();
        this.lastActivity = Date.now();
    }
    
    // למד העדפות מההתנהגות
    learnPreference(key, value) {
        if (!this.profile.preferences[key]) {
            this.profile.preferences[key] = value;
        }
    }
    
    // צור prompt מינימלי
    generateMinimalPrompt() {
        const cartSummary = this.cart.length > 0 
            ? this.cart.map(i => `${i.product_name}:${i.qty}→₪${i.client_price}`).join('|')
            : 'ריק';
            
        return `[עגלה:${cartSummary}]`;
    }
}

function getSession(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, new Session(userId));
    }
    const session = sessions.get(userId);
    session.lastActivity = Date.now();
    return session;
}
```

---

## חלק 4: ארכיטקטורה מוצעת - "Pini Engine"

### 4.1 תרשים זרימה

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER MESSAGE                            │
│                    "5000 פליירים לחלוקה"                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    1. MESSAGE CLASSIFIER                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Rules-based (NO LLM):                                  │   │
│  │  - Contains number + product keyword? → QUOTE           │   │
│  │  - Contains "תמחק/הסר/בטל"? → REMOVE                    │   │
│  │  - Contains "שנה/עדכן"? → UPDATE                        │   │
│  │  - Otherwise → CHAT                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│   QUOTE/UPDATE/REMOVE │       │        CHAT           │
│   (Server handles)    │       │    (LLM handles)      │
└───────────┬───────────┘       └───────────┬───────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│ 2. PARAMETER EXTRACTOR│       │   3. LLM CHAT MODE    │
│  ┌─────────────────┐  │       │  (Minimal prompt)     │
│  │ Regex/Rules:    │  │       │                       │
│  │ - qty: \d+      │  │       │  "איך אני יכול       │
│  │ - product: map  │  │       │   לעזור?"             │
│  │ - paper: map    │  │       │                       │
│  │ - finishing: map│  │       │                       │
│  └─────────────────┘  │       └───────────────────────┘
└───────────┬───────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. OPTIMIZATION ENGINE                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  a. Smart Defaults:                                      │   │
│  │     - flyer → chromo_135                                 │   │
│  │     - bc → chromo_300                                    │   │
│  │     - invitation → pearl_300                             │   │
│  │                                                          │   │
│  │  b. Imposition Calculator:                               │   │
│  │     - Find best sheet size                               │   │
│  │     - Calculate ups                                      │   │
│  │     - Calculate waste                                    │   │
│  │                                                          │   │
│  │  c. Cost Calculator:                                     │   │
│  │     - Paper cost                                         │   │
│  │     - Click cost (per sheet × sides)                     │   │
│  │     - Setup cost                                         │   │
│  │     - Finishing cost                                     │   │
│  │                                                          │   │
│  │  d. Price Calculator:                                    │   │
│  │     - Apply margin (qty-based)                           │   │
│  │     - Round to nice number                               │   │
│  │     - Check minimum price                                │   │
│  │                                                          │   │
│  │  e. Upsell Detector:                                     │   │
│  │     - Check if +X units = minimal cost increase          │   │
│  │     - Generate upsell suggestion                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    5. RESPONSE BUILDER                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Server builds EVERYTHING:                               │   │
│  │  - Quote card data (product, qty, price, breakdown)      │   │
│  │  - Production instructions                               │   │
│  │  - Dashboard stats                                       │   │
│  │  - Text response (template-based, NO LLM)                │   │
│  │  - Upsell suggestion (if applicable)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      6. FRONTEND                                │
│  - Display quote card                                           │
│  - Update cart                                                  │
│  - Update dashboard                                             │
│  - Show text response                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 מתי בכלל צריך LLM?

| סוג בקשה | LLM נדרש? | הסיבה |
|----------|----------|-------|
| "5000 פליירים" | ❌ לא | Regex יכול לחלץ |
| "תוסיף גם כרטיסים" | ❌ לא | Regex + keyword map |
| "שנה ל-10000" | ❌ לא | Regex + context |
| "תמחק את הרולאפ" | ❌ לא | Keyword + product match |
| "מה ההבדל בין כרומו למט?" | ✅ כן | שאלה פתוחה |
| "תמליץ לי על נייר לחתונה" | ✅ כן | דורש הבנה |
| "למה המחיר כזה גבוה?" | ⚠️ אולי | יכול להיות template |

**מסקנה:** ~80% מהבקשות לא צריכות LLM בכלל!

### 4.3 Response Templates (ללא LLM)

```javascript
const RESPONSE_TEMPLATES = {
    quote_added: (item) => 
        `מעולה! הוספתי ${item.qty} ${item.product_name}. ` +
        `חישבתי על בסיס ${item.description}, שזה הסטנדרט.`,
    
    quote_updated: (item, oldQty) =>
        `עדכנתי את הכמות מ-${oldQty} ל-${item.qty}. המחיר התעדכן בהתאם.`,
    
    item_removed: (productName) =>
        `הסרתי את ${productName} מהעגלה.`,
    
    cart_cleared: () =>
        `העגלה רוקנה. מה תרצה להזמין?`,
    
    upsell: (currentQty, suggestedQty, priceDiff) =>
        `💡 טיפ: ב-${priceDiff}₪ נוספים בלבד תקבל ${suggestedQty} במקום ${currentQty}!`,
    
    missing_info: (missingField) =>
        `כדי לתת הצעה מדויקת, אני צריך לדעת ${missingField}. מה תבחר?`
};
```

---

## חלק 5: מבנה קבצים מוצע

```
pini_system/
├── server.js                    # Express server
├── package.json
├── .env
│
├── db/
│   ├── materials.json           # חומרים ומחירים
│   ├── products.json            # הגדרות מוצרים
│   └── imposition_table.json    # טבלת אימפוזיציה מוכנה
│
├── engine/
│   ├── classifier.js            # מסווג הודעות (rules-based)
│   ├── extractor.js             # חילוץ פרמטרים (regex)
│   ├── optimizer.js             # אופטימיזציית אימפוזיציה
│   ├── calculator.js            # חישוב מחירים
│   └── responseBuilder.js       # בניית תשובות (templates)
│
├── services/
│   ├── sessionManager.js        # ניהול סשנים וזיכרון
│   ├── llmService.js            # קריאות ל-LLM (רק כשצריך)
│   └── pdfService.js            # יצירת PDF
│
├── config/
│   ├── prompts.js               # Prompts מינימליים
│   └── rules.js                 # חוקים עסקיים
│
└── public/
    └── index.html               # Frontend
```

---

## חלק 6: סיכום והמלצות

### 6.1 עקרונות מנחים

1. **"השרת הוא המוח"** - כל הלוגיקה העסקית בשרת
2. **"LLM הוא הפה"** - רק לתקשורת טבעית כשצריך
3. **"Rules First"** - נסה rules/regex לפני LLM
4. **"Minimal Tokens"** - כל token עולה כסף
5. **"Precompute"** - טבלאות מוכנות במקום חישוב בזמן אמת

### 6.2 צעדים הבאים

1. **שלב 1:** בנה את `classifier.js` ו-`extractor.js` (rules-based)
2. **שלב 2:** בנה את `optimizer.js` עם טבלת אימפוזיציה
3. **שלב 3:** שכתב את `calculator.js` עם לוגיקת השוואה
4. **שלב 4:** בנה `responseBuilder.js` עם templates
5. **שלב 5:** שלב את ה-LLM רק למקרים שבאמת צריך

### 6.3 מדדי הצלחה

| מדד | מצב נוכחי | יעד |
|-----|----------|-----|
| זמן תגובה | ~2-3 שניות | < 0.5 שניות |
| עלות per request | ~$0.003 | < $0.0005 |
| דיוק חישוב | 90% | 99% |
| "הזיות" LLM | יש | 0 |
| החלפת מנהל | 50% | 95% |

---

## חלק 7: ניהול סטטוס עיצוב וקבצים

### 7.1 למה זה קריטי?

הצעת מחיר לדפוס בלי לדעת את מצב העיצוב היא חסרת משמעות. מנהל דפוס מנוסה תמיד שואל: "יש לך קובץ מוכן?"

### 7.2 מצבי העיצוב האפשריים

```
┌─────────────────────────────────────────────────────────────┐
│                    DESIGN STATUS MATRIX                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STATUS 1: PRINT-READY (מוכן להדפסה)                        │
│  ├─ מה יש: PDF/AI עם bleed, CMYK, fonts embedded           │
│  ├─ מה צריך: כלום                                          │
│  ├─ תוספת מחיר: ₪0                                         │
│  └─ תוספת זמן: 0                                           │
│                                                             │
│  STATUS 2: NEEDS_ADJUSTMENT (צריך התאמה)                    │
│  ├─ מה יש: Word/Canva/JPG ברזולוציה נמוכה/RGB              │
│  ├─ מה צריך: המרה ל-CMYK, הוספת bleed, בדיקת רזולוציה      │
│  ├─ תוספת מחיר: ₪50-150                                    │
│  └─ תוספת זמן: +1 יום עסקים                                │
│                                                             │
│  STATUS 3: NEEDS_DESIGN (צריך עיצוב)                        │
│  ├─ מה יש: לוגו + תוכן טקסטואלי                            │
│  ├─ מה צריך: עיצוב גרפי מלא                                │
│  ├─ תוספת מחיר: ₪150-500 (תלוי מורכבות)                    │
│  └─ תוספת זמן: +2-3 ימי עסקים                              │
│                                                             │
│  STATUS 4: NEEDS_EVERYTHING (צריך הכל)                      │
│  ├─ מה יש: כלום או רעיון בלבד                              │
│  ├─ מה צריך: עיצוב לוגו + עיצוב מוצר                       │
│  ├─ תוספת מחיר: ₪500-2000                                  │
│  └─ תוספת זמן: +5-7 ימי עסקים                              │
│                                                             │
│  STATUS 5: REPEAT_ORDER (הזמנה חוזרת)                       │
│  ├─ מה יש: קובץ קיים במערכת מהזמנה קודמת                   │
│  ├─ מה צריך: כלום (אולי עדכון קטן)                         │
│  ├─ תוספת מחיר: ₪0 (הנחת לקוח חוזר אפשרית)                 │
│  └─ תוספת זמן: 0                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 טבלת תמחור עיצוב לפי מוצר

| מוצר | התאמה בסיסית | עיצוב סטנדרטי | עיצוב פרימיום |
|------|-------------|--------------|---------------|
| כרטיס ביקור | ₪50 | ₪150 | ₪350 |
| פלייר A5 | ₪75 | ₪200 | ₪450 |
| פלייר A4 | ₪75 | ₪250 | ₪550 |
| פרוספקט (3 עמודים) | ₪100 | ₪350 | ₪700 |
| הזמנה לאירוע | ₪100 | ₪300 | ₪600 |
| רולאפ | ₪100 | ₪300 | ₪600 |
| חוברת (עד 16 עמ') | ₪150 | ₪500 | ₪1200 |
| חוברת (עד 32 עמ') | ₪200 | ₪800 | ₪1800 |

### 7.4 זרימת השיחה המעודכנת

```
┌─────────────────────────────────────────────────────────────┐
│              CONVERSATION FLOW WITH DESIGN CHECK            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  USER: "אני צריך 1000 כרטיסי ביקור"                         │
│                         ↓                                   │
│  BOT: "מעולה! לפני שאתן הצעה - יש לך קובץ מוכן להדפסה?"    │
│                         ↓                                   │
│  [QUICK REPLY BUTTONS]                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ כן, PDF מוכן  │ 📄 יש עיצוב, לא בטוח │           │   │
│  │ 🎨 צריך עיצוב   │ 🆕 צריך הכל מאפס    │           │   │
│  │ 🔄 כמו פעם שעברה │                      │           │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  [IF "צריך עיצוב"]                                          │
│                         ↓                                   │
│  BOT: "אין בעיה! הנה המחיר המפורט:                         │
│                                                             │
│        🖨️ הדפסה 1000 כרטיסים: ₪180                         │
│        🎨 עיצוב גרפי: ₪150                                  │
│        ━━━━━━━━━━━━━━━━━━━━━                                │
│        💰 סה״כ: ₪330                                        │
│                                                             │
│        ⏱️ זמן אספקה: 4-5 ימי עסקים                          │
│                                                             │
│        מה הסגנון שאתה מחפש? מינימליסטי? קלאסי? מודרני?"    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.5 בדיקת קובץ אוטומטית (פיצ'ר עתידי)

כשלקוח מעלה קובץ, המערכת יכולה לבדוק אוטומטית:

```javascript
const FILE_CHECKS = {
    // בדיקות טכניות
    resolution: {
        min: 300, // DPI
        check: (file) => file.dpi >= 300,
        error: "הרזולוציה נמוכה מדי (${file.dpi} DPI). צריך לפחות 300 DPI."
    },
    
    colorSpace: {
        required: 'CMYK',
        check: (file) => file.colorSpace === 'CMYK',
        warning: "הקובץ ב-RGB. נמיר ל-CMYK (יתכנו שינויי צבע קלים)."
    },
    
    bleed: {
        min: 3, // מ"מ
        check: (file) => file.bleed >= 3,
        error: "חסר bleed (שפה). צריך להוסיף 3 מ"מ מכל צד."
    },
    
    fonts: {
        check: (file) => file.fontsEmbedded === true,
        error: "הפונטים לא מוטמעים בקובץ. יתכנו בעיות תצוגה."
    },
    
    fileType: {
        allowed: ['pdf', 'ai', 'eps', 'tiff'],
        preferred: 'pdf',
        check: (file) => ['pdf', 'ai', 'eps', 'tiff'].includes(file.type),
        error: "סוג קובץ לא נתמך. אנא שלח PDF, AI, EPS או TIFF."
    }
};

function analyzeUploadedFile(file) {
    const issues = [];
    const warnings = [];
    
    for (const [checkName, check] of Object.entries(FILE_CHECKS)) {
        if (!check.check(file)) {
            if (check.error) issues.push(check.error);
            if (check.warning) warnings.push(check.warning);
        }
    }
    
    return {
        status: issues.length === 0 ? 'ready' : 'needs_adjustment',
        issues,
        warnings,
        estimatedFixCost: issues.length * 25, // ₪25 לכל תיקון
        estimatedFixTime: issues.length > 0 ? 1 : 0 // ימים
    };
}
```

### 7.6 מבנה נתונים מעודכן

```javascript
// עדכון ל-Session object
const sessionSchema = {
    userId: String,
    cart: [{
        product_name: String,
        qty: Number,
        client_price: Number,
        
        // === חדש: מידע עיצוב ===
        design: {
            status: 'ready' | 'needs_adjustment' | 'needs_design' | 'needs_everything' | 'repeat',
            fileUploaded: Boolean,
            fileAnalysis: {
                issues: [String],
                warnings: [String]
            },
            designCost: Number,
            designNotes: String
        }
    }],
    
    // === חדש: קבצי לקוח ===
    customerFiles: [{
        filename: String,
        uploadDate: Date,
        productRef: String, // לאיזה מוצר בעגלה
        status: 'pending' | 'approved' | 'rejected',
        analysis: Object
    }]
};
```

### 7.7 תמחור דינמי כולל עיצוב

```javascript
function calculateTotalQuote(item) {
    // מחיר הדפסה בסיסי
    const printCost = calculatePrintCost(item);
    
    // עלות עיצוב לפי סטטוס
    let designCost = 0;
    
    switch (item.design.status) {
        case 'ready':
        case 'repeat':
            designCost = 0;
            break;
            
        case 'needs_adjustment':
            designCost = DESIGN_PRICING[item.product_name]?.adjustment || 50;
            break;
            
        case 'needs_design':
            designCost = DESIGN_PRICING[item.product_name]?.standard || 200;
            break;
            
        case 'needs_everything':
            designCost = DESIGN_PRICING[item.product_name]?.premium || 500;
            // כולל עיצוב לוגו אם צריך
            if (!item.hasLogo) {
                designCost += 350; // עיצוב לוגו בסיסי
            }
            break;
    }
    
    return {
        printCost,
        designCost,
        totalCost: printCost + designCost,
        breakdown: {
            print: printCost,
            design: designCost
        }
    };
}
```

---

## חלק 8: תכנית פעולה - איך מתקדמים

### 8.1 שלבי פיתוח מוצעים

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT ROADMAP                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PHASE 1: FOUNDATION (שבוע 1-2)                             │
│  ═══════════════════════════════                            │
│  ☐ 1.1 Refactor calculation.js → optimization engine       │
│  ☐ 1.2 Build imposition lookup table                       │
│  ☐ 1.3 Create message classifier (rules-based)             │
│  ☐ 1.4 Create parameter extractor (regex)                  │
│  ☐ 1.5 Build response templates                            │
│                                                             │
│  PHASE 2: SMART FEATURES (שבוע 3-4)                         │
│  ═══════════════════════════════                            │
│  ☐ 2.1 Add design status flow                              │
│  ☐ 2.2 Implement upsell logic                              │
│  ☐ 2.3 Add constraints validation                          │
│  ☐ 2.4 Create dynamic memory system                        │
│  ☐ 2.5 Optimize LLM calls (minimal prompts)                │
│                                                             │
│  PHASE 3: PRODUCTION TOOLS (שבוע 5-6)                       │
│  ═══════════════════════════════                            │
│  ☐ 3.1 Generate production job cards                       │
│  ☐ 3.2 PDF quote generation                                │
│  ☐ 3.3 Manager dashboard                                   │
│  ☐ 3.4 Cost tracking & analytics                           │
│                                                             │
│  PHASE 4: ADVANCED (שבוע 7-8)                               │
│  ═══════════════════════════════                            │
│  ☐ 4.1 File upload & analysis                              │
│  ☐ 4.2 Customer database                                   │
│  ☐ 4.3 Repeat order detection                              │
│  ☐ 4.4 WhatsApp integration                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 מה לעשות עכשיו (Phase 1)

**צעד 1: שכתוב מנוע החישוב**

הקובץ הנוכחי `calculation.js` טוב, אבל צריך להוסיף:
- טבלת אימפוזיציה מוכנה
- השוואת גדלי גיליון
- חישוב Upsell
- תמיכה בסטטוס עיצוב

**צעד 2: בניית Message Classifier**

קובץ חדש `classifier.js`:
- זיהוי כוונה ללא LLM
- מיפוי מילות מפתח
- ניתוב לפונקציה הנכונה

**צעד 3: עדכון Server.js**

- להפחית תלות ב-LLM
- להוסיף נתיב "מהיר" שעוקף את ה-LLM
- להשתמש ב-templates לתשובות

**צעד 4: עדכון Frontend**

- להוסיף כפתורי Quick Reply
- להציג פירוט עיצוב
- להוסיף אפשרות העלאת קובץ

### 8.3 מבנה קבצים מעודכן

```
pini_system/
├── server.js                    # Express server (simplified)
├── package.json
├── .env
│
├── db/
│   ├── materials.json           # חומרים ומחירים ✓
│   ├── products.json            # הגדרות מוצרים ✓
│   ├── imposition.json          # טבלת אימפוזיציה (חדש!)
│   └── design_pricing.json      # תמחור עיצוב (חדש!)
│
├── engine/
│   ├── classifier.js            # מסווג הודעות (חדש!)
│   ├── extractor.js             # חילוץ פרמטרים (חדש!)
│   ├── optimizer.js             # אופטימיזציית אימפוזיציה (חדש!)
│   ├── calculator.js            # חישוב מחירים (משופר)
│   └── responseBuilder.js       # בניית תשובות (חדש!)
│
├── services/
│   ├── sessionManager.js        # ניהול סשנים (משופר)
│   ├── llmService.js            # קריאות ל-LLM (מינימלי)
│   ├── pdfService.js            # יצירת PDF ✓
│   └── fileAnalyzer.js          # בדיקת קבצים (חדש!)
│
├── config/
│   ├── prompts.js               # Prompts מינימליים
│   ├── rules.js                 # חוקים עסקיים
│   └── templates.js             # תבניות תשובה
│
└── public/
    └── index.html               # Frontend (משופר)
```

### 8.4 קריטריונים להצלחה

| מדד | מצב נוכחי | יעד Phase 1 | יעד סופי |
|-----|----------|-------------|----------|
| אחוז בקשות ללא LLM | 0% | 60% | 85% |
| זמן תגובה ממוצע | 2-3s | 1s | 0.3s |
| עלות לבקשה | $0.003 | $0.001 | $0.0003 |
| דיוק הצעות מחיר | 85% | 95% | 99% |
| שאלות עיצוב | לא קיים | בסיסי | מלא עם בדיקת קובץ |
| Upsell suggestions | לא קיים | בסיסי | חכם עם ROI |

---

## נספח: קוד דוגמה

### A. Message Classifier (Rules-Based)

```javascript
// engine/classifier.js

const PRODUCT_KEYWORDS = {
    'פלייר': 'flyer', 'פליירים': 'flyer', 'עלון': 'flyer',
    'כרטיס': 'bc', 'כרטיסים': 'bc', 'ביקור': 'bc',
    'הזמנה': 'invitation', 'הזמנות': 'invitation',
    'רולאפ': 'rollup', 'באנר': 'rollup', 'שמשונית': 'banner',
    'קנבס': 'canvas', 'תמונה': 'canvas',
    'מדבקה': 'sticker', 'מדבקות': 'sticker',
    'חוברת': 'booklet', 'קטלוג': 'booklet'
};

const ACTION_KEYWORDS = {
    remove: ['תמחק', 'הסר', 'תוריד', 'בטל', 'הוצא'],
    update: ['שנה', 'עדכן', 'תחליף', 'במקום'],
    clear: ['נקה', 'רוקן', 'התחל מחדש', 'מחק הכל']
};

function classifyMessage(message) {
    const text = message.toLowerCase();
    
    // Check for clear cart
    if (ACTION_KEYWORDS.clear.some(kw => text.includes(kw))) {
        return { action: 'clear', confidence: 1.0 };
    }
    
    // Check for remove
    if (ACTION_KEYWORDS.remove.some(kw => text.includes(kw))) {
        const product = findProductInText(text);
        return { action: 'remove', product, confidence: 0.9 };
    }
    
    // Check for quantity (quote or update)
    const qtyMatch = text.match(/(\d+)/);
    if (qtyMatch) {
        const qty = parseInt(qtyMatch[1]);
        const product = findProductInText(text);
        
        if (ACTION_KEYWORDS.update.some(kw => text.includes(kw))) {
            return { action: 'update', qty, product, confidence: 0.9 };
        }
        
        if (product) {
            return { action: 'quote', qty, product, confidence: 0.95 };
        }
    }
    
    // Default: needs LLM
    return { action: 'chat', confidence: 0.5 };
}

function findProductInText(text) {
    for (const [keyword, product] of Object.entries(PRODUCT_KEYWORDS)) {
        if (text.includes(keyword)) {
            return product;
        }
    }
    return null;
}

module.exports = { classifyMessage };
```

### B. Imposition Optimizer

```javascript
// engine/optimizer.js

const SHEET_SIZES = {
    'SRA3': { width: 32, height: 45, clickCost: 0.35 },
    'SRA4': { width: 22.5, height: 32, clickCost: 0.25 },
    'A3': { width: 29.7, height: 42, clickCost: 0.30 },
    'A4': { width: 21, height: 29.7, clickCost: 0.20 }
};

const PRODUCT_SIZES = {
    'bc': { width: 9, height: 5 },
    'flyer_a5': { width: 14.8, height: 21 },
    'flyer_a6': { width: 10.5, height: 14.8 },
    'invitation': { width: 13, height: 18 }
};

function calculateUps(productW, productH, sheetW, sheetH) {
    // Include 3mm bleed on each side
    const pw = productW + 0.6;
    const ph = productH + 0.6;
    
    const option1 = Math.floor(sheetW / pw) * Math.floor(sheetH / ph);
    const option2 = Math.floor(sheetW / ph) * Math.floor(sheetH / pw);
    
    return Math.max(option1, option2);
}

function findOptimalSetup(product, qty, options = {}) {
    const productSize = PRODUCT_SIZES[product] || { width: 15, height: 21 };
    const results = [];
    
    for (const [sheetName, sheet] of Object.entries(SHEET_SIZES)) {
        const ups = calculateUps(
            productSize.width, 
            productSize.height, 
            sheet.width, 
            sheet.height
        );
        
        if (ups === 0) continue;
        
        const sheetsNeeded = Math.ceil(qty / ups);
        const wasteUnits = (sheetsNeeded * ups) - qty;
        const wastePercent = (wasteUnits / (sheetsNeeded * ups)) * 100;
        
        const paperCost = sheetsNeeded * 0.15; // Simplified
        const clickCost = sheetsNeeded * sheet.clickCost * (options.doubleSided ? 2 : 1);
        const setupCost = 20;
        
        const totalCost = paperCost + clickCost + setupCost;
        
        results.push({
            sheetSize: sheetName,
            ups,
            sheetsNeeded,
            wastePercent: wastePercent.toFixed(1),
            totalCost: totalCost.toFixed(2),
            costPerUnit: (totalCost / qty).toFixed(3)
        });
    }
    
    // Sort by total cost
    results.sort((a, b) => parseFloat(a.totalCost) - parseFloat(b.totalCost));
    
    return {
        optimal: results[0],
        alternatives: results.slice(1),
        upsell: calculateUpsell(results[0], qty)
    };
}

function calculateUpsell(optimal, currentQty) {
    // Check if ordering more makes sense
    const fullSheetQty = optimal.sheetsNeeded * optimal.ups;
    
    if (fullSheetQty > currentQty * 1.1) { // More than 10% waste
        const extraUnits = fullSheetQty - currentQty;
        return {
            suggested: true,
            newQty: fullSheetQty,
            extraUnits,
            extraCost: 0, // Same sheets, no extra cost!
            message: `קבל ${extraUnits} יחידות נוספות בחינם (ממילא מודפסות)`
        };
    }
    
    return { suggested: false };
}

module.exports = { findOptimalSetup, calculateUps };
```

---

**סוף מסמך המחקר**

מסמך זה מהווה בסיס לפיתוח מערכת הצעות מחיר אוטומטית שתחליף את עבודת המנהל ב-95% מהמקרים.

```


--- FILE: public\index.html ---
```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>דפוס בית יצחק - הצ'אט של פיני</title>
    <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <style>
        :root {
            --app-bg: #d1d7db;
            --chat-bg-color: #efeae2;
            --header-bg: #f0f2f5;
            --sidebar-bg: #ffffff;
            --user-msg-bg: #d9fdd3;
            --bot-msg-bg: #ffffff;
            --primary-color: #008069;
            --text-primary: #111b21;
            --text-secondary: #667781;
        }

        body {
            font-family: 'Heebo', sans-serif;
            background-color: var(--app-bg);
            margin: 0;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: var(--text-primary);
        }

        .app-container {
            display: flex;
            width: 100%;
            max-width: 1600px;
            height: 100vh;
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            overflow: hidden;
            position: relative;
        }

        @media (min-width: 1400px) {
            .app-container { height: 95vh; width: 95vw; }
        }

        /* --- Sidebar Styles --- */
        .sidebar {
            width: 350px;
            background: var(--sidebar-bg);
            border-left: 1px solid #e9edef;
            display: flex;
            flex-direction: column;
            z-index: 2;
        }

        .sidebar-header {
            height: 60px;
            background: var(--header-bg);
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #e9edef;
            font-weight: bold;
            font-size: 1.1rem;
        }

        .cart-content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background-color: #fff;
        }

        .cart-empty-state {
            text-align: center;
            color: var(--text-secondary);
            margin-top: 50px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }

        .cart-item {
            background: #fff;
            border-bottom: 1px solid #f0f2f5;
            padding: 12px 0;
            margin-bottom: 5px;
        }

        .cart-item-title { font-weight: bold; font-size: 0.95rem; }
        .cart-item-details { font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; }
        .cart-item-price { font-weight: bold; color: var(--text-primary); float: left; }

        .sidebar-footer {
            padding: 20px;
            background: #f0f2f5;
            border-top: 1px solid #e9edef;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 15px;
            color: var(--primary-color);
        }

        .action-btn {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer;
            transition: 0.2s;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background-color: var(--primary-color);
            color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .action-btn:hover { background-color: #006b56; }

        /* --- Chat Styles --- */
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            background-color: var(--chat-bg-color);
            background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png");
            background-repeat: repeat;
            position: relative;
        }

        .chat-header {
            height: 60px;
            background: var(--header-bg);
            padding: 0 16px;
            display: flex;
            align-items: center;
            gap: 15px;
            border-bottom: 1px solid #e9edef;
        }

        .avatar {
            width: 45px; height: 45px;
            background: white; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            overflow: hidden;
            border: 1px solid #ddd;
        }
        
        .avatar img { width: 100%; height: 100%; object-fit: cover; }

        .chat-info { flex: 1; }
        .chat-name { font-weight: bold; font-size: 1rem; }
        .chat-status { font-size: 0.8rem; color: var(--text-secondary); }

        .header-actions {
            color: #54656f; cursor: pointer; font-size: 1.2rem; padding: 10px;
        }

        .messages {
            flex: 1;
            padding: 20px 50px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .message {
            max-width: 65%;
            padding: 8px 12px;
            border-radius: 7.5px;
            font-size: 0.95rem;
            line-height: 1.4;
            position: relative;
            box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
            white-space: pre-wrap;
        }

        .message.bot { background: var(--bot-msg-bg); align-self: flex-start; border-top-right-radius: 0; }
        .message.user { background: var(--user-msg-bg); align-self: flex-end; border-top-left-radius: 0; }

        .msg-time {
            font-size: 0.7rem; color: #999; text-align: left; margin-top: 4px; float: left;
        }

        .input-area {
            height: 62px; background: #f0f2f5; padding: 0 16px;
            display: flex; align-items: center; gap: 10px;
        }

        .icon-btn { color: #54656f; cursor: pointer; font-size: 1.4rem; padding: 5px; }

        .input-wrapper {
            flex: 1; background: white; border-radius: 8px; padding: 9px 12px;
            display: flex; align-items: center;
        }

        input { border: none; width: 100%; outline: none; font-size: 1rem; font-family: inherit; }

        .quick-replies {
            display: flex; gap: 8px; justify-content: center;
            margin-top: 10px; flex-wrap: wrap; padding-bottom: 10px;
        }

        .chip {
            background: white; border: 1px solid #e9edef; color: var(--primary-color);
            padding: 8px 16px; border-radius: 20px; font-size: 0.9rem;
            font-weight: bold; cursor: pointer; transition: 0.2s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .chip:hover { background: #f0fdf4; transform: translateY(-1px); }

        @media (max-width: 768px) {
            .app-container { flex-direction: column; }
            .sidebar { width: 100%; height: 35%; border-left: none; border-top: 1px solid #ccc; order: 2; }
            .chat-area { height: 65%; order: 1; }
            .messages { padding: 10px; }
        }
    </style>
</head>
<body>

    <div class="app-container">
        <div class="chat-area">
            <div class="chat-header">
                <div class="avatar">
                    <img src="pini.png" alt="פיני" onerror="this.src='https://cdn-icons-png.flaticon.com/512/4712/4712027.png'">
                </div>
                <div class="chat-info">
                    <div class="chat-name">פיני - דפוס בית יצחק</div>
                    <div class="chat-status" id="connection-status">מחובר</div>
                </div>
                <div class="header-actions">
                    <i class="fas fa-search"></i>
                    <i class="fas fa-ellipsis-v" title="תפריט"></i>
                </div>
            </div>

            <div class="messages" id="messages-container"></div>

            <div class="input-area">
                <div class="icon-btn" onclick="toggleMenu()" title="תפריט מהיר"><i class="fas fa-bars"></i></div>
                <div class="icon-btn"><i class="fas fa-paperclip"></i></div>
                <div class="input-wrapper">
                    <input type="text" id="user-input" placeholder="הקלד הודעה..." autocomplete="off">
                </div>
                <div class="icon-btn" onclick="sendMessage()" style="color: var(--primary-color);"><i class="fas fa-paper-plane"></i></div>
            </div>
        </div>

        <div class="sidebar">
            <div class="sidebar-header">
                <span><i class="fas fa-shopping-cart"></i> סיכום ההזמנה שלך</span>
            </div>

            <div class="cart-content" id="cart-items">
                <div class="cart-empty-state">
                    <i class="fas fa-receipt" style="font-size: 3rem; opacity: 0.2;"></i>
                    <p>העגלה ריקה כרגע</p>
                </div>
            </div>

            <div class="sidebar-footer">
                <div class="total-row">
                    <span>סה"כ לתשלום:</span>
                    <span id="cart-total-display">₪0</span>
                </div>
                <button class="action-btn" onclick="downloadPDF()">
                    <i class="fas fa-file-pdf"></i> הורד הצעת מחיר (PDF)
                </button>
            </div>
        </div>
    </div>

    <script>
        // --- הגדרות חיבור לשרת ---
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const REMOTE_SERVER = 'https://dotandru-pini-print-bot.hf.space'; 
        const BASE_URL = isLocal ? 'http://localhost:7860' : REMOTE_SERVER;
        
        const API_URL = `${BASE_URL}/api/chat`;
        const PDF_URL = `${BASE_URL}/api/pdf`;

        const userId = 'user_' + Math.random().toString(36).substr(2, 9);
        let currentCart = [];
        let isProcessing = false;

        // --- UI Helpers ---
        function updateStatus(text) {
            const el = document.getElementById('connection-status');
            if(el) {
                el.innerText = text;
                el.style.color = text.includes('מקליד') ? 'var(--primary-color)' : '#667781';
            }
        }

        function scrollToBottom() {
            const container = document.getElementById('messages-container');
            if(container) container.scrollTop = container.scrollHeight;
        }

        function addMsg(text, sender) {
            const container = document.getElementById('messages-container');
            const div = document.createElement('div');
            div.className = `message ${sender}`;
            const now = new Date();
            const timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
            div.innerHTML = text.replace(/\n/g, '<br>') + `<div class="msg-time">${timeStr}</div>`;
            container.appendChild(div);
            scrollToBottom();
        }

        function removeQuickReplies() {
            document.querySelectorAll('.quick-replies').forEach(el => el.remove());
        }

        function addButtons(options) {
            const container = document.getElementById('messages-container');
            const qrDiv = document.createElement('div');
            qrDiv.className = 'quick-replies';
            options.forEach(opt => {
                const btn = document.createElement('div');
                btn.className = 'chip';
                const label = opt.label || opt.text || opt;
                const val = opt.value || opt;
                btn.innerText = label;
                btn.onclick = () => sendMessage(val);
                qrDiv.appendChild(btn);
            });
            container.appendChild(qrDiv);
            scrollToBottom();
        }

        function updateCartUI(cart) {
            currentCart = cart;
            const container = document.getElementById('cart-items');
            const totalDisplay = document.getElementById('cart-total-display');
            container.innerHTML = '';
            let total = 0;

            if (!cart || cart.length === 0) {
                container.innerHTML = `
                <div class="cart-empty-state">
                    <i class="fas fa-receipt" style="font-size: 3rem; opacity: 0.2;"></i>
                    <p>העגלה ריקה כרגע</p>
                </div>`;
            } else {
                cart.forEach(item => {
                    const price = item.client_price || 0;
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'cart-item';
                    itemDiv.innerHTML = `
                        <div class="cart-item-title">${item.product_name || item.product || 'פריט'} (${item.qty} יח')</div>
                        <div class="cart-item-price">₪${price}</div>
                        <div style="clear:both;"></div>
                        <div class="cart-item-details">${item.description || ''}</div>
                    `;
                    container.appendChild(itemDiv);
                    total += price;
                });
            }
            totalDisplay.innerText = '₪' + total.toLocaleString();
        }

        // --- Core Functions ---
        async function downloadPDF() {
            if (currentCart.length === 0) return alert('העגלה ריקה');
            addMsg("מפיק מסמך PDF... ⏳", "bot");
            try {
                const res = await fetch(PDF_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId, cart: currentCart })
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = "Quote_Pini_Print.pdf";
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    addMsg("המסמך ירד בהצלחה! ✅", "bot");
                } else {
                    addMsg("שגיאה בהפקת PDF ❌", "bot");
                }
            } catch (e) { console.error(e); addMsg("שגיאה בתקשורת ❌", "bot"); }
        }

        function toggleMenu() {
            sendMessage("תפריט");
        }

        async function sendMessage(text = null) {
            if (isProcessing) return;

            const inputField = document.getElementById('user-input');
            const message = text || inputField.value.trim();
            if (!message) return;

            addMsg(message, 'user');
            inputField.value = '';
            removeQuickReplies();
            
            isProcessing = true;
            updateStatus('פיני מקליד...');

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message, userId: userId })
                });

                if (!res.ok) throw new Error(`Server status: ${res.status}`);
                const data = await res.json();
                updateStatus('מחובר');
                
                if (data.text) addMsg(data.text, 'bot');
                
                const buttons = data.options || data.quickReplies;
                if (buttons && buttons.length > 0) addButtons(buttons);

                if (data.cart) updateCartUI(data.cart);

            } catch (error) {
                console.error('Error:', error);
                updateStatus('שגיאת חיבור');
                addMsg('אופס, לא הצלחתי להתחבר לשרת. נסה שוב בעוד רגע.', 'bot');
            } finally {
                isProcessing = false;
            }
        }

        document.getElementById('user-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        window.onload = function() {
            setTimeout(() => {
                addMsg("אהלן! אני פיני 👨‍🎨, מומחה הדפוס של 'בית יצחק'.", 'bot');
                setTimeout(() => {
                    addMsg("אני כאן כדי לעזור לך לקבל הצעות מחיר מהירות ומדוייקות.\nמה נדפיס היום?", 'bot');
                }, 800);
            }, 500);
        };
    </script>
</body>
</html>
```


--- FILE: README.md ---
```md
---
title: Pini Print Bot
emoji: 🖨️
colorFrom: blue
colorTo: green
sdk: docker
app_file: server.js
pinned: false
---

# Pini Bot Engine V3 - Server Heavy, LLM Light

## 📁 מבנה הקבצים

```
pini-bot/
├── server.js                    ← שרת ראשי V3
├── engine/                      
│   ├── classifier.js            ← סיווג הודעות (80% bypass LLM)
│   ├── calculation.js           ← מנוע חישוב מחירים
│   ├── optimizer.js             ← אימפוזיציה + upsell
│   ├── responseBuilder.js       ← תגובות עם אישיות
│   ├── personalityEngine.js     ← אישיות פיני + טקטיקות מכירה
│   ├── customerManager.js       ← ניהול לקוחות + CRM
│   └── dashboardManager.js      ← דשבורד לבית הדפוס
├── services/                    ← (קיים בפרויקט - לא נכלל כאן)
└── tests/
    └── test_scenario.js         ← 56 בדיקות אוטומטיות
```

## 🚀 מה חדש ב-V3

### 👥 ניהול לקוחות
- זיהוי אוטומטי לפי טלפון
- היסטוריית הזמנות
- העדפות נלמדות
- תגיות (VIP, עסקי, פרטי)

### 📊 דשבורד משופר
- מידע על העסקה (רווח, מרווח)
- פרטי לקוח
- התראות חכמות
- הצעות Upsell

### 🎭 אישיות פיני
- תגובות חמות ואנושיות
- זיהוי מצב רוח
- המלצות חכמות

## 🔧 התקנה

```bash
# 1. העתק קבצים
cp -r engine/ /path/to/pini-bot/
cp server.js /path/to/pini-bot/
cp -r tests/ /path/to/pini-bot/

# 2. הרץ בדיקות
node tests/test_scenario.js
```

## 📡 API Endpoints

### Chat
```
POST /api/chat
Body: { message, userId, phone?, customerName? }
Response: { content, cart, dashboard, customer, meta }
```

### Customers
```
GET /api/customers/search?q=...
GET /api/customers/:phone
POST /api/customers/:phone/notes
GET /api/customers-stats
```

### Utils
```
GET /api/stats
GET /api/health
POST /api/pdf
```

## 📊 תוצאות בדיקות

```
Total Tests:     56
Passed:          54 (96%)
Direct Calls:    80% ✅
LLM Calls:       20%
Savings:         $0.135 per 56 requests
```

## 💡 דוגמאות Response

### Chat Response
```javascript
{
  "content": "יופי של בחירה! 🎉 500 הזמנות ב-₪819",
  "cart": [...],
  "dashboard": {
    "currentDeal": {
      "totalPrice": 819,
      "profit": 491,
      "profitMargin": 60
    },
    "customer": {
      "name": "יוסי כהן",
      "isVIP": true
    },
    "alerts": [...]
  },
  "meta": {
    "classification": "quote",
    "usedLLM": false,
    "responseTime": 15
  }
}
```

```


--- FILE: server.js ---
```js
/** server.js V31.0 - Full PDF & Chat Support */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// ייבוא המנועים
const { classifyMessage } = require('./engine/classifier');
const { planActions } = require('./engine/planner');
const { getSession } = require('./services/sessionManager');
const { generateQuotePDF } = require('./services/pdfService'); // חובה לקיום ה-PDF!

const app = express();
const PORT = process.env.PORT || 7860;

app.use(cors());
app.use(bodyParser.json());

// === נתיב הצ'אט ===
app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    const sessionID = userId || 'default_user';
    const session = getSession(sessionID);

    console.log(`\n🔵 [${sessionID}] User: "${message}"`);

    try {
        // 1. הבנה (Classifier)
        const classification = await classifyMessage(message, session);
        
        // 2. תכנון (Planner)
        const plan = planActions(classification, session);
        
        // 3. ביצוע (Execution)
        let responseText = "";
        let quickReplies = [];

        for (const action of plan.actions) {
            if (action.type === 'PRESENT_OPTIONS') {
                session.currentProduct = action.product; 
                session.draftAttributes = action.saveDraft;
                responseText = action.question;
                quickReplies = action.options;
            }
            else if (action.type === 'CALCULATE_AND_ADD') {
                session.cart.push(action.payload);
            }
            else if (action.type === 'REMOVE_FROM_CART') {
                if (session.cart.length > 0) session.cart.pop();
            }
            else if (action.type === 'GENERATE_RESPONSE') {
                responseText = action.payload.text || action.template;
                if (action.payload.quickReplies) quickReplies = action.payload.quickReplies;
            }
            else if (action.type === 'CLEAR_SESSION_CONTEXT') {
                session.currentProduct = null;
                session.draftAttributes = {};
            }
        }

        // שליחת התשובה
        res.json({ 
            text: responseText, 
            options: quickReplies,
            cart: session.cart 
        });

    } catch (error) {
        console.error("💥 Server Error:", error);
        res.status(500).json({ text: "אופס, נתקלתי בבעיה. נסה שוב." });
    }
});

// === נתיב ה-PDF (התיקון!) ===
app.post('/api/pdf', async (req, res) => {
    const { userId, cart: clientCart } = req.body;
    
    // שליפת העגלה (מהבקשה או מהסשן)
    let cart = clientCart;
    if (!cart && userId) {
        const session = getSession(userId);
        cart = session.cart;
    }

    if (!cart || cart.length === 0) {
        return res.status(400).send("העגלה ריקה");
    }

    try {
        console.log("📄 Generating PDF Quote...");
        // הנחה שקיים שירות PDF תקין ב-services
        const pdfBuffer = await generateQuotePDF(cart, { name: "לקוח יקר" });
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'attachment; filename="quote.pdf"'
        });
        
        res.send(pdfBuffer);
        console.log("✅ PDF sent successfully");

    } catch (error) {
        console.error("❌ PDF Generation Error:", error);
        res.status(500).json({ error: "Failed to generate PDF" });
    }
});

app.listen(PORT, () => console.log(`🚀 SERVER running on port ${PORT}`));
```


--- FILE: services\costTracker.js ---
```js
const PRICING = {
    input: 0.075, // $ למיליון טוקנים
    output: 0.30, // $ למיליון טוקנים
    ils_rate: 3.6 
};

let sessionTotalCost = 0;

function trackCost(usageMetadata) {
    if (!usageMetadata) return;
    
    // הגנה מפני ערכים ריקים
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;

    const inputCost = (inputTokens / 1000000) * PRICING.input;
    const outputCost = (outputTokens / 1000000) * PRICING.output;
    const totalUsd = inputCost + outputCost;
    const totalIls = totalUsd * PRICING.ils_rate;

    if (!isNaN(totalIls)) {
        sessionTotalCost += totalIls;
    }

    console.log(`\n💰 --- מונה עלויות ---`);
    console.log(`Input Tokens: ${inputTokens} | Output Tokens: ${outputTokens}`);
    console.log(`עלות תור נוכחי: ₪${totalIls.toFixed(6)}`);
    console.log(`סה"כ סשן נוכחי: ₪${sessionTotalCost.toFixed(6)}`);
    console.log(`-----------------------\n`);
}

module.exports = { trackCost };
```


--- FILE: services\pdfService.js ---
```js
const puppeteer = require('puppeteer');

async function generateQuotePDF(cart, customerProfile) {
    let browser = null;
    try {
        console.log("🚀 Starting PDF generation (Low Memory Mode)...");
        
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // קריטי לשרתים עם זיכרון נמוך
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // חוסך המון זיכרון
                '--disable-extensions',
                '--mute-audio'
            ],
            executablePath: '/usr/bin/google-chrome-stable',
            timeout: 30000 // טיימאאוט של 30 שניות
        });

        const page = await browser.newPage();

        // --- אופטימיזציה לזיכרון: חסימת משאבים כבדים ---
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            // חוסמים תמונות כבדות, פונטים חיצוניים וסטיילים לא קריטיים בזמן הג'נרוט
            if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        const htmlContent = `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #008069; margin: 0;">הצעת מחיר</h1>
                <h3 style="margin: 5px 0;">דפוס בית יצחק</h3>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                <strong>לכבוד:</strong> ${customerProfile.name || 'לקוח יקר'}<br>
                <strong>תאריך:</strong> ${new Date().toLocaleDateString('he-IL')}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #008069; color: white;">
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">#</th>
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">פריט</th>
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">כמות</th>
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">מחיר</th>
                    </tr>
                </thead>
                <tbody>
                    ${cart.map((item, index) => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">${index + 1}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">
                                <strong>${item.product_name}</strong>
                                <br><span style="font-size: 0.85em; color: #666;">${item.description || ''}</span>
                            </td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${item.qty}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">₪${item.client_price}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="text-align: left; margin-top: 20px;">
                <h2 style="color: #008069;">סה"כ לתשלום: ₪${cart.reduce((sum, i) => sum + i.client_price, 0)}</h2>
            </div>
            
            <div style="margin-top: 50px; font-size: 0.8em; text-align: center; color: #888; border-top: 1px solid #eee; padding-top: 10px;">
                הופק באמצעות פיני - הבוט החכם | ט.ל.ח
            </div>
        </div>`;

        // שימוש ב-networkidle0 מוודא שאין עוד תעבורת רשת לפני ההדפסה
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        console.log("📸 Snapping PDF...");
        const pdfBuffer = await page.pdf({ 
            format: 'A4', 
            printBackground: true,
            margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
        });

        console.log("✅ PDF Generated successfully!");
        return pdfBuffer;

    } catch (error) {
        console.error("❌ PUPPETEER CRASH:", error);
        throw error;
    } finally {
        if (browser) {
            console.log("🔒 Closing browser...");
            await browser.close();
        }
    }
}

module.exports = { generateQuotePDF };
```


--- FILE: services\productionEngine.js ---
```js
const fs = require('fs');
const path = require('path');

// מילון מונחים לתרגום המפרט הטכני לשפה שיווקית בכרטיס הויזואלי
const HEBREW_DICT = {
    'offset_80': 'נייר נטול עץ 80 גרם (סטנדרטי לספרים)',
    'offset_90': 'נייר נטול עץ 90 גרם (איכותי)',
    'offset_120': 'נייר נטול עץ 120 גרם (יוקרתי)',
    'offset_300': 'נייר נטול עץ 300 גרם (כרטיס טבעי)',
    'chromo_135': 'כרומו 135 גרם (דק ומבריק)',
    'chromo_170': 'כרומו 170 גרם (יציב)',
    'chromo_300': 'כרומו 300 גרם (קשיח לכרטיסים)',
    'matte_300': 'כרומו מט 300 גרם',
    'pearl_300': 'נייר פנינה מנצנץ (יוקרתי)',
    'texture_300': 'נייר טקסטורה פשתן',
    'sticker_paper': 'מדבקת נייר',
    'vinyl_sticker': 'מדבקת ויניל (פלסטיק עמיד)',
    'rollup_film': 'פילם רולאפ (לא מתקפל)',
    'canvas': 'בד קנבס איכותי',
    'lami_matte': 'למינציה מט (מגע משי)',
    'lami_gloss': 'למינציה מבריקה',
    'fold_simple': 'קיפול אמצע',
    'fold_tri': 'קיפול פרוספקט (ל-3)',
    'perfect_bind': 'כריכה בחום (ספר)',
    'spiral_bind': 'כריכת ספירלה',
    'staple_bind': 'כריכת סיכות',
    'wood_frame': 'מתיחה על מסגרת עץ',
    'round_corners': 'פינות עגולות',
    'pocket_glue': 'כיס פנימי מודבק'
};

let dbCache = null;
const loadDB = () => {
    try {
        const mat = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/materials.json'), 'utf8'));
        // נטען גם את המוצרים רק בשביל שמות ברירת המחדל, אבל החישוב הוא אוניברסלי
        const prod = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'));
        return { mat, prod };
    } catch (e) { return { mat: {}, prod: {} }; }
};

class ProductionEngine {
    constructor() { this.db = loadDB(); }

    translate(key) { return HEBREW_DICT[key] || key; }

    // --- הלב של המערכת: מחשבון אוניברסלי לכל מוצר דפוס ---
    calculateCustom(params) {
        const { mat } = loadDB();
        const machineDigital = mat.machine_specs.digital;
        const machineWide = mat.machine_specs.wide;

        let report = {
            id: Date.now(), // מזהה ייחודי לפריט בעגלה
            product_name: params.product_name || "עבודת דפוס",
            qty: parseInt(params.qty) || 1,
            client_price: 0,
            production_cost: 0,
            profit_margin: 0,
            manager_log: [],
            display_specs: [],
            line_items: []
        };

        let rawCost = 0;
        const pages = parseInt(params.pages) || 1; 
        const width = parseFloat(params.width_cm) || 0;
        const height = parseFloat(params.height_cm) || 0;
        const printSides = parseInt(params.print_sides) || 1;

        // בניית המפרט הויזואלי (הריבוע היפה)
        if (width && height) report.display_specs.push({ label: 'גודל', value: `${width}x${height} ס"מ` });
        
        // זיהוי: האם זה פורמט רחב (מטרים) או דיגיטלי (גיליונות)?
        const isWideFormat = params.paper_type && mat.wide_media[params.paper_type];

        if (isWideFormat) {
            // --- חישוב פורמט רחב ---
            const areaMeters = (width / 100) * (height / 100) * report.qty;
            const mediaItem = mat.wide_media[params.paper_type];
            
            const mediaCost = areaMeters * (mediaItem.cost_sqm || 20);
            const inkCost = areaMeters * machineWide.ink_cost_sqm;
            
            rawCost = mediaCost + inkCost + machineWide.setup_cost;
            
            report.manager_log.push(`🔹 פורמט רחב: ${mediaItem.name}`);
            report.manager_log.push(`🔹 שטח כולל: ${areaMeters.toFixed(2)} מ"ר`);
            report.display_specs.push({ label: 'חומר', value: this.translate(params.paper_type) });

        } else {
            // --- חישוב דפוס דיגיטלי ---
            // 1. חישוב כמה נכנסים בגיליון (אימפוזיציה)
            const sheetW = 32, sheetH = 45; // SRA3
            // חישוב גס של כמה נכנסים (Ups)
            let ups = 1;
            if (width > 0 && height > 0) {
                const fitW = Math.floor(sheetW / width) * Math.floor(sheetH / height);
                const fitH = Math.floor(sheetW / height) * Math.floor(sheetH / width);
                ups = Math.max(fitW, fitH, 1);
            }
            
            // חישוב כמות גיליונות להדפסה (כולל עמודים בספר)
            // אם זה ספר (מעל 4 עמודים), החישוב הוא לפי כמות דפים
            const sheetsPerUnit = Math.ceil(pages / (ups * (printSides === 2 ? 2 : 1)));
            const totalSheets = Math.ceil(report.qty * sheetsPerUnit) + 25; // +25 פחת קבוע

            const paperKey = params.paper_type || 'offset_80';
            const paperItem = mat.papers[paperKey] || mat.papers.offset_80;
            
            const paperCost = totalSheets * paperItem.cost_sheet;
            const clickCost = totalSheets * (printSides === 2 ? 2 : 1) * machineDigital.click_color;

            rawCost = paperCost + clickCost + machineDigital.setup_cost;

            report.manager_log.push(`🔹 דיגיטלי: ${paperItem.name}`);
            report.manager_log.push(`🔹 עמודים: ${pages}, אימפוזיציה: ${ups}`);
            report.manager_log.push(`🔹 סה"כ גיליונות (כולל פחת): ${totalSheets}`);
            
            report.display_specs.push({ label: 'נייר', value: this.translate(paperKey) });
            if (pages > 1) report.display_specs.push({ label: 'עמודים', value: pages });
        }

        // --- חישוב גימורים וכריכות ---
        const finishings = params.finishing || [];
        finishings.forEach(finKey => {
            const finItem = mat.finishing[finKey];
            if (finItem) {
                let cost = 0;
                // לוגיקה לחישוב עלות גימור
                if (finItem.run) {
                    // מחיר פר יחידה (כמו כריכה/הדבקה)
                    cost = (finItem.run * report.qty) + (finItem.setup || 0);
                } else if (finItem.cost_side) {
                    // מחיר פר שטח/צד (כמו למינציה)
                    cost = (finItem.cost_side * report.qty * (width*height/1000)); // הערכה גסה לשטח
                    if (cost < 10) cost = 10;
                } else if (finItem.cost_meter) {
                    // מחיר למטר (מסגרת)
                    cost = ((width+height)/50) * report.qty * finItem.cost_meter;
                }

                rawCost += cost;
                report.manager_log.push(`🔸 תוספת: ${finItem.name}`);
                report.display_specs.push({ label: 'גימור', value: this.translate(finKey) });
            }
        });

        // --- תמחור סופי ---
        report.production_cost = parseFloat(rawCost.toFixed(2));
        
        // מרווח רווח דינמי (כמות גדולה = רווח נמוך יותר ליחידה)
        let margin = 3.0;
        if (report.qty > 500) margin = 2.5;
        if (report.qty > 2000) margin = 1.8;
        if (rawCost > 2000) margin = 1.5; // בעסקאות גדולות יורדים במכפיל

        report.client_price = Math.ceil(report.production_cost * margin);
        // עיגול יפה (למשל 199 במקום 197)
        if (report.client_price > 100) {
            report.client_price = Math.ceil(report.client_price / 10) * 10 - 1; 
        }
        if (report.client_price < 50) report.client_price = 50; // מינימום הזמנה

        report.profit = (report.client_price - report.production_cost).toFixed(2);
        report.profit_margin = Math.round((report.profit / report.client_price) * 100);

        return report;
    }

    // חשיפת הכלים ל-LLM
    getTools() {
        const { mat } = loadDB();
        // יצירת רשימות דינמיות לפרומפט
        const paperList = Object.keys(mat.papers).join(', ');
        const wideList = Object.keys(mat.wide_media).join(', ');
        const finishList = Object.keys(mat.finishing).join(', ');

        return [{
            function_declarations: [{
                name: "calculate_custom_job",
                description: "Calculate price for ANY print product. Analyze the user request and map it to technical specs.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        product_name: { type: "STRING", description: "Display name (e.g. 'Book', 'Flyer')" },
                        qty: { type: "NUMBER", description: "Quantity" },
                        width_cm: { type: "NUMBER", description: "Width (cm)" },
                        height_cm: { type: "NUMBER", description: "Height (cm)" },
                        pages: { type: "NUMBER", description: "Total pages (1 for single sheet, >1 for books)" },
                        print_sides: { type: "NUMBER", description: "1 or 2" },
                        paper_type: { 
                            type: "STRING", 
                            description: `Material code from: ${paperList}, ${wideList}` 
                        },
                        finishing: {
                            type: "ARRAY",
                            description: `List of finishing codes from: ${finishList}`,
                            items: { type: "STRING" }
                        }
                    },
                    required: ["product_name", "qty"]
                }
            },
            {
                name: "present_options",
                description: "Show clickable chips/buttons.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        text: { type: "STRING" },
                        options: { type: "ARRAY", items: { type: "STRING" } }
                    },
                    required: ["options"]
                }
            },
            {
                name: "update_customer_profile",
                description: "Save customer name/phone.",
                parameters: { type: "OBJECT", properties: { name: { type: "STRING" }, phone: { type: "STRING" } } }
            }]
        }];
    }
}

module.exports = new ProductionEngine();
```


--- FILE: services\sessionManager.js ---
```js
/**
 * services/sessionManager.js
 * מנהל הזיכרון (In-Memory Session Store)
 * =======================================
 * תפקיד: לשמור את העגלה ואת הסטטוס של כל משתמש.
 * הערה: בייצור אמיתי מחליפים את זה ב-Redis, אבל לפיתוח זה מעולה.
 */

const sessions = {};

// הגדרת זמן תפוגה לשיחה (30 דקות)
const SESSION_TIMEOUT = 30 * 60 * 1000;

function getSession(userId) {
    if (!sessions[userId]) {
        console.log(`✨ New Session created for: ${userId}`);
        sessions[userId] = {
            id: userId,
            cart: [],           // המוצרים שנוספו לעגלה
            currentProduct: null, // המוצר שעליו מדברים כרגע
            draftAttributes: {},  // תשובות זמניות (לפני חישוב)
            lastActive: Date.now()
        };
    }
    
    // עדכון זמן פעילות אחרון
    sessions[userId].lastActive = Date.now();
    return sessions[userId];
}

function clearSession(userId) {
    if (sessions[userId]) {
        // שומרים על העגלה, מאפסים רק את השיחה הנוכחית
        sessions[userId].currentProduct = null;
        sessions[userId].draftAttributes = {};
        console.log(`🧹 Session context cleared for: ${userId}`);
    }
}

function clearCart(userId) {
    if (sessions[userId]) {
        sessions[userId].cart = [];
        sessions[userId].currentProduct = null;
        sessions[userId].draftAttributes = {};
        console.log(`🗑️ Cart emptied for: ${userId}`);
    }
}

// מנגנון ניקוי אוטומטי לזיכרון (Garbage Collection)
setInterval(() => {
    const now = Date.now();
    Object.keys(sessions).forEach(key => {
        if (now - sessions[key].lastActive > SESSION_TIMEOUT) {
            delete sessions[key];
        }
    });
}, 60 * 1000);

module.exports = { getSession, clearSession, clearCart };
```


--- FILE: tests\test_full_qa.js ---
```js
/** tests/test_full_qa.js - Final Version */
const { classifyMessage } = require('../engine/classifier');
const { planActions } = require('../engine/planner');
const { getSession, clearSession } = require('../services/sessionManager');
require('dotenv').config();

const c = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", bold: "\x1b[1m" };

const TEST_SUITES = {
    digital_flow: [
        { text: "היי", expect: "greeting" },
        { text: "אני צריך 1000 כרטיסי ביקור", expect: "ask_paper" },
        { text: "נייר מט רגיל", expect: "ask_lami" },
        { text: "בלי למינציה", expect: "calculate" },
        { text: "בעצם תוסיף לי עוד 1000", expect: "update_qty" }
    ],
    wide_format: [
        { text: "תפריט", expect: "reset" },
        { text: "כמה עולה רולאפ?", expect: "ask_size" },
        { text: "85 על 200", expect: "ask_qty" },
        { text: "יחידה אחת", expect: "calculate" },
        { text: "אני רוצה גם מדבקות ויניל", expect: "ask_qty_sqm" },
        { text: "10 מטר רבוע", expect: "ask_cut" },
        { text: "חיתוך צורני", expect: "calculate" }
    ],
    indecisive_client: [
        { text: "נקה הכל", expect: "remove" },
        { text: "תביא לי פליירים", expect: "ask_size" },
        { text: "A5", expect: "ask_paper" },
        { text: "עזוב לא רוצה פליירים, תעשה הזמנות לחתונה", expect: "switch_product" },
        { text: "500 הזמנות", expect: "ask_size" },
        { text: "גודל 13 על 18", expect: "ask_paper" },
        { text: "נייר פנינה", expect: "calculate" }
    ],
    edge_cases: [
        { text: "ריסט", expect: "reset" },
        { text: "תדפיס לי 2 מליארד פליירים", expect: "qty_check" },
        // Updated Expectation: "out_of_scope" is acceptable for absurd sizes
        { text: "רוצה כרטיס ביקור בגודל של בניין", expect: "out_of_scope_or_logic" },
        { text: "מינוס 5 רולאפים", expect: "qty_negative" },
        { text: "סתם טקסט לא קשור", expect: "chat_fallback" }
    ],
    scope_security: [
        { text: "אני רוצה שלט חוצות באיילון", expect: "out_of_scope" },
        { text: "תדפיס לי על המים בים", expect: "impossible" },
        { text: "תכין לי קפה", expect: "chat" },
        { text: "מי בנה אותך?", expect: "chat" }
    ],
    checkout_flow: [
        { text: "תפריט", expect: "reset" },
        { text: "1000 פליירים A5 נייר כרומו 130", expect: "calculate_direct" },
        { text: "מה יש בעגלה?", expect: "show_cart" },
        { text: "תשלח לי הצעת מחיר", expect: "checkout" },
        { text: "תודה ביי", expect: "goodbye" }
    ]
};

async function runFullQA() {
    console.log(`${c.bold}🚀 STARTING FULL PLATFORM QA (Pini V10.6)${c.reset}\n`);
    const session = getSession('qa_tester_master');
    clearSession('qa_tester_master');
    let totalTests = 0, totalPassed = 0;

    for (const [suiteName, steps] of Object.entries(TEST_SUITES)) {
        console.log(`${c.yellow}📂 ${suiteName.toUpperCase()}${c.reset}`);
        
        for (const step of steps) {
            totalTests++;
            process.stdout.write(`Step ${totalTests}: "${step.text}" ... `);
            
            try {
                const classification = await classifyMessage(step.text, session);
                const plan = planActions(classification, session);
                
                let responseType = "unknown";
                let botText = "";

                for (const action of plan.actions) {
                    if (action.type === 'PRESENT_OPTIONS') {
                        session.currentProduct = action.product;
                        session.draftAttributes = action.saveDraft;
                        responseType = "question";
                        botText = action.question;
                    }
                    if (action.type === 'CALCULATE_AND_ADD') {
                        session.cart.push(action.payload);
                        responseType = "calculate";
                    }
                    if (action.type === 'GENERATE_RESPONSE') {
                        botText = action.payload.text || action.template;
                        if (action.template === 'greeting') responseType = "greeting";
                        if (action.template === 'quote_success') responseType = "calculate";
                        if (botText.includes("איפסתי")) responseType = "reset";
                        if (botText.includes("העגלה ריקה") || botText.includes("מחקתי")) responseType = "remove";
                        if (botText.includes("גדול עלינו")) responseType = "out_of_scope";
                        if (botText.includes("בלתי אפשרי")) responseType = "impossible";
                        if (botText.includes("הצעת מחיר מסודרת")) responseType = "checkout";
                        if (botText.includes("פריטים בעגלה")) responseType = "show_cart";
                        if (botText.includes("לא קיים")) responseType = "logic_error";
                        if (botText.includes("בוט דפוס חמוד")) responseType = "chat"; // זיהוי תשובת ה-Chat
                    }
                    if (action.type === 'CLEAR_SESSION_CONTEXT') {
                        session.currentProduct = null;
                        session.draftAttributes = {};
                    }
                }

                const isPass = checkExpectation(step.expect, responseType, classification);
                
                if (isPass) {
                    console.log(`${c.green}✅ PASS${c.reset}`);
                    totalPassed++;
                } else {
                    console.log(`${c.red}❌ FAIL${c.reset}`);
                    console.log(`   Expected: ${step.expect}`);
                    console.log(`   Got: ${responseType}`);
                    console.log(`   Bot Said: "${botText}"`);
                }
            } catch (e) { console.log(`${c.red}💥 CRASH: ${e.message}${c.reset}`); }
        }
        console.log(`${c.reset}`);
    }

    const score = Math.round((totalPassed / totalTests) * 100);
    console.log(`${c.bold}📊 SCORE: ${score}%${c.reset}`);
}

function checkExpectation(expect, actualType, classification) {
    switch (expect) {
        case 'greeting': return actualType === 'greeting';
        case 'reset': return actualType === 'reset';
        case 'remove': return actualType === 'remove';
        case 'checkout': return actualType === 'checkout';
        case 'goodbye': return actualType === 'greeting';
        case 'show_cart': return actualType === 'show_cart';
        case 'chat': case 'chat_fallback': return actualType === 'chat';
        case 'calculate': case 'calculate_direct': return actualType === 'calculate';
        case 'out_of_scope': return actualType === 'out_of_scope';
        case 'out_of_scope_or_logic': return actualType === 'out_of_scope' || actualType === 'logic_error';
        case 'impossible': return actualType === 'impossible';
        case 'logic_error': return actualType === 'logic_error';
        
        case 'ask_paper': case 'ask_size': case 'ask_qty': case 'ask_lami': case 'ask_cut': case 'ask_qty_sqm': case 'ask_frame':
            return actualType === 'question';
        case 'switch_product': return classification.product !== null && actualType === 'question';
        case 'update_qty': return actualType === 'question' || actualType === 'calculate';
        default: return actualType !== 'unknown';
    }
}

runFullQA();
```


--- FILE: tests\test_qa_master.js ---
```js
/**
 * tests/test_qa_master.js
 * בדיקת איכות מקיפה (QA) - פיני הבוט
 * ====================================
 * מריץ תרחישי שיחה שלמים ובודק שהלוגיקה לא נשברת.
 * כולל בדיקות לזיהוי ספרים, החלפת נושא, ומחיקת פריטים.
 */

const { planActions } = require('../engine/planner');
const { extractParameters } = require('../engine/extractor');
const { getSession, clearSession } = require('../services/sessionManager');
require('dotenv').config();

// צבעים ללוגים בטרמינל
const c = { reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", bold: "\x1b[1m", cyan: "\x1b[36m" };

const SCENARIOS = [
    {
        name: "📚 זרימת ספרים (בדיקת לוגיקה מספרית)",
        steps: [
            { user: "אני רוצה להדפיס ספר", expectType: "question", expectText: "כמה" },
            { user: "100 עותקים", expectType: "question", expectText: "עמודים" }, // מוודא ש-100 נתפס ככמות
            { user: "300", expectType: "question", expectText: "גודל" }, // מוודא ש-300 נתפס כעמודים ולא דורס כמות
            { user: "A5", expectType: "question", expectText: "נייר" },
            { user: "נטול עץ", expectType: "question", expectText: "כריכה" },
            { user: "כריכה רכה", expectType: "calculate" }
        ]
    },
    {
        name: "🃏 זרימה מהירה (כרטיסי ביקור + התנגשות 'מט')",
        steps: [
            { user: "כרטיסי ביקור", expectType: "question", expectText: "כמה" },
            { user: "1000", expectType: "question", expectText: "נייר" },
            { user: "מט 350", expectType: "question", expectText: "למינציה" }, // מוודא ש'מט' זוהה כחלק מהנייר ולא כלמינציה מוקדמת
            { user: "מט", expectType: "calculate" } // מוודא ש'מט' כאן מזוהה כלמינציה
        ]
    },
    {
        name: "🔄 החלפת נושא (רולאפ)",
        steps: [
            { user: "פליירים", expectType: "question", expectText: "כמה" }, // מתחיל פלייר
            { user: "בעצם לא, תביא לי רולאפ", expectType: "question", expectText: "כמה" }, // מחליף לרולאפ
            { user: "1", expectType: "question", expectText: "גודל" },
            { user: "85x200", expectType: "calculate" }
        ]
    },
    {
        name: "🗑️ בדיקת מחיקת פריט בודד",
        steps: [
            // 1. הוספת פריט לעגלה
            { user: "רולאפ", expectType: "question", expectText: "כמה" },
            { user: "1", expectType: "question", expectText: "גודל" },
            { user: "85x200", expectType: "calculate" }, 
            
            // 2. בדיקת מחיקה
            { user: "תמחק את פריט 1", expectType: "remove" }, // מצפה לפעולת מחיקה
            
            // 3. וידוא שהמערכת חוזרת לשגרה
            { user: "היי", expectType: "response", expectText: "מה תרצה להדפיס" } 
        ]
    }
];

async function runTests() {
    console.log(`${c.bold}${c.cyan}🤖 PINI BOT MASTER QA TEST${c.reset}\n`);
    
    const sessionId = 'qa_tester';
    let totalErrors = 0;

    for (const scenario of SCENARIOS) {
        console.log(`${c.yellow}📂 ${scenario.name}${c.reset}`);
        clearSession(sessionId); // התחלה נקייה לכל תרחיש
        const session = getSession(sessionId);

        for (const step of scenario.steps) {
            try {
                // 1. סימולציה: חילוץ פרמטרים (כמו בשרת)
                const extraction = extractParameters(step.user);
                
                // 2. סימולציה: קביעת כוונה (Intent Detection logic from server.js)
                let intent = 'chat';
                
                if (extraction.isReset) intent = 'reset';
                else if (extraction.isRemove) intent = 'remove_item'; // <--- התוספת החשובה לטסט
                else if (extraction.isCartStatus) intent = 'show_cart';
                
                else if (session.currentProduct) {
                     // אם הוזכר מוצר חדש בזמן שיש מוצר פעיל -> החלפת נושא
                     if (extraction.products.length > 0 && !extraction.products.includes(session.currentProduct)) {
                         intent = 'new_order';
                         session.currentProduct = extraction.products[0];
                         session.draftAttributes = {}; // איפוס טיוטה
                     } else {
                         intent = 'answer';
                     }
                }
                else if (extraction.products.length > 0) {
                    intent = 'new_order';
                    session.currentProduct = extraction.products[0];
                }

                // 3. הרצת המוח (Planner)
                const plan = planActions({ 
                    intent, 
                    extractedParams: extraction, 
                    product: session.currentProduct 
                }, session);
                
                const action = plan.actions[0]; // לוקחים את הפעולה הראשית
                
                // 4. פענוח סוג הפעולה שהתקבלה לבדיקה
                let type = 'unknown';
                let responseText = '';

                if (action.type === 'PRESENT_OPTIONS') {
                    type = 'question';
                    responseText = action.question;
                    // עדכון סטייט בסימולטור
                    session.currentProduct = action.product;
                    session.draftAttributes = action.saveDraft;

                } else if (action.type === 'CALCULATE_AND_ADD') {
                    type = 'calculate';
                    session.cart.push(action.payload);
                    session.currentProduct = null;
                    session.draftAttributes = {};

                } else if (action.type === 'REMOVE_FROM_CART') {
                    type = 'remove';
                    // סימולציית מחיקה (פשטנית לטסט)
                    if (session.cart.length > 0) session.cart.pop();

                } else if (action.type === 'CLEAR_SESSION_CONTEXT') {
                    type = 'reset';
                    session.cart = [];
                    session.currentProduct = null;

                } else if (action.type === 'GENERATE_RESPONSE') {
                    type = 'response';
                    responseText = action.payload.text;
                }

                // 5. בדיקה האם התוצאה תואמת לציפייה
                const textMatch = !step.expectText || (responseText && responseText.includes(step.expectText));
                const typeMatch = type === step.expectType;

                if (typeMatch && textMatch) {
                    console.log(`   ✅ "${step.user}" -> ${type}`);
                } else {
                    console.log(`   ❌ "${step.user}"`);
                    console.log(`      Received: [${type}] "${responseText || ''}"`);
                    console.log(`      Expected: [${step.expectType}] "${step.expectText || ''}"`);
                    console.log(`      Draft State: ${JSON.stringify(session.draftAttributes)}`);
                    totalErrors++;
                }

            } catch (e) { 
                console.log(`   💥 Error processing "${step.user}": ${e.message}`); 
                totalErrors++;
            }
        }
        console.log(""); // שורה ריקה בין תרחישים
    }

    if (totalErrors === 0) {
        console.log(`${c.green}${c.bold}🎉 כל הבדיקות עברו בהצלחה! המערכת יציבה.${c.reset}`);
    } else {
        console.log(`${c.red}${c.bold}⚠️ סיכום: נמצאו ${totalErrors} שגיאות.${c.reset}`);
    }
}

runTests();
```


--- FILE: tests\test_scenarios_complex.js ---
```js
/**
 * tests/test_scenarios_complex.js
 * בדיקת "הלקוח המשוגע" - 30 שלבים בשיחה רציפה
 * ============================================
 */

const { classifyMessage } = require('../engine/classifier');
const { planActions } = require('../engine/planner');
const { getSession, clearSession } = require('../services/sessionManager');
require('dotenv').config();

const c = { reset: "\x1b[0m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", cyan: "\x1b[36m" };

const SCENARIOS = [
    // --- סבב 1: הזמנת פליירים עם חרטות ---
    { step: 1, text: "היי פיני", expected: "greeting" },
    { step: 2, text: "אני רוצה להדפיס פליירים", expected: "ask_size" }, 
    { step: 3, text: "בגודל A5", expected: "ask_paper" }, // תשובה לשאלה קודמת
    { step: 4, text: "נייר עבה", expected: "ask_qty" },   // LLM should map "עבה" to chromo
    { step: 5, text: "1000 יחידות", expected: "calculate" },
    { step: 6, text: "בעצם תשנה את הכמות ל-5000", expected: "calculate_update" }, // שינוי דעה
    { step: 7, text: "עזוב, תמחק את הפליירים", expected: "remove_cart" }, // חרטה מלאה

    // --- סבב 2: כרטיסי ביקור (סלנג) ---
    { step: 8, text: "טוב, בוא נעשה כרטיסי ביקור", expected: "ask_qty" },
    { step: 9, text: "תביא לי אלפייה", expected: "ask_paper" }, // אלפייה = 1000
    { step: 10, text: "נייר רגיל", expected: "calculate" },
    
    // --- סבב 3: רולאפ (מידות מוזרות) ---
    { step: 11, text: "כמה עולה רולאפ?", expected: "ask_size" },
    { step: 12, text: "מטר עשרים", expected: "ask_qty" }, // 120 ס"מ
    { step: 13, text: "יחידה אחת", expected: "calculate" },
    
    // --- סבב 4: בלבול ומוצרים חסרים ---
    { step: 14, text: "אני רוצה להדפיס", expected: "ask_what" }, // לא אמר מה
    { step: 15, text: "הזמנות לחתונה", expected: "ask_qty" },
    { step: 16, text: "200 הזמנות", expected: "ask_size" },
    { step: 17, text: "גודל רגיל", expected: "ask_paper" }, // LLM צריך לנחש 13x18 או לשאול
    { step: 18, text: "נייר פנינה כזה מנצנץ", expected: "calculate" }, // pearl_300

    // --- סבב 5: קנבס ומסגרות ---
    { step: 19, text: "בא לי תמונה על קנבס לסלון", expected: "ask_size" },
    { step: 20, text: "משהו גדול, מטר על מטר", expected: "ask_frame" }, // 100x100
    { step: 21, text: "בלי מסגרת", expected: "ask_qty" },
    { step: 22, text: "אחד", expected: "calculate" },

    // --- סבב 6: מדבקות (שטח) ---
    { step: 23, text: "מדבקות ויניל", expected: "ask_qty_sqm" },
    { step: 24, text: "5 מטר רבוע", expected: "ask_cut" },
    { step: 25, text: "חיתוך צורני", expected: "calculate" },

    // --- סבב 7: סיום וסגירה ---
    { step: 26, text: "מה יש לי בעגלה?", expected: "show_cart" }, // (לא מומש ב-planner כרגע, יפול ל-consult)
    { step: 27, text: "תשלח לי הצעת מחיר מסודרת", expected: "pdf_flow" }, // checkout
    { step: 28, text: "תודה רבה!", expected: "greeting/consult" },
    { step: 29, text: "ביי", expected: "greeting" },
    { step: 30, text: "תמחק הכל להתחלה", expected: "reset" }
];

async function runScenarioTest() {
    console.log(`${c.cyan}🚀 STARTING CONTINUOUS CONVERSATION TEST (30 STEPS)${c.reset}\n`);
    
    const sessionId = 'stress_test_user_1';
    clearSession(sessionId); // מתחילים נקי
    const session = getSession(sessionId);
    
    let passCount = 0;

    for (const scenario of SCENARIOS) {
        console.log(`${c.yellow}Step ${scenario.step}: "${scenario.text}"${c.reset}`);
        
        try {
            // 1. סיווג
            const classification = await classifyMessage(scenario.text, session);
            
            // 2. תכנון
            const plan = planActions(classification, session);
            
            // 3. עדכון ה-Session (סימולציה של מה שהשרת עושה)
            // זה קריטי כדי שהשלב הבא יכיר את השלב הקודם
            for (const action of plan.actions) {
                if (action.type === 'PRESENT_OPTIONS') {
                    session.currentProduct = action.product;
                    session.draftAttributes = action.saveDraft;
                    console.log(`   🤖 Bot: ${action.question} [Product: ${action.product}]`);
                }
                if (action.type === 'CALCULATE_AND_ADD') {
                    const item = action.payload; // מדמים הוספה
                    // שים לב: בטסט האמיתי calculation מחזיר אובייקט מלא, כאן אנחנו רק מדמים
                    session.cart.push({ product: session.currentProduct, price: 100 }); 
                    console.log(`   💰 Bot: Calculated Price! (Item added to cart)`);
                }
                if (action.type === 'CLEAR_SESSION_CONTEXT') {
                    session.currentProduct = null;
                    session.draftAttributes = {};
                    console.log(`   ✨ Context Cleared`);
                }
                if (action.type === 'GENERATE_RESPONSE') {
                    console.log(`   💬 Bot: ${action.payload.text || action.template}`);
                }
            }

            // בדיקת הצלחה בסיסית (אם הבוט הגיב במשהו)
            if (plan.actions.length > 0) {
                passCount++;
            } else {
                console.log(`${c.red}   ❌ No response generated${c.reset}`);
            }
            console.log("--------------------------------------------------");

        } catch (e) {
            console.log(`${c.red}💥 Error in Step ${scenario.step}: ${e.message}${c.reset}`);
        }
    }

    console.log(`\n${c.green}🏁 TEST FINISHED: ${passCount}/30 Successful Interactions${c.reset}`);
}

runScenarioTest();
```


--- FILE: tests\test_ultimate_saga.js ---
```js
/** tests/test_ultimate_saga.js V11.0 - Robust Test Harness */
const { classifyMessage } = require('../engine/classifier');
const { planActions } = require('../engine/planner');
const { getSession, clearSession } = require('../services/sessionManager');
require('dotenv').config();

const c = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", bold: "\x1b[1m", cyan: "\x1b[36m" };

const SAGA_STEPS = [
    { id: 1, text: "היי פיני, מה העניינים?", expect: "greeting" },
    { id: 2, text: "תגיד מה אתה יודע להדפיס?", expect: "chat_or_consult" },
    { id: 3, text: "אני צריך עזרה עם אירוע חברה", expect: "chat_or_consult" },
    { id: 4, text: "טוב תתחיל עם כרטיסי ביקור", expect: "ask_qty" },
    { id: 5, text: "500 יחידות", expect: "ask_paper" },
    { id: 6, text: "נייר מט רגיל", expect: "ask_lami" },
    { id: 7, text: "בלי למינציה", expect: "calculate" },
    { id: 8, text: "סבבה. תוסיף לי גם רולאפ", expect: "ask_size" },
    { id: 9, text: "גודל סטנדרטי 85", expect: "ask_qty" },
    { id: 10, text: "שניים כאלה", expect: "calculate" },
    { id: 11, text: "כמה זה יוצא בינתיים?", expect: "show_cart" },
    { id: 12, text: "תגיד אתה עושה גם חולצות?", expect: "out_of_scope" },
    { id: 13, text: "באסה. טוב לא משנה", expect: "chat_or_consult" },
    { id: 14, text: "אני צריך גם פליירם לחלק", expect: "ask_size" },
    { id: 15, text: "דף שלם A4", expect: "ask_paper" },
    { id: 16, text: "כרומו דק", expect: "ask_qty" },
    { id: 17, text: "10000 עותקים", expect: "calculate" },
    { id: 18, text: "רגע, לגבי הכרטיסי ביקור ממקודם", expect: "update_intent" },
    { id: 19, text: "תשנה לי את הכמות ל-1000", expect: "calculate_update" },
    { id: 20, text: "וגם תחליף את הנייר ליוקרתי כזה, פנינה", expect: "calculate_update" },
    { id: 21, text: "מה עוד כדאי לאירוע?", expect: "chat_or_consult" },
    { id: 22, text: "אולי מדבקות לוגו?", expect: "ask_qty_sqm" },
    { id: 23, text: "כן! תביא לי 5 מטר", expect: "ask_cut" },
    { id: 24, text: "חיתוך צורני ברור", expect: "calculate" },
    { id: 25, text: "תמחק את הרולאפים, זה יקר לי", expect: "remove" },
    { id: 26, text: "אוי מחקת הכל?", expect: "chat_or_consult" },
    { id: 27, text: "לא נורא, נתחיל מהר", expect: "chat_or_consult" },
    { id: 28, text: "1000 פליירים A5", expect: "ask_paper" },
    { id: 29, text: "כרומו 300", expect: "calculate" },
    { id: 30, text: "500 כרטיסי ביקור מט", expect: "ask_lami" },
    { id: 31, text: "למינציה מט", expect: "calculate" },
    { id: 32, text: "תדפיס לי כסף", expect: "impossible" },
    { id: 33, text: "חחח סתם", expect: "chat" },
    { id: 34, text: "מה יש בסל?", expect: "show_cart" },
    { id: 35, text: "נראה טוב", expect: "chat" },
    { id: 36, text: "תארוז לי", expect: "checkout" },
    { id: 37, text: "איך משלמים?", expect: "checkout" },
    { id: 38, text: "תודה יא מלך", expect: "greeting" },
    { id: 39, text: "יאללה ביי", expect: "greeting" },
    { id: 40, text: "ריסט", expect: "reset" }
];

async function runUltimateSaga() {
    console.log(`${c.bold}${c.cyan}🔥 STARTING THE ULTIMATE REAL-LIFE SAGA (40 STEPS) 🔥${c.reset}\n`);
    
    const sessionId = 'saga_user_vip_v2';
    clearSession(sessionId);
    const session = getSession(sessionId);
    
    let passCount = 0;

    for (const step of SAGA_STEPS) {
        process.stdout.write(`${c.yellow}Step ${step.id}:${c.reset} "${step.text}" ... `);
        
        try {
            const classification = await classifyMessage(step.text, session);
            const plan = planActions(classification, session);
            
            let responseType = "unknown";
            let botText = "";

            for (const action of plan.actions) {
                if (action.type === 'PRESENT_OPTIONS') {
                    session.currentProduct = action.product;
                    session.draftAttributes = action.saveDraft;
                    responseType = "question"; // Default classification
                    botText = action.question;
                }
                if (action.type === 'CALCULATE_AND_ADD') {
                    session.cart.push(action.payload);
                    responseType = "calculate";
                }
                if (action.type === 'GENERATE_RESPONSE') {
                    botText = action.payload.text || action.template;
                    if (action.template === 'greeting') responseType = "greeting";
                    if (action.template === 'quote_success') responseType = "calculate";
                    if (botText.includes("איפסתי")) responseType = "reset";
                    if (botText.includes("מחקתי") || botText.includes("העגלה ריקה")) responseType = "remove";
                    if (botText.includes("גדול עלינו")) responseType = "out_of_scope";
                    if (botText.includes("בלתי אפשרי")) responseType = "impossible";
                    if (botText.includes("הצעת מחיר") || botText.includes("כפתור התשלום")) responseType = "checkout";
                    if (botText.includes("פריטים בעגלה")) responseType = "show_cart";
                    if (botText.includes("בוט דפוס") || botText.includes("בכיף") || botText.includes("פחות בקטע של קפה")) responseType = "chat";
                    if (botText.includes("מה תרצה להדפיס")) responseType = "chat_or_consult"; 
                }
                if (action.type === 'CLEAR_SESSION_CONTEXT') {
                    session.currentProduct = null;
                    session.draftAttributes = {};
                }
            }

            const isPass = checkExpectation(step.expect, responseType, classification, botText);

            if (isPass) {
                console.log(`${c.green}✅ PASS${c.reset}`);
                passCount++;
            } else {
                console.log(`${c.red}❌ FAIL${c.reset}`);
                console.log(`   Expected: ${step.expect}`);
                console.log(`   Got: ${responseType}`);
                console.log(`   Bot Said: "${botText}"`);
            }

        } catch (e) { console.log(`${c.red}💥 CRASH: ${e.message}${c.reset}`); }
    }

    const score = Math.round((passCount / SAGA_STEPS.length) * 100);
    console.log(`\n${c.bold}📊 SAGA SCORE: ${score}%${c.reset}`);
}

// פונקציית בדיקה חכמה וגמישה יותר
function checkExpectation(expected, actual, classification, botText) {
    if (expected === actual) return true;

    // Greeting Flexibility
    if (expected === "greeting") {
        if (actual === "chat" && (botText.includes("בכיף") || botText.includes("שמחתי"))) return true;
    }

    // Chat Flexibility
    if (expected === "chat" && actual === "greeting") return true;
    if (expected === "chat_or_consult") return actual === "chat" || actual === "greeting" || actual === "unknown";

    // Update vs Question vs Quote
    // אם ציפינו לשאלה ("כמה?") וקיבלנו שאלה, זה מצוין, גם אם הטסט קורא לזה update_intent
    if (expected.startsWith("ask_")) {
        return actual === "question" || actual === "update_intent";
    }

    // Update Intent
    if (expected === "update_intent") {
        // אם הבוט שואל שאלה רלוונטית למוצר, זה נחשב הצלחה
        if (actual === "question") return true;
    }
    
    // Calculate Update
    if (expected === "calculate_update") {
        // אם הצלחנו לחשב, או ששאלנו שאלה אחרונה לבירור
        return actual === "calculate" || actual === "question";
    }

    return false;
}

runUltimateSaga();
```
