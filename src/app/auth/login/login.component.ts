import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  emailOrUsername = signal('');
  password = signal('');
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      const name = this.route.snapshot.queryParamMap.get('name');
      const email = this.route.snapshot.queryParamMap.get('email');
      const role = this.route.snapshot.queryParamMap.get('role');
      this.authService.setSession(token, name, email, role);
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.emailOrUsername() || !this.password()) {
      this.errorMessage.set('Please fill in all fields.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.emailOrUsername(), this.password()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Invalid email/username or password.');
      },
    });
  }

  loginWithGoogle(): void {
    window.location.href =
      'http://localhost:8080/oauth2/authorization/google';
  }
}