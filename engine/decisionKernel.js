/** engine/decisionKernel.js - The Governance Kernel */

/**
 * Analyzes image technical data against user requirements.
 * Rules:
 * 1. DPI < 150 -> REJECT_LOW_RES
 * 2. Dimension mismatch > 10% -> DIMENSION_MISMATCH
 * 3. Else -> READY_FOR_PRINT
 * 
 * @param {Object} visionData - Technical data from LLM (dpi, width_mm, height_mm)
 * @param {Object} session - Current session with draft order details
 */
function analyzePrintReadyStatus(visionData, session) {
    if (!visionData) return { status: 'UNKNOWN' };

    const dpi = parseInt(visionData.dpi || 0);
    const width = parseFloat(visionData.width_mm || 0);
    const height = parseFloat(visionData.height_mm || 0);

    // Rule 1: DPI Kill Switch
    if (dpi < 150) {
        return {
            status: 'REJECT_LOW_RES',
            details: `DPI detected: ${dpi} (Required: 150+)`,
            raw: { dpi, width, height }
        };
    }

    // Rule 2: Dimension Mismatch (if target product has defined dimensions)
    // For now, checking against draftAttributes if they exist
    const draft = session.draftAttributes || {};
    if (draft.width && draft.height) {
        const targetW = parseFloat(draft.width);
        const targetH = parseFloat(draft.height);

        const diffW = Math.abs(width - targetW) / targetW;
        const diffH = Math.abs(height - targetH) / targetH;

        if (diffW > 0.1 || diffH > 0.1) {
            return {
                status: 'DIMENSION_MISMATCH',
                details: `Detected: ${width}x${height}mm vs Required: ${targetW}x${targetH}mm`,
                raw: { dpi, width, height }
            };
        }
    }

    return {
        status: 'READY_FOR_PRINT',
        details: 'File meets technical requirements.',
        raw: { dpi, width, height }
    };
}

module.exports = { analyzePrintReadyStatus };
