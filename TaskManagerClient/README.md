# 🎯 TaskManagerClient - Angular 20 Advanced Task Management

**Status: ✅ Frontend Complete - Ready for Backend Integration**

This is a modern Angular 20 task management application with team collaboration, security, and drag-and-drop functionality.

## ✨ Key Features

✅ **Authentication & Security**
- JWT token-based authentication
- Token expiration detection
- Automatic logout on 401 errors
- Protected routes with guards
- HTTP interceptors for security

✅ **Team Management**
- Create and manage teams
- Add members to teams
- Join teams with team codes
- Team-based project filtering
- Role-based permissions

✅ **Project Management**
- Create projects within teams
- Team-specific project display
- Project filtering by team
- Multi-team support

✅ **Drag and Drop Kanban Board**
- Move tasks between columns (Backlog → In Progress → Done)
- Optimistic updates for instant feedback
- Server synchronization with rollback
- Smooth CSS animations
- Visual feedback during drag

---

## 📚 Documentation

### Start Here 🎯
- 📖 [COMPLETE_SOLUTION.md](COMPLETE_SOLUTION.md) - **Quick reference for all requirements**
- 📖 [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) - **Step-by-step guide with priorities**

### Feature Guides
- 📖 [TEAM_MEMBERS_GUIDE.md](TEAM_MEMBERS_GUIDE.md) - Add/manage team members
- 📖 [ALL_PROJECTS_FEATURE.md](ALL_PROJECTS_FEATURE.md) - View all projects with search & sort
- 📖 [COMPLETE_API_SPECIFICATION.md](COMPLETE_API_SPECIFICATION.md) - Full API + database schema
- 📖 [DEBUGGING_TEAMS_PROJECTS.md](DEBUGGING_TEAMS_PROJECTS.md) - Troubleshoot errors

### Architecture & Security
- 📖 [SECURITY_IMPLEMENTATION.md](SECURITY_IMPLEMENTATION.md) - Auth, guards, interceptors
- 📖 [ROUTE_GUARDS_GUIDE.md](ROUTE_GUARDS_GUIDE.md) - Route protection
- 📖 [DRAG_DROP_GUIDE.md](DRAG_DROP_GUIDE.md) - Kanban board implementation

### Legacy Docs
- 📖 [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) - Previous implementation status
- 📖 [BACKEND_CHANGES.md](BACKEND_CHANGES.md) - Original backend spec
- 📖 [DRAG_DROP_SUMMARY.md](DRAG_DROP_SUMMARY.md) - Drag-drop feature summary

---

## 🚀 Development server

To start the development server:

```bash
npm start
```

or

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload when you modify any source files.

---

## 📦 Build

To build for production:

```bash
ng build
```

Build artifacts are stored in the `dist/` directory with optimization for performance.

---

## 🧪 Running Tests

### Unit Tests
```bash
npm test
```

or

```bash
ng test
```

---

## 🏗️ Project Structure

```
src/app/
├── app.ts                    # Main app component
├── app.routes.ts             # Route configuration with guards
├── app.config.ts             # App configuration & interceptors
├── components/
│   ├── login/                # Authentication
│   ├── teams/                # Team management
│   ├── team-members/         # View/manage team members
│   ├── join-team/            # Join team interface
│   ├── projects/             # Project listing
│   └── task-board/           # Kanban board with drag-drop
├── services/
│   └── api.ts                # API communication
├── guards/
│   ├── auth.guard.ts         # Authentication guard
│   └── no-auth.guard.ts      # Prevent login when authenticated
└── interceptors/
    └── http-error.interceptor.ts  # Global error handling
```

---

## 🔐 Authentication

### Login Flow
1. User enters email and password
2. Backend validates and returns JWT token
3. Token stored in localStorage
4. Token included in all API requests via interceptor
5. Token expiration checked on every request

### Token Validation
- Client-side: JWT `exp` claim parsed to check expiration
- Server-side: Token validated on protected endpoints
- Auto-logout: Triggered by 401 response or expired token

See [SECURITY_IMPLEMENTATION.md](SECURITY_IMPLEMENTATION.md) for details.

---

## 🛣️ Routes

### Public Routes
- `/login` - Authentication (Register/Login)

