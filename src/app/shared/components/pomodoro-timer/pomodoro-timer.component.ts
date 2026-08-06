import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

type Phase = 'work' | 'break' | 'longBreak';

@Component({
  selector: 'app-pomodoro-timer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pomodoro-timer.component.html',
  styleUrl: './pomodoro-timer.component.scss',
})
export class PomodoroTimerComponent implements OnDestroy {
  readonly WORK_DURATION  = 25 * 60;
  readonly BREAK_DURATION =  5 * 60;
  readonly LONG_BREAK     = 15 * 60;

  protected readonly Math = Math;

  phase          = signal<Phase>('work');
  secondsLeft    = signal(this.WORK_DURATION);
  isRunning      = signal(false);
  cyclesComplete = signal(0);

  private intervalId: any = null;

  get progress(): number {
    const total = this._totalForPhase(this.phase());
    return ((total - this.secondsLeft()) / total) * 100;
  }

  get circumference(): number { return 2 * Math.PI * 54; }

  get dashOffset(): number {
    return this.circumference - (this.progress / 100) * this.circumference;
  }

  get timeLabel(): string {
    const m = Math.floor(this.secondsLeft() / 60).toString().padStart(2, '0');
    const s = (this.secondsLeft() % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get phaseLabel(): string {
    switch (this.phase()) {
      case 'work':      return '🎯 Focus';
      case 'break':     return '☕ Break';
      case 'longBreak': return '🌿 Long Break';
    }
  }

  toggle(): void {
    if (this.isRunning()) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning.set(false);
    } else {
      this.isRunning.set(true);
      this.intervalId = setInterval(() => this._tick(), 1000);
    }
  }

  reset(): void {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning.set(false);
    this.secondsLeft.set(this._totalForPhase(this.phase()));
  }

  skip(): void {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning.set(false);
    this._nextPhase();
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }

  private _tick(): void {
    const next = this.secondsLeft() - 1;
    if (next <= 0) {
      this.secondsLeft.set(0);
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning.set(false);
      this._nextPhase();
    } else {
      this.secondsLeft.set(next);
    }
  }

  private _nextPhase(): void {
    if (this.phase() === 'work') {
      const cycles = this.cyclesComplete() + 1;
      this.cyclesComplete.set(cycles);
      const next: Phase = cycles % 4 === 0 ? 'longBreak' : 'break';
      this.phase.set(next);
    } else {
      this.phase.set('work');
    }
    this.secondsLeft.set(this._totalForPhase(this.phase()));
  }

  private _totalForPhase(p: Phase): number {
    switch (p) {
      case 'work':      return this.WORK_DURATION;
      case 'break':     return this.BREAK_DURATION;
      case 'longBreak': return this.LONG_BREAK;
    }
  }
}
