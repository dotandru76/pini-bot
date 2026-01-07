/**
 * Pini Planner (The Brain) V2
 * ===========================
 * מקבל כוונה ופרמטרים -> מחזיר רשימת משימות לביצוע.
 * תוקן: מיפוי נכון של שמות מוצרים למנוע החישוב.
 */

function planActions(intent, params, session) {
    const plan = {
        actions: [],
        nextState: 'idle' // למעקב אחרי הסטייט בשיחה
    };

    // === לוגיקת תכנון לפי כוונה ===

    switch (intent) {
        case 'quote':
            // האם יש את כל המידע (מוצר + כמות)?
            if (params.product && params.qty) {
                // יש מוצר וכמות -> הוסף לעגלה
                plan.actions.push({ 
                    type: 'CALCULATE_AND_ADD', 
                    payload: { 
                        product_name: params.product, // <--- התיקון הקריטי: מיפוי לשדה שהמחשבון מצפה לו
                        qty: params.qty,
                        attributes: params.attributes // העברת תכונות נוספות (כמו דחיפות)
                    } 
                });
                
                // האם ביקש דחוף? (מזוהה ע"י המערכת או ה-LLM)
                if (params.attributes && params.attributes.urgency === 'high') {
                    plan.actions.push({ type: 'CHECK_URGENCY_OPTIONS' });
                }

                // בסוף -> בחר תבנית תגובה
                plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'quote_added' });
                
                // *** עדכון דשבורד חובה! ***
                plan.actions.push({ type: 'UPDATE_DASHBOARD' });

            } else if (params.product && !params.qty) {
                // חסרה כמות -> שאל את הלקוח
                plan.actions.push({ 
                    type: 'ASK_QUESTION', 
                    question: 'quantity', 
                    product: params.product 
                });
            } else {
                // לא ברור מה המוצר -> העבר ל-LLM או שאל
                plan.actions.push({ type: 'CALL_LLM_CONSULTANT', input: params });
            }
            break;

        case 'update':
            // עדכון פריט קיים (אם לא צוין מוצר, קח את האחרון)
            const targetProduct = params.product || getLastAddedProduct(session);
            
            if (targetProduct && params.qty) {
                plan.actions.push({ 
                    type: 'UPDATE_CART_ITEM', 
                    payload: { 
                        product_name: targetProduct, 
                        qty: params.qty 
                    } 
                });
                plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'quote_updated' });
                plan.actions.push({ type: 'UPDATE_DASHBOARD' });
            } else {
                // אם אין מוצר בעגלה או לא זוהה מה לעדכן
                plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'cart_empty_error' });
            }
            break;

        case 'remove':
            const productToRemove = params.product || getLastAddedProduct(session);
            if (productToRemove) {
                plan.actions.push({ type: 'REMOVE_FROM_CART', product: productToRemove });
                plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'item_removed' });
                plan.actions.push({ type: 'UPDATE_DASHBOARD' });
            } else {
                plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'cart_empty_error' });
            }
            break;

        case 'checkout':
            plan.actions.push({ type: 'SUMMARIZE_CART' });
            plan.actions.push({ type: 'CHECK_DESIGN_STATUS' }); // בדיקה חכמה לפני סגירה (אם יש קבצים)
            plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'send_quote' });
            break;

        case 'clear':
            plan.actions.push({ type: 'CLEAR_CART' });
            plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'cart_cleared' });
            plan.actions.push({ type: 'UPDATE_DASHBOARD' });
            break;
        
        case 'status':
            plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'cart_status' });
            break;
            
        case 'greeting':
            plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'greeting' });
            break;

        case 'consult':
        default:
            // העברה ל-LLM (רק כשאין ברירה)
            plan.actions.push({ type: 'CALL_LLM_CONSULTANT', input: params });
            break;
    }

    return plan;
}

// עזר: שליפת המוצר האחרון מהסשן
function getLastAddedProduct(session) {
    if (!session.cart || session.cart.length === 0) return null;
    // הנחה: המבנה בעגלה מכיל את השדה product_name או product_category
    const lastItem = session.cart[session.cart.length - 1];
    return lastItem.product_category || lastItem.product_name; 
}

module.exports = { planActions };