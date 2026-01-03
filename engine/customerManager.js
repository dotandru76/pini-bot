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
