import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../services/api';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-join-team',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './join-team.html',
  styleUrl: './join-team.css'
})
export class JoinTeamComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  availableTeams = signal<any[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  
  joinMethod = signal<'code' | 'list'>('code'); // בחירה בין קוד או רשימה
  teamCode = '';
  selectedTeamId = '';
  joiningLoading = signal(false);

  ngOnInit() {
    this.loadAvailableTeams();
  }

  loadAvailableTeams() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAvailableTeams().subscribe({
      next: (data) => {
        this.availableTeams.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('שגיאה בטעינת צוותים');
        this.loading.set(false);
        console.error('Error loading available teams:', err);
      }
    });
  }

  joinByCode() {
    if (!this.teamCode.trim()) {
      alert('אנא הכנס קוד צוות');
      return;
    }

    this.joiningLoading.set(true);
    this.api.joinTeamByCode(this.teamCode).subscribe({
      next: () => {
        this.joiningLoading.set(false);
        alert('הצטרפת לצוות בהצלחה!');
        this.router.navigate(['/teams']);
      },
      error: (err) => {
        this.joiningLoading.set(false);
        if (err.status === 404) {
          alert('קוד צוות לא תקין');
        } else if (err.status === 409) {
          alert('אתה כבר חבר בצוות זה');
        } else {
          alert('שגיאה בהצטרפות לצוות');
        }
        console.error('Error joining team:', err);
      }
    });
  }

  joinBySelection() {
    if (!this.selectedTeamId) {
      alert('בחר צוות');
      return;
    }

    this.joiningLoading.set(true);
    // בעצם צריך להוסיף endpoint לצד השרת לצורך זה, או להשתמש ברשימה עם דיוקים
    // לעת עתה נוכל להשתמש בשיטה קיימת
    alert('שימוש בקוד הצוות למטה');
    const team = this.availableTeams().find(t => t.id === this.selectedTeamId);
    if (team) {
      this.teamCode = team.team_code;
      this.joinByCode();
    }
  }

  goBack() {
    this.router.navigate(['/teams']);
  }
}
