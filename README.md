# 🐺 WolfTasks - Collaborative Team Management System

![Angular 20](https://img.shields.io/badge/Angular-20.3.0-dd0031?style=for-the-badge&logo=angular)
![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=nodedotjs)
![SQLite](https://img.shields.io/badge/SQLite-3.x-003b57?style=for-the-badge&logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

WolfTasks היא מערכת Fullstack מודרנית לניהול משימות וצוותים, המאפשרת שיתוף פעולה בזמן אמת, ניהול פרויקטים אינטראקטיבי ומנגנון הרשאות חכם.

---

## ✨ פיצ'רים מרכזיים

### 📋 לוח משימות אינטראקטיבי (Kanban Board)
מימוש מלא של **Drag & Drop** למעבר בין סטטוסים (Backlog, In Progress, Done).
* **Optimistic Updates:** הממשק מתעדכן מיידית לשיפור חוויית המשתמש, עם מנגנון Rollback אוטומטי במקרה של שגיאת שרת.



### 🤝 ניהול צוותים חכם
* **הצטרפות בקוד:** הצטרפות מהירה לצוותים באמצעות `team_code` ייחודי.
* **ניהול הרשאות:** מנגנון Role-based Access Control (Owner, Admin, Member) המגן על המידע הרגיש.
* **תצוגת "כל הפרויקטים":** ריכוז של כל הפעילות מכל הצוותים במקום אחד עם יכולות סינון וחיפוש מתקדמות.

### 🔐 אבטחה וביצועים
* **Authentication:** אימות משתמשים באמצעות **JWT** (JSON Web Tokens).
* **Modern Control Flow:** שימוש בסינטקס החדש של Angular 20 (`@if`, `@for`) לביצועים אופטימליים.
* **Signals:** ניהול מצב (State Management) מודרני ותגובתי ללא צורך ב-Zone.js.



---

## 🛠️ טכנולוגיות

### Frontend
- **Angular 20** (Core, Signals, Standalone Components)
- **Angular CDK** (Drag & Drop)
- **RxJS** (Asynchronous Data Streams)
- **Tailwind CSS / Modern CSS** (Responsive UI)

### Backend
- **Node.js & Express**
- **SQLite** (Database)
- **JWT** (Security)

---

## 🚀 הוראות הרצה

### 1. שרת (Backend)
```bash
cd WolfTasksServer
npm install
# ליצירת נתונים ראשוניים
npm run seed
npm start
2. לקוח (Frontend)
Bash
cd TaskManagerClient
npm install
ng serve
האפליקציה תהיה זמינה בכתובת: http://localhost:4200

🏗️ מבנה בסיס הנתונים
המערכת מבוססת על מבנה טבלאות מקושרות (Relational):

Users: ניהול משתמשים ופרטי התחברות.

Teams: צוותים עם קודי הצטרפות ייחודיים.

Team Members: טבלת קישור לניהול תפקידים בצוות.

Projects & Tasks: היררכיית עבודה מסודרת.

👩‍💻 פותח על ידי
תמר וולפא פרויקט סיום אנגולר - מערכות ניהול מודרניות.
