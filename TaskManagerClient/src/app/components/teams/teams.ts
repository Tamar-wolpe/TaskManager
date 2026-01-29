import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../services/api';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teams.html',
  styleUrl: './teams.css'
})
export class TeamsComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  teams = signal<any[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadTeams();
  }

  loadTeams() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getTeams().subscribe({
      next: (data) => {
        this.teams.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('שגיאה בטעינת צוותים');
        this.loading.set(false);
        console.error('Error loading teams:', err);
      }
    });
  }

  createNewTeam() {
    const teamName = prompt('הכניסי את שם הצוות החדש:');
    if (teamName) {
      this.api.createTeam({ name: teamName }).subscribe({
        next: () => this.loadTeams(),
        error: (err) => {
          alert('שגיאה ביצירת צוות');
          console.error('Error creating team:', err);
        }
      });
    }
  }

  joinExistingTeam() {
    this.router.navigate(['/join-team']);
  }

  viewProjects(teamId: string) {
    this.router.navigate(['/projects', teamId]);
  }

  viewMembers(teamId: string) {
    this.router.navigate(['/team-members', teamId]);
  }

  viewAllProjects() {
    this.router.navigate(['/projects/all']);
  }

  joinTeamWithCode() {
    const code = prompt('הכניסי את קוד הצוות:');
    if (code) {
      this.loading.set(true);
      this.error.set(null);
      
      this.api.joinTeamByCode(code).subscribe({
        next: () => {
          this.loadTeams();
          alert('✅ הצטרפת לצוות בהצלחה!');
        },
        error: (err) => {
          this.error.set('שגיאה בהצטרפות לצוות: ' + (err.error?.error || err.message));
          this.loading.set(false);
          console.error('Error joining team:', err);
        }
      });
    }
  }
}