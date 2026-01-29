import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ApiService } from '../services/api';

/**
 * AuthGuard - הגנה על נתיבים שדורשים התחברות
 * 
 * מה שהוא עושה:
 * 1. בודק אם יש token ב-localStorage
 * 2. בודק אם ה-token תקין (לא expired)
 * 3. אם לא מחובר - מעביר ל-/login
 * 4. אם מחובר - מאפשר גישה
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const apiService = inject(ApiService);
  
  // בדוק אם יש token
  const token = sessionStorage.getItem('token');
  
  if (!token) {
    console.warn('❌ No token found. Redirecting to login.');
    // אם אין token, הפנה להתחברות
    router.navigate(['/login'], { 
      queryParams: { returnUrl: state.url } // שמור את הכתובת למעבר חזרה אחרי התחברות
    });
    return false;
  }
  
  // בדוק אם ה-token עדיין תקין (בדיקה בסיסית)
  if (isTokenExpired(token)) {
    console.warn('⏰ Token expired. Redirecting to login.');
    // נקה את ה-token
    sessionStorage.removeItem('token');
    apiService.logout();
    
    router.navigate(['/login'], { 
      queryParams: { expired: true }
    });
    return false;
  }
  
  console.log('✅ User authenticated. Allowing access.');
  return true;
};

/**
 * בדיקה בסיסית אם ה-token expired
 * (זה בדיקה קלילה - השרת יבדוק את זה בעמקות)
 */
function isTokenExpired(token: string): boolean {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    // decode payload
    const decoded = JSON.parse(atob(parts[1]));
    
    // בדוק אם יש exp claim וודא שלא expired
    if (decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now;
    }
    
    return false;
  } catch (err) {
    console.error('❌ Error decoding token:', err);
    return true;
  }
}
