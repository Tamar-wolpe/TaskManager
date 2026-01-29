import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpErrorInterceptor } from './interceptors/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    
    // HTTP Interceptors - שלח token אוטומטי וטפל בשגיאות
    provideHttpClient(
      withInterceptors([
        // Interceptor 1: הוסף token לכל בקשה
        (req, next) => {
          const token = sessionStorage.getItem('token');
          if (token) {
            const cloned = req.clone({
              setHeaders: { Authorization: `Bearer ${token}` }
            });
            return next(cloned);
          }
          return next(req);
        }
      ])
    ),
    
    // Interceptor 2: טיפול בשגיאות HTTP
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpErrorInterceptor,
      multi: true
    }
  ]
};