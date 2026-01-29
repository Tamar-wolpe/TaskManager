import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';

/**
 * HTTP Error Interceptor
 * 
 * מה שהוא עושה:
 * 1. תופס שגיאות HTTP מהשרת
 * 2. אם השגיאה היא 401 (Unauthorized) - token עלול להיות לא תקף
 * 3. מנקה את ה-token ומעביר ל-login
 * 4. לשגיאות אחרות - פשוט מעביר הלאה
 */
@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  private router = inject(Router);
  private apiService = inject(ApiService);

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Unauthorized - token עלול להיות לא תקף או expired
          console.warn('🔐 Unauthorized (401). Token might be invalid or expired.');
          
          // נקה את ה-token
          sessionStorage.removeItem('token');
          this.apiService.logout();
          
          // הפנה ל-login עם הודעה על expired
          this.router.navigate(['/login'], {
            queryParams: { expired: true }
          });
        }
        
        if (error.status === 403) {
          // Forbidden - משתמש לא יש הרשאות
          console.warn('🚫 Forbidden (403). User does not have permissions.');
        }
        
        if (error.status === 404) {
          // Not Found
          console.warn('❌ Resource not found (404).');
        }
        
        if (error.status === 500) {
          // Server Error
          console.error('🔥 Server error (500).');
        }
        
        return throwError(() => error);
      })
    );
  }
}
