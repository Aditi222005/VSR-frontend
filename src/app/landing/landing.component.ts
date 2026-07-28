import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  PLATFORM_ID,
  Inject,
  AfterViewInit,
  HostListener,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
import { CommonModule, isPlatformBrowser, ViewportScroller } from '@angular/common';
import { ScrollRevealDirective } from '../shared/directives/scroll-reveal.directive';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  // ── Signals ──
  mobileMenuOpen = signal(false);
  navScrolled = signal(false);
  scrollProgress = signal(0);

  // Counter values for social proof (animated)
  counterSessions = signal(0);
  counterStudents = signal(0);
  counterRating = signal(0);

  // Mouse parallax for hero blobs
  heroParallaxX = signal(0);
  heroParallaxY = signal(0);

  // Targets
  readonly targetSessions = 1200;
  readonly targetStudents = 300;
  readonly targetRating = 48; // displayed as 4.8

  private counterObserver: IntersectionObserver | null = null;
  private stepsObserver: IntersectionObserver | null = null;
  private countersAnimated = false;
  private counterRAF: number | null = null;

  // Room categories — each has a tint color for its card wash
  readonly categories = [
    { icon: '💻', name: 'Coding', online: 42, tint: 'coding' },
    { icon: '📝', name: 'Exam Prep', online: 78, tint: 'exam' },
    { icon: '📖', name: 'Reading', online: 23, tint: 'reading' },
    { icon: '🎨', name: 'Design', online: 15, tint: 'design' },
    { icon: '🎯', name: 'General Focus', online: 64, tint: 'focus' },
  ];

  // How it works steps
  readonly steps = [
    {
      number: 1,
      title: 'Pick your room',
      description:
        'Choose a room that matches what you\'re studying — Coding, Exam Prep, Reading, or just general focus.',
    },
    {
      number: 2,
      title: 'Start your session',
      description:
        'Join and begin. The timer syncs for everyone in the room so you\'re all working on the same clock.',
    },
    {
      number: 3,
      title: 'Stay accountable',
      description:
        'Others are visibly there with you. No chat clutter — just quiet, shared focus that keeps you going.',
    },
  ];

  // Value props — each has a gradient tint key
  readonly valueProps = [
    {
      icon: '👁️',
      title: 'Real presence, not noise',
      description:
        'A shared timer and visible people — no chat clutter during focus time.',
      tint: 'presence',
    },
    {
      icon: '🎯',
      title: 'Matched to you',
      description:
        'Rooms organized by what you\'re studying, so you land somewhere relevant.',
      tint: 'matched',
    },
    {
      icon: '⚡',
      title: 'Zero setup',
      description:
        'Join in one click. No scheduling, no downloads, no friction.',
      tint: 'speed',
    },
  ];

  // Steps progress line animation
  stepsLineProgress = signal(0);

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private viewportScroller: ViewportScroller,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.route.snapshot.queryParamMap.get('token');
      if (token) {
        const name = this.route.snapshot.queryParamMap.get('name');
        const email = this.route.snapshot.queryParamMap.get('email');
        const role = this.route.snapshot.queryParamMap.get('role');
        this.authService.setSession(token, name, email, role);
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      }
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Set up counter observer
    const statsSection = document.getElementById('social-proof');
    if (statsSection) {
      this.counterObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !this.countersAnimated) {
              this.countersAnimated = true;
              this.animateCounters();
            }
          });
        },
        { threshold: 0.3 }
      );
      this.counterObserver.observe(statsSection);
    }

    // Set up steps progress line observer
    const stepsSection = document.getElementById('how-it-works');
    if (stepsSection) {
      this.stepsObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Animate the connecting line based on how much of the section is visible
              const ratio = entry.intersectionRatio;
              this.stepsLineProgress.set(Math.min(ratio * 2.5, 1));
            }
          });
        },
        { threshold: Array.from({ length: 20 }, (_, i) => i / 20) }
      );
      this.stepsObserver.observe(stepsSection);
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.navScrolled.set(window.scrollY > 60);

    // Scroll progress
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      this.scrollProgress.set((window.scrollY / docHeight) * 100);
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // Only apply parallax in hero area (top ~100vh)
    if (window.scrollY > window.innerHeight) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    // Move blobs opposite to mouse, scaled down for subtlety
    this.heroParallaxX.set((event.clientX - centerX) / -40);
    this.heroParallaxY.set((event.clientY - centerY) / -40);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  scrollTo(fragment: string): void {
    this.closeMobileMenu();
    if (isPlatformBrowser(this.platformId)) {
      const el = document.getElementById(fragment);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  private animateCounters(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const duration = 2000; // ms
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      this.counterSessions.set(Math.round(eased * this.targetSessions));
      this.counterStudents.set(Math.round(eased * this.targetStudents));
      this.counterRating.set(Math.round(eased * this.targetRating));

      if (progress < 1) {
        this.counterRAF = requestAnimationFrame(step);
      }
    };

    this.counterRAF = requestAnimationFrame(step);
  }

  get formattedRating(): string {
    const val = this.counterRating();
    return (val / 10).toFixed(1);
  }

  ngOnDestroy(): void {
    this.counterObserver?.disconnect();
    this.stepsObserver?.disconnect();
    if (this.counterRAF !== null && isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.counterRAF);
    }
  }
}
