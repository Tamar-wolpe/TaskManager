import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

/**
 * NoAuthGuard - הגנה על דפי התחברות/הרשמה
 * 
 * מה שהוא עושה:
 * 1. בודק אם משתמש כבר מחובר
 * 2. אם כן - מעביר ל-/teams במקום להשאר בעמוד ההתחברות
 * 3. אם לא - מאפשר גישה לעמוד ההתחברות
 */
export const noAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = sessionStorage.getItem('token');
  
  if (token) {
    // משתמש כבר מחובר, הפנה לעמוד הבית
    console.log('✅ User already authenticated. Redirecting to teams.');
    router.navigate(['/teams']);
    return false;
  }
  
  // משתמש לא מחובר, מאפשר גישה לעמוד ההתחברות
  console.log('🔓 Not authenticated. Allowing access to login.');
  return true;
};
