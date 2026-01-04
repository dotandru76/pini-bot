/**
 * Pini Bot - Mega Stress Test
 * ============================
 * בודק מאות מקרים רנדומליים קשים
 * 
 * הרצה: node tests/stress_test.js [מספר_טסטים]
 * דוגמה: node tests/stress_test.js 500
 */

const { classifyMessage } = require('../engine/classifier');

// === קונפיגורציה ===
const NUM_TESTS = parseInt(process.argv[2]) || 200;
const SHOW_ALL = process.argv.includes('--all');
const SHOW_FAILS = process.argv.includes('--fails');

// === מאגרי מילים ===

const PRODUCTS = {
    flyer: ['פליירים', 'פלייר', 'עלונים', 'עלון', 'פלאיירים', 'דף פרסום'],
    bc: ['כרטיסי ביקור', 'כרטיס ביקור', 'כרטיסים', 'ביזנס קארד'],
    invitation: ['הזמנות', 'הזמנה', 'הזמנות לחתונה', 'הזמנה לאירוע'],
    rollup: ['רולאפ', 'רולאפים', 'באנר', 'באנרים', 'רול אפ'],
    sticker: ['מדבקות', 'מדבקה', 'סטיקרים', 'סטיקר'],
    booklet: ['חוברות', 'חוברת', 'קטלוג', 'קטלוגים'],
    poster: ['פוסטר', 'פוסטרים', 'שלט', 'שלטים']
};

const QUANTITIES = {
    valid_small: [50, 100, 150, 200, 250, 300],
    valid_medium: [500, 750, 1000, 1500, 2000],
    valid_large: [2500, 3000, 5000, 10000],
    hebrew: ['אחד', 'שניים', 'שלושה', 'עשר', 'עשרים', 'מאה', 'מאתיים', 'אלף'],
    formatted: ['1,000', '2,500', '5,000', '10,000']
};

// מידות שצריך לסנן (לא כמויות!)
const DIMENSIONS = {
    rollup_sizes: ['85x200', '100x200', '120x200', '80x180', '60x160'],
    weights: ['135 גרם', '170 גרם', '250 גרם', '300 גרם', '350 גרם', '400 גרם'],
    lengths: ['5 ס"מ', '10 סמ', '15 ס"מ', '20 סמ', '50 ס"מ', '85 ס"מ', '100 סמ'],
    paper_sizes: ['A3', 'A4', 'A5', 'A6', 'B2', 'B3', 'DL']
};

// פעולות
const ACTIONS = {
    add: ['צריך', 'רוצה', 'בא לי', 'תכין לי', 'תוסיף', 'אפשר', 'אני צריך', 'תעשה לי'],
    update: ['שנה ל-', 'עדכן ל-', 'תעלה ל-', 'תשנה ל-', 'במקום', 'תעדכן ל-'],
    remove: ['תוריד', 'תמחק', 'בלי', 'הורד', 'תבטל', 'וותר על'],
    status: ['כמה זה', 'מה המחיר', 'מה יש בעגלה', 'סיכום', 'תראה לי'],
    clear: ['נקה הכל', 'תמחק הכל', 'מחק עגלה', 'התחל מחדש']
};

// מילות מילוי (רעש)
const FILLERS = [
    'בבקשה', 'תודה', 'דחוף', 'מהר', 'היי', 'שלום', 'פיני',
    'איכותי', 'יפה', 'טוב', 'הכי טוב', 'פרימיום', 'של הבוס',
    'למחר', 'לשבוע הבא', 'בהקדם', 'עד מחר', 'אם אפשר',
    'לעסק', 'לחתונה', 'לאירוע', 'למשרד', 'ללקוח'
];

// גימורים
const FINISHINGS = [
    'למינציה', 'למינציה מט', 'למינציה מבריקה', 'ספוט UV',
    'פויל זהב', 'פויל כסף', 'הבלטה', 'פינות עגולות',
    'דו צדדי', 'צד אחד', 'צבעוני', 'שחור לבן'
];

// === פונקציות עזר ===

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

function maybe(probability = 0.5) {
    return Math.random() < probability;
}

// === גנרטורים של מקרי בדיקה ===

/**
 * מקרה רגיל: מוצר + כמות
 */
function generateNormalCase() {
    const productKey = random(Object.keys(PRODUCTS));
    const productName = random(PRODUCTS[productKey]);
    const qtyType = random(['valid_small', 'valid_medium', 'valid_large', 'hebrew', 'formatted']);
    const qty = random(QUANTITIES[qtyType]);
    const action = maybe(0.7) ? random(ACTIONS.add) : '';
    const filler = maybe(0.5) ? random(FILLERS) : '';
    
    // סדר רנדומלי
    const parts = shuffle([action, qty, productName, filler].filter(Boolean));
    
    return {
        text: parts.join(' ').trim(),
        expected: {
            action: 'quote',
            product: productKey,
            hasQty: true
        },
        type: 'normal'
    };
}

