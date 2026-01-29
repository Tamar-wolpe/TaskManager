# 📁 "All Projects" Feature - Complete Implementation

## Overview

Add a feature that displays all projects across all teams with full details, filtering, and sorting capabilities.

---

## 1️⃣ Backend API Endpoint

### GET /api/projects/all
**Get all projects with optional filtering and sorting**

#### Query Parameters:
```
?sortBy=created_at  // or 'name'
?order=DESC         // or 'ASC'
?search=keyword     // optional: search in name
```

#### Backend Implementation (Node.js)

```javascript
// routes/projects.js
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const { sortBy = 'created_at', order = 'DESC', search } = req.query;
    
    // Validate sort parameters
    const allowedSortBy = ['created_at', 'name'];
    const allowedOrder = ['ASC', 'DESC'];
    
    if (!allowedSortBy.includes(sortBy) || !allowedOrder.includes(order)) {
      return res.status(400).json({ error: 'Invalid sort parameters' });
    }
    
    // Build query
    let query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.team_id,
        t.name AS team_name,
        u.name AS created_by_name,
        p.created_at,
        p.updated_at,
        COUNT(DISTINCT ta.id) AS tasks_count,
        COUNT(DISTINCT CASE WHEN ta.status = 'done' THEN ta.id END) AS completed_tasks
      FROM projects p
      JOIN teams t ON p.team_id = t.id
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN tasks ta ON p.id = ta.project_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Add search filter if provided
    if (search) {
      query += ` AND p.name ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }
    
    // Add grouping for aggregate functions
    query += `
      GROUP BY p.id, p.name, p.description, p.team_id, t.name, u.name, p.created_at, p.updated_at
      ORDER BY p.${sortBy} ${order}
      LIMIT 100
    `;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});
