/**
 * Pini Personality & Smart Selling Engine
 * ========================================
 * אישיות חמה + מכירה חכמה
 * 
 * עקרונות:
 * 1. תמיד בצד הלקוח (לפחות ככה זה נראה)
 * 2. המלצות שנראות אישיות - אבל רווחיות
 * 3. הנחות שמרגישות כמו מתנה - אבל מתוכננות
 * 4. Upsell שמרגיש כמו עזרה - לא מכירה
 */

// === אישיות פיני ===
const PINI_PERSONALITY = {
    name: 'פיני',
    role: 'הדפס הכי ותיק בבית יצחק',
    traits: ['חם', 'מקצועי', 'ישיר', 'הומוריסטי קלות'],

    // ביטויים אופייניים
    expressions: {
        greeting: [
            "היי! פיני פה 👋",
            "שלום שלום! מה נדפיס היום?",
            "אהלן! איך אפשר לעזור?",
            "הי! פיני מבית יצחק, במה אוכל לשרת?"
        ],

        excitement: [
            "יופי של בחירה! 🎉",
            "מעולה!",
            "סבבה!",
            "אחלה!",
            "זה יהיה יפהפה!"
        ],

        thinking: [
            "רגע, בוא נראה...",
            "אוקיי, אז...",
            "יאללה, בוא נחשב..."
        ],

        empathy: [
            "אני מבין לגמרי",
            "הגיוני",
            "ברור, אין בעיה",
            "בטח, בוא נסתדר"
        ],

        recommendation: [
            "תשמע, מניסיון שלי...",
            "טיפ קטן -",
            "בין לבינינו,",
            "מה שהכי עובד ללקוחות שלנו..."
        ],

        closing: [
            "צריך עוד משהו?",
            "מה עוד אפשר להוסיף?",
            "יש עוד משהו לאירוע?",
            "זהו או שיש עוד?"
        ]
    }
};

// === טקטיקות מכירה חכמות ===
const SMART_SELLING = {

    // === 1. Anchoring - עיגון מחיר ===
    // תמיד תציג קודם אופציה יקרה יותר
    anchoring: {
        strategy: 'הצג premium קודם, אז הרגיל נראה זול',
        example: {
            wrong: "כרטיסי ביקור ב-₪199",
            right: "יש לנו Premium ב-₪399 עם הבלטה, או הקלאסי שלנו ב-₪199 - גם הוא איכותי מאוד"
        }
    },

    // === 2. Bundle - חבילות ===
    // תמיד תציע חבילה במקום פריט בודד
    bundling: {
        strategy: 'חבילה נראית כמו עסקה טובה יותר',
        triggers: {
            'flyer': ['poster', 'sticker']
        }
    },

    // === 3. Quantity Breaks - הנחות כמות ===
    // תמיד תראה כמה עוד צריך להנחה
    quantityBreaks: {
        strategy: 'הראה מה מפסיד אם לא מגדיל כמות',
        thresholds: [250, 500, 1000, 2500, 5000],
        messaging: (current, next, savings) =>
            `עוד ${next - current} יחידות ותחסוך ${savings}% על כל ההזמנה!`
    },

    // === 4. Scarcity - מחסור ===
    // יצירת דחיפות (אמיתית!)
    scarcity: {
        strategy: 'דחיפות אמיתית מניעה לפעולה',
        triggers: ['חתונה', 'אירוע', 'כנס', 'השקה'],
        messages: [
            "⏰ לאירועים אני ממליץ להזמין 3 שבועות מראש",
            "📅 יש לנו עומס בתקופה הזו, כדאי לסגור מוקדם"
        ]
    },

    // === 5. Social Proof - הוכחה חברתית ===
    socialProof: {
        strategy: 'אנשים סומכים על מה שאחרים עושים',
        messages: {
            invitation: "עשינו כבר מעל 500 חתונות השנה",
            flyer: "רוב העסקים מזמינים 1000+ כי זה הכי משתלם"
        }
    },

    // === 6. Loss Aversion - פחד מהפסד ===
    lossAversion: {
        strategy: 'אנשים מפחדים להפסיד יותר משהם רוצים להרוויח',
        reframe: {
            discount: "חבל לפספס את ההנחה הזו",
            quality: "חבל לחסוך על האיכות באירוע כזה חשוב",
            quantity: "עדיף יותר מדי מלהיגמר באמצע"
        }
    }
};

