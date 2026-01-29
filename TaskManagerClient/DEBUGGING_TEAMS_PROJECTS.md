# 🐛 Debugging Guide - Teams & Projects Loading Issues

## 🔍 Problem: "שגיאה בטעינת צוותים" (Error loading teams)

### Possible Causes & Solutions

---

## 1️⃣ **Issue: Backend Not Running or Wrong URL**

### Check if backend is accessible:

Open browser console (F12) and run:
```javascript
fetch('http://localhost:3000/api/teams', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(d => console.log('Teams:', d))
.catch(e => console.error('Error:', e))
```

### If fails:
- [ ] Backend server running? (Node.js/C#)
- [ ] Correct port? (Currently set to 3000, change if needed)
- [ ] CORS enabled on backend?

### Fix URL if needed (in api.ts):
```typescript
private readonly baseUrl = 'http://localhost:5000/api'; // Change 3000 to your port
```

---

## 2️⃣ **Issue: Missing Authorization Header**

### Current Implementation Check:

In `app.config.ts`:
```typescript
app.use((req, next) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.set('Authorization', `Bearer ${token}`);
  }
  return next(req);
});
```

### Test if header is being sent:

1. Open DevTools → Network tab
2. Try to load teams (navigate to /teams)
3. Look for GET request to `/api/teams`
4. Click on request → Headers tab
5. Look for `Authorization` header
6. Should show: `Authorization: Bearer eyJhbGc...`

### If missing:
- [ ] Check that token was saved during login
- [ ] Open DevTools Console and check: `localStorage.getItem('token')`
- [ ] Should return a long JWT token string

---

## 3️⃣ **Issue: Backend Missing /api/teams Endpoint**

### Backend implementation needed:

#### Node.js (Express) example:
```javascript
// routes/teams.js
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// GET /api/teams - Get all teams for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all teams where user is a member
    const query = `
      SELECT DISTINCT t.*
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = $1
      ORDER BY t.created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    
    // Return teams with member count
    const teams = result.rows.map(team => ({
      ...team,
      members_count: 0 // Will fill from separate query if needed
    }));
    
    res.json(teams);
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

module.exports = router;
```

#### C# (ASP.NET Core) example:
```csharp
// Controllers/TeamsController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TeamsController : ControllerBase
{
    private readonly ITeamService _teamService;
    
    [HttpGet]
    public async Task<IActionResult> GetTeams()
    {
        var userId = User.FindFirst("id")?.Value;
        var teams = await _teamService.GetUserTeams(userId);
        return Ok(teams);
    }
}
```

---

## 4️⃣ **Issue: Token Expired**

### Current implementation handles this, but check:

In `http-error.interceptor.ts`:
```typescript
// Should log out on 401 response
if (error.status === 401) {
  this.api.logout(); // Clears token
  this.router.navigate(['/login?expired=true']);
}
```

### Test:
1. Open DevTools → Application → Cookies/Storage
2. Check `localStorage` for token
3. Look at Network requests for 401 responses

---

## ✅ Complete Testing Flow

### Step 1: Verify Backend Setup

```bash
# 1. Check backend is running
curl http://localhost:3000/api/teams

# Should get 401 (Unauthorized) without token
# This means backend is working!
```

### Step 2: Test Authentication

In browser console:
```javascript
// Test login
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Login response:', data);
  localStorage.setItem('token', data.token);
})
```

### Step 3: Test Teams API

```javascript
// With token
fetch('http://localhost:3000/api/teams', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(data => console.log('Teams:', data))
.catch(e => console.error('Error:', e))
```

---

## 🛠️ Common Backend Mistakes

### ❌ Wrong database schema

Make sure team_members table exists:
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

### ❌ Authentication middleware not applied

```javascript
// ✅ CORRECT
app.get('/api/teams', authenticateToken, (req, res) => {
  // Now req.user is available
});

// ❌ WRONG
app.get('/api/teams', (req, res) => {
  // req.user is undefined
});
```

### ❌ CORS not enabled

```javascript
// Add CORS headers
const cors = require('cors');
app.use(cors());

// Or specify allowed origin:
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
```

### ❌ JWT not validated

```javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
  
  if (!token) return res.status(401).json({ error: 'Token required' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}
```

---

## 📡 Network Debugging

### Enable verbose logging in Angular:

In `api.ts`:
```typescript
getTeams(): Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/teams`).pipe(
    tap(data => console.log('✅ Teams loaded:', data)),
    catchError(error => {
      console.error('❌ Teams error:', error);
      throw error;
    })
  );
}
```

Import catchError:
```typescript
import { Observable, catchError, throwError } from 'rxjs';

// Then in subscribe:
this.api.getTeams().subscribe({
  next: (data) => {
    console.log('✅ Successfully loaded teams:', data);
    this.teams.set(data);
  },
  error: (err) => {
    console.error('❌ Failed to load teams:', err);
    console.log('Status:', err.status);
    console.log('Message:', err.message);
    console.log('Error:', err.error);
  }
});
```

---

## 🔧 Fixing the Teams Component

Ensure `teams.ts` has proper error logging:

```typescript
loadTeams() {
  this.loading.set(true);
  this.error.set(null);
  
  this.api.getTeams().subscribe({
    next: (data) => {
      console.log('✅ Teams loaded successfully:', data);
      this.teams.set(data);
      this.loading.set(false);
    },
    error: (err) => {
      console.error('❌ Error loading teams:', err);
      console.log('Error status:', err.status);
      console.log('Error details:', err.message);
      
      this.error.set('שגיאה בטעינת צוותים: ' + (err.error?.message || err.message));
      this.loading.set(false);
    }
  });
}
```

---

## 🎯 Quick Checklist

- [ ] Backend is running on correct port (3000)
- [ ] `/api/teams` endpoint exists on backend
- [ ] User is logged in (token in localStorage)
- [ ] Token is sent in Authorization header
- [ ] team_members table exists in database
- [ ] User is member of at least one team
- [ ] Backend returns 200 (not 401/403/500)
- [ ] CORS enabled for localhost:4200
- [ ] JWT secret configured on backend

---

## 💡 Pro Tips

1. **Always check DevTools Network tab first** - See exact error response
2. **Use console.log() liberally** - Know exactly what's happening
3. **Test endpoints with curl or Postman first** - Before debugging frontend
4. **Check browser dev tools** - F12 → Console for error messages
5. **Look for 401 responses** - Usually means token is missing/invalid

---

If still stuck, provide:
- [ ] Screenshot of Network tab showing /api/teams request
- [ ] What error message appears
- [ ] What your backend framework is (Node.js, C#, etc)
- [ ] Screenshot of backend server logs
