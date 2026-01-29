import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { ApiService } from './services/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <nav style="padding: 1rem; background: #7b68ee; color: white; display: flex; gap: 20px; align-items: center;">
      <strong style="margin-right: auto; cursor: pointer;" (click)="goHome()">📋 Task Manager</strong>
      
      @if (api.token()) {
        <a routerLink="/teams" style="color: white; text-decoration: none; cursor: pointer;">צוותים</a>
        <button (click)="logout()" style="background: #ff6b6b; color: white; border: none; padding: 0.5rem 1rem; cursor: pointer; border-radius: 4px;">
          התנתקות
        </button>
      } @else {
        <a routerLink="/login" style="color: white; text-decoration: none; cursor: pointer;">התחברות</a>
      }
    </nav>
    <main style="padding: 20px;">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    nav a:hover { text-decoration: underline !important; }
    nav a { cursor: pointer; }
  `]
})
export class AppComponent {
  api = inject(ApiService);
  private router = inject(Router);

  logout() {
    this.api.logout();
    this.router.navigate(['/login']);
  }

  goHome() {
    if (this.api.token()) {
      this.router.navigate(['/teams']);
    } else {
      this.router.navigate(['/login']);
    }
  }
} 