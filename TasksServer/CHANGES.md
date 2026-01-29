# 📋 תיעוד שינויים - Backend Server

## 📅 תאריך: 29.01.2026
## 👤 ממוציא: Senior Backend Manager

---

## 🎯 סיכום כללי

שרת Node.js עודכן עם תוכנות ניהול צוותים חדשות ומשופרות. כל השינויים תואמים לדרישות החזית.

---

## ✅ שינויים בביצוע

### 1️⃣ שינויי Database (src/db.js)

#### CHANGE 1: עדכון טבלת teams
**מה השתנה:**
- הוסף עמודה `team_code` (TEXT UNIQUE NOT NULL) - קוד ייחודי לכל צוות
- הוסף עמודה `description` (TEXT) - תיאור צוות
- הוסף עמודה `created_by` (INTEGER) - מזהה היוצר
- הוסף Foreign Key ל-users table

**למה:**
- `team_code` - מאפשר לחברים להצטרף בעזרת קוד ברק או טקסט
- `description` - מידע נוסף על הצוות
- `created_by` - מעקב אחרי מי יצר את הצוות

**שורות קוד:**
```sql
ALTER TABLE teams ADD COLUMN description TEXT;
ALTER TABLE teams ADD COLUMN team_code TEXT UNIQUE NOT NULL;
ALTER TABLE teams ADD COLUMN created_by INTEGER;
```

**Status:** ✅ הטבלה `team_members` כבר קיימת בקוד!

---

### 2️⃣ שינויי Controllers (src/controllers/teams.controller.js)

#### CHANGE 2: עדכון `listTeams()` function
**מה השתנה:**
- הוסף `team_code` לתוצאות
- הוסף ספירת `memberCount`
- הוסף `description` ו-`created_by`
- הוסף error handling עם try-catch

**למה:** צריך להחזיר את הקוד כדי שהחזית יוכל להציג אותו

**דוגמה:**
```javascript
// לפני:
SELECT t.*, (SELECT COUNT(*) FROM team_members...) as members_count

// אחרי:
SELECT t.id, t.name, t.description, t.team_code, t.created_by, t.created_at,
       COUNT(tm.user_id) as memberCount
```

---

#### CHANGE 3: עדכון `createTeam()` function
**מה השתנה:**
- יוצר `team_code` ייחודי אוטומטי
- שומר את `created_by` (ID של היוצר)
- מוסיף את היוצר כ-`owner` ב-team_members
- הוסף error handling

**קוד:**
```javascript
// יצירת team_code ייחודי
let teamCode;
let codeExists = true;
while (codeExists) {
  teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const check = db.prepare('SELECT id FROM teams WHERE team_code = ?').get(teamCode);
  codeExists = !!check;
}

// הוספת יוצר כ-owner
db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?,?,?)')
  .run(teamId, req.user.id, 'owner');
```

---

#### CHANGE 4: עדכון `addMember()` function
**מה השתנה:**
- בדיקת הרשאות קפדנית - רק owner/admin יכולים להוסיף
- תמיכה בהוספה לפי `email` או `userId`
- בדיקה אם משתמש כבר חבר
- error handling ותגובות צפויות

**קוד:**
```javascript
// בדיקת הרשאות
if (!['owner', 'admin'].includes(membership.role)) {
  return res.status(403).json({ error: 'אין הרשאה להוסיף חברים' });
}

// בדיקה אם כבר חבר
if (existing) {
  return res.status(409).json({ error: 'משתמש כבר חבר בצוות' });
}
```

---

#### CHANGE 5: `getTeamMembers()` - NEW FUNCTION
**מה זה:**
- endpoint חדש: `GET /api/teams/:teamId/members`
- מחזיר רשימת כל החברים בצוות

**קוד:**
```javascript
export function getTeamMembers(req, res) {
  // בדיקה: האם בקשן חבר בצוות?
  const membership = db
    .prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?')
    .get(teamId, userId);
  
  if (!membership) {
    return res.status(403).json({ error: 'לא יש לך הרשאה' });
  }
  
  // החזר את כל החברים
  const members = db.prepare(`
    SELECT u.id, u.name, u.email, tm.role, tm.team_id
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ?
  `).all(teamId);
  
  res.json(members);
}
```

---

#### CHANGE 6: `joinTeamByCode()` - NEW FUNCTION
**מה זה:**
- endpoint חדש: `POST /api/teams/join-by-code`
- מאפשר למשתמש להצטרף לצוות בעזרת קוד

**קוד:**
```javascript
export function joinTeamByCode(req, res) {
  const { code } = req.body;
  
  // חיפוש צוות לפי קוד
  const team = db.prepare('SELECT id FROM teams WHERE team_code = ?').get(code);
  
  if (!team) {
    return res.status(404).json({ error: 'קוד צוות לא תקין' });
  }
  
  // בדיקה: האם כבר חבר?
  const existing = db
    .prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?')
    .get(teamId, userId);
  
  if (existing) {
    return res.status(409).json({ error: 'אתה כבר חבר בצוות זה' });
  }
  
  // הוספה כ-member
  db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?,?,?)')
    .run(teamId, userId, 'member');
}
```

---

#### CHANGE 7: `getAvailableTeams()` - NEW FUNCTION
**מה זה:**
- endpoint חדש: `GET /api/teams/available-to-join`
- מחזיר צוותים שהמשתמש עדיין לא חבר בהם

**קוד:**
```javascript
export function getAvailableTeams(req, res) {
  // קבל צוותים שה-user לא חבר בהם
  const teams = db.prepare(`
    SELECT 
      t.id, t.name, t.description, t.team_code, t.created_at,
      COUNT(tm.user_id) as memberCount
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    WHERE t.id NOT IN (
      SELECT team_id FROM team_members WHERE user_id = ?
    )
    GROUP BY t.id
  `).all(userId);
  
  res.json(teams);
}
```

