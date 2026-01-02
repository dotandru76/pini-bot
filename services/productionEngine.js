const fs = require('fs');
const path = require('path');

// מילון מונחים לתרגום המפרט הטכני לשפה שיווקית בכרטיס הויזואלי
const HEBREW_DICT = {
    'offset_80': 'נייר נטול עץ 80 גרם (סטנדרטי לספרים)',
    'offset_90': 'נייר נטול עץ 90 גרם (איכותי)',
    'offset_120': 'נייר נטול עץ 120 גרם (יוקרתי)',
    'offset_300': 'נייר נטול עץ 300 גרם (כרטיס טבעי)',
    'chromo_135': 'כרומו 135 גרם (דק ומבריק)',
    'chromo_170': 'כרומו 170 גרם (יציב)',
    'chromo_300': 'כרומו 300 גרם (קשיח לכרטיסים)',
    'matte_300': 'כרומו מט 300 גרם',
    'pearl_300': 'נייר פנינה מנצנץ (יוקרתי)',
    'texture_300': 'נייר טקסטורה פשתן',
    'sticker_paper': 'מדבקת נייר',
    'vinyl_sticker': 'מדבקת ויניל (פלסטיק עמיד)',
    'rollup_film': 'פילם רולאפ (לא מתקפל)',
    'canvas': 'בד קנבס איכותי',
    'lami_matte': 'למינציה מט (מגע משי)',
    'lami_gloss': 'למינציה מבריקה',
    'fold_simple': 'קיפול אמצע',
    'fold_tri': 'קיפול פרוספקט (ל-3)',
    'perfect_bind': 'כריכה בחום (ספר)',
    'spiral_bind': 'כריכת ספירלה',
    'staple_bind': 'כריכת סיכות',
    'wood_frame': 'מתיחה על מסגרת עץ',
    'round_corners': 'פינות עגולות',
    'pocket_glue': 'כיס פנימי מודבק'
};

let dbCache = null;
const loadDB = () => {
    try {
        const mat = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/materials.json'), 'utf8'));
        // נטען גם את המוצרים רק בשביל שמות ברירת המחדל, אבל החישוב הוא אוניברסלי
        const prod = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/products.json'), 'utf8'));
        return { mat, prod };
    } catch (e) { return { mat: {}, prod: {} }; }
};

class ProductionEngine {
    constructor() { this.db = loadDB(); }

    translate(key) { return HEBREW_DICT[key] || key; }

