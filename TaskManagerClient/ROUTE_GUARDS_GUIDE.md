# 🛡️ Route Guards - Documentation

## מה זה Route Guard?

Route Guard הוא middleware שבודק תנאים לפני שמשתמש יכול לגשת לעמוד מסוים.

### 🎯 יתרונות:

✅ **מניעת גישה לא מורשית** - לא יכול להגיע דרך שורת הכתובת  
✅ **ניהול אוטומטי** - אם token expired, מעביר ל-login  
✅ **חוויה יותר טובה** - שמור את המקום שהמשתמש ביקש חזרה אחרי התחברות  
✅ **Security** - בדיקות בצד Client ו-Server  

---

## 🔐 Types of Guards in This Project

### 1. **authGuard** ✅ מחובר?
```typescript
// קובץ: src/app/guards/auth.guard.ts

✓ בודק אם יש token ב-localStorage
✓ בודק אם token לא expired
✓ אם לא מחובר → הפנה ל-/login
✓ אם expired → הפנה ל-/login?expired=true
```

**שימוש:**
```typescript
{ 
  path: 'teams', 
  loadComponent: (...),
  canActivate: [authGuard]  // ← הוסף פה
}
```

---

### 2. **noAuthGuard** 🚫 כבר מחובר?
```typescript
// קובץ: src/app/guards/no-auth.guard.ts

✓ בודק אם משתמש כבר מחובר
✓ אם כן → הפנה ל-/teams
✓ אם לא → מאפשר גישה ל-/login
```

**שימוש:**
```typescript
{ 
  path: 'login', 
  loadComponent: (...),
  canActivate: [noAuthGuard]  // ← מניעה מקבלתן להכנס אם כבר מחובר
}
```

---

### 3. **HttpErrorInterceptor** 🚨 שגיאות HTTP
```typescript
// קובץ: src/app/interceptors/http-error.interceptor.ts

✓ תופס שגיאות 401 (Unauthorized)
✓ אם token לא תקף → נקה ו-logout
✓ אם אחרת → רק log
```

**ברקע:**
```typescript
// בכל בקשה HTTP, אם שגיאה 401:
if (error.status === 401) {
  // Token לא תקף
  → logout()
  → navigate to /login?expired=true
}
```

---

## 📊 Flow Diagram

```
┌─ משתמש מנסה להגיע ל-/teams
│
├─ Guard בודק: יש token?
│  │
│  ├─ אם לא → ❌ אל תכנס, הלך ל-/login
│  │
│  └─ אם כן → בודק אם token expired?
│     │
│     ├─ אם כן → ❌ Token expired, הלך ל-/login?expired=true
│     │
│     └─ אם לא → ✅ טוב, הכנס ל-/teams

┌─ משתמש מנסה להגיע ל-/login
│
├─ Guard בודק: כבר מחובר?
│  │
│  ├─ אם כן → ❌ אתה כבר מחובר, הלך ל-/teams
│  │
│  └─ אם לא → ✅ טוב, הכנס ל-/login

┌─ בקשה HTTP ל-API תגובה 401
│
├─ Interceptor תופס את השגיאה
│  │
│  └─ Token לא תקף → logout() → navigate to /login?expired=true
```

---

## 🔄 Routes Setup

```typescript
// src/app/app.routes.ts

export const routes: Routes = [
  { 
    path: 'login', 
    loadComponent: (...),
    canActivate: [noAuthGuard]  // ← מניעה מקבלתן להכנס אם כבר מחובר
  },
  { 
    path: 'teams', 
    loadComponent: (...),
    canActivate: [authGuard]    // ← בדוק אם מחובר
  },
  { 
    path: 'join-team', 
    loadComponent: (...),
    canActivate: [authGuard]    // ← בדוק אם מחובר
  },
  { 
    path: 'team-members/:teamId', 
    loadComponent: (...),
    canActivate: [authGuard]    // ← בדוק אם מחובר
  },
  { 
    path: 'projects/:teamId', 
    loadComponent: (...),
    canActivate: [authGuard]    // ← בדוק אם מחובר
  },
  { 
    path: 'tasks/:projectId', 
    loadComponent: (...),
    canActivate: [authGuard]    // ← בדוק אם מחובר
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }  // ← לכל נתיב לא קיים
];
```

---

## 🧪 Test Scenarios

### Scenario 1: משתמש לא מחובר מנסה להגיע ל-/teams
```
1. משתמש נכנס ל-http://localhost:4200/teams
2. authGuard בודק: אין token ❌
3. Guard מעביר ל-http://localhost:4200/login
4. משתמש מתחבר
5. Guard מעביר ל-http://localhost:4200/teams ✅
```

### Scenario 2: משתמש מחובר מנסה להגיע ל-/login
```
1. משתמש נכנס ל-http://localhost:4200/login
2. noAuthGuard בודק: יש token ✅
3. Guard מעביר ל-http://localhost:4200/teams
4. משתמש כבר בפנים ✅
```

### Scenario 3: Token expired בזמן עבודה
```
1. משתמש בעמוד /teams
2. עושה פעולה (למשל: לחוץ על כפתור)
3. בקשה HTTP חוזרת עם 401
4. HttpErrorInterceptor תופס את זה
5. Logout אוטומטי
6. Navigate ל-/login?expired=true
7. משתמש רואה הודעה: "⏰ התחברותך פקעה"
8. משתמש מתחבר שוב ✅
```

---

## 📝 Token Validation (Client-Side)

```typescript
// src/app/guards/auth.guard.ts

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const decoded = JSON.parse(atob(parts[1]));
    
    if (decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now;  // אם עכשיו > exp → expired
    }
    
    return false;
  } catch (err) {
    return true;  // אם שגיאה בdecode → בטוח expired
  }
}
```

**JWT Token Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE2MTYyMzkyMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

          ↓↓↓ Payload (חלק 2)
{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022,
  "exp": 1616239222   ← Expiration time (unix timestamp)
}
```

---

## 🔗 Integration with App Config

```typescript
// src/app/app.config.ts

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    
    // Interceptor 1: הוסף token לכל בקשה
    provideHttpClient(
      withInterceptors([
        (req, next) => {
          const token = localStorage.getItem('token');
          if (token) {
            req = req.clone({
              setHeaders: { Authorization: `Bearer ${token}` }
            });
          }
          return next(req);
        }
      ])
    ),
    
    // Interceptor 2: טיפול בשגיאות
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpErrorInterceptor,
      multi: true
    }
  ]
};
```

---

## ✅ Checklist

- [x] authGuard - בדיקה אם מחובר
- [x] noAuthGuard - מניעה מקבלתן להכנס אם כבר מחובר
- [x] HttpErrorInterceptor - טיפול בשגיאות 401
- [x] Routes מסודרות עם Guards
- [x] Token validation client-side
- [x] returnUrl - שמירת המקום שביקש חזרה
- [x] expired token handling - הודעה למשתמש

---

## 🚀 What's Still Backend?

⚠️ **Backend צריך להוסיף:**
1. ✅ Validate token בכל בקשה מוגנת
2. ✅ Return 401 אם token לא תקף
3. ✅ Check team_members table בפעולות חברויות

---

## 📚 References

- [Angular Guards Docs](https://angular.io/guide/router#preventing-unauthorized-access)
- [JWT Authentication](https://jwt.io/)
- [HTTP Interceptors](https://angular.io/guide/http#intercepting-requests-and-responses)
