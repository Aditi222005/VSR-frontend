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

  public extractTokenFromUrl(): { token: string | null; name: string | null; email: string | null; role: string | null; error: string | null } {
    if (typeof window === 'undefined') {
      return { token: null, name: null, email: null, role: null, error: null };
    }

    try {
      const url = new URL(window.location.href);

      let token = url.searchParams.get('token') ||
                  url.searchParams.get('accessToken') ||
                  url.searchParams.get('access_token') ||
                  url.searchParams.get('jwt') ||
                  url.searchParams.get('bearer');

      let name = url.searchParams.get('name') || url.searchParams.get('username') || url.searchParams.get('user');
      let email = url.searchParams.get('email');
      let role = url.searchParams.get('role');
      let error = url.searchParams.get('error') || url.searchParams.get('error_message') || url.searchParams.get('error_description');

      if (!token && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        token = hashParams.get('token') ||
                hashParams.get('accessToken') ||
                hashParams.get('access_token') ||
                hashParams.get('jwt') ||
                hashParams.get('bearer');
        name = name || hashParams.get('name') || hashParams.get('username');
        email = email || hashParams.get('email');
        role = role || hashParams.get('role');
        error = error || hashParams.get('error') || hashParams.get('error_message') || hashParams.get('error_description');
      }

      if (!token && document.cookie) {
        const match = document.cookie.match(/(?:^|;\s*)(?:token|accessToken|jwt)\s*=\s*([^;]+)/);
        if (match) {
          token = decodeURIComponent(match[1]);
        }
      }

      return { token, name, email, role, error };
    } catch {
      return { token: null, name: null, email: null, role: null, error: null };
    }
  }

  private formatName(rawName?: string | null, email?: string | null): string {
    if (rawName && !rawName.includes('@')) {
      return rawName;
    }

    const emailToUse = (rawName && rawName.includes('@')) ? rawName : email;
    if (emailToUse && emailToUse.includes('@')) {
      const handle = emailToUse.split('@')[0];
      return handle
        .replace(/[._\-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    return rawName || 'User';
  }

  private loadUserFromStorage(): User | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('token');
    if (!token) return null;

    let name = localStorage.getItem('name');
    let email = localStorage.getItem('email') || '';

    if (!name || name.includes('@')) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const payloadName = payload.name || payload.given_name || payload.username || payload.preferred_username || '';
        const payloadEmail = payload.email || (payload.sub && payload.sub.includes('@') ? payload.sub : '');
        name = this.formatName(name || payloadName, email || payloadEmail);
        if (!email && payloadEmail) email = payloadEmail;
      } catch {
        name = this.formatName(name, email);
      }
    }

    return { name: name || 'User', email, studyPreference: null };
  }

  setSession(token: string, name?: string | null, email?: string | null, role?: string | null): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);

      let resolvedName = name || '';
      let resolvedEmail = email || '';
      let resolvedRole = role || '';

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!resolvedName) {
          resolvedName = payload.name || payload.given_name || payload.username || payload.preferred_username || '';
        }
        if (!resolvedEmail) {
          resolvedEmail = payload.email || (payload.sub && payload.sub.includes('@') ? payload.sub : '');
        }
        if (!resolvedRole) {
          resolvedRole = payload.role || payload.roles?.[0] || '';
        }
        if (!resolvedName && payload.sub && !payload.sub.includes('@')) {
          resolvedName = payload.sub;
        }
      } catch {
        // Ignore JSON parse errors
      }

      resolvedName = this.formatName(resolvedName, resolvedEmail);

      localStorage.setItem('name', resolvedName);
      if (resolvedEmail) localStorage.setItem('email', resolvedEmail);
      if (resolvedRole) localStorage.setItem('role', resolvedRole);

      this.userSignal.set({
        name: resolvedName,
        email: resolvedEmail,
        studyPreference: null,
      });
    }
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
        const displayName = this.formatName(res.name, emailOrUsername);

        if (typeof window !== 'undefined') {
          localStorage.setItem('token', res.token);
          localStorage.setItem('name', displayName);
          if (res.role) localStorage.setItem('role', res.role);
          if (emailOrUsername.includes('@')) {
            localStorage.setItem('email', emailOrUsername);
          }
        }

        this.userSignal.set({
          name: displayName,
          email: emailOrUsername.includes('@') ? emailOrUsername : '',
          studyPreference: null,
        });
      })
    );
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('name');
      localStorage.removeItem('email');
      localStorage.removeItem('role');
    }
    this.userSignal.set(null);
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
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