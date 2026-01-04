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