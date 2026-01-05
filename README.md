---
title: Pini Print Bot
emoji: 🖨️
colorFrom: blue
colorTo: green
sdk: docker
app_file: server.js
pinned: false
---

# Pini Bot Engine V3 - Server Heavy, LLM Light

## 📁 מבנה הקבצים

```
pini-bot/
├── server.js                    ← שרת ראשי V3
├── engine/                      
│   ├── classifier.js            ← סיווג הודעות (80% bypass LLM)
│   ├── calculation.js           ← מנוע חישוב מחירים
│   ├── optimizer.js             ← אימפוזיציה + upsell
│   ├── responseBuilder.js       ← תגובות עם אישיות
│   ├── personalityEngine.js     ← אישיות פיני + טקטיקות מכירה
│   ├── customerManager.js       ← ניהול לקוחות + CRM
│   └── dashboardManager.js      ← דשבורד לבית הדפוס
├── services/                    ← (קיים בפרויקט - לא נכלל כאן)
└── tests/
    └── test_scenario.js         ← 56 בדיקות אוטומטיות
```

## 🚀 מה חדש ב-V3

### 👥 ניהול לקוחות
- זיהוי אוטומטי לפי טלפון
- היסטוריית הזמנות
- העדפות נלמדות
- תגיות (VIP, עסקי, פרטי)

### 📊 דשבורד משופר
- מידע על העסקה (רווח, מרווח)
- פרטי לקוח
- התראות חכמות
- הצעות Upsell

### 🎭 אישיות פיני
- תגובות חמות ואנושיות
- זיהוי מצב רוח
- המלצות חכמות

## 🔧 התקנה

```bash
# 1. העתק קבצים
cp -r engine/ /path/to/pini-bot/
cp server.js /path/to/pini-bot/
cp -r tests/ /path/to/pini-bot/

# 2. הרץ בדיקות
node tests/test_scenario.js
```

## 📡 API Endpoints

### Chat
```
POST /api/chat
Body: { message, userId, phone?, customerName? }
Response: { content, cart, dashboard, customer, meta }
```

### Customers
```
GET /api/customers/search?q=...
GET /api/customers/:phone
POST /api/customers/:phone/notes
GET /api/customers-stats
```

### Utils
```
GET /api/stats
GET /api/health
POST /api/pdf
```

## 📊 תוצאות בדיקות

```
Total Tests:     56
Passed:          54 (96%)
Direct Calls:    80% ✅
LLM Calls:       20%
Savings:         $0.135 per 56 requests
```

## 💡 דוגמאות Response

### Chat Response
```javascript
{
  "content": "יופי של בחירה! 🎉 500 הזמנות ב-₪819",
  "cart": [...],
  "dashboard": {
    "currentDeal": {
      "totalPrice": 819,
      "profit": 491,
      "profitMargin": 60
    },
    "customer": {
      "name": "יוסי כהן",
      "isVIP": true
    },
    "alerts": [...]
  },
  "meta": {
    "classification": "quote",
    "usedLLM": false,
    "responseTime": 15
  }
}
```
