# מסמך מחקר: ארכיטקטורה אופטימלית לפיני - בוט הצעות מחיר לדפוס

## תקציר מנהלים

מסמך זה מציג ארכיטקטורה חדשנית להפיכת בוט הצעות מחיר לדפוס ממערכת "נחמדה" למערכת שמחליפה לחלוטין מנהל בית דפוס. הארכיטקטורה מבוססת על שלושה עקרונות:

1. **השרת עושה את העבודה הקשה** - כל החישובים, האופטימיזציות והלוגיקה העסקית בצד השרת
2. **ה-LLM הוא רק ממשק** - מקבל הוראות מינימליות ומחזיר פרמטרים מובנים
3. **זיכרון דינמי** - שומר על הקשר בלי לשלוח את כל ההיסטוריה

---

## חלק 1: אלגוריתם אימפוזיציה ואופטימיזציה

### 1.1 הבעיה: Cutting Stock Problem (CSP)

בעיית חיתוך המלאי היא בעיה קלאסית באופטימיזציה (NP-Hard). בדפוס, זה מתורגם ל:

**קלט:**
- גודל גיליון מכונה (SRA3 = 32x45 ס"מ)
- גודל המוצר הסופי (כרטיס 9x5, פלייר A5, וכו')
- כמות נדרשת

**פלט:**
- כמה יחידות נכנסות בגיליון (Ups)
- כמה גיליונות להדפיס
- עלות אופטימלית

### 1.2 אלגוריתם Gilmore-Gomory (פשוט לדפוס)

במקום לפתור את הבעיה המלאה (שדורשת Linear Programming), נשתמש באלגוריתם גריידי פשוט שמתאים ל-90% מהמקרים:

```
function calculateOptimalImposition(productWidth, productHeight, sheetWidth, sheetHeight):
    
    // נסה שני כיוונים (לאורך ולרוחב)
    option1 = floor(sheetWidth / productWidth) * floor(sheetHeight / productHeight)
    option2 = floor(sheetWidth / productHeight) * floor(sheetHeight / productWidth)
    
    // בחר את האפשרות עם יותר יחידות
    ups = max(option1, option2)
    
    // חשב פחת (waste)
    usedArea = ups * productWidth * productHeight
    totalArea = sheetWidth * sheetHeight
    wastePercent = (totalArea - usedArea) / totalArea * 100
    
    return { ups, wastePercent, orientation: option1 > option2 ? 'portrait' : 'landscape' }
```

### 1.3 אופטימיזציה מתקדמת: השוואת גדלי גיליון

המנהל החכם לא בוחר רק כמה נכנסים בגיליון - הוא משווה בין אפשרויות:

```
function findBestSheetSize(product, quantity, availableSheets):
    
    results = []
    
    for sheet in availableSheets:  // [SRA3, SRA4, A3, A4, B3...]
        imposition = calculateOptimalImposition(product, sheet)
        
        sheetsNeeded = ceil(quantity / imposition.ups)
        wasteCost = sheetsNeeded * sheet.cost * imposition.wastePercent
        clickCost = sheetsNeeded * getClickCost(sheet.size)
        setupCost = getSetupCost(sheet.size)
        
        totalCost = wasteCost + clickCost + setupCost
        
        results.push({
            sheetSize: sheet.name,
            ups: imposition.ups,
            sheetsNeeded,
            totalCost,
            recommendation: generateRecommendation(...)
        })
    
    // מיין לפי עלות ובחר את הזול
    return results.sort(by: totalCost)[0]
```

### 1.4 התובנה הגדולה: חוברת A3 = 2 דפי A4

זו הדוגמה שנתת, ואני מבין אותה כעת לגמרי:

```
// חוברת 8 עמודים A5:

// אופציה א': הדפסה בודדת
sheets = 8  // כל עמוד בנפרד
clicks = 8
cost = HIGH

// אופציה ב': אימפוזיציה חכמה
// גיליון A3 דו-צדדי = 4 עמודים A5
sheets = 2  // (8 עמודים / 4 עמודים לגיליון)
clicks = 4  // (2 גיליונות × 2 צדדים)
cost = LOW

// הפרש: 75% חיסכון!
```

### 1.5 טבלת החלטות אימפוזיציה מוכנה

במקום לחשב בזמן אמת, נבנה lookup table:

| מוצר | גודל סופי | גודל גיליון | Ups | קיפול |
|------|-----------|-------------|-----|-------|
| כרטיס ביקור | 9x5 | SRA3 | 24 | ללא |
| פלייר A5 | 14.8x21 | SRA3 | 4 | ללא |
| פלייר A6 | 10.5x14.8 | SRA3 | 8 | ללא |
| פרוספקט 3 | DL | SRA3 | 6 | C-fold |
| חוברת A5 (8pp) | A5 | A3 | 4pp/sheet | Saddle |
| הזמנה | 13x18 | SRA3 | 4 | Optional |

---

## חלק 2: אופטימיזציה של עבודה מול LLM

### 2.1 הבעיה: עלות טוקנים

כל בקשה ל-LLM עולה כסף. ב-Gemini 2.0 Flash:
- Input: $0.075 / 1M tokens
- Output: $0.30 / 1M tokens

**הבעיה הנוכחית:**
- System prompt ארוך (חוקים, מוצרים, מצב עגלה) = ~2000 tokens
- היסטוריה מלאה = +500 tokens לכל תור
- אחרי 10 הודעות: ~7000 tokens לכל בקשה!

### 2.2 הפתרון: "Server-Heavy, LLM-Light"

**העיקרון:** השרת עושה את כל העבודה, ה-LLM רק מפרש את כוונת המשתמש.

```
┌─────────────────────────────────────────────────────────┐
│                    BEFORE (Heavy LLM)                   │
├─────────────────────────────────────────────────────────┤
│  User: "תכין לי 5000 פליירים"                           │
│                    ↓                                    │
│  LLM receives: [2000 token system prompt]               │
│               + [500 token history]                     │
│               + [user message]                          │
│                    ↓                                    │
│  LLM thinks: "מה הנייר? מה הגימור? מה המחיר?"          │
│                    ↓                                    │
│  LLM calls: calculate_custom_job(...)                   │
│                    ↓                                    │
│  Server calculates price                                │
│                    ↓                                    │
│  LLM formats response                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    AFTER (Light LLM)                    │
├─────────────────────────────────────────────────────────┤
│  User: "תכין לי 5000 פליירים"                           │
│                    ↓                                    │
│  LLM receives: [200 token minimal prompt]               │
│               + [50 token compressed context]           │
│                    ↓                                    │
│  LLM extracts: { product: "flyer", qty: 5000 }         │
│                    ↓                                    │
│  Server does EVERYTHING:                                │
│    - Smart defaults                                     │
│    - Optimal imposition                                 │
│    - Price calculation                                  │
│    - Response generation template                       │
│                    ↓                                    │
│  LLM just fills template or server sends directly       │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Prompt מינימלי מוצע

```
אתה עוזר לחילוץ פרמטרים מבקשות דפוס בעברית.

חלץ את הפרמטרים הבאים (JSON):
- product: סוג מוצר (flyer/bc/invitation/rollup/booklet/sticker)
- qty: כמות (מספר)
- paper: סוג נייר (אם צוין)
- finishing: גימור (אם צוין)
- action: פעולה (quote/update/remove/clear)

אם חסר מידע, החזר null לאותו שדה.
דוגמה: "5000 פליירים" → {"product":"flyer","qty":5000,"paper":null,"finishing":null,"action":"quote"}
```

**גודל: ~150 tokens במקום 2000!**

### 2.4 שני מצבי LLM

```javascript
// מצב 1: חילוץ פרמטרים (זול, מהיר)
const extractParams = async (userMessage) => {
    const response = await llm.complete({
        model: "gemini-2.0-flash",
        prompt: MINIMAL_EXTRACTION_PROMPT + userMessage,
        max_tokens: 100,
        response_format: "json"
    });
    return JSON.parse(response);
};

// מצב 2: שיחה חופשית (רק כשצריך)
const freeChat = async (userMessage, context) => {
    // משתמשים בזה רק לשאלות כלליות, לא לתמחור
    const response = await llm.complete({
        model: "gemini-2.0-flash",
        prompt: CONVERSATIONAL_PROMPT + context + userMessage,
        max_tokens: 300
    });
    return response;
};

// הנתב
const router = (userMessage) => {
    // אם יש מילות מפתח של תמחור → extractParams
    if (containsPricingKeywords(userMessage)) {
        return { mode: 'extract', handler: extractParams };
    }
    // אחרת → שיחה חופשית
    return { mode: 'chat', handler: freeChat };
};
```

### 2.5 חיסכון צפוי

| מדד | לפני | אחרי | חיסכון |
|-----|------|------|--------|
| Tokens per request | ~3000 | ~400 | 87% |
| Cost per 1000 requests | $0.90 | $0.12 | 87% |
| Response time | ~2s | ~0.5s | 75% |

---

## חלק 3: ניהול זיכרון דינמי

### 3.1 הבעיה: Context Window

כל LLM מוגבל בכמות הטקסט שהוא יכול "לזכור":
- GPT-3.5: 4K tokens
- GPT-4: 8K-128K tokens
- Gemini 2.0 Flash: 1M tokens (אבל יקר!)

**הבעיה האמיתית:** לא הגודל, אלא העלות. שליחת 10K tokens בכל בקשה = עלות גבוהה.

### 3.2 ארכיטקטורת זיכרון היררכית

```
┌─────────────────────────────────────────────────────────┐
│                   MEMORY ARCHITECTURE                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Layer 1: Immediate Context (in prompt)                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ - Current cart summary (1 line per item)        │   │
│  │ - Last 2 messages                               │   │
│  │ - Active constraints                            │   │
│  │ Size: ~100-200 tokens                           │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                               │
│  Layer 2: Session State (server-side)                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ - Full cart with all details                    │   │
│  │ - Customer profile                              │   │
│  │ - Conversation history (last 20)                │   │
│  │ - Preferences learned                           │   │
│  │ Storage: In-memory (sessions object)            │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                               │
│  Layer 3: Long-term Memory (optional, DB)               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ - Customer history across sessions              │   │
│  │ - Common orders                                 │   │
│  │ - Price history                                 │   │
│  │ Storage: Database / Vector DB                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Sliding Window + Compression

```javascript
class ConversationMemory {
    constructor(maxMessages = 20) {
        this.maxMessages = maxMessages;
        this.messages = [];
        this.summary = "";
        this.keyFacts = [];
    }
    
    addMessage(role, content) {
        this.messages.push({ role, content, timestamp: Date.now() });
        
        // אם יש יותר מדי הודעות
        if (this.messages.length > this.maxMessages) {
            // דחוס את ההודעות הישנות לסיכום
            const oldMessages = this.messages.splice(0, 5);
            this.compressToSummary(oldMessages);
        }
    }
    
    compressToSummary(messages) {
        // חילוץ עובדות מפתח (ללא LLM!)
        for (const msg of messages) {
            // חפש מספרים (כמויות)
            const quantities = msg.content.match(/\d+/g);
            // חפש מוצרים
            const products = this.extractProducts(msg.content);
            // שמור עובדות
            if (quantities && products.length) {
                this.keyFacts.push({
                    product: products[0],
                    qty: quantities[0],
                    timestamp: msg.timestamp
                });
            }
        }
    }
    
    getContextForLLM() {
        // החזר רק את מה שה-LLM צריך
        return {
            summary: this.summary,
            recentMessages: this.messages.slice(-4), // רק 4 אחרונות
            keyFacts: this.keyFacts.slice(-5) // רק 5 עובדות אחרונות
        };
    }
}
```

### 3.4 Server-Side State Management

```javascript
// sessionManager.js - גרסה משופרת

const sessions = new Map();

class Session {
    constructor(userId) {
        this.userId = userId;
        this.cart = [];
        this.memory = new ConversationMemory();
        this.profile = {
            name: null,
            phone: null,
            preferences: {
                defaultPaper: null,
                priceRange: null
            }
        };
        this.state = {
            currentProduct: null,
            awaitingInput: null,
            lastAction: null
        };
        this.createdAt = Date.now();
        this.lastActivity = Date.now();
    }
    
    // למד העדפות מההתנהגות
    learnPreference(key, value) {
        if (!this.profile.preferences[key]) {
            this.profile.preferences[key] = value;
        }
    }
    
    // צור prompt מינימלי
    generateMinimalPrompt() {
        const cartSummary = this.cart.length > 0 
            ? this.cart.map(i => `${i.product_name}:${i.qty}→₪${i.client_price}`).join('|')
            : 'ריק';
            
        return `[עגלה:${cartSummary}]`;
    }
}

function getSession(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, new Session(userId));
    }
    const session = sessions.get(userId);
    session.lastActivity = Date.now();
    return session;
}
```

---

## חלק 4: ארכיטקטורה מוצעת - "Pini Engine"

### 4.1 תרשים זרימה

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER MESSAGE                            │
│                    "5000 פליירים לחלוקה"                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    1. MESSAGE CLASSIFIER                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Rules-based (NO LLM):                                  │   │
│  │  - Contains number + product keyword? → QUOTE           │   │
│  │  - Contains "תמחק/הסר/בטל"? → REMOVE                    │   │
│  │  - Contains "שנה/עדכן"? → UPDATE                        │   │
│  │  - Otherwise → CHAT                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│   QUOTE/UPDATE/REMOVE │       │        CHAT           │
│   (Server handles)    │       │    (LLM handles)      │
└───────────┬───────────┘       └───────────┬───────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│ 2. PARAMETER EXTRACTOR│       │   3. LLM CHAT MODE    │
│  ┌─────────────────┐  │       │  (Minimal prompt)     │
│  │ Regex/Rules:    │  │       │                       │
│  │ - qty: \d+      │  │       │  "איך אני יכול       │
│  │ - product: map  │  │       │   לעזור?"             │
│  │ - paper: map    │  │       │                       │
│  │ - finishing: map│  │       │                       │
│  └─────────────────┘  │       └───────────────────────┘
└───────────┬───────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. OPTIMIZATION ENGINE                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  a. Smart Defaults:                                      │   │
│  │     - flyer → chromo_135                                 │   │
│  │     - bc → chromo_300                                    │   │
│  │     - invitation → pearl_300                             │   │
│  │                                                          │   │
│  │  b. Imposition Calculator:                               │   │
│  │     - Find best sheet size                               │   │
│  │     - Calculate ups                                      │   │
│  │     - Calculate waste                                    │   │
│  │                                                          │   │
│  │  c. Cost Calculator:                                     │   │
│  │     - Paper cost                                         │   │
│  │     - Click cost (per sheet × sides)                     │   │
│  │     - Setup cost                                         │   │
│  │     - Finishing cost                                     │   │
│  │                                                          │   │
│  │  d. Price Calculator:                                    │   │
│  │     - Apply margin (qty-based)                           │   │
│  │     - Round to nice number                               │   │
│  │     - Check minimum price                                │   │
│  │                                                          │   │
│  │  e. Upsell Detector:                                     │   │
│  │     - Check if +X units = minimal cost increase          │   │
│  │     - Generate upsell suggestion                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    5. RESPONSE BUILDER                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Server builds EVERYTHING:                               │   │
│  │  - Quote card data (product, qty, price, breakdown)      │   │
│  │  - Production instructions                               │   │
│  │  - Dashboard stats                                       │   │
│  │  - Text response (template-based, NO LLM)                │   │
│  │  - Upsell suggestion (if applicable)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      6. FRONTEND                                │
│  - Display quote card                                           │
│  - Update cart                                                  │
│  - Update dashboard                                             │
│  - Show text response                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 מתי בכלל צריך LLM?

| סוג בקשה | LLM נדרש? | הסיבה |
|----------|----------|-------|
| "5000 פליירים" | ❌ לא | Regex יכול לחלץ |
| "תוסיף גם כרטיסים" | ❌ לא | Regex + keyword map |
| "שנה ל-10000" | ❌ לא | Regex + context |
| "תמחק את הרולאפ" | ❌ לא | Keyword + product match |
| "מה ההבדל בין כרומו למט?" | ✅ כן | שאלה פתוחה |
| "תמליץ לי על נייר לחתונה" | ✅ כן | דורש הבנה |
| "למה המחיר כזה גבוה?" | ⚠️ אולי | יכול להיות template |

**מסקנה:** ~80% מהבקשות לא צריכות LLM בכלל!

### 4.3 Response Templates (ללא LLM)

```javascript
const RESPONSE_TEMPLATES = {
    quote_added: (item) => 
        `מעולה! הוספתי ${item.qty} ${item.product_name}. ` +
        `חישבתי על בסיס ${item.description}, שזה הסטנדרט.`,
    
    quote_updated: (item, oldQty) =>
        `עדכנתי את הכמות מ-${oldQty} ל-${item.qty}. המחיר התעדכן בהתאם.`,
    
    item_removed: (productName) =>
        `הסרתי את ${productName} מהעגלה.`,
    
    cart_cleared: () =>
        `העגלה רוקנה. מה תרצה להזמין?`,
    
    upsell: (currentQty, suggestedQty, priceDiff) =>
        `💡 טיפ: ב-${priceDiff}₪ נוספים בלבד תקבל ${suggestedQty} במקום ${currentQty}!`,
    
    missing_info: (missingField) =>
        `כדי לתת הצעה מדויקת, אני צריך לדעת ${missingField}. מה תבחר?`
};
```

---

## חלק 5: מבנה קבצים מוצע

```
pini_system/
├── server.js                    # Express server
├── package.json
├── .env
│
├── db/
│   ├── materials.json           # חומרים ומחירים
│   ├── products.json            # הגדרות מוצרים
│   └── imposition_table.json    # טבלת אימפוזיציה מוכנה
│
├── engine/
│   ├── classifier.js            # מסווג הודעות (rules-based)
│   ├── extractor.js             # חילוץ פרמטרים (regex)
│   ├── optimizer.js             # אופטימיזציית אימפוזיציה
│   ├── calculator.js            # חישוב מחירים
│   └── responseBuilder.js       # בניית תשובות (templates)
│
├── services/
│   ├── sessionManager.js        # ניהול סשנים וזיכרון
│   ├── llmService.js            # קריאות ל-LLM (רק כשצריך)
│   └── pdfService.js            # יצירת PDF
│
├── config/
│   ├── prompts.js               # Prompts מינימליים
│   └── rules.js                 # חוקים עסקיים
│
└── public/
    └── index.html               # Frontend
```

---

## חלק 6: סיכום והמלצות

### 6.1 עקרונות מנחים

1. **"השרת הוא המוח"** - כל הלוגיקה העסקית בשרת
2. **"LLM הוא הפה"** - רק לתקשורת טבעית כשצריך
3. **"Rules First"** - נסה rules/regex לפני LLM
4. **"Minimal Tokens"** - כל token עולה כסף
5. **"Precompute"** - טבלאות מוכנות במקום חישוב בזמן אמת

### 6.2 צעדים הבאים

1. **שלב 1:** בנה את `classifier.js` ו-`extractor.js` (rules-based)
2. **שלב 2:** בנה את `optimizer.js` עם טבלת אימפוזיציה
3. **שלב 3:** שכתב את `calculator.js` עם לוגיקת השוואה
4. **שלב 4:** בנה `responseBuilder.js` עם templates
5. **שלב 5:** שלב את ה-LLM רק למקרים שבאמת צריך

### 6.3 מדדי הצלחה

| מדד | מצב נוכחי | יעד |
|-----|----------|-----|
| זמן תגובה | ~2-3 שניות | < 0.5 שניות |
| עלות per request | ~$0.003 | < $0.0005 |
| דיוק חישוב | 90% | 99% |
| "הזיות" LLM | יש | 0 |
| החלפת מנהל | 50% | 95% |

---

## חלק 7: ניהול סטטוס עיצוב וקבצים

### 7.1 למה זה קריטי?

הצעת מחיר לדפוס בלי לדעת את מצב העיצוב היא חסרת משמעות. מנהל דפוס מנוסה תמיד שואל: "יש לך קובץ מוכן?"

### 7.2 מצבי העיצוב האפשריים

```
┌─────────────────────────────────────────────────────────────┐
│                    DESIGN STATUS MATRIX                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STATUS 1: PRINT-READY (מוכן להדפסה)                        │
│  ├─ מה יש: PDF/AI עם bleed, CMYK, fonts embedded           │
│  ├─ מה צריך: כלום                                          │
│  ├─ תוספת מחיר: ₪0                                         │
│  └─ תוספת זמן: 0                                           │
│                                                             │
│  STATUS 2: NEEDS_ADJUSTMENT (צריך התאמה)                    │
│  ├─ מה יש: Word/Canva/JPG ברזולוציה נמוכה/RGB              │
│  ├─ מה צריך: המרה ל-CMYK, הוספת bleed, בדיקת רזולוציה      │
│  ├─ תוספת מחיר: ₪50-150                                    │
│  └─ תוספת זמן: +1 יום עסקים                                │
│                                                             │
│  STATUS 3: NEEDS_DESIGN (צריך עיצוב)                        │
│  ├─ מה יש: לוגו + תוכן טקסטואלי                            │
│  ├─ מה צריך: עיצוב גרפי מלא                                │
│  ├─ תוספת מחיר: ₪150-500 (תלוי מורכבות)                    │
│  └─ תוספת זמן: +2-3 ימי עסקים                              │
│                                                             │
│  STATUS 4: NEEDS_EVERYTHING (צריך הכל)                      │
│  ├─ מה יש: כלום או רעיון בלבד                              │
│  ├─ מה צריך: עיצוב לוגו + עיצוב מוצר                       │
│  ├─ תוספת מחיר: ₪500-2000                                  │
│  └─ תוספת זמן: +5-7 ימי עסקים                              │
│                                                             │
│  STATUS 5: REPEAT_ORDER (הזמנה חוזרת)                       │
│  ├─ מה יש: קובץ קיים במערכת מהזמנה קודמת                   │
│  ├─ מה צריך: כלום (אולי עדכון קטן)                         │
│  ├─ תוספת מחיר: ₪0 (הנחת לקוח חוזר אפשרית)                 │
│  └─ תוספת זמן: 0                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 טבלת תמחור עיצוב לפי מוצר

| מוצר | התאמה בסיסית | עיצוב סטנדרטי | עיצוב פרימיום |
|------|-------------|--------------|---------------|
| כרטיס ביקור | ₪50 | ₪150 | ₪350 |
| פלייר A5 | ₪75 | ₪200 | ₪450 |
| פלייר A4 | ₪75 | ₪250 | ₪550 |
| פרוספקט (3 עמודים) | ₪100 | ₪350 | ₪700 |
| הזמנה לאירוע | ₪100 | ₪300 | ₪600 |
| רולאפ | ₪100 | ₪300 | ₪600 |
| חוברת (עד 16 עמ') | ₪150 | ₪500 | ₪1200 |
| חוברת (עד 32 עמ') | ₪200 | ₪800 | ₪1800 |

### 7.4 זרימת השיחה המעודכנת

```
┌─────────────────────────────────────────────────────────────┐
│              CONVERSATION FLOW WITH DESIGN CHECK            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  USER: "אני צריך 1000 כרטיסי ביקור"                         │
│                         ↓                                   │
│  BOT: "מעולה! לפני שאתן הצעה - יש לך קובץ מוכן להדפסה?"    │
│                         ↓                                   │
│  [QUICK REPLY BUTTONS]                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ כן, PDF מוכן  │ 📄 יש עיצוב, לא בטוח │           │   │
│  │ 🎨 צריך עיצוב   │ 🆕 צריך הכל מאפס    │           │   │
│  │ 🔄 כמו פעם שעברה │                      │           │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  [IF "צריך עיצוב"]                                          │
│                         ↓                                   │
│  BOT: "אין בעיה! הנה המחיר המפורט:                         │
│                                                             │
│        🖨️ הדפסה 1000 כרטיסים: ₪180                         │
│        🎨 עיצוב גרפי: ₪150                                  │
│        ━━━━━━━━━━━━━━━━━━━━━                                │
│        💰 סה״כ: ₪330                                        │
│                                                             │
│        ⏱️ זמן אספקה: 4-5 ימי עסקים                          │
│                                                             │
│        מה הסגנון שאתה מחפש? מינימליסטי? קלאסי? מודרני?"    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.5 בדיקת קובץ אוטומטית (פיצ'ר עתידי)

כשלקוח מעלה קובץ, המערכת יכולה לבדוק אוטומטית:

```javascript
const FILE_CHECKS = {
    // בדיקות טכניות
    resolution: {
        min: 300, // DPI
        check: (file) => file.dpi >= 300,
        error: "הרזולוציה נמוכה מדי (${file.dpi} DPI). צריך לפחות 300 DPI."
    },
    
    colorSpace: {
        required: 'CMYK',
        check: (file) => file.colorSpace === 'CMYK',
        warning: "הקובץ ב-RGB. נמיר ל-CMYK (יתכנו שינויי צבע קלים)."
    },
    
    bleed: {
        min: 3, // מ"מ
        check: (file) => file.bleed >= 3,
        error: "חסר bleed (שפה). צריך להוסיף 3 מ"מ מכל צד."
    },
    
    fonts: {
        check: (file) => file.fontsEmbedded === true,
        error: "הפונטים לא מוטמעים בקובץ. יתכנו בעיות תצוגה."
    },
    
    fileType: {
        allowed: ['pdf', 'ai', 'eps', 'tiff'],
        preferred: 'pdf',
        check: (file) => ['pdf', 'ai', 'eps', 'tiff'].includes(file.type),
        error: "סוג קובץ לא נתמך. אנא שלח PDF, AI, EPS או TIFF."
    }
};

function analyzeUploadedFile(file) {
    const issues = [];
    const warnings = [];
    
    for (const [checkName, check] of Object.entries(FILE_CHECKS)) {
        if (!check.check(file)) {
            if (check.error) issues.push(check.error);
            if (check.warning) warnings.push(check.warning);
        }
    }
    
    return {
        status: issues.length === 0 ? 'ready' : 'needs_adjustment',
        issues,
        warnings,
        estimatedFixCost: issues.length * 25, // ₪25 לכל תיקון
        estimatedFixTime: issues.length > 0 ? 1 : 0 // ימים
    };
}
```

### 7.6 מבנה נתונים מעודכן

```javascript
// עדכון ל-Session object
const sessionSchema = {
    userId: String,
    cart: [{
        product_name: String,
        qty: Number,
        client_price: Number,
        
        // === חדש: מידע עיצוב ===
        design: {
            status: 'ready' | 'needs_adjustment' | 'needs_design' | 'needs_everything' | 'repeat',
            fileUploaded: Boolean,
            fileAnalysis: {
                issues: [String],
                warnings: [String]
            },
            designCost: Number,
            designNotes: String
        }
    }],
    
    // === חדש: קבצי לקוח ===
    customerFiles: [{
        filename: String,
        uploadDate: Date,
        productRef: String, // לאיזה מוצר בעגלה
        status: 'pending' | 'approved' | 'rejected',
        analysis: Object
    }]
};
```

### 7.7 תמחור דינמי כולל עיצוב

```javascript
function calculateTotalQuote(item) {
    // מחיר הדפסה בסיסי
    const printCost = calculatePrintCost(item);
    
    // עלות עיצוב לפי סטטוס
    let designCost = 0;
    
    switch (item.design.status) {
        case 'ready':
        case 'repeat':
            designCost = 0;
            break;
            
        case 'needs_adjustment':
            designCost = DESIGN_PRICING[item.product_name]?.adjustment || 50;
            break;
            
        case 'needs_design':
            designCost = DESIGN_PRICING[item.product_name]?.standard || 200;
            break;
            
        case 'needs_everything':
            designCost = DESIGN_PRICING[item.product_name]?.premium || 500;
            // כולל עיצוב לוגו אם צריך
            if (!item.hasLogo) {
                designCost += 350; // עיצוב לוגו בסיסי
            }
            break;
    }
    
    return {
        printCost,
        designCost,
        totalCost: printCost + designCost,
        breakdown: {
            print: printCost,
            design: designCost
        }
    };
}
```

---

## חלק 8: תכנית פעולה - איך מתקדמים

### 8.1 שלבי פיתוח מוצעים

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT ROADMAP                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PHASE 1: FOUNDATION (שבוע 1-2)                             │
│  ═══════════════════════════════                            │
│  ☐ 1.1 Refactor calculation.js → optimization engine       │
│  ☐ 1.2 Build imposition lookup table                       │
│  ☐ 1.3 Create message classifier (rules-based)             │
│  ☐ 1.4 Create parameter extractor (regex)                  │
│  ☐ 1.5 Build response templates                            │
│                                                             │
│  PHASE 2: SMART FEATURES (שבוע 3-4)                         │
│  ═══════════════════════════════                            │
│  ☐ 2.1 Add design status flow                              │
│  ☐ 2.2 Implement upsell logic                              │
│  ☐ 2.3 Add constraints validation                          │
│  ☐ 2.4 Create dynamic memory system                        │
│  ☐ 2.5 Optimize LLM calls (minimal prompts)                │
│                                                             │
│  PHASE 3: PRODUCTION TOOLS (שבוע 5-6)                       │
│  ═══════════════════════════════                            │
│  ☐ 3.1 Generate production job cards                       │
│  ☐ 3.2 PDF quote generation                                │
│  ☐ 3.3 Manager dashboard                                   │
│  ☐ 3.4 Cost tracking & analytics                           │
│                                                             │
│  PHASE 4: ADVANCED (שבוע 7-8)                               │
│  ═══════════════════════════════                            │
│  ☐ 4.1 File upload & analysis                              │
│  ☐ 4.2 Customer database                                   │
│  ☐ 4.3 Repeat order detection                              │
│  ☐ 4.4 WhatsApp integration                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 מה לעשות עכשיו (Phase 1)

**צעד 1: שכתוב מנוע החישוב**

הקובץ הנוכחי `calculation.js` טוב, אבל צריך להוסיף:
- טבלת אימפוזיציה מוכנה
- השוואת גדלי גיליון
- חישוב Upsell
- תמיכה בסטטוס עיצוב

**צעד 2: בניית Message Classifier**

קובץ חדש `classifier.js`:
- זיהוי כוונה ללא LLM
- מיפוי מילות מפתח
- ניתוב לפונקציה הנכונה

**צעד 3: עדכון Server.js**

- להפחית תלות ב-LLM
- להוסיף נתיב "מהיר" שעוקף את ה-LLM
- להשתמש ב-templates לתשובות

**צעד 4: עדכון Frontend**

- להוסיף כפתורי Quick Reply
- להציג פירוט עיצוב
- להוסיף אפשרות העלאת קובץ

### 8.3 מבנה קבצים מעודכן

```
pini_system/
├── server.js                    # Express server (simplified)
├── package.json
├── .env
│
├── db/
│   ├── materials.json           # חומרים ומחירים ✓
│   ├── products.json            # הגדרות מוצרים ✓
│   ├── imposition.json          # טבלת אימפוזיציה (חדש!)
│   └── design_pricing.json      # תמחור עיצוב (חדש!)
│
├── engine/
│   ├── classifier.js            # מסווג הודעות (חדש!)
│   ├── extractor.js             # חילוץ פרמטרים (חדש!)
│   ├── optimizer.js             # אופטימיזציית אימפוזיציה (חדש!)
│   ├── calculator.js            # חישוב מחירים (משופר)
│   └── responseBuilder.js       # בניית תשובות (חדש!)
│
├── services/
│   ├── sessionManager.js        # ניהול סשנים (משופר)
│   ├── llmService.js            # קריאות ל-LLM (מינימלי)
│   ├── pdfService.js            # יצירת PDF ✓
│   └── fileAnalyzer.js          # בדיקת קבצים (חדש!)
│
├── config/
│   ├── prompts.js               # Prompts מינימליים
│   ├── rules.js                 # חוקים עסקיים
│   └── templates.js             # תבניות תשובה
│
└── public/
    └── index.html               # Frontend (משופר)
```

### 8.4 קריטריונים להצלחה

| מדד | מצב נוכחי | יעד Phase 1 | יעד סופי |
|-----|----------|-------------|----------|
| אחוז בקשות ללא LLM | 0% | 60% | 85% |
| זמן תגובה ממוצע | 2-3s | 1s | 0.3s |
| עלות לבקשה | $0.003 | $0.001 | $0.0003 |
| דיוק הצעות מחיר | 85% | 95% | 99% |
| שאלות עיצוב | לא קיים | בסיסי | מלא עם בדיקת קובץ |
| Upsell suggestions | לא קיים | בסיסי | חכם עם ROI |

---

## נספח: קוד דוגמה

### A. Message Classifier (Rules-Based)

```javascript
// engine/classifier.js

const PRODUCT_KEYWORDS = {
    'פלייר': 'flyer', 'פליירים': 'flyer', 'עלון': 'flyer',
    'כרטיס': 'bc', 'כרטיסים': 'bc', 'ביקור': 'bc',
    'הזמנה': 'invitation', 'הזמנות': 'invitation',
    'רולאפ': 'rollup', 'באנר': 'rollup', 'שמשונית': 'banner',
    'קנבס': 'canvas', 'תמונה': 'canvas',
    'מדבקה': 'sticker', 'מדבקות': 'sticker',
    'חוברת': 'booklet', 'קטלוג': 'booklet'
};

const ACTION_KEYWORDS = {
    remove: ['תמחק', 'הסר', 'תוריד', 'בטל', 'הוצא'],
    update: ['שנה', 'עדכן', 'תחליף', 'במקום'],
    clear: ['נקה', 'רוקן', 'התחל מחדש', 'מחק הכל']
};

function classifyMessage(message) {
    const text = message.toLowerCase();
    
    // Check for clear cart
    if (ACTION_KEYWORDS.clear.some(kw => text.includes(kw))) {
        return { action: 'clear', confidence: 1.0 };
    }
    
    // Check for remove
    if (ACTION_KEYWORDS.remove.some(kw => text.includes(kw))) {
        const product = findProductInText(text);
        return { action: 'remove', product, confidence: 0.9 };
    }
    
    // Check for quantity (quote or update)
    const qtyMatch = text.match(/(\d+)/);
    if (qtyMatch) {
        const qty = parseInt(qtyMatch[1]);
        const product = findProductInText(text);
        
        if (ACTION_KEYWORDS.update.some(kw => text.includes(kw))) {
            return { action: 'update', qty, product, confidence: 0.9 };
        }
        
        if (product) {
            return { action: 'quote', qty, product, confidence: 0.95 };
        }
    }
    
    // Default: needs LLM
    return { action: 'chat', confidence: 0.5 };
}

function findProductInText(text) {
    for (const [keyword, product] of Object.entries(PRODUCT_KEYWORDS)) {
        if (text.includes(keyword)) {
            return product;
        }
    }
    return null;
}

module.exports = { classifyMessage };
```

### B. Imposition Optimizer

```javascript
// engine/optimizer.js

const SHEET_SIZES = {
    'SRA3': { width: 32, height: 45, clickCost: 0.35 },
    'SRA4': { width: 22.5, height: 32, clickCost: 0.25 },
    'A3': { width: 29.7, height: 42, clickCost: 0.30 },
    'A4': { width: 21, height: 29.7, clickCost: 0.20 }
};

const PRODUCT_SIZES = {
    'bc': { width: 9, height: 5 },
    'flyer_a5': { width: 14.8, height: 21 },
    'flyer_a6': { width: 10.5, height: 14.8 },
    'invitation': { width: 13, height: 18 }
};

function calculateUps(productW, productH, sheetW, sheetH) {
    // Include 3mm bleed on each side
    const pw = productW + 0.6;
    const ph = productH + 0.6;
    
    const option1 = Math.floor(sheetW / pw) * Math.floor(sheetH / ph);
    const option2 = Math.floor(sheetW / ph) * Math.floor(sheetH / pw);
    
    return Math.max(option1, option2);
}

function findOptimalSetup(product, qty, options = {}) {
    const productSize = PRODUCT_SIZES[product] || { width: 15, height: 21 };
    const results = [];
    
    for (const [sheetName, sheet] of Object.entries(SHEET_SIZES)) {
        const ups = calculateUps(
            productSize.width, 
            productSize.height, 
            sheet.width, 
            sheet.height
        );
        
        if (ups === 0) continue;
        
        const sheetsNeeded = Math.ceil(qty / ups);
        const wasteUnits = (sheetsNeeded * ups) - qty;
        const wastePercent = (wasteUnits / (sheetsNeeded * ups)) * 100;
        
        const paperCost = sheetsNeeded * 0.15; // Simplified
        const clickCost = sheetsNeeded * sheet.clickCost * (options.doubleSided ? 2 : 1);
        const setupCost = 20;
        
        const totalCost = paperCost + clickCost + setupCost;
        
        results.push({
            sheetSize: sheetName,
            ups,
            sheetsNeeded,
            wastePercent: wastePercent.toFixed(1),
            totalCost: totalCost.toFixed(2),
            costPerUnit: (totalCost / qty).toFixed(3)
        });
    }
    
    // Sort by total cost
    results.sort((a, b) => parseFloat(a.totalCost) - parseFloat(b.totalCost));
    
    return {
        optimal: results[0],
        alternatives: results.slice(1),
        upsell: calculateUpsell(results[0], qty)
    };
}

function calculateUpsell(optimal, currentQty) {
    // Check if ordering more makes sense
    const fullSheetQty = optimal.sheetsNeeded * optimal.ups;
    
    if (fullSheetQty > currentQty * 1.1) { // More than 10% waste
        const extraUnits = fullSheetQty - currentQty;
        return {
            suggested: true,
            newQty: fullSheetQty,
            extraUnits,
            extraCost: 0, // Same sheets, no extra cost!
            message: `קבל ${extraUnits} יחידות נוספות בחינם (ממילא מודפסות)`
        };
    }
    
    return { suggested: false };
}

module.exports = { findOptimalSetup, calculateUps };
```

---

**סוף מסמך המחקר**

מסמך זה מהווה בסיס לפיתוח מערכת הצעות מחיר אוטומטית שתחליף את עבודת המנהל ב-95% מהמקרים.