```

#### Backend Implementation (C#/ASP.NET)

```csharp
[HttpGet("all")]
[Authorize]
public async Task<IActionResult> GetAllProjects(
    [FromQuery] string sortBy = "created_at",
    [FromQuery] string order = "DESC",
    [FromQuery] string search = null)
{
    var query = _context.Projects
        .Include(p => p.Team)
        .Include(p => p.CreatedBy)
        .Include(p => p.Tasks)
        .AsQueryable();
    
    // Filter by search
    if (!string.IsNullOrEmpty(search))
    {
        query = query.Where(p => p.Name.Contains(search));
    }
    
    // Sort
    query = sortBy switch
    {
        "name" => order == "DESC" ? query.OrderByDescending(p => p.Name) : query.OrderBy(p => p.Name),
        _ => order == "DESC" ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt)
    };
    
    var projects = await query
        .Select(p => new
        {
            p.Id,
            p.Name,
            p.Description,
            p.TeamId,
            TeamName = p.Team.Name,
            CreatedByName = p.CreatedBy.Name,
            p.CreatedAt,
            p.UpdatedAt,
            TasksCount = p.Tasks.Count,
            CompletedTasks = p.Tasks.Count(t => t.Status == "done")
        })
        .Take(100)
        .ToListAsync();
    
    return Ok(projects);
}
```

---

## 2️⃣ Frontend - API Service

Update `src/app/services/api.ts`:

```typescript
getAllProjects(sortBy: string = 'created_at', order: string = 'DESC'): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.baseUrl}/projects/all?sortBy=${sortBy}&order=${order}`
  );
}

searchProjects(keyword: string): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.baseUrl}/projects/all?search=${keyword}`
  );
}
```

---

## 3️⃣ Frontend - Create "All Projects" Component

Create `src/app/components/all-projects/all-projects.ts`:

```typescript
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ApiService } from '../../services/api';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-all-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './all-projects.html',
  styleUrl: './all-projects.css'
})
export class AllProjectsComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  allProjects = signal<any[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  
  sortBy = signal<'created_at' | 'name'>('created_at');
  sortOrder = signal<'ASC' | 'DESC'>('DESC');
  searchTerm = signal('');

  // Computed: Filter projects by search term
  filteredProjects = computed(() => {
    const projects = this.allProjects();
    const search = this.searchTerm().toLowerCase();
    
    if (!search) return projects;
    
    return projects.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.team_name.toLowerCase().includes(search) ||
      p.description?.toLowerCase().includes(search)
    );
  });

  ngOnInit() {
    this.loadAllProjects();
  }

  loadAllProjects() {
    this.loading.set(true);
    this.error.set(null);
    
    const sortBy = this.sortBy();
    const order = this.sortOrder();
    
    this.api.getAllProjects(sortBy, order).subscribe({
      next: (data) => {
        console.log(`✅ Loaded ${data.length} projects`);
        this.allProjects.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading projects:', err);
        this.error.set('שגיאה בטעינת הפרויקטים');
        this.loading.set(false);
      }
    });
  }

  changeSortBy(newSort: 'created_at' | 'name') {
    this.sortBy.set(newSort);
    this.loadAllProjects();
  }

  toggleSortOrder() {
    const newOrder = this.sortOrder() === 'ASC' ? 'DESC' : 'ASC';
    this.sortOrder.set(newOrder);
    this.loadAllProjects();
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    // Client-side filtering - no need to reload
  }

  goToProject(projectId: string) {
    this.router.navigate(['/tasks', projectId]);
  }

  goBack() {
    this.router.navigate(['/teams']);
  }

  getCompletionPercentage(project: any): number {
    if (project.tasks_count === 0) return 0;
    return Math.round((project.completed_tasks / project.tasks_count) * 100);
  }

  getProgressColor(percentage: number): string {
    if (percentage < 33) return '#f57c00'; // Orange
    if (percentage < 67) return '#fbc02d'; // Yellow
    return '#388e3c'; // Green
  }
}
```

---

## 4️⃣ Frontend - Template HTML

Create `src/app/components/all-projects/all-projects.html`:

```html
<div class="container">
  <!-- Header -->
  <div class="header">
    <h1>כל הפרויקטים</h1>
    <button class="btn-back" (click)="goBack()">← חזור לצוותים</button>
  </div>

  <!-- Loading State -->
  <div *ngIf="loading()" class="loading">
    ⏳ טוען פרויקטים...
  </div>

  <!-- Error Message -->
  <div *ngIf="error()" class="error">
    ⚠️ {{ error() }}
  </div>

  <!-- Controls -->
  <div class="controls">
    <!-- Search Bar -->
    <div class="search-box">
      <input
        type="text"
        [(ngModel)]="$signal.searchTerm"
        placeholder="חפש בשם פרויקט או צוות..."
        class="search-input"
      />
      <span class="search-icon">🔍</span>
    </div>

    <!-- Sort Controls -->
    <div class="sort-controls">
      <div class="sort-group">
        <label>מיין לפי:</label>
        <select [(ngModel)]="$signal.sortBy" (change)="changeSortBy($any($event.target).value)">
          <option value="created_at">תאריך יצירה</option>
          <option value="name">שם</option>
        </select>
      </div>

      <button class="btn-toggle-order" (click)="toggleSortOrder()">
        {{ sortOrder() === 'DESC' ? '↓ יורד' : '↑ עולה' }}
      </button>
    </div>

    <!-- Result Count -->
    <div class="result-count">
      נמצאו {{ filteredProjects().length }} פרויקטים
    </div>
  </div>

  <!-- Projects Grid -->
  <div class="projects-grid">
    <div *ngIf="filteredProjects().length === 0" class="no-projects">
      <p>אין פרויקטים להצגה</p>
    </div>

    <div *ngFor="let project of filteredProjects()" class="project-card">
      <!-- Header -->
      <div class="project-header">
        <div>
          <h3>{{ project.name }}</h3>
          <p class="team-name">צוות: <strong>{{ project.team_name }}</strong></p>
        </div>
        <button 
          class="btn-open" 
          (click)="goToProject(project.id)"
          title="פתח פרויקט">
          ➡️
        </button>
      </div>

      <!-- Description -->
      <div class="description">
        <p>{{ project.description || 'אין תיאור' }}</p>
      </div>

      <!-- Stats -->
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">משימות:</span>
          <span class="stat-value">{{ project.tasks_count }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">הושלמו:</span>
          <span class="stat-value">{{ project.completed_tasks }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">יוצר:</span>
          <span class="stat-value">{{ project.created_by_name || 'לא ידוע' }}</span>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="progress-section" *ngIf="project.tasks_count > 0">
        <div class="progress-label">
          התקדמות: {{ getCompletionPercentage(project) }}%
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            [style.width.%]="getCompletionPercentage(project)"
            [style.background-color]="getProgressColor(getCompletionPercentage(project))">
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="card-footer">
        <span class="created-date">
          יצור: {{ project.created_at | date: 'dd/MM/yyyy' }}
        </span>
      </div>
    </div>
  </div>
</div>
```

---

## 5️⃣ Frontend - Styling CSS

Create `src/app/components/all-projects/all-projects.css`:

```css
.container {
  max-width: 1200px;
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
  font-size: 28px;
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

.loading, .error {
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 16px;
  text-align: center;
}

.loading {
  background: #e3f2fd;
  color: #1976d2;
}

.error {
  background: #ffebee;
  color: #d32f2f;
}

/* Controls Section */
.controls {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  display: flex;
  gap: 20px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 250px;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 10px 35px 10px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
}

.search-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: #999;
}

.sort-controls {
  display: flex;
  gap: 15px;
  align-items: flex-end;
}

.sort-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.sort-group label {
  font-size: 12px;
  font-weight: bold;
  color: #666;
}

.sort-group select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background: white;
  cursor: pointer;
}

.btn-toggle-order {
  background: #4285f4;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
}

.btn-toggle-order:hover {
  background: #3367d6;
}

.result-count {
  font-size: 13px;
  color: #666;
  font-weight: bold;
}

/* Projects Grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.no-projects {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 16px;
}

/* Project Card */
.project-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.project-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
}

