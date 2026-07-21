import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  // Signals for form values
  name = signal('');
  username = signal('');
  email = signal('');
  mobile = signal('');
  password = signal('');

  // UI state signals
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(private router: Router) {}

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  onSubmit(event: Event): void {
    event.preventDefault();

    // Basic required validations
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

    // Simple email format check
    if (!this.email().includes('@')) {
      this.errorMessage.set('Please enter a valid email address.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    // Simulate registration redirect after 1.5s
    setTimeout(() => {
      this.isLoading.set(false);
      // Redirect to home/login
      this.router.navigate(['/login']);
    }, 1500);
  }

  loginWithGoogle(): void {
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
      this.router.navigate(['/dashboard']);
    }, 1000);
  }
}
