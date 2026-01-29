import db from '../db.js';

/**
 * ✅ CHANGE 1: List Teams - Updated to include team_code and memberCount
 * GET /api/teams - Get all teams for current user
 */
export function listTeams(req, res) {
  try {
    const teams = db
      .prepare(
        `SELECT 
           t.id, t.name, t.description, t.team_code, t.created_by, t.created_at,
           COUNT(tm.user_id) as memberCount
         FROM teams t
         LEFT JOIN team_members tm ON tm.team_id = t.id
         WHERE t.id IN (
           SELECT team_id FROM team_members WHERE user_id = ?
         )
         GROUP BY t.id
         ORDER BY t.created_at DESC`
      )
      .all(req.user.id);
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
}

/**
 * ✅ CHANGE 2: Create Team - Updated to generate team_code and add creator as owner
 * POST /api/teams - Create new team and add creator as owner
 */
export function createTeam(req, res) {
  try {
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    
    // Generate unique team code
    let teamCode;
    let codeExists = true;
    while (codeExists) {
      teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const check = db.prepare('SELECT id FROM teams WHERE team_code = ?').get(teamCode);
      codeExists = !!check;
    }
    
    // Create team with team_code and creator
    const info = db
      .prepare('INSERT INTO teams (name, description, team_code, created_by) VALUES (?,?,?,?)')
      .run(name, description || '', teamCode, req.user.id);
    
    const teamId = info.lastInsertRowid;
    
    // Add creator as owner
    db
      .prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?,?,?)')
      .run(teamId, req.user.id, 'owner');
    
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    res.status(201).json({ ...team, memberCount: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
}

/**
 * ✅ CHANGE 3: Add Member - Updated with role enforcement for owner/admin
 * POST /api/teams/:teamId/members - Add member (by email or userId)
 */
export function addMember(req, res) {
  try {
    const { teamId } = req.params;
    const { email, userId, role = 'member' } = req.body || {};
    
    // Check if requester is owner or admin
    const membership = db
      .prepare('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?')
      .get(teamId, req.user.id);
    
    if (!membership) return res.status(403).json({ error: 'אתה לא חבר בצוות' });
    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: 'אין הרשאה להוסיף חברים' });
    }
    
    // Find user by email if email provided
    let targetUserId = userId;
    if (email && !userId) {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (!user) return res.status(404).json({ error: 'משתמש לא קיים' });
      targetUserId = user.id;
    }
    
    if (!targetUserId) return res.status(400).json({ error: 'email or userId required' });
    
    // Check if already member
    const existing = db
      .prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?')
      .get(teamId, targetUserId);
    
    if (existing) {
      return res.status(409).json({ error: 'משתמש כבר חבר בצוות' });
    }
    
    // Add member
    db
      .prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?,?,?)')
      .run(teamId, targetUserId, role);
    
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
}

/**
 * ✅ CHANGE 4: Get Team Members - NEW endpoint
 * GET /api/teams/:teamId/members - Get all members of a team
 */
export function getTeamMembers(req, res) {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    
    // Check if user is member of this team
    const membership = db
      .prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?')
      .get(teamId, userId);
    
    if (!membership) {
      return res.status(403).json({ error: 'לא יש לך הרשאה' });
    }
    
    // Get all members
    const members = db
      .prepare(`
        SELECT u.id, u.name, u.email, tm.role, tm.team_id
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ?
        ORDER BY tm.role DESC, tm.team_id ASC
      `)
      .all(teamId);
    
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
}

/**
 * ✅ CHANGE 5: Join Team by Code - NEW endpoint
 * POST /api/teams/join-by-code - Join a team using team_code
 */
export function joinTeamByCode(req, res) {
  try {
    const { code } = req.body;
    const userId = req.user.id;
    
    if (!code) return res.status(400).json({ error: 'code required' });
    
    // Find team by code
    const team = db.prepare('SELECT id FROM teams WHERE team_code = ?').get(code);
    
    if (!team) {
      return res.status(404).json({ error: 'קוד צוות לא תקין' });
    }
    
    const teamId = team.id;
    
    // Check if already member
    const existing = db
      .prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?')
      .get(teamId, userId);
    
    if (existing) {
      return res.status(409).json({ error: 'אתה כבר חבר בצוות זה' });
    }
    
    // Add member
    db
      .prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?,?,?)')
      .run(teamId, userId, 'member');
    
    res.status(201).json({ success: true, teamId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
}

/**
 * ✅ CHANGE 6: Get Available Teams to Join - NEW endpoint
 * GET /api/teams/available-to-join - Get teams user can join
 */
export function getAvailableTeams(req, res) {
  try {
    const userId = req.user.id;
    
    // Get teams that user is NOT a member of
    const teams = db
      .prepare(`
        SELECT 
          t.id, t.name, t.description, t.team_code, t.created_at,
          COUNT(tm.user_id) as memberCount
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE t.id NOT IN (
          SELECT team_id FROM team_members WHERE user_id = ?
        )
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `)
      .all(userId);
    
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
}
