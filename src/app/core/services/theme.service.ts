import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  
  currentTheme = signal<Theme>('dark');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem('vsr_theme') as Theme;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        this.currentTheme.set(savedTheme);
      } else {
        this.currentTheme.set('dark');
      }
      this.applyTheme(this.currentTheme());
    }
  }

  toggleTheme(): void {
    const nextTheme: Theme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.currentTheme.set(nextTheme);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('vsr_theme', nextTheme);
      this.applyTheme(nextTheme);
    }
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('vsr_theme', theme);
      this.applyTheme(theme);
    }
  }

  private applyTheme(theme: Theme): void {
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
}
