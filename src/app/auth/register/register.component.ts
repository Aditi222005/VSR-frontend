import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  name = signal('');
  username = signal('');
  email = signal('');
  mobile = signal('');
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

    if (
      !this.name() ||
      !this.username() ||
      !this.email() ||
      !this.mobile() ||
      !this.password()
    ) {
      this.errorMessage.set('All fields are required.');
      return;
    }

    if (!this.email().includes('@')) {
      this.errorMessage.set('Please enter a valid email address.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.register({
      name: this.name(),
      username: this.username(),
      email: this.email(),
      mobile: this.mobile(),
      password: this.password(),
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Registration failed. Try again.');
      },
    });
  }

  loginWithGoogle(): void {
    this.errorMessage.set('Google login is not available yet.');
  }
}