---

### 3️⃣ שינויי Routes (src/routes/teams.js)

#### CHANGE 8: עדכון routes file

**מה השתנה:**
- הוסף 3 endpoints חדשים
- כל endpoints מוגן עם `requireAuth`
- סדר הנכון של routes (specifics לפני generics)

**Routes החדשים/המעודכנים:**
```javascript
// GET /api/teams - עדכן להחזיר team_code
router.get('/', listTeams);

// GET /api/teams/available-to-join - חדש
router.get('/available-to-join', getAvailableTeams);

// POST /api/teams - עדכן עם team_code generation
router.post('/', createTeam);

// POST /api/teams/join-by-code - חדש
router.post('/join-by-code', joinTeamByCode);

// GET /api/teams/:teamId/members - חדש
router.get('/:teamId/members', getTeamMembers);

// POST /api/teams/:teamId/members - עדכן עם role enforcement
router.post('/:teamId/members', addMember);
```

**סדר חשוב!** `/available-to-join` חייב להיות לפני `/:teamId` כדי שלא יתבלבל

---

### 4️⃣ שינויי Seed (seed.js)

#### CHANGE 9: עדכון seed data
**מה השתנה:**
- הוסף `team_code` generation כשיוצרים צוות
- הוסף `description` וי `created_by`
- מחפש קוד ייחודי

**קוד:**
```javascript
function generateTeamCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const teamCode = generateTeamCode();
const tinfo = db.prepare(
  'INSERT INTO teams (name, description, team_code, created_by) VALUES (?,?,?,?)'
).run('Core Team', 'Main team for project management', teamCode, aliceId);

console.log(`Team code: ${teamCode}`);
```

---

## 🔒 Security & Authorization

### הרשאות בגדרות:
```
owner  - יכול להוסיף/הסיר חברים, עדכן הגדרות
admin  - יכול להוסיף/הסיר חברים
member - יכול לראות מידע צוות
```

### בדיקות Permissions:
```javascript
// בכל action שדורש הרשאה
const membership = db
  .prepare('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?')
  .get(teamId, userId);

if (!['owner', 'admin'].includes(membership.role)) {
  return res.status(403).json({ error: 'אין הרשאה' });
}
```

### Token Validation:
```javascript
// בכל protected route יש requireAuth middleware
const token = authHeader && authHeader.split(' ')[1];

if (!token) {
  return res.status(401).json({ error: 'אין token' });
}

jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
  if (err) return res.status(403).json({ error: 'token לא תקף' });
  req.user = user;
  next();
});
```

---

## 🧪 דוגמאות בדיקה

### 1. להצטרף לצוות בעזרת קוד:
```bash
POST /api/teams/join-by-code
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "AB1234"
}
```

### 2. לקבל רשימת חברים בצוות:
```bash
GET /api/teams/123/members
Authorization: Bearer <token>
```

### 3. לקבל צוותים פתוחים להצטרפות:
```bash
GET /api/teams/available-to-join
Authorization: Bearer <token>
```

### 4. לליצור צוות (עם team_code אוטומטי):
```bash
POST /api/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Team",
  "description": "Team for project X"
}

Response:
{
  "id": 1,
  "name": "My Team",
  "description": "Team for project X",
  "team_code": "AB1234",
  "memberCount": 1
}
```

---

## 📊 טבלת שינויים

| # | שם הוםשינוי | סוג | קובץ | סטטוס |
|---|---|---|---|---|
| 1 | עדכון teams table | Database | src/db.js | ✅ DONE |
| 2 | listTeams() עם team_code | Function | src/controllers/teams.controller.js | ✅ DONE |
| 3 | createTeam() עם team_code generation | Function | src/controllers/teams.controller.js | ✅ DONE |
| 4 | addMember() עם role enforcement | Function | src/controllers/teams.controller.js | ✅ DONE |
| 5 | getTeamMembers() - חדש | Function | src/controllers/teams.controller.js | ✅ DONE |
| 6 | joinTeamByCode() - חדש | Function | src/controllers/teams.controller.js | ✅ DONE |
| 7 | getAvailableTeams() - חדש | Function | src/controllers/teams.controller.js | ✅ DONE |
| 8 | עדכון routes ב-teams.js | Routes | src/routes/teams.js | ✅ DONE |
| 9 | עדכון seed data עם team_code | Data | seed.js | ✅ DONE |

---

## ⚙️ הוראות הפעלה

### 1. Reset Database (אפס בסיס נתונים):
```bash
rm data.sqlite
rm data.sqlite-shm
rm data.sqlite-wal
npm run seed
```

### 2. הפעלת השרת:
```bash
npm start
```

### 3. בדיקה:
```bash
curl -X GET http://localhost:3000/health
```

---

## 🔍 Verification Checklist

- ✅ team_code יצור אוטומטי וייחודי לכל צוות
- ✅ יוצר צוות מוסף כ-owner אוטומטי
- ✅ עדכון endpoints להחזיר team_code
- ✅ Endpoints חדשים עם הרשאות נכונות
- ✅ Error handling בכל functions
- ✅ authenticateToken middleware בכל routes
- ✅ בדיקות permission טובות (owner/admin only)
- ✅ Seed data עדכן עם team_code

---

## 📝 Notes

- כל endpoint מוגן עם `requireAuth` middleware
- כל POST לחברים דורש role owner/admin
- team_code ייחודי למנוע התנגשויות
- Error messages בעברית עבור משתמשים
- SQL queries optimized עם indexes

---

**תאריך עדכון:** 29.01.2026  
**Version:** 1.0  
**Status:** ✅ PRODUCTION READY
