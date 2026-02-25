/**
 * Pini Knowledge Base & Product Catalog
 * ======================================
 * כל מה שפיני צריך לדעת על דפוס + קטלוג מוצרים מלא
 */

// ============================================================
// קטלוג מוצרים מלא
// ============================================================

const PRODUCT_CATALOG = {

    // === פליירים ===
    flyer: {
        name: 'פליירים / עלונים',
        emoji: '📢',
        description: 'הכלי השיווקי הכי אפקטיבי - מגיע לכל מקום',

        sizes: [
            { name: 'A5', size: '21×14.8 ס"מ', desc: 'חצי A4 - הכי נפוץ', popular: true },
            { name: 'A4', size: '29.7×21 ס"מ', desc: 'גודל מכתב', popular: true },
            { name: 'A6', size: '14.8×10.5 ס"מ', desc: 'קטן - לחלוקה המונית' },
            { name: 'DL', size: '21×10 ס"מ', desc: 'צר וארוך - נכנס למעטפה' },
            { name: 'A3', size: '42×29.7 ס"מ', desc: 'גדול - פוסטר קטן' },
            { name: 'מותאם אישית', size: 'לפי בקשה', desc: 'כל גודל שתרצה' }
        ],

        papers: [
            { name: 'כרומו 135 גרם', desc: 'קל - לחלוקה המונית', price_factor: 0.8, popular: true },
            { name: 'כרומו 170 גרם', desc: 'סטנדרט - איזון מושלם', price_factor: 1.0, popular: true },
            { name: 'כרומו 250 גרם', desc: 'עבה - יותר איכותי', price_factor: 1.3 },
            { name: 'מט 170 גרם', desc: 'ללא ברק - אלגנטי', price_factor: 1.1 },
            { name: 'ממוחזר 150 גרם', desc: 'אקולוגי', price_factor: 1.15 }
        ],

        finishings: [
            { name: 'ללא גימור', desc: 'רגיל - הכי נפוץ', price_add: 0, popular: true },
            { name: 'למינציה מט', desc: 'מגן ויפה', price_add: 50 },
            { name: 'למינציה מבריקה', desc: 'צבעים חזקים יותר', price_add: 50 },
            { name: 'קיפול לשניים', desc: 'מתקפל באמצע', price_add: 30 },
            { name: 'קיפול לשלושה', desc: 'ברושור Z או C', price_add: 40 },
            { name: 'ניקוב', desc: 'עם חור לתלייה', price_add: 20 }
        ],

        printing: [
            { name: 'צד אחד', price_factor: 0.6 },
            { name: 'דו-צדדי', price_factor: 1.0, popular: true }
        ],

        quantities: [250, 500, 1000, 2500, 5000, 10000],
        min_qty: 250,
        production_days: 4,
        express_available: true,

        tips: [
            'ב-1000+ המחיר ליחידה נהיה זניח',
            'כרומו 135 מושלם לחלוקה ברחוב',
            'כרומו 170 לפליירים שנשמרים (תפריטים, מחירונים)'
        ]
    },

    // === הזמנות ===
    invitation: {
        name: 'הזמנות לאירועים',
        emoji: '🎉',
        description: 'הזמנה יפה = ציפייה לאירוע מושלם',

        types: [
            { name: 'חתונה', emoji: '💒', popular: true },
            { name: 'בר/בת מצווה', emoji: '✡️', popular: true },
            { name: 'ברית/הכנסת שם', emoji: '👶' },
            { name: 'יום הולדת', emoji: '🎂' },
            { name: 'אירוע עסקי', emoji: '🏢' }
        ],

        sizes: [
            { name: 'סטנדרט', size: '14×14 ס"מ', popular: true },
            { name: 'מרובע גדול', size: '15×15 ס"מ' },
            { name: 'מלבן', size: '21×10 ס"מ', desc: 'DL' },
            { name: 'A5', size: '21×14.8 ס"מ' },
            { name: 'מתקפל', size: '14×28 ס"מ (מתקפל ל-14×14)' }
        ],

        papers: [
            { name: 'פנינה 300 גרם', desc: 'נצנוץ עדין - הכי פופולרי לחתונות', price_factor: 1.2, popular: true },
            { name: 'קרטון לבן 350 גרם', desc: 'קלאסי ואלגנטי', price_factor: 1.0 },
            { name: 'קרטון שמנת 300 גרם', desc: 'חם ורומנטי', price_factor: 1.1 },
            { name: 'מרקם פשתן 300 גרם', desc: 'טקסטורה יוקרתית', price_factor: 1.4 },
            { name: 'כותנה 300 גרם', desc: 'רך ומיוחד', price_factor: 1.5 },
            { name: 'קראפט 300 גרם', desc: 'חום טבעי - בוהו שיק', price_factor: 1.2 }
        ],

        finishings: [
            { name: 'ללא גימור', price_add: 0 },
            { name: 'פויל זהב', desc: 'הטבעה זהב - יוקרה', price_add: 100, popular: true },
            { name: 'פויל כסף', desc: 'הטבעה כסף - מודרני', price_add: 100 },
            { name: 'פויל רוז גולד', desc: 'הטבעה ורוד זהב - רומנטי', price_add: 120 },
            { name: 'הבלטה', desc: 'תלת מימד', price_add: 80 },
            { name: 'חיתוך לייזר', desc: 'תחרה/דוגמה חתוכה', price_add: 200, premium: true },
            { name: 'שרוך/סרט', desc: 'קשירה דקורטיבית', price_add: 50 }
        ],

        extras: [
            { name: 'מעטפה רגילה', price_add: 20 },
            { name: 'מעטפה פנינה', price_add: 35 },
            { name: 'מדבקת סגירה', price_add: 15 },
            { name: 'כרטיס RSVP', price_add: 40 },
            { name: 'מפת הגעה', price_add: 30 }
        ],

        quantities: [50, 100, 150, 200, 250, 300, 400, 500],
        min_qty: 50,
        production_days: 7,
        express_available: true,

        tips: [
            'תמיד הזמינו 10% יותר - לטעויות בכתובות',
            'פויל זהב על נייר פנינה = שילוב מנצח',
            'מתקפל נותן יותר מקום לטקסט ותמונות'
        ]
    },

    // === רולאפים / באנרים ===
    rollup: {
        name: 'רולאפים ובאנרים',
        emoji: '🎪',
        description: 'נוכחות שאי אפשר להתעלם ממנה',

        types: [
            {
                name: 'רולאפ סטנדרטי',
                sizes: ['85×200', '100×200', '120×200'],
                desc: 'עם מעמד מתקפל - קל לנשיאה',
                popular: true
            },
            {
                name: 'רולאפ פרימיום',
                sizes: ['85×200', '100×200'],
                desc: 'מעמד איכותי יותר - ליותר שימושים'
            },
            {
                name: 'באנר X',
                sizes: ['60×160', '80×180'],
                desc: 'מעמד X - יציב ופשוט'
            },
            {
                name: 'באנר תלייה',
                sizes: ['מותאם אישית'],
                desc: 'עם לולאות - לתלייה על קיר'
            },
            {
                name: 'שלט קאפה',
                sizes: ['מותאם אישית'],
                desc: 'לוח קשיח - לתצוגה קבועה'
            }
        ],

        materials: [
            { name: 'ויניל 440 גרם', desc: 'סטנדרט - איכותי', price_factor: 1.0, popular: true },
            { name: 'ויניל פרימיום', desc: 'עמיד יותר', price_factor: 1.3 },
            { name: 'בד פוליאסטר', desc: 'ללא השתקפות - לצילומים', price_factor: 1.5 },
            { name: 'מש (רשת)', desc: 'לשימוש חוץ - עמיד ברוח', price_factor: 1.2 }
        ],

        quantities: [1, 2, 3, 5, 10],
        min_qty: 1,
        production_days: 3,
        express_available: true,

        tips: [
            '85×200 הגודל הנפוץ ביותר',
            'לאירועים חוזרים - קנו 2 (גיבוי)',
            'באנר בד מתאים לצילום ווידאו (אין השתקפות)'
        ]
    },

    // === מדבקות ===
    sticker: {
        name: 'מדבקות',
        emoji: '🏷️',
        description: 'ממיתוג ועד אריזה - מדבקה לכל צורך',

        shapes: [
            { name: 'עגול', sizes: ['3 ס"מ', '4 ס"מ', '5 ס"מ', '6 ס"מ', '8 ס"מ'], popular: true },
            { name: 'מרובע', sizes: ['3×3', '4×4', '5×5', '6×6', '8×8'] },
            { name: 'מלבן', sizes: ['3×2', '5×3', '7×5', '10×7'], popular: true },
            { name: 'אובלי', sizes: ['5×3', '7×4'] },
            { name: 'חיתוך צורני', sizes: ['לפי העיצוב'], desc: 'חותכים לפי קו המתאר', premium: true }
        ],

        materials: [
            { name: 'נייר לבן', desc: 'סטנדרט - כתיבה עליו אפשרית', price_factor: 0.8 },
            { name: 'נייר מבריק', desc: 'צבעים עזים', price_factor: 1.0, popular: true },
            { name: 'ויניל לבן', desc: 'עמיד במים - לשימוש חוץ', price_factor: 1.4, popular: true },
            { name: 'ויניל שקוף', desc: 'רק העיצוב נראה', price_factor: 1.6 },
            { name: 'כסף מטאלי', desc: 'מראה מתכתי', price_factor: 1.8 },
            { name: 'זהב מטאלי', desc: 'יוקרה', price_factor: 1.8 },
            { name: 'קראפט', desc: 'חום טבעי - אקולוגי', price_factor: 1.2 },
            { name: 'הולוגרפי', desc: 'קשת צבעים משתנה', price_factor: 2.5, premium: true }
        ],

        finishings: [
            { name: 'רגיל', price_add: 0 },
            { name: 'למינציה מט', desc: 'מגן + מט', price_add: 30 },
            { name: 'למינציה מבריקה', desc: 'מגן + ברק', price_add: 30 }
        ],

        adhesives: [
            { name: 'דבק קבוע', desc: 'סטנדרט', price_factor: 1.0 },
            { name: 'דבק חזק', desc: 'למשטחים קשים', price_factor: 1.1 },
            { name: 'דבק נשלף', desc: 'להסרה ללא שאריות', price_factor: 1.2 },
            { name: 'דבק לקירור', desc: 'עמיד בקור - למקררים', price_factor: 1.3 }
        ],

        quantities: [50, 100, 250, 500, 1000, 2500, 5000],
        min_qty: 50,
        production_days: 4,
        express_available: true,

        tips: [
            'ויניל חובה למוצרים שנרטבים',
            'חיתוך צורני עושה רושם אבל עולה יותר',
            'למדבקות קטנות (עד 5 ס"מ) - קנו יותר, עולה כמעט אותו דבר'
        ]
    },

    // === חוברות ===
    booklet: {
        name: 'חוברות וקטלוגים',
        emoji: '📖',
        description: 'לתוכן שדורש יותר מדף אחד',

        types: [
            { name: 'חוברת מהודקת', desc: '2 סיכות באמצע - עד 64 עמודים', popular: true },
            { name: 'חוברת ספירלה', desc: 'כריכת פלסטיק/מתכת - נפתח שטוח' },
            { name: 'קטלוג דבק חם', desc: 'כריכה מודבקת - מקצועי' },
            { name: 'מחברת', desc: 'עם שורות/ריבועים - לכתיבה' }
        ],

        sizes: [
            { name: 'A5', size: '21×14.8 ס"מ', desc: 'הנפוץ ביותר', popular: true },
            { name: 'A4', size: '29.7×21 ס"מ', desc: 'גדול - לקטלוגים' },
            { name: 'מרובע', size: '21×21 ס"מ', desc: 'מודרני ויפה' },
            { name: 'DL', size: '21×10 ס"מ', desc: 'צר - לתפריטים' }
        ],

        pages: [8, 12, 16, 20, 24, 32, 48, 64],

        papers: [
            { name: 'כרומו 150 גרם (פנים)', desc: 'מבריק', price_factor: 1.0, popular: true },
            { name: 'מט 150 גרם (פנים)', desc: 'קריאה נוחה', price_factor: 1.1 },
            { name: 'כרומו 250 גרם (כריכה)', desc: 'עטיפה חזקה', price_factor: 1.2 },
            { name: 'כרומו 300 גרם (כריכה)', desc: 'עטיפה יוקרתית', price_factor: 1.4 }
        ],

        finishings: [
            { name: 'ללא גימור', price_add: 0 },
            { name: 'למינציה מט לכריכה', price_add: 40, popular: true },
            { name: 'למינציה מבריקה לכריכה', price_add: 40 },
            { name: 'ספוט UV על הכריכה', price_add: 80 }
        ],

        quantities: [25, 50, 100, 250, 500, 1000],
        min_qty: 25,
        production_days: 7,
        express_available: true,

        tips: [
            'מספר עמודים חייב להתחלק ב-4',
            'כריכה עם למינציה מחזיקה יותר זמן',
            '16-24 עמודים = הגודל הנפוץ ביותר'
        ]
    },

    // === פוסטרים ===
    poster: {
        name: 'פוסטרים והדפסות גדולות',
        emoji: '🖼️',
        description: 'להדפסות שרואים מרחוק',

        sizes: [
            { name: 'A3', size: '42×29.7 ס"מ' },
            { name: 'A2', size: '59.4×42 ס"מ', popular: true },
            { name: 'A1', size: '84.1×59.4 ס"מ', popular: true },
            { name: 'A0', size: '118.9×84.1 ס"מ' },
            { name: '50×70', size: '50×70 ס"מ', desc: 'סטנדרט פוסטר' },
            { name: '70×100', size: '70×100 ס"מ' },
            { name: 'מותאם אישית', size: 'כל גודל' }
        ],

        materials: [
            { name: 'נייר כרומו 200 גרם', desc: 'מבריק - צבעים עזים', price_factor: 1.0, popular: true },
            { name: 'נייר מט 200 גרם', desc: 'ללא השתקפות', price_factor: 1.1 },
            { name: 'נייר פוטו 260 גרם', desc: 'איכות צילום', price_factor: 1.5 },
            { name: 'קנבס', desc: 'לתמונות אמנות', price_factor: 2.5 },
            { name: 'פורקס 3 מ"מ', desc: 'לוח קשיח קל', price_factor: 2.0 },
            { name: 'קאפה 5 מ"מ', desc: 'לוח קשיח', price_factor: 2.2 }
        ],

        quantities: [1, 5, 10, 25, 50, 100],
        min_qty: 1,
        production_days: 2,
        express_available: true,

        tips: [
            'לפוסטר חוץ - בקשו למינציה או הדפסה על ויניל',
            'לתמונות אמנות - קנבס נותן מראה גלריה',
            'פורקס/קאפה לא צריך מסגרת'
        ]
    },

    // === ניירת משרדית ===
    office: {
        name: 'ניירת משרדית',
        emoji: '📋',
        description: 'כל מה שצריך למשרד מקצועי',

        items: [
            {
                name: 'נייר מכתבים',
                sizes: ['A4'],
                papers: ['נטול עץ 100 גרם', 'כותנה 120 גרם'],
                quantities: [100, 250, 500, 1000]
            },
            {
                name: 'מעטפות',
                sizes: ['DL (11×22)', 'C5 (16×23)', 'C4 (23×32)'],
                options: ['עם חלון', 'ללא חלון', 'עם הדפסה', 'לבן בלבד'],
                quantities: [100, 250, 500, 1000]
            },
            {
                name: 'כרטיסי תודה / ברכה',
                sizes: ['10×15', '12×17', 'A6'],
                papers: ['קרטון לבן 300 גרם', 'פנינה 300 גרם'],
                quantities: [50, 100, 250]
            },
            {
                name: 'פנקסי חשבונית / קבלה',
                sizes: ['A5', 'A4'],
                options: ['מקור+העתק', 'מקור+2 העתקים'],
                quantities: [5, 10, 20, 50]
            },
            {
                name: 'תיקיות / פולדרים',
                sizes: ['A4'],
                options: ['כיס אחד', 'שני כיסים', 'עם שם בהבלטה'],
                quantities: [100, 250, 500]
            }
        ],

        tips: [
            'ניירת אחידה משדרת מקצועיות',
            'הזמינו הכל ביחד - חוסך זמן ומשלוח',
            'נייר מכתבים + מעטפות תואמות = חובה'
        ]
    }
};