/**
 * מקרה קשה: מוצר עם מידות (לא כמויות!)
 */
function generateDimensionCase() {
    const productKey = random(Object.keys(PRODUCTS));
    const productName = random(PRODUCTS[productKey]);
    const dimType = random(Object.keys(DIMENSIONS));
    const dimension = random(DIMENSIONS[dimType]);
    const action = maybe(0.5) ? random(ACTIONS.add) : '';
    const filler = maybe(0.3) ? random(FILLERS) : '';
    
    // סדר רנדומלי - מידה בלבד, בלי כמות אמיתית
    const parts = shuffle([action, productName, dimension, filler].filter(Boolean));
    
    return {
        text: parts.join(' ').trim(),
        expected: {
            action: 'quote_incomplete', // אין כמות אמיתית!
            product: productKey,
            hasQty: false
        },
        type: 'dimension_only',
        dimension: dimension
    };
}

/**
 * מקרה מעורב: מוצר + כמות + מידה
 */
function generateMixedCase() {
    const productKey = random(Object.keys(PRODUCTS));
    const productName = random(PRODUCTS[productKey]);
    const qty = random(QUANTITIES.valid_medium);
    const dimType = random(Object.keys(DIMENSIONS));
    const dimension = random(DIMENSIONS[dimType]);
    const action = maybe(0.5) ? random(ACTIONS.add) : '';
    const filler = maybe(0.3) ? random(FILLERS) : '';
    
    // כמות + מידה
    const parts = shuffle([action, String(qty), productName, dimension, filler].filter(Boolean));
    
    return {
        text: parts.join(' ').trim(),
        expected: {
            action: 'quote',
            product: productKey,
            qty: qty, // הכמות האמיתית
            hasQty: true
        },
        type: 'mixed',
        dimension: dimension
    };
}

/**
 * מקרה רולאפ ספציפי
 */
function generateRollupCase() {
    const productName = random(PRODUCTS.rollup);
    const size = random(DIMENSIONS.rollup_sizes);
    const hasRealQty = maybe(0.5);
    const realQty = hasRealQty ? randomInt(1, 10) : null;
    const action = maybe(0.5) ? random(ACTIONS.add) : '';
    const filler = maybe(0.3) ? random(FILLERS) : '';
    
    let parts;
    if (hasRealQty) {
        parts = shuffle([action, String(realQty), productName, size, filler].filter(Boolean));
    } else {
        parts = shuffle([action, productName, size, filler].filter(Boolean));
    }
    
    return {
        text: parts.join(' ').trim(),
        expected: {
            action: hasRealQty ? 'quote' : 'quote_incomplete',
            product: 'rollup',
            qty: realQty,
            hasQty: hasRealQty
        },
        type: 'rollup',
        size: size
    };
}

/**
 * מקרה עדכון כמות
 */
function generateUpdateCase() {
    const productKey = random(Object.keys(PRODUCTS));
    const productName = random(PRODUCTS[productKey]);
    const qty = random([...QUANTITIES.valid_medium, ...QUANTITIES.valid_large]);
    const action = random(ACTIONS.update);
    
    const text = `${action} ${qty} ${productName}`;
    
    return {
        text: text,
        expected: {
            action: 'update_qty',
            product: productKey,
            qty: typeof qty === 'string' ? parseInt(qty.replace(/,/g, '')) : qty
        },
        type: 'update'
    };
}

/**
 * מקרה הסרה
 */
function generateRemoveCase() {
    const productKey = random(Object.keys(PRODUCTS));
    const productName = random(PRODUCTS[productKey]);
    const action = random(ACTIONS.remove);
    const filler = maybe(0.3) ? random(FILLERS) : '';
    
    const parts = [action, productName, filler].filter(Boolean);
    
    return {
        text: parts.join(' ').trim(),
        expected: {
            action: 'remove',
            product: productKey
        },
        type: 'remove'
    };
}

/**
 * מקרה סטטוס
 */
function generateStatusCase() {
    const action = random(ACTIONS.status);
    const filler = maybe(0.3) ? random(FILLERS) : '';
    
    return {
        text: `${action} ${filler}`.trim(),
        expected: {
            action: 'status'
        },
        type: 'status'
    };
}

/**
 * מקרה ברכה
 */
function generateGreetingCase() {
    const greetings = [
        'היי', 'שלום', 'בוקר טוב', 'ערב טוב', 'מה נשמע',
        'היי פיני', 'שלום פיני', 'אהלן', 'הי'
    ];
    
    return {
        text: random(greetings),
        expected: {
            action: 'greeting'
        },
        type: 'greeting'
    };
}

/**
 * מקרה מסובך - הרבה רעש
 */
