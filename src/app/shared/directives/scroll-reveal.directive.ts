import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  /** Threshold (0-1) — fraction of element visible to trigger reveal */
  @Input() revealThreshold = 0.15;

  /** Optional extra delay class index (1-6) for staggered children */
  @Input() revealDelay = 0;

  /** Use springy overshoot easing instead of smooth ease-out */
  @Input() revealSpring = true;

  /** Use pop/scale animation instead of default slide-up */
  @Input() revealPop = false;

  private observer: IntersectionObserver | null = null;

  constructor(
    private el: ElementRef<HTMLElement>,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    const element = this.el.nativeElement;
    element.classList.add('scroll-reveal');

    if (this.revealSpring) {
      element.classList.add('scroll-reveal--spring');
    }

    if (this.revealPop) {
      element.classList.add('scroll-reveal--pop');
    }

    if (this.revealDelay > 0) {
      element.classList.add(`scroll-reveal-delay-${this.revealDelay}`);
    }

    // Only run IntersectionObserver in the browser
    if (!isPlatformBrowser(this.platformId)) {
      // On server, just show content immediately
      element.classList.add('revealed');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            // Once revealed, stop observing — animations are one-shot
            this.observer?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: this.revealThreshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
