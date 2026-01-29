import 'dotenv/config';
import db from './src/db.js';
import bcrypt from 'bcryptjs';

function upsertUser(name, email, password, role='user') {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return existing.id;
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)').run(name, email, hash, role);
  return info.lastInsertRowid;
}

function generateTeamCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function seed() {
  // ✅ CHANGE 10: Migrate existing database if needed
  try {
    // Check if description column exists
    const tableInfo = db.prepare("PRAGMA table_info(teams)").all();
    const hasDescription = tableInfo.some(col => col.name === 'description');
    const hasTeamCode = tableInfo.some(col => col.name === 'team_code');
    const hasCreatedBy = tableInfo.some(col => col.name === 'created_by');
    
    // Add missing columns if they don't exist
    if (!hasDescription) {
      console.log('Migrating: Adding description column to teams...');
      try {
        db.exec('ALTER TABLE teams ADD COLUMN description TEXT');
      } catch (e) {
        console.log('Description column exists or error:', e.message.substring(0, 50));
      }
    }
    
    if (!hasTeamCode) {
      console.log('Migrating: Adding team_code column to teams...');
      try {
        db.exec('ALTER TABLE teams ADD COLUMN team_code TEXT');
      } catch (e) {
        console.log('Team_code column exists or error:', e.message.substring(0, 50));
      }
    }
    
    if (!hasCreatedBy) {
      console.log('Migrating: Adding created_by column to teams...');
      try {
        db.exec('ALTER TABLE teams ADD COLUMN created_by INTEGER');
      } catch (e) {
        console.log('Created_by column exists or error:', e.message.substring(0, 50));
      }
    }
  } catch (e) {
    console.log('Migration check skipped:', e.message.substring(0, 50));
  }

  const aliceId = upsertUser('Alice', 'alice@example.com', 'Password1!');
  const bobId = upsertUser('Bob', 'bob@example.com', 'Password1!');

  // Generate team code and create team with new fields
  const teamCode = generateTeamCode();
  
  // Update or create team
  const existing = db.prepare('SELECT id FROM teams WHERE name = ?').get('Core Team');
  if (existing) {
    // Update existing team
    db.prepare('UPDATE teams SET description = ?, team_code = ?, created_by = ? WHERE id = ?')
      .run('Main team for project management', teamCode, aliceId, existing.id);
    const teamId = existing.id;
    
    // Ensure members are set correctly
    db.prepare('INSERT OR IGNORE INTO team_members (team_id, user_id, role) VALUES (?,?,?)').run(teamId, aliceId, 'owner');
    db.prepare('INSERT OR IGNORE INTO team_members (team_id, user_id, role) VALUES (?,?,?)').run(teamId, bobId, 'member');
  } else {
    // Create new team
    const tinfo = db.prepare('INSERT INTO teams (name, description, team_code, created_by) VALUES (?,?,?,?)').run('Core Team', 'Main team for project management', teamCode, aliceId);
    const teamId = tinfo.lastInsertRowid;
    db.prepare('INSERT OR IGNORE INTO team_members (team_id, user_id, role) VALUES (?,?,?)').run(teamId, aliceId, 'owner');
    db.prepare('INSERT OR IGNORE INTO team_members (team_id, user_id, role) VALUES (?,?,?)').run(teamId, bobId, 'member');
  }

  const teamId = db.prepare('SELECT id FROM teams WHERE name = ?').get('Core Team').id;

  // Create project if doesn't exist
  const existingProject = db.prepare('SELECT id FROM projects WHERE name = ? AND team_id = ?').get('Launch', teamId);
  let projectId;
  if (existingProject) {
    projectId = existingProject.id;
  } else {
    const pinfo = db.prepare('INSERT INTO projects (team_id, name, description) VALUES (?,?,?)').run(teamId, 'Launch', 'Product launch project');
    projectId = pinfo.lastInsertRowid;
  }

  // Add tasks if not exist
  const existingTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?').get(projectId);
  if (existingTasks.count === 0) {
    const taskStmt = db.prepare('INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, order_index) VALUES (?,?,?,?,?,?,?)');
    taskStmt.run(projectId, 'Plan campaign', 'Define channels and KPIs', 'in_progress', 'high', aliceId, 1);
    taskStmt.run(projectId, 'Design assets', 'Create visuals', 'todo', 'normal', bobId, 2);
    taskStmt.run(projectId, 'Update landing page', 'Copy and layout', 'todo', 'low', null, 3);
  }

  console.log('Seed completed. Users: alice@example.com/bob@example.com, password: Password1!');
  console.log(`Team code: ${teamCode}`);
}

seed();
