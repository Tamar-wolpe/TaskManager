import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'https://tasks-server-gmpd.onrender.com';
  
  // ניהול מצב ה-Token
  token = signal<string | null>(sessionStorage.getItem('token'));

  // --- אימות (Auth) ---

  register(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, userData).pipe(
      tap((res: any) => this.saveToken(res.token))
    ); // [cite: 16]
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap((res: any) => this.saveToken(res.token))
    ); // [cite: 17]
  }

  private saveToken(token: string) {
    if (token) {
      sessionStorage.setItem('token', token);
      this.token.set(token);
    }
  }

  // --- צוותים (Teams) ---

  getTeams(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/teams`); // [cite: 18]
  }

  createTeam(teamData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/teams`, teamData); // [cite: 19]
  }

  // --- פרויקטים (Projects) ---

  // 📌 עדכון: עכשיו מקבל teamId כparameter
  getProjects(teamId?: string): Observable<any[]> {
    if (teamId) {
      // אם יש teamId - שלח אותו כquery parameter
      return this.http.get<any[]>(`${this.baseUrl}/projects?teamId=${teamId}`);
    }
    // אם אין teamId - החזר את כל הפרויקטים (למשתמש)
    return this.http.get<any[]>(`${this.baseUrl}/projects`);
  }

  createProject(teamId: string, projectName: string): Observable<any> {
    // שליחת אובייקט JSON הכולל את שם הפרויקט ומזהה הצוות 
    return this.http.post(`${this.baseUrl}/projects`, { 
      name: projectName, 
      teamId: teamId 
    });
  }

  // --- משימות (Tasks) ---

  getTasks(projectId?: string): Observable<any[]> {
    const url = projectId ? `${this.baseUrl}/tasks?projectId=${projectId}` : `${this.baseUrl}/tasks`;
    return this.http.get<any[]>(url); // [cite: 23]
  }

  createTask(task: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/tasks`, task); // [cite: 24]
  }

  updateTask(id: string, updates: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/tasks/${id}`, updates); // [cite: 25]
  }

  deleteTask(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/tasks/${id}`); // [cite: 26]
  }

  // --- תגובות (Comments) ---

  getComments(taskId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/comments?taskId=${taskId}`); // [cite: 27]
  }

  createComment(comment: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/comments`, comment);
  }

  // --- חברי צוות (Team Members) ---

  addMemberToTeam(teamId: string, email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/teams/${teamId}/members`, { email });
  }

  getTeamMembers(teamId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/teams/${teamId}/members`);
  }

  joinTeamByCode(teamCode: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/teams/join-by-code`, { code: teamCode });
  }

  getAvailableTeams(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/teams/available-to-join`);
  }

  // --- התחברות (Logout) ---

  logout() {
    sessionStorage.removeItem('token');
    this.token.set(null);
  }

  getToken(): string | null {
    return this.token();
  }
}