.project-header {
  padding: 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.project-header h3 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
}

.team-name {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.btn-open {
  background: #4285f4;
  color: white;
  border: none;
  width: 35px;
  height: 35px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-open:hover {
  background: #3367d6;
}

.description {
  padding: 15px;
  color: #666;
  font-size: 13px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.stats {
  padding: 15px;
  background: #f9f9f9;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  font-size: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  color: #666;
  font-weight: bold;
}

.stat-value {
  color: #333;
  font-weight: bold;
  background: white;
  padding: 2px 6px;
  border-radius: 3px;
}

/* Progress Bar */
.progress-section {
  padding: 15px;
  border-top: 1px solid #eee;
}

.progress-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-weight: bold;
}

.progress-bar {
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.card-footer {
  padding: 10px 15px;
  background: #fafafa;
  font-size: 11px;
  color: #999;
}

.created-date {
  display: block;
  text-align: center;
}

/* Responsive */
@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .sort-controls {
    flex-direction: column;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }

  .stats {
    grid-template-columns: 1fr;
  }
}
```

---

## 6️⃣ Update Routes

In `src/app/app.routes.ts`:

```typescript
import { AllProjectsComponent } from './components/all-projects/all-projects';

export const routes: Routes = [
  // ... other routes ...
  {
    path: 'projects/all',
    component: AllProjectsComponent,
    canActivate: [authGuard]
  }
];
```

---

## 7️⃣ Add Navigation Link

Update your teams or navbar component to include link to all projects:

```html
<button (click)="router.navigate(['/projects/all'])" class="btn-all-projects">
  📁 כל הפרויקטים
</button>
```

```typescript
// In component
router = inject(Router);

// In methods
goToAllProjects() {
  this.router.navigate(['/projects/all']);
}
```

---

## ✅ Features

✅ **View all projects** across all teams
✅ **Search** by name, team, or description
✅ **Sort** by name or creation date
✅ **Progress tracking** with completion percentage
✅ **Team grouping** - see which team each project belongs to
✅ **Task statistics** - count of tasks and completed tasks
✅ **Quick navigation** - click to open project
✅ **Responsive design** - works on mobile
✅ **Performance** - limited to 100 projects

---

## 🐛 Troubleshooting

### No projects showing
- Check backend endpoint returns data
- Verify authentication token sent
- Check browser console for errors

### Search not working
- Search is client-side filtering (instant)
- Check projects are loaded first
- Verify search term matches project names

### Sorting not working
- Reload projects after changing sort
- Check backend supports sortBy parameter
- Verify project timestamps exist

---

**"All Projects" feature is now complete! 🎉**
