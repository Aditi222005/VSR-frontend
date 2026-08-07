import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { WebSocketService } from '../../../core/services/websocket/websocket.service';
import { PomodoroState } from '../../../core/models/pomodoro-state.model';

type Phase = 'work' | 'break' | 'longBreak';

@Component({
  selector: 'app-pomodoro-timer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pomodoro-timer.component.html',
  styleUrl: './pomodoro-timer.component.scss'
})
export class PomodoroTimerComponent
implements OnInit, OnDestroy {

  @Input({ required: true })
  roomId!: number;

  readonly WORK_DURATION = 25 * 60;
  readonly BREAK_DURATION = 5 * 60;
  readonly LONG_BREAK = 15 * 60;

  protected readonly Math = Math;

  phase = signal<Phase>('work');

  secondsLeft = signal(this.WORK_DURATION);

  isRunning = signal(false);

  cyclesComplete = signal(0);

  private intervalId: any = null;

  constructor(
    private websocketService: WebSocketService
  ) {}

  ngOnInit(): void {

    this.websocketService.connect();

    this.websocketService.subscribeToPomodoro(
      this.roomId,
      state => this.updateState(state)
    );

    this.websocketService.requestPomodoroState(
      this.roomId
    );

  }

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

ngOnDestroy(): void {

  clearInterval(this.intervalId);

  this.intervalId = null;

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

}}