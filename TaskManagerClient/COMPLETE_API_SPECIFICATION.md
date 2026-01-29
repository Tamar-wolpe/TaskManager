# 🔧 Backend API Specification - Complete Integration Guide

## 📋 Overview

This document details all the backend changes and API endpoints required for the Angular Task Manager application to work correctly.

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Teams Table
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_code VARCHAR(10) UNIQUE, -- For joining teams
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Team Members Table (Many-to-Many)
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Index for fast lookups
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```

### Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_projects_team_id ON projects(team_id);
```

### Tasks Table
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'backlog', -- 'backlog', 'in-progress', 'done'
  priority VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high'
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
```

### Comments Table
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_comments_task_id ON comments(task_id);
```

---

## 🔐 Authentication Endpoints

### POST /api/auth/register
**Register a new user**

Request:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "User Name"
}
```

Response (201):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "token": "jwt_token_here"
}
```

Response (400):
```json
{
  "error": "Email already exists"
}
```

---

### POST /api/auth/login
**Authenticate user and return JWT token**

Request:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

Response (200):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "token": "jwt_token_here"
}
```

Response (401):
```json
{
  "error": "Invalid credentials"
}
```

---

## 👥 Team Management Endpoints

### GET /api/teams
**Get all teams for authenticated user**

Headers:
```
Authorization: Bearer jwt_token
```

Response (200):
```json
[
  {
    "id": "team_uuid",
    "name": "Team Name",
    "description": "Team Description",
    "created_by": "user_uuid",
    "team_code": "ABC123XYZ",
    "members_count": 5,
    "created_at": "2026-01-29T10:00:00Z",
    "role": "owner" // Role of current user in this team
  }
]
```

**Logic:**
- Filter teams where user is in team_members table
- Include role of user in each team
- Return team_code for joining purposes
- Include member count

---

### POST /api/teams
**Create a new team**

Headers:
```
Authorization: Bearer jwt_token
```

Request:
```json
{
  "name": "New Team",
  "description": "Team Description"
}
```

Response (201):
```json
{
  "id": "new_team_uuid",
  "name": "New Team",
  "description": "Team Description",
  "created_by": "current_user_uuid",
  "team_code": "AUTO_GENERATED_CODE",
  "created_at": "2026-01-29T10:00:00Z"
}
```

**Logic:**
- Create teams table entry
- Auto-generate team_code (10 characters, unique)
- Add creator as 'owner' in team_members table
- Return created team with code

---

### GET /api/teams/:teamId/members
**Get all members of a team**

Headers:
```
Authorization: Bearer jwt_token
```

Response (200):
```json
[
  {
    "id": "user_uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "owner", // Role in this team
    "joined_at": "2026-01-29T10:00:00Z"
  }
]
```

**Logic:**
- Query team_members table for this team
- Join with users table to get user details
- Return array of members with their roles

---

### POST /api/teams/:teamId/members
**Add a member to a team**

Headers:
```
Authorization: Bearer jwt_token
```

Request:
```json
{
  "email": "newmember@example.com",
  "role": "member" // or 'admin', 'owner'
}
```

Response (201):
```json
{
  "id": "membership_uuid",
  "user_id": "user_uuid",
  "team_id": "team_uuid",
  "role": "member",
  "joined_at": "2026-01-29T10:00:00Z"
}
```

**Logic:**
- Check if current user has permission (owner or admin)
- Find user by email
- Create entry in team_members table
- Return created membership

Response (400):
```json
{
  "error": "User not found" // or already in team
}
```

Response (403):
```json
{
  "error": "Unauthorized - only owners can add members"
}
```

---

### POST /api/teams/join-by-code
**Join a team using team code**

Headers:
```
Authorization: Bearer jwt_token
```

Request:
```json
{
  "team_code": "ABC123XYZ"
}
```

Response (201):
```json
{
  "id": "team_uuid",
  "name": "Team Name",
  "description": "Team Description",
  "role": "member"
}
```

**Logic:**
- Find team by team_code
- Add current user to team_members with role 'member'
- Return team details

Response (404):
```json
{
  "error": "Team not found"
}
```

---

### GET /api/teams/available
**Get all teams available to join (not already member)**

Headers:
```
Authorization: Bearer jwt_token
```

Response (200):
```json
[
  {
    "id": "team_uuid",
    "name": "Team Name",
    "description": "Team Description",
    "members_count": 5,
    "created_by": "creator_uuid"
  }
]
```

**Logic:**
- Return all teams where user is NOT in team_members
- Include member count for context

---

## 📁 Project Management Endpoints

### GET /api/projects
**Get projects for current user**

Headers:
```
Authorization: Bearer jwt_token
```

Query Parameters:
```
?teamId=team_uuid  // Optional - filter by team
```

Response (200):
```json
[
  {
    "id": "project_uuid",
    "name": "Project Name",
    "description": "Project Description",
    "team_id": "team_uuid",
    "team_name": "Team Name",
    "created_by": "user_uuid",
    "created_at": "2026-01-29T10:00:00Z"
  }
]
```

**Logic:**
- Get all teams user is member of
- If teamId provided: filter to only that team's projects
- If no teamId: return all projects from all user's teams
- Join with teams table for team_name
- Order by created_at DESC

---

### GET /api/projects/all
**Get ALL projects in the system (for admin or overview)**

Headers:
```
Authorization: Bearer jwt_token
```

Query Parameters:
```
?sortBy=created_at  // or name
?order=DESC         // or ASC
```

Response (200):
```json
[
  {
    "id": "project_uuid",
    "name": "Project Name",
    "description": "Project Description",
    "team_id": "team_uuid",
    "team_name": "Team Name",
    "created_by": "user_uuid",
    "created_at": "2026-01-29T10:00:00Z",
    "tasks_count": 12 // Number of tasks in project
  }
]
```

**Logic:**
- Return all projects from all teams
- Include task count per project
- Support sorting by created_at or name
- Support order (ASC/DESC)

---

### POST /api/projects
**Create a new project**

Headers:
```
Authorization: Bearer jwt_token
```

Request:
```json
{
  "name": "New Project",
  "description": "Project Description",
  "team_id": "team_uuid"
}
```

Response (201):
```json
{
  "id": "new_project_uuid",
  "name": "New Project",
  "description": "Project Description",
  "team_id": "team_uuid",
  "created_by": "current_user_uuid",
  "created_at": "2026-01-29T10:00:00Z"
}
```

**Logic:**
- Verify current user is member of specified team
- Create project entry
- Return created project

Response (403):
```json
{
  "error": "You are not a member of this team"
}
```

---

## ✅ Task Management Endpoints

### GET /api/tasks
**Get tasks for a project**

Headers:
```
Authorization: Bearer jwt_token
```

Query Parameters:
```
?projectId=project_uuid
```

Response (200):
```json
[
  {
    "id": "task_uuid",
    "title": "Task Title",
    "description": "Task Description",
    "status": "in-progress",
    "priority": "high",
    "project_id": "project_uuid",
    "created_by": "user_uuid",
    "created_at": "2026-01-29T10:00:00Z"
  }
]
```

---

### POST /api/tasks
**Create a new task**

Headers:
```
Authorization: Bearer jwt_token
```

Request:
```json
{
  "title": "New Task",
  "description": "Task Description",
  "status": "backlog",
  "priority": "medium",
  "project_id": "project_uuid"
}
```

Response (201):
```json
{
  "id": "new_task_uuid",
  "title": "New Task",
  "description": "Task Description",
  "status": "backlog",
  "priority": "medium",
  "project_id": "project_uuid",
  "created_by": "current_user_uuid",
  "created_at": "2026-01-29T10:00:00Z"
}
```

---

### PATCH /api/tasks/:taskId
**Update a task (especially status for drag-drop)**

Headers:
```
Authorization: Bearer jwt_token
```

Request:
```json
{
  "status": "in-progress",
  "priority": "high",
  "description": "Updated description"
}
```

Response (200):
```json
{
  "id": "task_uuid",
  "title": "Task Title",
  "description": "Updated description",
  "status": "in-progress",
  "priority": "high",
  "project_id": "project_uuid",
  "updated_at": "2026-01-29T10:00:00Z"
}
```

---

### DELETE /api/tasks/:taskId
**Delete a task**

Headers:
```
Authorization: Bearer jwt_token
```

Response (204):
```
No content
```

---

## 💬 Comments Endpoints

### GET /api/tasks/:taskId/comments
**Get comments for a task**

Headers:
```
Authorization: Bearer jwt_token
```

Response (200):
```json
[
  {
    "id": "comment_uuid",
    "content": "Comment text",
    "task_id": "task_uuid",
    "created_by": "user_uuid",
    "user_name": "User Name",
    "created_at": "2026-01-29T10:00:00Z"
  }
]
```

---

### POST /api/tasks/:taskId/comments
**Add a comment to a task**

Headers:
```
Authorization: Bearer jwt_token
```

Request:
```json
{
  "content": "Comment text"
}
```

Response (201):
```json
{
  "id": "comment_uuid",
  "content": "Comment text",
  "task_id": "task_uuid",
  "created_by": "current_user_uuid",
  "user_name": "Current User Name",
  "created_at": "2026-01-29T10:00:00Z"
}
```

---

## 🔒 Authentication Middleware

All protected endpoints require this middleware:

```javascript
// Pseudocode
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## 🛡️ Error Handling

### Standard Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid input",
  "details": "Field X is required"
}
```

**401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "Token required or expired"
}
```

**403 Forbidden**
```json
{
  "error": "Forbidden",
  "message": "You don't have permission for this action"
}
```

**404 Not Found**
```json
{
  "error": "Not found",
  "message": "Resource not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "message": "Something went wrong"
}
```

---

## ✅ Implementation Checklist

- [ ] Database schema created
- [ ] Authentication endpoints (register, login)
- [ ] Team management endpoints
- [ ] Team members table & queries
- [ ] Project filtering by team
- [ ] All endpoints protected with authenticateToken middleware
- [ ] Error handling implemented
- [ ] CORS enabled for Angular frontend
- [ ] JWT secret configured in environment

---

## 🔄 Data Flow Summary

```
User Registers/Logs In
    ↓
Backend returns JWT token
    ↓
Angular stores token in localStorage
    ↓
Frontend adds "Authorization: Bearer token" to all requests
    ↓
Backend middleware validates token
    ↓
Request processes
    ↓
Backend returns data filtered by user's team membership
    ↓
Angular displays user's teams/projects
```

---

**This specification ensures proper team management, project filtering, and secure API access.**
