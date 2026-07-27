import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  name: string;
  email: string;
  studyPreference?: string | null;
}

interface AuthResponse {
  token: string;
  name: string;
  role: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  private userSignal = signal<User | null>(this.loadUserFromStorage());

  currentUser = this.userSignal.asReadonly();

  constructor(private http: HttpClient) {}

  private loadUserFromStorage(): User | null {
    const name = localStorage.getItem('name');
    const email = localStorage.getItem('email');
    if (!name) return null;
    return { name, email: email ?? '', studyPreference: null };
  }

  register(data: {
    name: string;
    username: string;
    email: string;
    mobile: string;
    password: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(emailOrUsername: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { emailOrUsername, password }).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('name', res.name);
        localStorage.setItem('role', res.role);

        this.userSignal.set({
          name: res.name,
          email: emailOrUsername,
          studyPreference: null,
        });
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('role');
    this.userSignal.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  updateStudyPreference(pref: string | null): void {
    const current = this.userSignal();
    if (current) {
      this.userSignal.set({
        ...current,
        studyPreference: pref,
      });
    }
  }
}