import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
  { 
    path: 'login', 
    loadComponent: () => import('./components/login/login').then(m => m.LoginComponent),
    canActivate: [noAuthGuard] // מניעה מקבלתן להכנס אם כבר מחובר
  },
  { 
    path: 'teams', 
    loadComponent: () => import('./components/teams/teams').then(m => m.TeamsComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'join-team', 
    loadComponent: () => import('./components/join-team/join-team').then(m => m.JoinTeamComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'team-members/:teamId', 
    loadComponent: () => import('./components/team-members/team-members').then(m => m.TeamMembersComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'projects/all', 
    loadComponent: () => import('./components/projects/projects').then(m => m.ProjectsComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'projects/:teamId', 
    loadComponent: () => import('./components/projects/projects').then(m => m.ProjectsComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'tasks/:projectId', 
    loadComponent: () => import('./components/task-board/task-board').then(m => m.TaskBoardComponent),
    canActivate: [authGuard]
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' } // לכל נתיב לא קיים, הפנה ל-login
];