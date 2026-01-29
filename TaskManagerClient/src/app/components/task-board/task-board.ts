

// import { Component, OnInit, inject, signal } from '@angular/core';
// import { ApiService } from '../../services/api';
// import { ActivatedRoute } from '@angular/router';
// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-task-board',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './task-board.html',
//   styleUrl: './task-board.css'
// })
// export class TaskBoardComponent implements OnInit {
//   private api = inject(ApiService);
//   private route = inject(ActivatedRoute);

//   tasks = signal<any[]>([]);
//   projectId = this.route.snapshot.params['projectId'];

//   ngOnInit() {
//     this.loadTasks();
//   }

//   loadTasks() {
//     this.api.getTasks(this.projectId).subscribe(data => {
//       this.tasks.set(data);
//     });
//   }

//   getTasksByStatus(status: string) {
//     return this.tasks().filter(t => t.status === status);
//   }

//   // הוספת משימה חדשה [cite: 24]
//   addTask(status: string = 'backlog') {
//     const title = prompt('שם המשימה:');
//     if (title) {
//       const newTask = { 
//         title, 
//         status, 
//         projectId: this.projectId,
//         priority: 'medium' 
//       };
//       this.api.createTask(newTask).subscribe(() => this.loadTasks());
//     }
//   }

//   // עדכון סטטוס משימה (למשל מ-Backlog ל-Done) [cite: 25]
//   updateTaskStatus(taskId: string, newStatus: string) {
//     this.api.updateTask(taskId, { status: newStatus }).subscribe(() => {
//       this.loadTasks();
//     });
//   }

//   // מחיקת משימה [cite: 26]
//   deleteTask(taskId: string) {
//     if (confirm('האם את בטוחה שברצונך למחוק משימה זו?')) {
//       this.api.deleteTask(taskId).subscribe(() => {
//         this.loadTasks();
//       });
//     }
//   }
// }


import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../services/api';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './task-board.html',
  styleUrl: './task-board.css'
})
export class TaskBoardComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  tasks = signal<any[]>([]);
  projectId = '';
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.projectId = this.route.snapshot.params['projectId'];
    this.loadTasks();
  }

  loadTasks() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getTasks(this.projectId).subscribe({
      next: (data) => {
        console.log(`✅ Loaded ${data.length} tasks`);
        this.tasks.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('שגיאה בטעינת משימות');
        this.loading.set(false);
        console.error('Error loading tasks:', err);
      }
    });
  }

  getTasksByStatus(status: string) {
    return this.tasks().filter(t => t.status === status);
  }

  /**
   * 🎯 Drag and Drop Handler
   * קורא כל פעם שמשתמש מעביר משימה בין עמודות
   */
  onTaskDropped(event: CdkDragDrop<any[]>, newStatus: string) {
    const task = event.item.data;
    const oldStatus = task.status;

    // אם הוא בעמודה אחרת - עדכן את הstatus
    if (oldStatus !== newStatus) {
      console.log(`📤 Moving task from ${oldStatus} to ${newStatus}`);
      
      // עדכן בלוקאלי ברגע (UX טוב יותר)
      this.updateTaskLocal(task.id, newStatus);
      
      // שלח לשרת
      this.api.updateTask(task.id, { status: newStatus }).subscribe({
        next: () => {
          console.log(`✅ Task updated on server`);
        },
        error: (err) => {
          console.error('Error updating task:', err);
          alert('שגיאה בעדכון משימה');
          // חזור לstatus הישן אם שרת נכשל
          this.updateTaskLocal(task.id, oldStatus);
        }
      });
    }
  }

  /**
   * עדכן משימה בלוקאלי (לא שלח לשרת)
   */
  private updateTaskLocal(taskId: string, newStatus: string) {
    const updatedTasks = this.tasks().map(t =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    this.tasks.set(updatedTasks);
  }

  addTask(status: string = 'backlog') {
    const title = prompt('שם המשימה:');
    if (title) {
      const newTask = { 
        title, 
        status, 
        projectId: this.projectId,
        priority: 'medium' 
      };
      this.api.createTask(newTask).subscribe({
        next: () => this.loadTasks(),
        error: (err) => {
          alert('שגיאה ביצירת משימה');
          console.error('Error creating task:', err);
        }
      });
    }
  }

  updateTaskStatus(taskId: string, newStatus: string) {
    this.updateTaskLocal(taskId, newStatus);
    this.api.updateTask(taskId, { status: newStatus }).subscribe({
      next: () => console.log('✅ Task updated'),
      error: (err) => {
        alert('שגיאה בעדכון משימה');
        console.error('Error updating task:', err);
        this.loadTasks();
      }
    });
  }

  deleteTask(taskId: string) {
    if (confirm('האם את בטוחה שברצונך למחוק משימה זו?')) {
      this.api.deleteTask(taskId).subscribe({
        next: () => this.loadTasks(),
        error: (err) => {
          alert('שגיאה במחיקת משימה');
          console.error('Error deleting task:', err);
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/projects']);
  }
}