// ============================================================
// בסיס ידע מקצועי - שאלות ותשובות
// ============================================================

const PRINT_KNOWLEDGE = {

    // === חומרים ===
    materials: {
        'כרומו': {
            desc: 'נייר מצופה מבריק - הנפוץ ביותר בדפוס',
            pros: ['צבעים חזקים ועזים', 'מראה מקצועי', 'מחיר סביר'],
            cons: ['משתקף באור חזק', 'לא מתאים לכתיבה'],
            best_for: ['פליירים', 'ברושורים', 'קטלוגים', 'פוסטרים']
        },
        'מט': {
            desc: 'נייר מצופה ללא ברק',
            pros: ['לא משתקף', 'מראה אלגנטי', 'קריאה נוחה'],
            cons: ['צבעים קצת פחות עזים'],
            best_for: ['ספרים', 'דוחות', 'כרטיסי ביקור יוקרתיים']
        },
        'נטול עץ (אופסט)': {
            desc: 'נייר לא מצופה - כמו נייר צילום',
            pros: ['אפשר לכתוב עליו', 'מראה טבעי', 'זול'],
            cons: ['ספיגת דיו גבוהה', 'צבעים עמומים יותר'],
            best_for: ['נייר מכתבים', 'טפסים', 'מחברות']
        },
        'פנינה': {
            desc: 'נייר עם נצנוץ עדין',
            pros: ['מראה יוקרתי', 'נצנוץ עדין', 'ייחודי'],
            cons: ['יקר יותר'],
            best_for: ['הזמנות לאירועים', 'כרטיסי ביקור VIP']
        },
        'קראפט': {
            desc: 'נייר חום טבעי - מראה אקולוגי',
            pros: ['מראה אותנטי', 'אקולוגי', 'טרנדי'],
            cons: ['לא לכל עיצוב'],
            best_for: ['מוצרים אורגניים', 'בוטיקים', 'עסקים ירוקים']
        },
        'ויניל': {
            desc: 'פלסטיק עמיד במים ושמש',
            pros: ['עמיד מאוד', 'לשימוש חוץ', 'עמיד בשריטות'],
            cons: ['יקר יותר', 'לא ניתן לכתוב עליו'],
            best_for: ['מדבקות חוץ', 'באנרים', 'שילוט']
        }
    },

    // === גימורים ===
    finishings: {
        'למינציה': {
            desc: 'ציפוי פלסטיק דק שמגן על ההדפסה',
            types: {
                'מט': 'מראה אלגנטי, לא משתקף, נעים למגע',
                'מבריק': 'צבעים חזקים יותר, מראה מבריק',
                'סופט טאצ\'': 'מט קטיפתי - תחושת משי'
            },
            benefits: ['הגנה מפני שריטות', 'הגנה מלחות', 'מראה יוקרתי'],
            best_for: 'כרטיסי ביקור, כריכות, תפריטים'
        },
        'ספוט UV': {
            desc: 'לכה מבריקה על אזורים נבחרים (בד"כ הלוגו)',
            effect: 'הלוגו/טקסט בולט ומבריק על רקע מט',
            tip: 'הכי יפה בשילוב עם למינציה מט',
            best_for: 'כרטיסי ביקור, הזמנות, כריכות'
        },
        'הבלטה (סקודיקס)': {
            desc: 'הלוגו/טקסט בולט בתלת מימד',
            effect: 'אפשר להרגיש את הלוגו במגע',
            best_for: 'כרטיסי ביקור יוקרתיים, הזמנות'
        },
        'פויל (הטבעה חמה)': {
            desc: 'הטבעה מתכתית - זהב, כסף, רוז גולד ועוד',
            effect: 'ברק מתכתי אמיתי - וואו מובטח!',
            best_for: 'הזמנות, כרטיסי ביקור VIP, תעודות'
        },
        'פינות עגולות': {
            desc: 'עיגול הפינות במכונה מיוחדת',
            effect: 'מראה מודרני ורך',
            best_for: 'כרטיסי ביקור, כרטיסי ביקור'
        },
        'חיתוך צורני (דיקט)': {
            desc: 'חיתוך לפי צורה מיוחדת במקום מלבן רגיל',
            effect: 'המוצר בצורה ייחודית',
            cost: 'יקר יותר - דורש תבנית מיוחדת',
            best_for: 'כרטיסי ביקור מיוחדים, מדבקות, הזמנות'
        }
    },

    // === מונחים מקצועיים ===
    terms: {
        'בליד (Bleed)': 'הארכת העיצוב 3 מ"מ מעבר לקו החיתוך - מונע פסים לבנים בקצוות',
        'DPI': 'נקודות לאינץ\' - מדד לאיכות תמונה. להדפסה צריך 300 DPI מינימום',
        'CMYK': 'מצב צבע להדפסה (ציאן, מג\'נטה, צהוב, שחור) - חובה להדפסה!',
        'RGB': 'מצב צבע למסכים - לא להדפסה! צריך להמיר ל-CMYK',
        'וקטור': 'גרפיקה מתמטית שלא מאבדת איכות בהגדלה - מושלם ללוגואים',
        'רסטר': 'תמונה מפיקסלים - מאבדת איכות בהגדלה',
        'אימפוזיציה': 'סידור העמודים לפני הדפסה כך שאחרי קיפול יהיו בסדר הנכון',
        'ביג': 'קו שקע בנייר שמאפשר קיפול נקי ללא שבירה'
    },

    // === שאלות נפוצות ===
    faq: {
        'כמה זמן לוקח?': {
            answer: 'תלוי במוצר:\n• כרטיסי ביקור: 5 ימי עסקים\n• פליירים: 4 ימי עסקים\n• הזמנות: 7 ימי עסקים\n• רולאפים: 3 ימי עסקים\n\n⚡ יש אופציה לאקספרס בתוספת תשלום!'
        },
        'מה הפורמט לקבצים?': {
            answer: 'הכי טוב: PDF להדפסה\n\nגם אפשר: AI, EPS, PSD, TIFF\n\n⚠️ חשוב:\n• 300 DPI מינימום\n• צבעים CMYK\n• בליד 3 מ"מ\n\nשלח ואני אבדוק בחינם!'
        },
        'אפשר לראות הדפסה לפני?': {
            answer: 'בטח! יש לנו כמה אופציות:\n\n1️⃣ הוכחה דיגיטלית (PDF) - חינם\n2️⃣ הדפסת ניסיון - ₪50\n3️⃣ פלוטר צבע (1:1) - ₪100\n\nלהזמנות גדולות - ההוכחה משתלמת!'
        },
        'יש משלוחים?': {
            answer: 'כן! 🚚\n\n• איסוף עצמי - חינם\n• משלוח רגיל - ₪30 (2-3 ימים)\n• משלוח מהיר - ₪50 (יום למחרת)\n• שליח עד הבית - ₪60\n\n✨ מעל ₪500 - משלוח חינם!'
        },
        'אפשר לשלם בתשלומים?': {
            answer: 'בטח! 💳\n\n• עד 3 תשלומים ללא ריבית\n• ביט / אפליקציית תשלום\n• העברה בנקאית\n• מזומן באיסוף'
        }
    }
};

