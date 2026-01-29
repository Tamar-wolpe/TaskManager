// import { Component, OnInit, inject, signal } from '@angular/core';
// import { ApiService } from '../../services/api';
// import { ActivatedRoute, Router } from '@angular/router';
// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-projects',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './projects.html',
//   styleUrl: './projects.css'
// })
// export class ProjectsComponent implements OnInit {
//   private api = inject(ApiService);
//   private route = inject(ActivatedRoute);
//   private router = inject(Router);
  
//   // שימוש ב-Signal לאחסון הפרויקטים שיוצגו במסך
//   projects = signal<any[]>([]);
  
//   // שליפת ה-teamId מהכתובת בשורת המשימות (URL)
//   teamId = this.route.snapshot.params['teamId'];

//   ngOnInit() {
//     this.loadProjects();
//   }


// loadProjects() {
//   this.api.getProjects().subscribe({
//     next: (allProjects) => {
//       console.log('נתונים שהתקבלו מהשרת:', allProjects);
//       // במקום לסנן, בואי נציג את הכל כדי לוודא שזה עובד
//       this.projects.set(allProjects); 
      
//       // אם את חייבת לסנן, השתמש ב- == במקום === כדי למנוע בעיות של סוג משתנה
//       // const filtered = allProjects.filter((p: any) => p.teamId == this.teamId);
//       // this.projects.set(filtered);
//     },
//     error: (err) => console.error('שגיאה:', err)
//   });
// }



// // loadProjects() {
// //   this.api.getProjects().subscribe({
// //     next: (allProjects) => {
// //       // חילוץ ה-ID של הצוות הנוכחי מה-URL
// //       const currentTeamId = this.route.snapshot.params['teamId'];
      
// //       // סינון: רק פרויקטים שבהם ה-teamId זהה לצוות שבו אנחנו נמצאים
// //       // משתמשים ב- == (ולא ===) למקרה שאחד מהם הוא מחרוזת והשני מספר
// //       const filtered = allProjects.filter((p: any) => p.teamId == currentTeamId);
      
// //       // עדכון ה-Signal שמוצג ב-HTML
// //       this.projects.set(filtered);
      
// //       console.log('פרויקטים לאחר סינון לצוות ' + currentTeamId + ':', filtered);
// //     },
// //     error: (err) => console.error('שגיאה בטעינת פרויקטים:', err)
// //   });
// // }

//   createNewProject() {
//     const name = prompt('הכניסי שם לפרויקט החדש:');
//     if (name && this.teamId) {
//       // שליחת ה-teamId יחד עם השם כפי שהשרת מצפה
//       this.api.createProject(this.teamId, name).subscribe({
//         next: () => {
//           // אחרי שהשרת החזיר תשובה חיובית (201), מרעננים את הרשימה
//           this.loadProjects();
//         },
//         error: (err) => alert('שגיאה ביצירת פרויקט. ודאי שאת מחוברת.')
//       });
//     }
//   }

//   goToBoard(projectId: string) {
//     this.router.navigate(['/tasks', projectId]);
//   }
// }


import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ApiService } from '../../services/api';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './projects.html',
  styleUrl: './projects.css'
})
export class ProjectsComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  allProjects = signal<any[]>([]);
  teamId = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  filteredProjects = computed(() => {
    const tid = this.teamId();
    if (!tid || tid === 'all') return this.allProjects();
    return this.allProjects().filter(p => p.team_id == parseInt(tid));
  });

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.teamId.set(params['teamId'] || 'all');
      this.loadProjects();
    });
  }

  loadProjects() {
    this.loading.set(true);
    this.error.set(null);
    const tid = this.teamId();
    
    // 📌 שלח את teamId לשרת
    this.api.getProjects(tid && tid !== 'all' ? tid : undefined).subscribe({
      next: (data) => {
        console.log(`✅ Loaded projects for team ${tid}:`, data);
        this.allProjects.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('שגיאה בטעינת פרויקטים');
        this.loading.set(false);
        console.error('Error loading projects:', err);
      }
    });
  }

  showAll() {
    this.router.navigate(['/projects/all']);
  }

  goToBoard(projectId: string) {
    this.router.navigate(['/tasks', projectId]);
  }

  createNewProject() {
    const name = prompt('שם הפרויקט החדש:');
    const tid = this.teamId();
    if (name && tid && tid !== 'all') {
      this.api.createProject(tid, name).subscribe({
        next: () => this.loadProjects(),
        error: (err) => {
          alert('שגיאה ביצירת פרויקט. ודאי שאת מחוברת.');
          console.error('Error creating project:', err);
        }
      });
    } else {
      alert('כדי ליצור פרויקט, עלייך להיות בתוך צוות ספציפי (לא בתצוגת "הצג הכל")');
    }
  }
}