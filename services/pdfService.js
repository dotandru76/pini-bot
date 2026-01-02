const puppeteer = require('puppeteer');

async function generateQuotePDF(cart, customerProfile) {
    let browser = null;
    try {
        console.log("🚀 Starting PDF generation (Low Memory Mode)...");
        
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // קריטי לשרתים עם זיכרון נמוך
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // חוסך המון זיכרון
                '--disable-extensions',
                '--mute-audio'
            ],
            executablePath: '/usr/bin/google-chrome-stable',
            timeout: 30000 // טיימאאוט של 30 שניות
        });

        const page = await browser.newPage();

        // --- אופטימיזציה לזיכרון: חסימת משאבים כבדים ---
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            // חוסמים תמונות כבדות, פונטים חיצוניים וסטיילים לא קריטיים בזמן הג'נרוט
            if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        const htmlContent = `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #008069; margin: 0;">הצעת מחיר</h1>
                <h3 style="margin: 5px 0;">דפוס בית יצחק</h3>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                <strong>לכבוד:</strong> ${customerProfile.name || 'לקוח יקר'}<br>
                <strong>תאריך:</strong> ${new Date().toLocaleDateString('he-IL')}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #008069; color: white;">
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">#</th>
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">פריט</th>
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">כמות</th>
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">מחיר</th>
                    </tr>
                </thead>
                <tbody>
                    ${cart.map((item, index) => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">${index + 1}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">
                                <strong>${item.product_name}</strong>
                                <br><span style="font-size: 0.85em; color: #666;">${item.description || ''}</span>
                            </td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${item.qty}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">₪${item.client_price}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="text-align: left; margin-top: 20px;">
                <h2 style="color: #008069;">סה"כ לתשלום: ₪${cart.reduce((sum, i) => sum + i.client_price, 0)}</h2>
            </div>
            
            <div style="margin-top: 50px; font-size: 0.8em; text-align: center; color: #888; border-top: 1px solid #eee; padding-top: 10px;">
                הופק באמצעות פיני - הבוט החכם | ט.ל.ח
            </div>
        </div>`;

        // שימוש ב-networkidle0 מוודא שאין עוד תעבורת רשת לפני ההדפסה
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        console.log("📸 Snapping PDF...");
        const pdfBuffer = await page.pdf({ 
            format: 'A4', 
            printBackground: true,
            margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
        });

        console.log("✅ PDF Generated successfully!");
        return pdfBuffer;

    } catch (error) {
        console.error("❌ PUPPETEER CRASH:", error);
        throw error;
    } finally {
        if (browser) {
            console.log("🔒 Closing browser...");
            await browser.close();
        }
    }
}

module.exports = { generateQuotePDF };