// ============================================================
// פונקציות תפריט
// ============================================================

/**
 * מחזיר תפריט כללי של כל המוצרים
 */
function getMainMenu() {
    let menu = "🖨️ **מה נדפיס היום?**\n\n";

    const categories = [
        { emoji: '📢', name: 'פליירים ועלונים', key: 'flyer', desc: 'שיווק שעובד' },
        { emoji: '🎉', name: 'הזמנות לאירועים', key: 'invitation', desc: 'חתונות, בר מצווה ועוד' },
        { emoji: '🏷️', name: 'מדבקות', key: 'sticker', desc: 'ממיתוג ועד אריזה' },
        { emoji: '📖', name: 'חוברות וקטלוגים', key: 'booklet', desc: 'כשצריך יותר מדף' },
        { emoji: '🖼️', name: 'פוסטרים והדפסות', key: 'poster', desc: 'גדול ויפה' },
        { emoji: '📋', name: 'ניירת משרדית', key: 'office', desc: 'הכל למשרד' }
    ];

    categories.forEach(cat => {
        menu += `${cat.emoji} **${cat.name}**\n   ${cat.desc}\n\n`;
    });

    menu += "---\n💬 *ספר לי מה אתה צריך ואעזור לך לבחור!*";

    return menu;
}

/**
 * מחזיר תפריט מפורט למוצר ספציפי
 */
