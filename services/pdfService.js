const PDFDocument = require('pdfkit');

/**
 * Creates a PDF quote natively using PDFKit.
 * This replaces the heavy Puppeteer implementation.
 * 
 * @param {Array} cart - Array of product objects
 * @param {Object} customerProfile - Customer details
 * @returns {Promise<Buffer>} - Resolves with the PDF file buffer
 */
async function generateQuotePDF(cart, customerProfile) {
    return new Promise((resolve, reject) => {
        try {
            console.log("🚀 Generating PDF Quote (PDFKit Mode)...");

            // Create a document
            // We use 'hebrew' settings where appropriate, though PDFKit has limitations with RTL text natively.
            // For simple quotes, basic left-to-right English or carefully placed Hebrew strings work, 
            // but for full right-to-left Hebrew shaping we need to reverse the text or use a font that supports Hebrew well.
            const doc = new PDFDocument({ margin: 50, size: 'A4' });

            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                console.log("✅ PDF Generated successfully!");
                resolve(pdfData);
            });
            doc.on('error', (err) => {
                reject(err);
            });

            // Register a unicode font (crucial for Hebrew!). 
            // In a real production app, ensure you have a .ttf file in a /fonts directory.
            // Fallback to standard Helvetica if no custom font is provided right now.
            // doc.font('fonts/Heebo-Regular.ttf');

            const customerName = customerProfile?.name || 'Dear Customer';
            const dateStr = new Date().toLocaleDateString('he-IL');

            // Header Section
            doc.fontSize(24).fillColor('#008069').text('Price Quote', { align: 'center' });
            doc.fontSize(14).fillColor('#666666').text('Dfus Beit Yitzhak', { align: 'center' });
            doc.moveDown(2);

            // Customer Info Box
            doc.rect(50, doc.y, 495, 60).fillAndStroke('#f8f9fa', '#eeeeee');
            doc.fillColor('#333333').fontSize(12);
            doc.text(`For: ${customerName}`, 60, doc.y - 45);
            doc.text(`Date: ${dateStr}`, 60, doc.y + 5);
            doc.moveDown(3);

            // Table Header
            const tableTop = doc.y;
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#008069');
            doc.text('#', 50, tableTop);
            doc.text('Item', 100, tableTop);
            doc.text('Qty', 350, tableTop);
            doc.text('Price (ILS)', 450, tableTop);

            doc.moveTo(50, tableTop + 20).lineTo(545, tableTop + 20).stroke('#dddddd');

            let y = tableTop + 30;
            doc.font('Helvetica').fontSize(10).fillColor('#333333');

            // Table Rows
            cart.forEach((item, index) => {
                const price = item.client_price || 0;

                // Print Row
                doc.text(`${index + 1}`, 50, y);
                doc.text(item.product_name || 'Item', 100, y);
                doc.text(`${item.qty}`, 350, y);
                doc.text(`ILS ${price}`, 450, y);

                y += 15;

                // Description (if any)
                if (item.description) {
                    doc.fillColor('#888888').fontSize(8);

                    // We need to strip or translate Hebrew for now if font isn't loaded, 
                    // but for code replacement sake we place the description.
                    doc.text(item.description, 100, y, { width: 230 });

                    // Advance Y based on description height
                    y += doc.heightOfString(item.description, { width: 230 }) + 5;
                    doc.fillColor('#333333').fontSize(10);
                } else {
                    y += 5;
                }

                // Draw line between items
                doc.moveTo(50, y).lineTo(545, y).stroke('#eeeeee');
                y += 15;
            });

            // Total
            y += 10;
            const total = cart.reduce((sum, i) => sum + (i.client_price || 0), 0);
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#008069');
            doc.text(`Total to Pay: ILS ${total}`, 50, y, { align: 'right' });

            // Footer & Visual Trust Section (Phase 5.3)
            doc.y = 700;
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#008069');
            doc.moveDown(1);

            doc.fontSize(12).font('Helvetica-Bold').fillColor('#008069').text('VISUAL TRUST SECTION', { align: 'center' });
            doc.fontSize(8).font('Helvetica').fillColor('#666666');
            doc.text('✓ Integrity Verified | ✓ Traceable Production Ticket | ✓ Locked Specification', { align: 'center' });

            doc.moveDown(1);
            doc.fontSize(7).fillColor('#999999');
            cart.forEach(item => {
                doc.text(`[${item.product}] traceId: ${item.traceId} | hash: ${item.integrityHash}`, { align: 'left' });
            });

            doc.y = 800;
            doc.fontSize(8).fillColor('#888888').text('Generated by Pini Bot for Dfus Beit Yitzhak - E. & O.E.', { align: 'center' });

            // Finalize PDF file
            doc.end();

        } catch (error) {
            console.error("❌ PDFKit Error:", error);
            reject(error);
        }
    });
}

/**
 * Helper to reverse Hebrew strings for PDFKit if a Unicode font without Bidi is used.
 */
function reverseHebrew(str) {
    if (!str) return '';
    return str.split('').reverse().join('');
}

module.exports = { generateQuotePDF };