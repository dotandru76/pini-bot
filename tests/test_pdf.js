const fs = require('fs');
const path = require('path');
const { generateQuotePDF } = require('../services/pdfService');

const mockCart = [
    {
        product: "booklet",
        displayName: "חוברות - כריכת סיכות",
        qty: 100,
        client_price: 563,
        pricing_snapshot: { client_price: 563 },
        validated_params: { qty: 100, paper_type: "נייר כרומו" },
        description: "A5, דפי פנים: נייר כרומו",
        traceId: "test-trace-1234",
        integrityHash: "test-hash-5678"
    }
];

const profile = { name: "בית יצחק טסט" };

async function runTest() {
    try {
        console.log("Generating PDF...");
        const pdfBuffer = await generateQuotePDF(mockCart, profile, false);
        const outPath = path.join(__dirname, '../public/output_test.pdf');
        fs.writeFileSync(outPath, pdfBuffer);
        console.log(`✅ Saved PDF to ${outPath}`);
    } catch (e) {
        console.error("❌ Failed to generate PDF", e);
    }
}

runTest();
