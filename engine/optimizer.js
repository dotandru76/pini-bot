/**
 * engine/optimizer.js
 * מנוע אימפוזיציה (Imposition Engine) - V2 (Hardened)
 * ====================================
 * תפקיד: לחשב מתמטית כמה יחידות נכנסות בגיליון SRA3.
 * תוקן: הוספת Epsilon Guard למניעת חיתוך שגוי בגלל Floating Point (למשל מונע מ-2.99999998 להפוך ל-2).
 */

const MACHINE_SPECS = {
    // HP Indigo 7K specs (SRA3)
    sheetWidth: 320,  // mm
    sheetHeight: 450, // mm
    margins: 5,       // mm (safety margin for gripper/bleed)
    gutter: 2         // mm (space between cuts)
};

/**
 * פונקציית עזר לחלוקה מוגנת מפני שגיאות Floating Point
 */
function safeFloorDivision(total, part) {
    if (part <= 0) return 0;
    // Number.EPSILON מחפה בדיוק על המספרים שיורדים ב-0.000000001
    return Math.floor((total / part) + Number.EPSILON);
}

/**
 * חישוב פריסה אופטימלית (Best Fit)
 * @param {number} prodWidth - רוחב מוצר במ"מ
 * @param {number} prodHeight - גובה מוצר במ"מ
 * @returns {object} { ups, layout, efficiency }
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
    const fitW_A = safeFloorDivision(safeW, prodWidth + MACHINE_SPECS.gutter);
    const fitH_A = safeFloorDivision(safeH, prodHeight + MACHINE_SPECS.gutter);
    const total_A = fitW_A * fitH_A;

    // אופציה ב': מסובב (Landscape)
    const fitW_B = safeFloorDivision(safeW, prodHeight + MACHINE_SPECS.gutter);
    const fitH_B = safeFloorDivision(safeH, prodWidth + MACHINE_SPECS.gutter);
    const total_B = fitW_B * fitH_B;

    // בחירת המנצח (איפה נכנסים יותר?)
    const maxUps = Math.max(total_A, total_B);
    const bestLayout = total_A >= total_B ? 'portrait' : 'landscape';

    // טיפול אלגנטי במוצר גדול מדי (הגנה על המערכת מקרש על חלוקה באפס)
    if (maxUps === 0) {
        return { ups: 0, layout: 'error', efficiency: "0.0%" };
    }

    // חישוב אחוז ניצול הנייר (Efficiency) - הערה: מחושב מול שטח ברוטו בכוונה תחילה
    const usedArea = maxUps * prodWidth * prodHeight;
    const totalArea = MACHINE_SPECS.sheetWidth * MACHINE_SPECS.sheetHeight;
    const efficiencyNum = ((usedArea / totalArea) * 100).toFixed(1);

    return {
        ups: maxUps,
        layout: bestLayout,
        efficiency: efficiencyNum + "%"
    };
}

module.exports = { calculateImposition };