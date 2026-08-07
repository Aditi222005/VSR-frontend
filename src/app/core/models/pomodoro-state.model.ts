export interface PomodoroState {

  roomId: number;

  phase: 'work' | 'break' | 'longBreak';

  running: boolean;

  remainingSeconds: number;

  startedAt: string | null;

  cyclesComplete: number;

}