function generateNoisyCase() {
    const productKey = random(Object.keys(PRODUCTS));
    const productName = random(PRODUCTS[productKey]);
    const qty = random(QUANTITIES.valid_medium);
    const fillers = [random(FILLERS), random(FILLERS), random(FILLERS)];
    const finishing = maybe(0.5) ? random(FINISHINGS) : '';
    const dimension = maybe(0.3) ? random(DIMENSIONS.weights) : '';
    
    const parts = shuffle([
        ...fillers,
        String(qty),
        productName,
        finishing,
        dimension
    ].filter(Boolean));
    
    return {
        text: parts.join(' ').trim(),
        expected: {
            action: 'quote',
            product: productKey,
            hasQty: true
        },
        type: 'noisy'
    };
}

/**
 * מקרה חסר כמות
 */
function generateIncompleteCase() {
    const productKey = random(Object.keys(PRODUCTS));
    const productName = random(PRODUCTS[productKey]);
    const action = maybe(0.7) ? random(ACTIONS.add) : '';
    const filler = maybe(0.5) ? random(FILLERS) : '';
    
    // בלי כמות!
    const parts = shuffle([action, productName, filler].filter(Boolean));
    
    return {
        text: parts.join(' ').trim(),
        expected: {
            action: 'quote_incomplete',
            product: productKey,
            hasQty: false
        },
        type: 'incomplete'
    };
}

/**
 * מקרה עם מספרי טלפון (לא לזהות ככמות)
 */
function generatePhoneCase() {
    const productKey = random(Object.keys(PRODUCTS));
    const productName = random(PRODUCTS[productKey]);
    const phone = `05${randomInt(0,9)}-${randomInt(100,999)}-${randomInt(1000,9999)}`;
    const qty = random(QUANTITIES.valid_small);
    
    return {
        text: `${qty} ${productName} טלפון ${phone}`,
        expected: {
            action: 'quote',
            product: productKey,
            qty: qty,
            hasQty: true
        },
        type: 'phone'
    };
}

/**
 * מקרה A4/A5 - לא לזהות כמספר
 */
function generatePaperSizeCase() {
    const productKey = random(['flyer', 'booklet', 'poster']);
    const productName = random(PRODUCTS[productKey]);
    const paperSize = random(['A4', 'A5', 'A3', 'DL']);
    const hasQty = maybe(0.5);
    const qty = hasQty ? random(QUANTITIES.valid_medium) : null;
    
    let text;
    if (hasQty) {
        text = `${qty} ${productName} ${paperSize}`;
    } else {
        text = `${productName} ${paperSize}`;
    }
    
    return {
        text: text,
        expected: {
            action: hasQty ? 'quote' : 'quote_incomplete',
            product: productKey,
            hasQty: hasQty
        },
        type: 'paper_size'
    };
}

// === הרצת הבדיקות ===

