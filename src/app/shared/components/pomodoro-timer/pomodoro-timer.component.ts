import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { WebSocketService } from '../../../core/services/websocket/websocket.service';
import { PomodoroState } from '../../../core/models/pomodoro-state.model';

type Phase = 'work' | 'break' | 'longBreak';

/**
 * Threshold in seconds: if remainingSeconds from backend > this value,
 * we treat it as the 2-hour public session (not a normal Pomodoro phase).
 * 2 hours = 7200 s, but we use 900 (15 min) as safe lower-bound so even
 * a near-expired public session is still recognised.
 */
const PUBLIC_SESSION_THRESHOLD = 900;

@Component({
  selector: 'app-pomodoro-timer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pomodoro-timer.component.html',
  styleUrl: './pomodoro-timer.component.scss'
})
export class PomodoroTimerComponent
implements OnInit, OnDestroy, OnChanges {

  @Input({ required: true })
  roomId!: number;

  /** 'PUBLIC' | 'PRIVATE' – passed from RoomComponent */
  @Input()
  roomType: string = 'PUBLIC';

  // ─── Existing Pomodoro state ───────────────────────────────────────────────
  readonly WORK_DURATION = 25 * 60;
  readonly BREAK_DURATION = 5 * 60;
  readonly LONG_BREAK = 15 * 60;

  protected readonly Math = Math;

  phase = signal<Phase>('work');
  secondsLeft = signal(this.WORK_DURATION);
  isRunning = signal(false);
  cyclesComplete = signal(0);

  private intervalId: any = null;

  // ─── Public session state ──────────────────────────────────────────────────
  /** Whether the public session panel should show */
  publicSessionVisible = signal(false);

  /** Remaining seconds for the public 2-hour session (local countdown) */
  publicSecondsLeft = signal(0);

  /** Whether the public session is running */
  publicRunning = signal(false);

  /** Raw startedAt string from backend (for debug display) */
  publicStartedAt = signal<string | null>(null);

  /** Raw remainingSeconds from the last backend message (for debug display) */
  publicRawRemaining = signal(0);

  private publicIntervalId: any = null;

  private wsReadyRetryId: any = null;

  constructor(
    private websocketService: WebSocketService
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {

    this.websocketService.connect();

    // Subscribe to the shared Pomodoro topic for this room.
    // Both normal Pomodoro updates AND the public session state arrive here.
    this.websocketService.subscribeToPomodoro(
      this.roomId,
      state => this.handleIncomingState(state)
    );

    // Request normal Pomodoro state immediately
    this.websocketService.requestPomodoroState(this.roomId);

    // For PUBLIC rooms, also request the 2-hour session state.
    // The WS might not be connected yet, so retry a few times.
    if (this.roomType === 'PUBLIC') {
      this.schedulePublicStateRequest();
    }

  }

  ngOnChanges(changes: SimpleChanges): void {
    // If roomType changes to PUBLIC after init, kick off a state request
    if (changes['roomType'] && this.roomType === 'PUBLIC') {
      this.schedulePublicStateRequest();
    }
  }

  ngOnDestroy(): void {

    clearInterval(this.intervalId);
    this.intervalId = null;

    clearInterval(this.publicIntervalId);
    this.publicIntervalId = null;

    clearTimeout(this.wsReadyRetryId);
    this.wsReadyRetryId = null;

  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public-session helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retry requesting the public state a few times so it still works
   * even when the WebSocket hasn't finished connecting yet.
   */
  private schedulePublicStateRequest(attempt = 0): void {

    clearTimeout(this.wsReadyRetryId);

    const delay = attempt === 0 ? 500 : 2000;

    this.wsReadyRetryId = setTimeout(() => {

      this.websocketService.requestPublicRoomState(this.roomId);

      if (attempt < 3) {
        this.schedulePublicStateRequest(attempt + 1);
      }

    }, delay);

  }

  // ─────────────────────────────────────────────────────────────────────────
  // Incoming WebSocket state dispatcher
  // ─────────────────────────────────────────────────────────────────────────

  private handleIncomingState(state: PomodoroState): void {

    console.log('[PomodoroTimer] Incoming state:', state);

    // Determine whether this message is the public 2-hour session or a
    // normal Pomodoro phase update.
    //
    // We use remainingSeconds > PUBLIC_SESSION_THRESHOLD as the signal.
    // A normal Pomodoro phase tops out at 25 min (1500 s), so anything
    // above 900 s that arrives while running is treated as the public session.
    // (If the session is near its end and < 900 s, it falls through to
    // updateState() which is harmless – it will just look like a long timer.)
    const isPublicSession =
      this.roomType === 'PUBLIC' &&
      state.remainingSeconds > PUBLIC_SESSION_THRESHOLD;

    if (isPublicSession) {
      this.updatePublicState(state);
    } else {
      this.updateState(state);
    }

  }

  // ─────────────────────────────────────────────────────────────────────────
  // Existing Pomodoro – updateState (unchanged logic)
  // ─────────────────────────────────────────────────────────────────────────

  private updateState(
    state: PomodoroState
  ): void {

    this.phase.set(state.phase);

    this.cyclesComplete.set(state.cyclesComplete);

    this.isRunning.set(state.running);

    clearInterval(this.intervalId);
    this.intervalId = null;

    if (!state.running) {

      this.secondsLeft.set(state.remainingSeconds);
      return;

    }

    const started = new Date(state.startedAt!).getTime();

    const update = () => {

      const elapsed = Math.floor(
        (Date.now() - started) / 1000
      );

      const remaining = Math.max(
        0,
        state.remainingSeconds - elapsed
      );

      this.secondsLeft.set(remaining);

      if (remaining <= 0) {

        clearInterval(this.intervalId);
        this.intervalId = null;

        this.websocketService.nextPomodoro(
          this.roomId
        );

      }

    };

    update();

    this.intervalId = setInterval(update, 1000);

  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public session timer
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Update the public 2-hour session countdown from a backend broadcast.
   *
   * SYNC RULE: remainingSeconds from backend IS the source of truth at
   * the moment the message is received.  We seed localSecondsLeft from
   * that value and decrement locally every second.  If another backend
   * message arrives, we re-sync again.
   */
  private updatePublicState(state: PomodoroState): void {

    console.log('[PomodoroTimer] Public session state update:', state);

    // Stop any existing local countdown
    clearInterval(this.publicIntervalId);
    this.publicIntervalId = null;

    // Record debug values
    this.publicRawRemaining.set(state.remainingSeconds);
    this.publicStartedAt.set(state.startedAt);
    this.publicRunning.set(state.running);
    this.publicSessionVisible.set(true);

    if (!state.running || state.remainingSeconds <= 0) {
      // Session expired or paused – display remaining as-is, no tick
      this.publicSecondsLeft.set(Math.max(0, state.remainingSeconds));
      this.publicRunning.set(false);
      return;
    }

    // Seed from backend's remainingSeconds directly (backend is source of truth)
    let remaining = state.remainingSeconds;
    this.publicSecondsLeft.set(remaining);

    // Local countdown – decrements every second
    this.publicIntervalId = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      this.publicSecondsLeft.set(remaining);

      if (remaining <= 0) {
        clearInterval(this.publicIntervalId);
        this.publicIntervalId = null;
        this.publicRunning.set(false);
        console.log('[PomodoroTimer] Public session expired locally.');
      }

    }, 1000);

  }

  // ─────────────────────────────────────────────────────────────────────────
  // Existing Pomodoro – computed / getters
  // ─────────────────────────────────────────────────────────────────────────

  get progress(): number {

    const total = this._totalForPhase(this.phase());

    return ((total - this.secondsLeft()) / total) * 100;

  }

  get circumference(): number {

    return 2 * Math.PI * 54;

  }

  get dashOffset(): number {

    return this.circumference -
           (this.progress / 100) * this.circumference;

  }

  get timeLabel(): string {

    const m = Math.floor(
        this.secondsLeft() / 60
    ).toString().padStart(2, '0');

    const s = (
        this.secondsLeft() % 60
    ).toString().padStart(2, '0');

    return `${m}:${s}`;

  }

  get phaseLabel(): string {

    switch (this.phase()) {

      case 'work':
        return '🎯 Focus';

      case 'break':
        return '☕ Break';

      case 'longBreak':
        return '🌿 Long Break';

    }

  }

  // ─── Public session formatted time ────────────────────────────────────────

  get publicTimeLabel(): string {
    const total = this.publicSecondsLeft();
    const h = Math.floor(total / 3600).toString().padStart(2, '0');
    const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  get publicStatusLabel(): string {
    if (this.publicSecondsLeft() <= 0) return 'Session Expired';
    return this.publicRunning() ? 'Session Active' : 'Session Paused';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Existing Pomodoro – actions
  // ─────────────────────────────────────────────────────────────────────────

  toggle(): void {

    if (this.isRunning()) {

      this.websocketService.pausePomodoro(
        this.roomId
      );

    } else {

      this.websocketService.startPomodoro(
        this.roomId
      );

    }

  }

  reset(): void {

    this.websocketService.resetPomodoro(
      this.roomId
    );

  }

  skip(): void {

    this.websocketService.nextPomodoro(
      this.roomId
    );

  }

  private _totalForPhase(
    phase: Phase
  ): number {

    switch (phase) {

      case 'work':
        return this.WORK_DURATION;

      case 'break':
        return this.BREAK_DURATION;

      case 'longBreak':
        return this.LONG_BREAK;

    }

  }
}