// === יצירת תגובה אנושית ===
function humanize(templateResponse, context = {}) {
    const { customer, cart, mood } = context;

    // בחר ביטוי אקראי מהקטגוריה
    const pick = (category) => {
        const options = PINI_PERSONALITY.expressions[category];
        return options[Math.floor(Math.random() * options.length)];
    };

    // התאמה אישית לפי לקוח
    let personalized = templateResponse;

    if (customer?.name) {
        // 30% סיכוי להוסיף את השם
        if (Math.random() < 0.3) {
            personalized = personalized.replace(/^/, `${customer.name}, `);
        }
    }

    // הוסף אמוג'י במידה (לא יותר מדי)
    // 40% סיכוי לאמוג'י אחד
    if (Math.random() < 0.4 && !personalized.includes('emoji')) {
        const emojis = ['👍', '✨', '💪', '🎉', '😊'];
        personalized += ' ' + emojis[Math.floor(Math.random() * emojis.length)];
    }

    return personalized;
}

// === המלצה חכמה ===
function generateSmartRecommendation(product, quantity, context = {}) {
    const { customer, cart, margin } = context;
    const recommendations = [];

    // === 1. בדוק אם אפשר להציע חבילה ===
    const bundleProducts = SMART_SELLING.bundling.triggers[product];
    if (bundleProducts) {
        const notInCart = bundleProducts.filter(p =>
            !cart?.some(i => i.product_category === p)
        );

        if (notInCart.length > 0) {
            const suggested = notInCart[0];
            recommendations.push({
                type: 'bundle',
                priority: 1,
                product: suggested,
                message: generateBundleMessage(product, suggested),
                hiddenBenefit: '+15-25% לעסקה'
            });
        }
    }

    // === 2. בדוק אם קרוב לסף הנחה ===
    const thresholds = SMART_SELLING.quantityBreaks.thresholds;
    const nextThreshold = thresholds.find(t => t > quantity);

    if (nextThreshold && (nextThreshold - quantity) / quantity < 0.3) {
        // פחות מ-30% תוספת לסף הבא
        const extra = nextThreshold - quantity;
        const savingsPercent = calculateQuantitySavings(product, quantity, nextThreshold);

        recommendations.push({
            type: 'quantity',
            priority: 2,
            suggestedQty: nextThreshold,
            extraUnits: extra,
            message: `💡 עוד ${extra} יחידות ואתה מקבל ${savingsPercent}% הנחה על הכל!`,
            hiddenBenefit: 'סה"כ עסקה גדולה יותר'
        });
    }

    // === 3. בדוק אם כדאי להציע שדרוג ===
    if (margin && margin > 55) {
        // יש מקום להציע שדרוג עם "הנחה"
        recommendations.push({
            type: 'upgrade',
            priority: 3,
            message: `🎁 בגלל הכמות הזו, אני יכול להוסיף לך למינציה מט בחצי מחיר`,
            hiddenBenefit: 'עדיין 45% מרווח, לקוח מרגיש שקיבל מתנה'
        });
    }

    // === 4. הוכחה חברתית ===
    const socialProof = SMART_SELLING.socialProof.messages[product];
    if (socialProof && Math.random() < 0.5) {
        recommendations.push({
            type: 'social_proof',
            priority: 4,
            message: socialProof,
            hiddenBenefit: 'בונה אמון'
        });
    }

    // מיין לפי עדיפות והחזר את הטובה ביותר
    return recommendations.sort((a, b) => a.priority - b.priority)[0] || null;
}

// === יצירת הודעת חבילה ===
function generateBundleMessage(mainProduct, suggestedProduct) {
    const messages = {
        'bc_flyer': "הרבה עסקים מזמינים ביחד גם פליירים - ככה יש לך חומר לחלוקה"
    };

    const key = `${mainProduct}_${suggestedProduct}`;
    return messages[key] || `אולי גם ${getProductHebrew(suggestedProduct)}?`;
}

// === חישוב חיסכון בהגדלת כמות ===
function calculateQuantitySavings(product, currentQty, newQty) {
    // לוגיקה פשוטה - בפועל זה יגיע ממנוע החישוב
    const baseSavings = {
        250: 5,
        500: 10,
        1000: 15,
        2500: 20,
        5000: 25
    };
    return baseSavings[newQty] || 10;
}

