# 👥 Team Members Management - Complete Implementation

## Overview

This guide explains how to manage team members - adding users to teams, viewing members, and joining teams.

---

## 1️⃣ Database Schema (Backend)

### team_members Table

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id) -- Prevent duplicate memberships
);

-- Indexes for performance
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```

### teams Table (update)

```sql
-- Add team_code for joining teams
ALTER TABLE teams ADD COLUMN team_code VARCHAR(10) UNIQUE NOT NULL;

-- Add example codes when creating teams
-- Could be auto-generated: 10 random alphanumeric chars
```

---

## 2️⃣ API Endpoints (Backend Implementation)

### POST /api/teams/:teamId/members
**Add a member to a team by email**

#### Backend Code (Node.js/Express)

```javascript
// routes/teams.js
router.post('/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email, role = 'member' } = req.body;
    const userId = req.user.id;
    
    // 1. Check if current user is owner/admin of this team
    const permissionCheck = await db.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );
    
    if (!permissionCheck.rows[0] || !['owner', 'admin'].includes(permissionCheck.rows[0].role)) {
      return res.status(403).json({ error: 'Only owners can add members' });
    }
    
    // 2. Find user by email
    const userCheck = await db.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );
    
    if (!userCheck.rows[0]) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    const newUserId = userCheck.rows[0].id;
    
    // 3. Check if already member
    const memberCheck = await db.query(
      `SELECT id FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, newUserId]
    );
    
    if (memberCheck.rows[0]) {
      return res.status(400).json({ error: 'User already in team' });
    }
    
    // 4. Add to team
    const result = await db.query(
      `INSERT INTO team_members (team_id, user_id, role) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [teamId, newUserId, role]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding member:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});
```

#### Backend Code (C#/ASP.NET)

```csharp
[HttpPost("{teamId}/members")]
[Authorize]
public async Task<IActionResult> AddMember(string teamId, [FromBody] AddMemberRequest request)
{
    var userId = User.FindFirst("id")?.Value;
    
    // Check permissions
    var isOwner = await _context.TeamMembers
        .Where(tm => tm.TeamId == teamId && tm.UserId == userId)
        .Where(tm => tm.Role == "owner" || tm.Role == "admin")
        .AnyAsync();
    
    if (!isOwner)
        return Forbid();
    
    // Find user by email
    var newUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
    if (newUser == null)
        return BadRequest(new { error = "User not found" });
    
    // Check if already member
    var alreadyMember = await _context.TeamMembers
        .Where(tm => tm.TeamId == teamId && tm.UserId == newUser.Id)
        .AnyAsync();
    
    if (alreadyMember)
        return BadRequest(new { error = "User already in team" });
    
    // Add member
    var teamMember = new TeamMember
    {
        TeamId = teamId,
        UserId = newUser.Id,
        Role = request.Role ?? "member"
    };
    
    _context.TeamMembers.Add(teamMember);
    await _context.SaveChangesAsync();
    
    return CreatedAtAction(nameof(GetMember), new { id = teamMember.Id }, teamMember);
}
```

---

### GET /api/teams/:teamId/members
**Get all members of a team**

#### Backend (Node.js)

```javascript
router.get('/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const result = await db.query(
      `SELECT u.id, u.email, u.name, tm.role, tm.joined_at
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at DESC`,
      [teamId]
    );
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});
```

---

## 3️⃣ Frontend - Angular Implementation

### Step 1: API Service Methods (Already In Code)

In `src/app/services/api.ts`:

```typescript
// Add member to team
addMemberToTeam(teamId: string, email: string): Observable<any> {
  return this.http.post(`${this.baseUrl}/teams/${teamId}/members`, { email });
}

