import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../services/api';
import { ActivatedRoute, Router } from '@angular/router';
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
  newMemberEmail = '';
  addMemberLoading = signal(false);

  ngOnInit() {
    this.teamId = this.route.snapshot.params['teamId'];
    this.loadMembers();
  }

  loadMembers() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getTeamMembers(this.teamId).subscribe({
      next: (data) => {
        this.members.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('שגיאה בטעינת חברי הצוות');
        this.loading.set(false);
        console.error('Error loading members:', err);
      }
    });
  }

  addMember() {
    if (!this.newMemberEmail.trim()) {
      alert('אנא הכנס אימייל');
      return;
    }

    this.addMemberLoading.set(true);
    this.api.addMemberToTeam(this.teamId, this.newMemberEmail).subscribe({
      next: () => {
        this.newMemberEmail = '';
        this.addMemberLoading.set(false);
        this.loadMembers();
        alert('חבר נוסף בהצלחה!');
      },
      error: (err) => {
        this.addMemberLoading.set(false);
        if (err.status === 404) {
          alert('משתמש בעל אימייל זה לא קיים');
        } else if (err.status === 409) {
          alert('משתמש זה כבר חבר בצוות');
        } else {
          alert('שגיאה בהוספת חבר');
        }
        console.error('Error adding member:', err);
      }
    });
  }

  goBack() {
    this.router.navigate(['/teams']);
  }
}
