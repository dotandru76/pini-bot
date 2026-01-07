/**
 * Pini Planner (The Brain)
 * ========================
 * מקבל כוונה ופרמטרים -> מחזיר רשימת משימות לביצוע.
 * זה המקום שבו נקבעת ה"אסטרטגיה".
 */

function planActions(intent, params, session) {
    const plan = {
        actions: [],
        nextState: 'idle' // למעקב אחרי הסטייט בשיחה
    };

    // === לוגיקת תכנון לפי כוונה ===

    switch (intent) {
        case 'quote':
            // האם יש את כל המידע?
            if (params.product && params.qty) {
                // יש מוצר וכמות -> הוסף לעגלה
                plan.actions.push({ 
                    type: 'CALCULATE_AND_ADD', 
                    payload: { product: params.product, qty: params.qty } 
                });
                
                // האם ביקש דחוף? -> הוסף בדיקת דחיפות
                if (params.attributes.urgency === 'high') {
                    plan.actions.push({ type: 'CHECK_URGENCY_OPTIONS' });
                }

                // בסוף -> הצג תוצאה
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
            }
            break;

        case 'update':
            // עדכון פריט קיים
            const targetProduct = params.product || getLastAddedProduct(session);
            if (targetProduct && params.qty) {
                plan.actions.push({ 
                    type: 'UPDATE_CART_ITEM', 
                    payload: { product: targetProduct, qty: params.qty } 
                });
                plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'quote_updated' });
                plan.actions.push({ type: 'UPDATE_DASHBOARD' });
            } else {
                plan.actions.push({ type: 'ASK_CLARIFICATION', context: 'update_what' });
            }
            break;

        case 'remove':
            const productToRemove = params.product || getLastAddedProduct(session);
            if (productToRemove) {
                plan.actions.push({ type: 'REMOVE_FROM_CART', product: productToRemove });
                plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'item_removed' });
                plan.actions.push({ type: 'UPDATE_DASHBOARD' });
            }
            break;

        case 'checkout':
            plan.actions.push({ type: 'SUMMARIZE_CART' });
            plan.actions.push({ type: 'CHECK_DESIGN_STATUS' }); // בדיקה חכמה לפני סגירה
            plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'send_quote' });
            break;

        case 'clear':
            plan.actions.push({ type: 'CLEAR_CART' });
            plan.actions.push({ type: 'GENERATE_RESPONSE', template: 'cart_cleared' });
            plan.actions.push({ type: 'UPDATE_DASHBOARD' });
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
    return session.cart[session.cart.length - 1].product_category; // או product_name
}

module.exports = { planActions };