// Get team members
getTeamMembers(teamId: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/teams/${teamId}/members`);
}
```

✅ **Already implemented!**

---

### Step 2: Team Members Component

Create or update `src/app/components/team-members/team-members.ts`:

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-team-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-members.html',
  styleUrl: './team-members.css'
})
export class TeamMembersComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  teamId = '';
  members = signal<any[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  newMemberEmail = signal('');
  successMessage = signal<string | null>(null);

  ngOnInit() {
    this.teamId = this.route.snapshot.params['teamId'];
    this.loadMembers();
  }

  loadMembers() {
    this.loading.set(true);
    this.error.set(null);
    
    this.api.getTeamMembers(this.teamId).subscribe({
      next: (data) => {
        console.log('✅ Members loaded:', data);
        this.members.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading members:', err);
        this.error.set('שגיאה בטעינת חברים');
        this.loading.set(false);
      }
    });
  }

  addMember() {
    const email = this.newMemberEmail().trim();
    
    if (!email) {
      this.error.set('הכניסי כתובת אימייל');
      return;
    }
    
    this.loading.set(true);
    this.error.set(null);
    this.successMessage.set(null);
    
    this.api.addMemberToTeam(this.teamId, email).subscribe({
      next: () => {
        this.successMessage.set(`✅ ${email} נוסף לצוות בהצלחה!`);
        this.newMemberEmail.set('');
        this.loadMembers();
        
        // Clear success message after 3 seconds
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        console.error('❌ Error adding member:', err);
        const errorMsg = err.error?.error || err.message || 'שגיאה בהוספת חבר';
        this.error.set(errorMsg);
        this.loading.set(false);
      }
    });
  }

  removeMember(memberId: string) {
    // TODO: Implement remove member functionality
    // This would require a DELETE endpoint on backend
    if (confirm('האם אתה בטוח שברצונך להסיר חבר זה?')) {
      console.log('Remove member:', memberId);
    }
  }

  goBack() {
    this.router.navigate(['/teams']);
  }
}
```

### Step 3: Template HTML

Create `src/app/components/team-members/team-members.html`:

```html
<div class="container">
  <div class="header">
    <h1>ניהול חברים בצוות</h1>
    <button class="btn-back" (click)="goBack()">← חזור לצוותים</button>
  </div>

  <!-- Loading State -->
  <div *ngIf="loading()" class="loading">טוען...</div>

  <!-- Error Message -->
  <div *ngIf="error()" class="error">
    ⚠️ {{ error() }}
  </div>

  <!-- Success Message -->
  <div *ngIf="successMessage()" class="success">
    {{ successMessage() }}
  </div>

  <!-- Add Member Form -->
  <div class="add-member-form">
    <h2>הוסף חבר חדש</h2>
    <div class="form-group">
      <input
        type="email"
        [(ngModel)]="$signal.newMemberEmail"
        placeholder="הכניסי כתובת אימייל"
        (keyup.enter)="addMember()"
        class="input-field"
      />
      <button (click)="addMember()" class="btn-add">הוסף חבר</button>
    </div>
  </div>

  <!-- Members List -->
  <div class="members-list">
    <h2>חברים בצוות ({{ members().length }})</h2>
    
    <div *ngIf="members().length === 0" class="no-members">
      אין חברים בצוות עדיין
    </div>

    <div *ngFor="let member of members()" class="member-card">
      <div class="member-info">
        <h3>{{ member.name || member.email }}</h3>
        <p class="member-email">{{ member.email }}</p>
        <p class="member-role">תפקיד: <span class="role-badge">{{ member.role }}</span></p>
        <p class="member-joined">הצטרף: {{ member.joined_at | date: 'dd/MM/yyyy' }}</p>
      </div>
      <div class="member-actions">
        <!-- TODO: Add remove button when backend supports it -->
        <!-- <button (click)="removeMember(member.id)" class="btn-remove">הסר</button> -->
      </div>
    </div>
  </div>
</div>
```

### Step 4: Styling

Create `src/app/components/team-members/team-members.css`:

```css
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 2px solid #eee;
  padding-bottom: 15px;
}

.header h1 {
  margin: 0;
  color: #333;
}

.btn-back {
  background: #666;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-back:hover {
  background: #444;
}

.loading, .error, .success {
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 14px;
}

.loading {
  background: #e3f2fd;
  color: #1976d2;
}

.error {
  background: #ffebee;
  color: #d32f2f;
}

.success {
  background: #e8f5e9;
  color: #388e3c;
}

.add-member-form {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.add-member-form h2 {
  margin-top: 0;
  color: #333;
}

.form-group {
  display: flex;
  gap: 10px;
}

.input-field {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.input-field:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
}

.btn-add {
  background: #4285f4;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}

.btn-add:hover {
  background: #3367d6;
}

.members-list h2 {
  color: #333;
  margin-bottom: 20px;
}

.no-members {
  text-align: center;
  padding: 40px;
  background: #f5f5f5;
  border-radius: 4px;
  color: #999;
}

.member-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.member-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.member-info {
  flex: 1;
}

.member-info h3 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
}

.member-email {
  margin: 0;
  color: #666;
  font-size: 13px;
}

.member-role {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #666;
}

.role-badge {
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: bold;
  color: #333;
}

.member-joined {
  margin: 5px 0 0 0;
  font-size: 12px;
  color: #999;
}

.member-actions {
  display: flex;
  gap: 10px;
}

.btn-remove {
  background: #d32f2f;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-remove:hover {
  background: #c62828;
}
```

---

## 4️⃣ Update Routes

In `src/app/app.routes.ts`:

```typescript
import { TeamMembersComponent } from './components/team-members/team-members';

export const routes: Routes = [
  // ... other routes ...
  {
    path: 'team-members/:teamId',
    component: TeamMembersComponent,
    canActivate: [authGuard]
  }
];
```

---

## 5️⃣ Update Teams Template

Update `src/app/components/teams/teams.html` to add "Manage Members" button:

```html
<!-- In each team card -->
<div class="team-actions">
  <button (click)="viewMembers(teamId)">👥 חברים</button>
  <button (click)="viewProjects(teamId)">📁 פרויקטים</button>
</div>
```

Update `src/app/components/teams/teams.ts`:

```typescript
viewMembers(teamId: string) {
  this.router.navigate(['/team-members', teamId]);
}
```

---

## ✅ Complete Flow Summary

### Adding a Member:

```
1. User navigates to /team-members/:teamId
2. Component loads members via GET /api/teams/:teamId/members
3. User enters email and clicks "Add"
4. Angular sends POST /api/teams/:teamId/members { email }
5. Backend finds user by email
6. Backend checks permissions (user must be owner/admin)
7. Backend adds to team_members table
8. Frontend reloads members list
9. Success message shown
```

### Viewing Members:

```
1. Component calls getTeamMembers(teamId)
2. Backend queries team_members + users tables
3. Returns list with email, name, role, joined_at
4. Frontend displays in list
```

---

## 🐛 Troubleshooting

### Error: "User not found"
- Check email is spelled correctly
- Make sure user exists in users table
- Verify email format is valid

### Error: "Only owners can add members"
- Current user must be owner or admin of team
- Check team_members table: current user's role

### Error: "User already in team"
- Member is already in this team
- No duplicates allowed (UNIQUE constraint)

### No members showing
- Check GET endpoint returns data
- Verify team_members table has entries
- Check join with users table works

---

**Team members management is now fully integrated! 🎉**