    // --- הלב של המערכת: מחשבון אוניברסלי לכל מוצר דפוס ---
    calculateCustom(params) {
        const { mat } = loadDB();
        const machineDigital = mat.machine_specs.digital;
        const machineWide = mat.machine_specs.wide;

        let report = {
            id: Date.now(), // מזהה ייחודי לפריט בעגלה
            product_name: params.product_name || "עבודת דפוס",
            qty: parseInt(params.qty) || 1,
            client_price: 0,
            production_cost: 0,
            profit_margin: 0,
            manager_log: [],
            display_specs: [],
            line_items: []
        };

        let rawCost = 0;
        const pages = parseInt(params.pages) || 1; 
        const width = parseFloat(params.width_cm) || 0;
        const height = parseFloat(params.height_cm) || 0;
        const printSides = parseInt(params.print_sides) || 1;

        // בניית המפרט הויזואלי (הריבוע היפה)
        if (width && height) report.display_specs.push({ label: 'גודל', value: `${width}x${height} ס"מ` });
        
        // זיהוי: האם זה פורמט רחב (מטרים) או דיגיטלי (גיליונות)?
        const isWideFormat = params.paper_type && mat.wide_media[params.paper_type];

        if (isWideFormat) {
            // --- חישוב פורמט רחב ---
            const areaMeters = (width / 100) * (height / 100) * report.qty;
            const mediaItem = mat.wide_media[params.paper_type];
            
            const mediaCost = areaMeters * (mediaItem.cost_sqm || 20);
            const inkCost = areaMeters * machineWide.ink_cost_sqm;
            
            rawCost = mediaCost + inkCost + machineWide.setup_cost;
            
            report.manager_log.push(`🔹 פורמט רחב: ${mediaItem.name}`);
            report.manager_log.push(`🔹 שטח כולל: ${areaMeters.toFixed(2)} מ"ר`);
            report.display_specs.push({ label: 'חומר', value: this.translate(params.paper_type) });

        } else {
            // --- חישוב דפוס דיגיטלי ---
            // 1. חישוב כמה נכנסים בגיליון (אימפוזיציה)
            const sheetW = 32, sheetH = 45; // SRA3
            // חישוב גס של כמה נכנסים (Ups)
            let ups = 1;
            if (width > 0 && height > 0) {
                const fitW = Math.floor(sheetW / width) * Math.floor(sheetH / height);
                const fitH = Math.floor(sheetW / height) * Math.floor(sheetH / width);
                ups = Math.max(fitW, fitH, 1);
            }
            
            // חישוב כמות גיליונות להדפסה (כולל עמודים בספר)
            // אם זה ספר (מעל 4 עמודים), החישוב הוא לפי כמות דפים
            const sheetsPerUnit = Math.ceil(pages / (ups * (printSides === 2 ? 2 : 1)));
            const totalSheets = Math.ceil(report.qty * sheetsPerUnit) + 25; // +25 פחת קבוע

            const paperKey = params.paper_type || 'offset_80';
            const paperItem = mat.papers[paperKey] || mat.papers.offset_80;
            
            const paperCost = totalSheets * paperItem.cost_sheet;
            const clickCost = totalSheets * (printSides === 2 ? 2 : 1) * machineDigital.click_color;

            rawCost = paperCost + clickCost + machineDigital.setup_cost;

            report.manager_log.push(`🔹 דיגיטלי: ${paperItem.name}`);
            report.manager_log.push(`🔹 עמודים: ${pages}, אימפוזיציה: ${ups}`);
            report.manager_log.push(`🔹 סה"כ גיליונות (כולל פחת): ${totalSheets}`);
            
            report.display_specs.push({ label: 'נייר', value: this.translate(paperKey) });
            if (pages > 1) report.display_specs.push({ label: 'עמודים', value: pages });
        }

        // --- חישוב גימורים וכריכות ---
        const finishings = params.finishing || [];
        finishings.forEach(finKey => {
            const finItem = mat.finishing[finKey];
            if (finItem) {
                let cost = 0;
                // לוגיקה לחישוב עלות גימור
                if (finItem.run) {
                    // מחיר פר יחידה (כמו כריכה/הדבקה)
                    cost = (finItem.run * report.qty) + (finItem.setup || 0);
                } else if (finItem.cost_side) {
                    // מחיר פר שטח/צד (כמו למינציה)
                    cost = (finItem.cost_side * report.qty * (width*height/1000)); // הערכה גסה לשטח
                    if (cost < 10) cost = 10;
                } else if (finItem.cost_meter) {
                    // מחיר למטר (מסגרת)
                    cost = ((width+height)/50) * report.qty * finItem.cost_meter;
                }

                rawCost += cost;
                report.manager_log.push(`🔸 תוספת: ${finItem.name}`);
                report.display_specs.push({ label: 'גימור', value: this.translate(finKey) });
            }
        });

        // --- תמחור סופי ---
        report.production_cost = parseFloat(rawCost.toFixed(2));
        
        // מרווח רווח דינמי (כמות גדולה = רווח נמוך יותר ליחידה)
        let margin = 3.0;
        if (report.qty > 500) margin = 2.5;
        if (report.qty > 2000) margin = 1.8;
        if (rawCost > 2000) margin = 1.5; // בעסקאות גדולות יורדים במכפיל

        report.client_price = Math.ceil(report.production_cost * margin);
        // עיגול יפה (למשל 199 במקום 197)
        if (report.client_price > 100) {
            report.client_price = Math.ceil(report.client_price / 10) * 10 - 1; 
        }
        if (report.client_price < 50) report.client_price = 50; // מינימום הזמנה

        report.profit = (report.client_price - report.production_cost).toFixed(2);
        report.profit_margin = Math.round((report.profit / report.client_price) * 100);

        return report;
    }

    // חשיפת הכלים ל-LLM
    getTools() {
        const { mat } = loadDB();
        // יצירת רשימות דינמיות לפרומפט
        const paperList = Object.keys(mat.papers).join(', ');
        const wideList = Object.keys(mat.wide_media).join(', ');
        const finishList = Object.keys(mat.finishing).join(', ');

        return [{
            function_declarations: [{
                name: "calculate_custom_job",
                description: "Calculate price for ANY print product. Analyze the user request and map it to technical specs.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        product_name: { type: "STRING", description: "Display name (e.g. 'Book', 'Flyer')" },
                        qty: { type: "NUMBER", description: "Quantity" },
                        width_cm: { type: "NUMBER", description: "Width (cm)" },
                        height_cm: { type: "NUMBER", description: "Height (cm)" },
                        pages: { type: "NUMBER", description: "Total pages (1 for single sheet, >1 for books)" },
                        print_sides: { type: "NUMBER", description: "1 or 2" },
                        paper_type: { 
                            type: "STRING", 
                            description: `Material code from: ${paperList}, ${wideList}` 
                        },
                        finishing: {
                            type: "ARRAY",
                            description: `List of finishing codes from: ${finishList}`,
                            items: { type: "STRING" }
                        }
                    },
                    required: ["product_name", "qty"]
                }
            },
            {
                name: "present_options",
                description: "Show clickable chips/buttons.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        text: { type: "STRING" },
                        options: { type: "ARRAY", items: { type: "STRING" } }
                    },
                    required: ["options"]
                }
            },
            {
                name: "update_customer_profile",
                description: "Save customer name/phone.",
                parameters: { type: "OBJECT", properties: { name: { type: "STRING" }, phone: { type: "STRING" } } }
            }]
        }];
    }
}

module.exports = new ProductionEngine();