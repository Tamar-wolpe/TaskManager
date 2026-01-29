# 🔧 Backend Changes Required - Node.js Server

## ⚡ Quick Summary

שרת Node.js **חייב** לעדכן את הקוד כדי שהפרונטאנד יעבוד:

### 1. Database:
- ✅ הוסף `team_code` ל-teams table
- ✅ יצור `team_members` table (Many-to-Many)

### 2. API Endpoints:
- ✅ `GET /api/teams/:teamId/members` - קבל רשימת חברים
- ✅ `POST /api/teams/join-by-code` - הצטרף בעזרת קוד
- ✅ `GET /api/teams/available-to-join` - צוותים פתוחים
- ✅ Update `GET /api/teams` - החזר team_code
- ✅ Update `POST /api/teams` - הוסף creator כ-owner ב-team_members
- ✅ Update `POST /api/teams/:teamId/members` - בדוק הרשאות

### 3. Middleware:
- ✅ `authenticateToken` - בדוק token בכל בקשה מוגנת
- ✅ Return 401 אם token לא תקף
- ✅ Return 403 אם משתמש אין הרשאות

### 4. Security:
- ✅ בדוק team_members table לכל פעולה
- ✅ אל תאפשר גישה לנתונים של צוות שהמשתמש לא חבר בו
- ✅ הוגן את הEndpoints עם authenticateToken

---

## 📊 Database Schema Changes

### 1️⃣ Update Users Table
```sql
-- Add team_code field to auto-generate codes
ALTER TABLE teams ADD COLUMN team_code VARCHAR(10) UNIQUE NOT NULL DEFAULT (SUBSTR(HEX(RANDOM()), 1, 6));

-- Make sure team_code is indexed for fast lookups
CREATE INDEX idx_team_code ON teams(team_code);
```

### 2️⃣ Create team_members Table (Many-to-Many)
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
```

### 3️⃣ Update Teams Table
```sql
-- Make sure teams has these columns:
-- id, name, description, team_code, created_by, created_at

-- Add team_code if missing
ALTER TABLE teams ADD COLUMN team_code VARCHAR(10) UNIQUE;

-- Update team_code for existing teams
UPDATE teams SET team_code = SUBSTR(HEX(RANDOM()), 1, 6) WHERE team_code IS NULL;