function runTests() {
    console.log(`\n🚀 Pini Bot Mega Stress Test`);
    console.log(`   Running ${NUM_TESTS} random hard cases...\n`);
    console.log('='.repeat(60) + '\n');
    
    const generators = [
        { fn: generateNormalCase, weight: 20 },
        { fn: generateDimensionCase, weight: 15 },
        { fn: generateMixedCase, weight: 15 },
        { fn: generateRollupCase, weight: 15 },
        { fn: generateUpdateCase, weight: 8 },
        { fn: generateRemoveCase, weight: 5 },
        { fn: generateStatusCase, weight: 3 },
        { fn: generateGreetingCase, weight: 3 },
        { fn: generateNoisyCase, weight: 8 },
        { fn: generateIncompleteCase, weight: 5 },
        { fn: generatePhoneCase, weight: 2 },
        { fn: generatePaperSizeCase, weight: 6 }
    ];
    
    // בנה מאגר משוקלל
    const weightedGenerators = [];
    generators.forEach(g => {
        for (let i = 0; i < g.weight; i++) {
            weightedGenerators.push(g.fn);
        }
    });
    
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        llm_calls: 0,
        direct_calls: 0,
        by_type: {}
    };
    
    const failures = [];
    
    for (let i = 0; i < NUM_TESTS; i++) {
        const generator = random(weightedGenerators);
        const testCase = generator();
        
        // הרץ את הClassifier
        const result = classifyMessage(testCase.text, { cart: [] });
        
        results.total++;
        
        // בדוק תוצאות
        let passed = true;
        let failReason = '';
        
        // בדיקת action
        if (testCase.expected.action) {
            if (result.action !== testCase.expected.action) {
                // מקרים מיוחדים שבסדר
                const okCases = [
                    // quote_incomplete יכול להיות גם chat אם צריך LLM
                    testCase.expected.action === 'quote_incomplete' && result.action === 'chat',
                    // greeting יכול להיות גם chat
                    testCase.expected.action === 'greeting' && result.action === 'chat'
                ];
                
                if (!okCases.some(x => x)) {
                    passed = false;
                    failReason = `Expected action: ${testCase.expected.action}, Got: ${result.action}`;
                }
            }
        }
        
        // בדיקת כמות - רק למקרים עם מידות
        if (testCase.type === 'dimension_only') {
            // וודא שלא זיהה כמות מהמידה
            if (result.data?.qty && !testCase.expected.hasQty) {
                // בדוק אם הכמות היא מהמידה
                const dimNumbers = testCase.dimension?.match(/\d+/g) || [];
                if (dimNumbers.includes(String(result.data.qty))) {
                    passed = false;
                    failReason = `Detected dimension as quantity: ${result.data.qty} from "${testCase.dimension}"`;
                }
            }
        }
        
        // בדיקת כמות למקרים מעורבים
        if (testCase.type === 'mixed' && testCase.expected.qty) {
            if (result.data?.qty !== testCase.expected.qty) {
                passed = false;
                failReason = `Expected qty: ${testCase.expected.qty}, Got: ${result.data?.qty}`;
            }
        }
        
        // סטטיסטיקות
        if (result.needsLLM) {
            results.llm_calls++;
        } else {
            results.direct_calls++;
        }
        
        if (!results.by_type[testCase.type]) {
            results.by_type[testCase.type] = { total: 0, passed: 0, failed: 0 };
        }
        results.by_type[testCase.type].total++;
        
        if (passed) {
            results.passed++;
            results.by_type[testCase.type].passed++;
            
            if (SHOW_ALL) {
                console.log(`✅ #${i + 1} [${testCase.type}] "${testCase.text}"`);
                console.log(`   → ${result.action} | ${result.data?.product || '-'} | qty: ${result.data?.qty || '-'}`);
            }
        } else {
            results.failed++;
            results.by_type[testCase.type].failed++;
            
            failures.push({
                num: i + 1,
                ...testCase,
                result: result,
                reason: failReason
            });
            
            if (SHOW_ALL || SHOW_FAILS) {
                console.log(`❌ #${i + 1} [${testCase.type}] "${testCase.text}"`);
                console.log(`   Expected: ${testCase.expected.action} | ${testCase.expected.product || '-'} | qty: ${testCase.expected.qty || '-'}`);
                console.log(`   Got:      ${result.action} | ${result.data?.product || '-'} | qty: ${result.data?.qty || '-'}`);
                console.log(`   Reason:   ${failReason}`);
                console.log('');
            }
        }
    }
    
    // === סיכום ===
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTS SUMMARY');
    console.log('='.repeat(60) + '\n');
    
    const passRate = ((results.passed / results.total) * 100).toFixed(1);
    const directRate = ((results.direct_calls / results.total) * 100).toFixed(1);
    
    console.log(`Total Tests:    ${results.total}`);
    console.log(`Passed:         ${results.passed} (${passRate}%)`);
    console.log(`Failed:         ${results.failed}`);
    console.log('');
    console.log(`Direct Calls:   ${results.direct_calls} (${directRate}%)`);
    console.log(`LLM Calls:      ${results.llm_calls} (${(100 - parseFloat(directRate)).toFixed(1)}%)`);
    
    console.log('\n📈 Results by Type:\n');
    
    Object.entries(results.by_type)
        .sort((a, b) => b[1].total - a[1].total)
        .forEach(([type, stats]) => {
            const rate = ((stats.passed / stats.total) * 100).toFixed(0);
            const bar = '█'.repeat(Math.round(stats.passed / stats.total * 20));
            const emptyBar = '░'.repeat(20 - bar.length);
            console.log(`  ${type.padEnd(18)} ${bar}${emptyBar} ${rate}% (${stats.passed}/${stats.total})`);
        });
    
    // הצג כישלונות
    if (failures.length > 0 && !SHOW_FAILS) {
        console.log('\n⚠️  Top Failures (run with --fails to see all):\n');
        
        failures.slice(0, 10).forEach(f => {
            console.log(`  ❌ "${f.text}"`);
            console.log(`     ${f.reason}`);
        });
        
        if (failures.length > 10) {
            console.log(`\n  ... and ${failures.length - 10} more failures`);
        }
    }
    
    // ציון סופי
    console.log('\n' + '='.repeat(60));
    
    if (passRate >= 95) {
        console.log('🏆 EXCELLENT! System is production-ready!');
    } else if (passRate >= 90) {
        console.log('✅ GOOD! Minor improvements needed.');
    } else if (passRate >= 80) {
        console.log('⚠️  NEEDS WORK. Check the failures above.');
    } else {
        console.log('❌ CRITICAL! Major issues found.');
    }
    
    console.log('='.repeat(60) + '\n');
    
    // החזר exit code
    process.exit(results.failed > 0 ? 1 : 0);
}

// הרץ!
runTests();