function getProductMenu(productKey) {
    const product = PRODUCT_CATALOG[productKey];
    if (!product) return null;

    let menu = `${product.emoji} **${product.name}**\n`;
    menu += `${product.description}\n\n`;
    menu += `---\n\n`;

    // גדלים
    if (product.sizes) {
        menu += `📐 **גדלים:**\n`;
        product.sizes.forEach(size => {
            const popular = size.popular ? ' ⭐' : '';
            const desc = size.desc ? ` - ${size.desc}` : '';
            menu += `• ${size.name} (${size.size})${desc}${popular}\n`;
        });
        menu += `\n`;
    }

    // סוגי נייר
    if (product.papers) {
        menu += `📄 **סוגי נייר:**\n`;
        product.papers.forEach(paper => {
            const popular = paper.popular ? ' ⭐' : '';
            menu += `• ${paper.name}${paper.desc ? ` - ${paper.desc}` : ''}${popular}\n`;
        });
        menu += `\n`;
    }

    // גימורים
    if (product.finishings) {
        menu += `✨ **גימורים:**\n`;
        product.finishings.forEach(finish => {
            const popular = finish.popular ? ' ⭐' : '';
            const premium = finish.premium ? ' 💎' : '';
            menu += `• ${finish.name}${finish.desc ? ` - ${finish.desc}` : ''}${popular}${premium}\n`;
        });
        menu += `\n`;
    }

    // כמויות
    if (product.quantities) {
        menu += `📦 **כמויות:** ${product.quantities.join(' / ')}\n`;
        menu += `   (מינימום: ${product.min_qty})\n\n`;
    }

    // זמן אספקה
    menu += `⏱️ **זמן אספקה:** ${product.production_days} ימי עסקים`;
    if (product.express_available) {
        menu += ` (יש אקספרס ⚡)`;
    }
    menu += `\n\n`;

    // טיפים
    if (product.tips && product.tips.length > 0) {
        menu += `💡 **טיפים:**\n`;
        product.tips.forEach(tip => {
            menu += `• ${tip}\n`;
        });
    }

    menu += `\n---\n💬 *מה הכמות והמפרט שמעניינים אותך?*`;

    return menu;
}