ALTER TABLE teams ALTER COLUMN team_code SET NOT NULL;
```

---

## 🔌 New API Endpoints (Express/Node.js)

### 1. ✅ Get Team Members
```javascript
// GET /api/teams/:teamId/members
router.get('/teams/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    
    // Check if user is member of this team
    const membership = await db.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );
    
    if (!membership.rows.length) {
      return res.status(403).json({ error: 'לא יש לך הרשאה' });
    }
    
    // Get all members
    const members = await db.query(`
      SELECT u.id, u.name, u.email, tm.role, tm.joined_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
      ORDER BY tm.role DESC, tm.joined_at ASC
    `, [teamId]);
    
    res.json(members.rows);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
});
```

### 2. ✅ Join Team by Code
```javascript
// POST /api/teams/join-by-code
router.post('/teams/join-by-code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;
    
    // Find team by code
    const team = await db.query(
      'SELECT id FROM teams WHERE team_code = $1',
      [code]
    );
    
    if (!team.rows.length) {
      return res.status(404).json({ error: 'קוד צוות לא תקין' });
    }
    
    const teamId = team.rows[0].id;
    
    // Check if already member
    const existing = await db.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );
    
    if (existing.rows.length) {
      return res.status(409).json({ error: 'אתה כבר חבר בצוות זה' });
    }
    
    // Add member
    await db.query(
      'INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), $1, $2, $3)',
      [teamId, userId, 'member']
    );
    
    res.status(201).json({ success: true, teamId });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
});
```

### 3. ✅ Get Available Teams to Join
```javascript
// GET /api/teams/available-to-join
router.get('/teams/available-to-join', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get teams that user is NOT a member of
    const teams = await db.query(`
      SELECT 
        t.id, t.name, t.description, t.team_code,
        COUNT(tm.user_id) as memberCount
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.id NOT IN (
        SELECT team_id FROM team_members WHERE user_id = $1
      )
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [userId]);
    
    res.json(teams.rows);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
});
```

### 4. ✅ Update Add Member to Team
```javascript
// POST /api/teams/:teamId/members
router.post('/teams/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email } = req.body;
    const userId = req.user.id;
    
    // Check if requester is owner or admin
    const membership = await db.query(
      'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );
    
    if (!membership.rows.length || !['owner', 'admin'].includes(membership.rows[0].role)) {
      return res.status(403).json({ error: 'אין הרשאה' });
    }
    
    // Find user by email
    const user = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (!user.rows.length) {
      return res.status(404).json({ error: 'משתמש לא קיים' });
    }
    
    const newUserId = user.rows[0].id;
    
    // Check if already member
    const existing = await db.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, newUserId]
    );
    
    if (existing.rows.length) {
      return res.status(409).json({ error: 'משתמש כבר חבר בצוות' });
    }
    
    // Add member
    await db.query(
      'INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), $1, $2, $3)',
      [teamId, newUserId, 'member']
    );
    
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
});
```

### 5. ✅ Update Get Teams (Modified)
```javascript
// GET /api/teams (מעדכן להחזיר את team_code וספירת חברים)
router.get('/teams', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const teams = await db.query(`
      SELECT 
        t.id, t.name, t.description, t.team_code,
        COUNT(tm.user_id) as memberCount
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.id IN (
        SELECT team_id FROM team_members WHERE user_id = $1
      )
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [userId]);
    
    res.json(teams.rows);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
});
```

### 6. ✅ Update Create Team (Modified)
```javascript
// POST /api/teams (מעדכן להוסיף את היוצר כ-owner)
router.post('/teams', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;
    
    // Generate unique team code
    let teamCode;
    let codeExists = true;
    while (codeExists) {
      teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const check = await db.query('SELECT id FROM teams WHERE team_code = $1', [teamCode]);
      codeExists = check.rows.length > 0;
    }
    
    // Create team
    const team = await db.query(
      'INSERT INTO teams (id, name, description, team_code, created_by) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id',
      [name, description || '', teamCode, userId]
    );
    
    const teamId = team.rows[0].id;
    
    // Add creator as owner
    await db.query(
      'INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), $1, $2, $3)',
      [teamId, userId, 'owner']
    );
    
    res.status(201).json({ 
      id: teamId, 
      name, 
      description: description || '', 
      team_code: teamCode,
      memberCount: 1 
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
});
```

---

## 🔐 Protect Routes - Backend Middleware

### authenticateToken Middleware (ודא שיש)
```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'אין token' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'token לא תקף' });
    }
    req.user = user;
    next();
  });
};
```

### Apply to ALL protected routes:
```javascript
// מכל route שדורש התחברות, הוסף את middleware:
router.get('/teams', authenticateToken, ...);
router.post('/teams', authenticateToken, ...);
router.get('/projects', authenticateToken, ...);
router.post('/projects', authenticateToken, ...);
router.get('/tasks', authenticateToken, ...);
router.post('/tasks', authenticateToken, ...);
// וכו'
```

---

## 📝 Summary of Changes

| שם | סוג | סטטוס |
|---|---|---|
| team_members table | DB | ✅ NEW |
| team_code column | DB | ✅ NEW |
| GET /teams/:teamId/members | API | ✅ NEW |
| POST /teams/join-by-code | API | ✅ NEW |
| GET /teams/available-to-join | API | ✅ NEW |
| GET /teams (updated) | API | 🔄 UPDATE |
| POST /teams (updated) | API | 🔄 UPDATE |
| POST /teams/:teamId/members | API | 🔄 UPDATE |
| authenticateToken | Middleware | ✅ CHECK |

