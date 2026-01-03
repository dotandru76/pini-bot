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
