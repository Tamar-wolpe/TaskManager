import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLogin = signal(true);
  email = '';
  password = '';
  username = '';
  loading = signal(false);
  error = signal<string | null>(null);
  returnUrl = '';
  showExpiredMessage = false;

  ngOnInit() {
    // בדוק אם עכשיו חזרנו כי ה-token expired
    this.route.queryParams.subscribe(params => {
      if (params['expired']) {
        this.showExpiredMessage = true;
        this.error.set('⏰ התחברותך פקעה. אנא התחבר שוב.');
      }
      this.returnUrl = params['returnUrl'] || '/teams';
    });
  }

  handleSubmit(event: Event) {
    event.preventDefault();
    this.error.set(null);
    this.loading.set(true);

    const data = { email: this.email, password: this.password, name: this.username };
    const request = this.isLogin() 
      ? this.api.login({ email: this.email, password: this.password }) 
      : this.api.register(data);

    request.subscribe({
      next: (res) => {
        this.loading.set(false);
        console.log('✅ Authentication successful!', res);
        // מעבר ל-returnUrl או ל-teams
        this.router.navigate([this.returnUrl]);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 400) {
          this.error.set('❌ אימייל או סיסמה שגויים');
        } else if (err.status === 409) {
          this.error.set('❌ החשבון כבר קיים');
        } else if (err.status === 401) {
          this.error.set('❌ אימייל או סיסמה שגויים');
        } else {
          this.error.set('❌ שגיאה בניהול. בדקט את השרת מחדש או קטע דקטות בסיסמה.');
        }
        console.error('Authentication error:', err);
      }
    });
  }
}