/**
 * מחזיר מידע על חומר
 */
function getMaterialInfo(materialKey) {
    const material = PRINT_KNOWLEDGE.materials[materialKey];
    if (!material) return null;

    let info = `📄 **${materialKey}**\n\n`;
    info += `${material.desc}\n\n`;

    info += `✅ **יתרונות:**\n`;
    material.pros.forEach(pro => info += `• ${pro}\n`);

    if (material.cons && material.cons.length > 0) {
        info += `\n⚠️ **לשים לב:**\n`;
        material.cons.forEach(con => info += `• ${con}\n`);
    }

    info += `\n🎯 **הכי מתאים ל:** ${material.best_for.join(', ')}`;

    return info;
}

/**
 * מחזיר מידע על גימור
 */
function getFinishingInfo(finishingKey) {
    const finishing = PRINT_KNOWLEDGE.finishings[finishingKey];
    if (!finishing) return null;

    let info = `✨ **${finishingKey}**\n\n`;
    info += `${finishing.desc}\n\n`;

    if (finishing.types) {
        info += `**סוגים:**\n`;
        for (const [type, desc] of Object.entries(finishing.types)) {
            info += `• ${type}: ${desc}\n`;
        }
        info += `\n`;
    }

    if (finishing.effect) {
        info += `🎨 **האפקט:** ${finishing.effect}\n\n`;
    }

    if (finishing.benefits) {
        info += `✅ **יתרונות:**\n`;
        finishing.benefits.forEach(b => info += `• ${b}\n`);
        info += `\n`;
    }

    info += `🎯 **מומלץ ל:** ${finishing.best_for}`;

    return info;
}