### Protected Routes (require authGuard)
- `/teams` - List user's teams
- `/projects/all` - All projects user has access to
- `/projects/:teamId` - Team-specific projects
- `/tasks/:projectId` - Task Kanban board
- `/join-team` - Join existing team
- `/team-members/:teamId` - Manage team members

All protected routes redirect to `/login?returnUrl=...` if not authenticated.

See [ROUTE_GUARDS_GUIDE.md](ROUTE_GUARDS_GUIDE.md) for details.

---

## 🎯 Drag and Drop

### How It Works
1. Click and hold task card to start drag
2. Drag over another column to move
3. Release to drop task in new column
4. Task updates instantly (optimistic update)
5. Server sync happens in background

### Visual Feedback
- **Hover**: Card shows shadow and slight lift
- **During Drag**: Column highlights in green
- **Placeholder**: Original position shows faded placeholder
- **Preview**: Ghost image follows cursor

### Error Handling
- If server fails: Task automatically reverts to original column
- User sees error alert: "שגיאה בעדכון משימה"
- Console logs exact error for debugging

See [DRAG_DROP_GUIDE.md](DRAG_DROP_GUIDE.md) for implementation details.

---

## 📡 API Integration

### Required Endpoints

The frontend expects these API endpoints:

```
POST   /api/auth/register         - Register new user
POST   /api/auth/login            - Login user
GET    /api/teams                 - Get user's teams
POST   /api/teams                 - Create new team
GET    /api/teams/available       - Get teams user can join
POST   /api/teams/join-by-code    - Join team with code
GET    /api/teams/:id/members     - Get team members
POST   /api/teams/:id/members     - Add member to team

GET    /api/projects              - Get all projects
GET    /api/projects?teamId=X     - Get team's projects
POST   /api/projects              - Create project

GET    /api/tasks?projectId=X     - Get project's tasks
POST   /api/tasks                 - Create task
PATCH  /api/tasks/:id             - Update task (esp. status)
DELETE /api/tasks/:id             - Delete task

GET    /api/tasks/:id/comments    - Get task comments
POST   /api/tasks/:id/comments    - Add comment
```

See [BACKEND_CHANGES.md](BACKEND_CHANGES.md) for complete specification.

---

## 🔧 Configuration

### Environment Setup
- **Angular**: 20.3.0
- **Node.js**: 18+
- **npm**: 9+

### Dependencies
- **@angular/core**: 20.3.0
- **@angular/cdk**: 21.1.1 (Drag and Drop)
- **@angular/common**: 20.3.0
- **rxjs**: 7.8.0

---

## 📋 Compilation Status

```
✅ No TypeScript Errors
✅ No Compilation Warnings
✅ All Components Standalone
✅ All Routes Protected
✅ HTTP Interceptors Active
```

---

## 🚦 Current Status

### ✅ Completed
- Authentication & JWT handling
- Route guards (auth & no-auth)
- HTTP interceptors for security
- Team management interface
- Project filtering by team
- Drag and drop Kanban board
- Optimistic updates with rollback
- Error handling throughout
- Comprehensive documentation

### ⏳ Backend Implementation Needed
- API endpoints (see [BACKEND_CHANGES.md](BACKEND_CHANGES.md))
- Database schema updates
- Team member persistence
- Task status persistence
- Authentication backend

---

## 🆘 Troubleshooting

### "שגיאה בטעינת פרויקטים" (Error loading projects)
- Check that user is authenticated (token in localStorage)
- Verify backend API is running on configured URL
- Check Network tab in DevTools for API response

### "שגיאה בעדכון משימה" (Error updating task)
- Task automatically reverts to original position
- Check server PATCH endpoint is implemented
- Verify user has permission to update task

### Tasks not showing
- Navigate to specific project/team
- Check browser console for API errors
- Verify backend returns tasks with correct projectId

---

## 📞 Support

For issues or questions:
1. Check the relevant documentation file
2. Review console logs in DevTools
3. Check Network tab for API responses
4. Review error messages for clues

---

## 📝 License

This project is part of Angular coursework.

---

**✨ Modern Angular 20 Task Management - Production Ready Frontend ✨**


```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
