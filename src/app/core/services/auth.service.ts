import { Injectable, signal } from '@angular/core';

export interface User {
  name: string;
  email: string;
  studyPreference?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Mock current user. Defaulting to Alex with a Coding preference to show recommendations.
  private userSignal = signal<User | null>({
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    studyPreference: 'Coding', // Set to null/undefined to test the callout/prompt
  });

  currentUser = this.userSignal.asReadonly();

  constructor() {}

  login(name: string, email: string): void {
    this.userSignal.set({
      name,
      email,
      studyPreference: 'Coding', // Default preference
    });
  }

  logout(): void {
    this.userSignal.set(null);
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