/**
 * מחזיר תשובה לשאלה נפוצה
 */
function getFaqAnswer(question) {
    // חיפוש התאמה
    const faqKeys = Object.keys(PRINT_KNOWLEDGE.faq);

    for (const key of faqKeys) {
        if (question.includes(key) || key.includes(question)) {
            return PRINT_KNOWLEDGE.faq[key].answer;
        }
    }

    // חיפוש חלקי
    const questionLower = question.toLowerCase();

    if (questionLower.includes('זמן') || questionLower.includes('לוקח') || questionLower.includes('מתי')) {
        return PRINT_KNOWLEDGE.faq['כמה זמן לוקח?'].answer;
    }

    if (questionLower.includes('קובץ') || questionLower.includes('פורמט') || questionLower.includes('pdf')) {
        return PRINT_KNOWLEDGE.faq['מה הפורמט לקבצים?'].answer;
    }

    if (questionLower.includes('משלוח') || questionLower.includes('לקבל') || questionLower.includes('איסוף')) {
        return PRINT_KNOWLEDGE.faq['יש משלוחים?'].answer;
    }

    if (questionLower.includes('תשלום') || questionLower.includes('לשלם') || questionLower.includes('כרטיס')) {
        return PRINT_KNOWLEDGE.faq['אפשר לשלם בתשלומים?'].answer;
    }

    if (questionLower.includes('הוכחה') || questionLower.includes('לראות') || questionLower.includes('לפני')) {
        return PRINT_KNOWLEDGE.faq['אפשר לראות הדפסה לפני?'].answer;
    }

    return null;
}

/**
 * מחזיר הסבר למונח מקצועי
 */
function getTermExplanation(term) {
    const termLower = term.toLowerCase();

    for (const [key, explanation] of Object.entries(PRINT_KNOWLEDGE.terms)) {
        if (key.toLowerCase().includes(termLower) || termLower.includes(key.toLowerCase())) {
            return `📚 **${key}**\n\n${explanation}`;
        }
    }

    return null;
}

// ============================================================
// יצוא
// ============================================================

module.exports = {
    PRODUCT_CATALOG,
    PRINT_KNOWLEDGE,
    getMainMenu,
    getProductMenu,
    getMaterialInfo,
    getFinishingInfo,
    getFaqAnswer,
    getTermExplanation
};
