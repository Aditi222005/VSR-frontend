import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  emailOrUsername = signal('');
  password = signal('');
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(private router: Router, private authService: AuthService) {}

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
    // OAuth not implemented yet — placeholder
    this.errorMessage.set('Google login is not available yet.');
  }
}