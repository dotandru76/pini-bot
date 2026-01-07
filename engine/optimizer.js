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