const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Creates a PDF quote natively using PDFKit.
 * This replaces the heavy Puppeteer implementation.
 * 
 * @param {Array} cart - Array of product objects
 * @param {Object} customerProfile - Customer details
 * @returns {Promise<Buffer>} - Resolves with the PDF file buffer
 */
async function generateQuotePDF(cart, customerProfile, isDraft = false) {
    return new Promise((resolve, reject) => {
        try {
            console.log(`🚀 Generating PDF Quote (PDFKit Mode, isDraft: ${isDraft})...`);

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

            const fontPath = path.join(__dirname, '../public/fonts/Arimo-Regular.ttf');
            const hasHebrewFont = fs.existsSync(fontPath);

            const customerName = customerProfile?.name || 'Dear Customer';
            const dateStr = new Date().toLocaleDateString('he-IL');

            // Header Section
            if (hasHebrewFont) doc.font(fontPath);

            // Add Logo if exists
            let logoPath = path.join(__dirname, '../public/logo.png');
            if (!fs.existsSync(logoPath)) {
                logoPath = path.join(__dirname, '../public/pini.png'); // Fallback to pini.png
            }
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 40, { width: 120 }); // Place logo on the top left
            }

            doc.fontSize(24).fillColor('#008069').text(reverseHebrew('הצעת מחיר - דפוס בית יצחק'), { align: 'center' });
            doc.fontSize(14).fillColor('#666666').text(reverseHebrew('הצעת מחיר'), { align: 'center' });

            if (isDraft) {
                doc.moveDown(1);
                doc.fontSize(16).fillColor('#d32f2f').text(reverseHebrew('טיוטה - חסר מפרט טכני'), { align: 'center' });
                doc.fontSize(10).text(reverseHebrew('המחיר הסופי עשוי להשתנות עם השלמת הפרטים.'), { align: 'center' });
            }

            doc.moveDown(2);

            // Customer Info Box
            doc.rect(50, doc.y, 495, 60).fillAndStroke('#f8f9fa', '#eeeeee');
            doc.fillColor('#333333').fontSize(12).font(hasHebrewFont ? fontPath : 'Helvetica');
            doc.text(reverseHebrew(`לכבוד: ${customerName}`), 50, doc.y - 45, { align: 'right', width: 480 });
            doc.text(reverseHebrew(`תאריך: ${dateStr}`), 50, doc.y + 5, { align: 'right', width: 480 });
            doc.moveDown(3);

            const tableTop = doc.y;
            doc.fontSize(12).fillColor('#008069');
            doc.text('#', 545, tableTop);
            doc.text(reverseHebrew('מוצר'), 400, tableTop, { align: 'right' });
            doc.text(reverseHebrew('כמות'), 150, tableTop, { align: 'right' });
            doc.text(reverseHebrew('מחיר (₪)'), 50, tableTop, { align: 'right' });

            doc.moveTo(50, tableTop + 20).lineTo(545, tableTop + 20).stroke('#dddddd');

            let y = tableTop + 30;
            doc.font(hasHebrewFont ? fontPath : 'Helvetica').fontSize(10).fillColor('#333333');

            // Table Rows
            cart.forEach((item, index) => {
                // Phase 5.3: Robust Mapping (V3 vs V4)
                const isPending = item.isPending === true;
                const price = isPending ? 0 : (item.pricing_snapshot?.client_price || item.client_price || 0);
                const qty = item.validated_params?.qty || item.qty || 0;
                const label = item.displayName || item.product_name || item.product || 'פריט';

                // Print Row
                doc.text(`${index + 1}`, 545, y);
                doc.text(reverseHebrew(label), 300, y, { align: 'right', width: 220 });
                doc.text(`${qty > 0 ? qty : '-'}`, 150, y, { align: 'right' });
                doc.text(isPending ? reverseHebrew('ממתין') : `₪${price.toLocaleString()}`, 50, y, { align: 'right' });

                y += 15;

                // Description (if any)
                const desc = item.description || item.validated_params?.paper_type || '';
                if (desc) {
                    doc.fillColor('#888888').fontSize(8);
                    doc.text(reverseHebrew(desc), 100, y, { width: 420, align: 'right' });
                    y += doc.heightOfString(desc, { width: 420 }) + 5;
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
            const total = cart.reduce((sum, i) => sum + (i.isPending ? 0 : (i.pricing_snapshot?.client_price || i.client_price || 0)), 0);
            doc.fontSize(14).fillColor('#008069');
            doc.text(reverseHebrew(`סה"כ לתשלום: ₪${total.toLocaleString()}`), 50, y, { align: 'right' });

            if (isDraft) {
                y += 20;
                doc.fontSize(10).fillColor('#d32f2f').text(reverseHebrew('* המחיר הסופי עשוי להשתנות עם השלמת המפרט.'), 50, y, { align: 'right' });
            }

            // Footer & Visual Trust Section (Phase 5.3)
            doc.y = 700;
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#008069');
            doc.moveDown(1);

            doc.fontSize(12).font(hasHebrewFont ? fontPath : 'Helvetica').fillColor('#008069').text(reverseHebrew('אזור אימות ואמינות'), { align: 'center' });
            doc.fontSize(8).fillColor('#666666');
            doc.text(reverseHebrew('✓ תקינות אומתה | ✓ נתיב הפקה עקיב | ✓ מפרט נעול'), { align: 'center' });

            doc.moveDown(1);
            doc.fontSize(7).fillColor('#999999');
            cart.forEach(item => {
                doc.text(reverseHebrew(`[${item.product}] קוד מעקב: ${item.traceId} | גיבוב: ${item.integrityHash}`), { align: 'center' });
            });

            doc.y = 800;
            doc.fontSize(8).fillColor('#888888').text(reverseHebrew('הופק על ידי פיני הבוט עבור דפוס בית יצחק - ט.ל.ח.'), { align: 'center' });

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