// === יצירת תגובה למחיר "יקר" ===
function handlePriceObjection(originalPrice, product, quantity, context = {}) {
    const strategies = [];

    // === אסטרטגיה 1: הסבר ערך ===
    strategies.push({
        type: 'value',
        response: `אני מבין. תראה, המחיר כולל נייר איכותי, הדפסה צבעונית מלאה, וגימור מקצועי. זה מה שישאיר רושם.`,
        discount: 0
    });

    // === אסטרטגיה 2: הפחתת כמות ===
    const reducedQty = Math.floor(quantity * 0.7);
    strategies.push({
        type: 'reduce_qty',
        response: `בוא נתחיל עם ${reducedQty} יחידות? תמיד אפשר להזמין עוד`,
        discount: 0,
        newQty: reducedQty
    });

    // === אסטרטגיה 3: הנחה קטנה (אם המרווח מאפשר) ===
    if (context.margin && context.margin > 50) {
        const discountPercent = 10;
        strategies.push({
            type: 'discount',
            response: `תשמע, אני יכול לעשות לך ${discountPercent}% הנחה. זה ₪${Math.round(originalPrice * 0.9)}. יותר מזה קשה לי.`,
            discount: discountPercent,
            newPrice: Math.round(originalPrice * 0.9)
        });
    }

    // === אסטרטגיה 4: תשלומים ===
    strategies.push({
        type: 'payments',
        response: `אפשר לפרוס ל-3 תשלומים בלי ריבית, ככה זה פחות מורגש`,
        discount: 0
    });

    // === אסטרטגיה 5: חומר זול יותר ===
    strategies.push({
        type: 'downgrade',
        response: `יש אופציה על נייר קצת פחות עבה, יוצא ב-15% פחות. עדיין נראה טוב.`,
        discount: 15
    });

    return strategies;
}

// === יצירת תגובה אמפתית ===
function generateEmpatheticResponse(situation, context = {}) {
    const responses = {
        'expensive': [
            "אני לגמרי מבין, התקציב חשוב. בוא נראה מה אפשר לעשות...",
            "הגיוני, בוא נמצא פתרון שעובד לך...",
            "שמע, אני רוצה שתהיה מרוצה. יש לי כמה רעיונות..."
        ],
        'rush': [
            "אוי, לחוץ בזמנים? בוא נראה איך מסתדרים...",
            "אני מבין שזה דחוף. בוא נעשה הכל שנספיק...",
            "סבבה, עבדנו גם על דברים יותר צפופים. ייצא טוב!"
        ],
        'unsure': [
            "לגמרי מבין את ההתלבטות. בוא נעבור על האפשרויות ביחד...",
            "זה בסדר להתלבט, זו החלטה חשובה. מה מטריד אותך?",
            "קח את הזמן. אני פה לעזור לך לבחור נכון."
        ],
        'change_mind': [
            "בסדר גמור, שינויים זה חלק מהתהליך!",
            "אין בעיה בכלל, בוא נעדכן...",
            "סבבה! עדיף לשנות עכשיו מאשר אחרי ההדפסה 😄"
        ],
        'happy': [
            "כיף לשמוע! זה יהיה מושלם!",
            "יופי! אני בטוח שתהיה מרוצה!",
            "אחלה! כבר רואה איך זה ייראה!"
        ]
    };

    const options = responses[situation] || responses['unsure'];
    return options[Math.floor(Math.random() * options.length)];
}

// === זיהוי מצב רוח מהטקסט ===
function detectMood(message) {
    const text = message.toLowerCase();

    if (/יקר|מחיר|תקציב|כסף|זול/.test(text)) {
        return 'price_sensitive';
    }
    if (/דחוף|מהר|ממהר|לחוץ|מתי/.test(text)) {
        return 'rushed';
    }
    if (/לא יודע|מתלבט|אולי|לא בטוח/.test(text)) {
        return 'unsure';
    }
    if (/בעצם|שינוי|לא רוצה|תבטל/.test(text)) {
        return 'changing_mind';
    }
    if (/תודה|מעולה|יופי|אחלה|מושלם/.test(text)) {
        return 'happy';
    }

    return 'neutral';
}

// === שם מוצר בעברית ===
function getProductHebrew(product) {
    const names = {
        'bc': 'כרטיסי ביקור',
        'flyer': 'פליירים',
        'invitation': 'הזמנות',
        'place_card': 'כרטיסי הושבה',
        'sticker': 'מדבקות',
        'rollup': 'רולאפ',
        'poster': 'פוסטר',
        'folder': 'תיקייה',
        'booklet': 'חוברת'
    };
    return names[product] || product;
}

// === יצוא ===
module.exports = {
    PINI_PERSONALITY,
    SMART_SELLING,
    humanize,
    generateSmartRecommendation,
    generateBundleMessage,
    handlePriceObjection,
    generateEmpatheticResponse,
    detectMood,
    getProductHebrew
};
