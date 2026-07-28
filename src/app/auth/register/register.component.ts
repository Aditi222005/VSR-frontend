import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  name = signal('');
  username = signal('');
  email = signal('');
  mobile = signal('');
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

    if (!this.name() || !this.name().trim()) {
      this.errorMessage.set('Name is required.');
      return;
    }

    if (!this.username() || !this.username().trim()) {
      this.errorMessage.set('Username is required.');
      return;
    }

    if (!this.email() || !this.email().trim()) {
      this.errorMessage.set('Email address is required.');
      return;
    }

    if (!this.email().includes('@')) {
      this.errorMessage.set('Please enter a valid email address.');
      return;
    }

    if (!this.mobile() || !this.mobile().trim()) {
      this.errorMessage.set('Mobile number is required.');
      return;
    }

    const phoneRegex = /^[0-9+\-\s()]{7,15}$/;
    if (!phoneRegex.test(this.mobile().trim())) {
      this.errorMessage.set('Please enter a valid mobile number.');
      return;
    }

    if (!this.password()) {
      this.errorMessage.set('Password is required.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.register({
      name: this.name().trim(),
      username: this.username().trim(),
      email: this.email().trim(),
      mobile: this.mobile().trim(),
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
    window.location.href =
      'http://localhost:8080/oauth2/authorization/google';
  }
}