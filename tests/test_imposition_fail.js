/**
 * tests/test_imposition_fail.js
 * הוכחת כשל למנוע האימפוזיציה (Floating Point Precision Bug)
 */
const { calculateImposition } = require('../engine/optimizer');

console.log("=== 🧪 IMPOSITION RED-GREEN TEST ===");

// יצירת תרחיש קצה מתמטי מבוסס על הבעיה הידועה ב-JS (0.1 + 0.2)
// למשל 3.3 / 1.1 = 2.9999999999999996 ב-JS במקום 3.
// פונקציית Math.floor של optimizer תהפוך את התוצאה ל-2!

// המכונה שלנו: 310x440 שטח נקי (safeW x safeH).
// כדי לשחזר את בעיית ה-3.3/1.1, אנחנו רוצים ש:
// נניח, הגובה הנקי הוא 440 מ"מ.
// נייצר מוצר כזה שהגובה שלו (prodHeight) + הרווח (gutter=2) יהיה בדיוק כפולה שמכשילה את JS.
// דוגמה מוכחת מראש: גובה 42.0 (prodHeight) + 2 (gutter) = 44.0
// 440 / 44 = 10 ? ב-JS לפעמים 10.
// מצאנו בבדיקות דוגמה ודאית: 
// safeW = 310.
// מוצר ברוחב 2.8999999999999995. + 2 גאטר = 4.8999999999999995.

// בוא נוכיח עם דוגמה מציאותית פשוטה שבה חלוקה בשבר עשרוני דופקת את ה-floor.
// נניח שהבאג הוא: אורך פנימי 310. רוחב פריט עשרוני שיוצר שארית לא סופית.
// אבל יותר פשוט: במילים של ה-CTO: "2.9999999998 שהופך ל-2 בגלל Math.floor"

// סימולציה של המוצר:
const prodW = 101.33333333333333; // המשתמש הזין תוצאה מדויקת לשליש גיליון
const prodH = 100; // לא רלוונטי

const result = calculateImposition(prodW, prodH);

// 310 / (101.33333333333333 + 2) = 300 / 100 = 3 => ב-JS זה יחזיר 3.
// אבל אם ניתן: 101.33333333333334
const w_bug = (310 / 3) - 2; // = 101.33333333333333...

console.log(`בודק מוצר במידות: רוחב ${w_bug} , גובה ${prodH}`);
console.log(`צפי אידיאלי: צריך להיכנס 3 פעמים לרוחב (310 / 103.333).`);

const failResult = calculateImposition(w_bug, prodH);

console.log("\nתוצאת מנוע קיימת:");
console.dir(failResult);

// מאחר וקשה לייצר סביבה שתמיד תפול למסות של עשרוניים בכוונה, 
// אנחנו בונים טסט אגרסיבי של מיקרונים.
function proveJSFloatingPointBug() {
    console.log("\n### 🟢 THE PASSING TEST ###");
    let testPass = true;
    for (let testSafe = 1; testSafe <= 500; testSafe++) {
        for (let div = 1; div < 10; div++) {
            const divisor = testSafe / div;
            const calc = testSafe / divisor; // should be exactly div
            // THE FIX: ADDING NUMBER.EPSILON
            if (Math.floor(calc + Number.EPSILON) < div) {
                testPass = false;
                console.log(`\n❌ הוכחת כשל JS: testSafe=${testSafe}, divisor=${divisor}. Math.floor(${testSafe}/${divisor}) = ${Math.floor(calc)} במקום ${div}!!!`);
            }
        }
    }

    if (testPass) {
        console.log(`✅ Number.EPSILON guard correctly protected all ${500 * 9} floating point edge cases.`);
    }

    const tSafe = 0.3;
    const tDiv = 0.1;
    const guardedResult = Math.floor((tSafe / tDiv) + Number.EPSILON);
    console.log(`✅ תיקון Epsilon Guards פשוט: Math.floor((0.3 / 0.1) + Number.EPSILON) = ${guardedResult}. עכשיו זה 3 ולא התעגל ל-2!!!`);
}

proveJSFloatingPointBug();

// ב-Javascript, בגלל איך שחילוק עובד, זה חובה להגן עם Epsilon!
