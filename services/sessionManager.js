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
// כמות מקסימלית של מזהי בקשות לשמירה (למניעת Memory Leak)
const MAX_PROCESSED_REQUESTS = 50;

function getSession(userId) {
    if (!sessions[userId]) {
        console.log(`✨ New Session created for: ${userId}`);
        sessions[userId] = {
            id: userId,
            cart: [],           // המוצרים שנוספו לעגלה
            currentProduct: null, // המוצר שעליו מדברים כרגע
            draftAttributes: {},  // תשובות זמניות (לפני חישוב)
            processedRequests: new Map(),
            lastActive: Date.now(),
            lastSpecChangeTime: Date.now(), // Tracking for Semantic Aging
            blockState: { reason: null, ttl: 0 } // Phase 4.2: Built-in Turn-Based Memory
        };
    }

    // Phase 5.3: Semantic Aging (Drift Detection)
    const session = sessions[userId];
    const driftDelta = (Date.now() - session.lastSpecChangeTime) / 1000 / 60; // in minutes
    if (driftDelta >= 8 && driftDelta <= 12 && session.draftAttributes && Object.keys(session.draftAttributes).length > 0) {
        session.driftDetected = true;
        console.log(`⏳ [SESSION] Semantic Aging detected for ${userId}: ${driftDelta.toFixed(1)}m`);
    } else {
        session.driftDetected = false;
    }
    if (session.blockState && session.blockState.reason === "PARAMETER_INSTABILITY") {
        if (session.blockState.ttl > 0) {
            session.blockState.ttl--;
            console.log(`[SESSION] TTL Decrement: ${session.blockState.ttl} left for ${userId}`);

            if (session.blockState.ttl === 0) {
                console.log(`[SESSION] TTL Expired. Releasing block for ${userId}`);
                session.blockState.reason = null;
            }
        }
    }

    // עדכון זמן פעילות אחרון
    sessions[userId].lastActive = Date.now();
    return sessions[userId];
}

/**
 * Phase 1.2: Idempotency Guard (Check & Lock)
 * בודק אם הבקשה כבר קיימת/מעובדת, ונועל אותה באופן סינכרוני
 */
function checkAndLockRequest(session, requestId, payloadText) {
    if (!requestId) return { status: 'NEW' }; // אם הקליינט ישן ולא שלח ID

    const existing = session.processedRequests.get(requestId);

    if (existing) {
        // בדוק סכנת מניפולציה (Payload Mismatch)
        if (existing.payload !== payloadText) {
            console.warn(`🚨 SECURITY ALERT: Payload Mismatch for requestId ${requestId}`);
            return { status: 'MISMATCH_ERROR' };
        }

        if (existing.status === 'PROCESSING') {
            return { status: 'PROCESSING_ERROR' }; // בקשה מתחרה נדחית
        }

        if (existing.status === 'COMPLETED') {
            console.log(`♻️ IDEMPOTENCY: Returning cached response for ${requestId}`);
            return { status: 'COMPLETED', cachedResponse: existing.response };
        }
    }

    // נעילה סינכרונית - Atomicity שומר על ה-Thread מפני כניסה כפולה מיידית
    session.processedRequests.set(requestId, {
        payload: payloadText,
        status: 'PROCESSING',
        timestamp: Date.now(),
        response: null
    });

    // הגנה מ-Memory Leak: לנקות מידע ישן
    if (session.processedRequests.size > MAX_PROCESSED_REQUESTS) {
        const oldestKey = session.processedRequests.keys().next().value;
        session.processedRequests.delete(oldestKey);
    }

    return { status: 'NEW' };
}

/**
 * Phase 1.2: Release & Cache
 * מעדכן את הסטטוס לסיום יחד עם שמירת התשובה למטמון להחזרה חוזרת
 */
function cacheCompletedRequest(session, requestId, responseBody) {
    if (!requestId) return;
    const reqData = session.processedRequests.get(requestId);
    if (reqData && reqData.status === 'PROCESSING') {
        reqData.status = 'COMPLETED';
        // --- PHASE 1.2 Hardening: ניתוק רפרנסים (Deep Clone) למניעת קריסות Cache Mutation ---
        reqData.response = JSON.parse(JSON.stringify(responseBody));
    }
}

/**
 * Phase 1.2: Cleanup on Error
 * משחרר נעילה במקרה של קריסת AI או Validation Error, כדי לא לתקוע לקוח לנצח.
 */
function releaseFailedRequest(session, requestId) {
    if (!requestId) return;
    const reqData = session.processedRequests.get(requestId);
    if (reqData && reqData.status === 'PROCESSING') {
        session.processedRequests.delete(requestId);
        console.log(`🔓 RELEASED Failed Request Lock: ${requestId}`);
    }
}

function clearSession(userId) {
    if (sessions[userId]) {
        // שומרים על העגלה ועל מזהי הבקשות (שלא ידפוק רענון), מאפסים רק את השיחה הנוכחית
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

/**
 * Phase 4: Secure Push to Cart
 * Enforces traceId uniqueness and prevents silent overwrites.
 */
function pushToSessionCart(session, item) {
    if (!item.traceId) {
        throw new Error("Cannot push item without traceId to cart.");
    }

    const exists = session.cart.some(cartItem => cartItem.traceId === item.traceId);
    if (exists) {
        console.warn(`🛡️ [SESSION] Duplicate traceId blocked: ${item.traceId}`);
        return false;
    }

    session.cart.push(item);
    console.log(`✅ [SESSION] Item added to cart: ${item.product} (${item.traceId.substring(0, 8)}...)`);
    return true;
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

module.exports = {
    getSession,
    clearSession,
    clearCart,
    pushToSessionCart,
    checkAndLockRequest,
    cacheCompletedRequest,
    releaseFailedRequest
};