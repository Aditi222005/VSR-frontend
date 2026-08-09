import {
  Component, OnInit, OnDestroy, signal, inject, PLATFORM_ID, computed, ViewChild, ElementRef
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { WebSocketService } from '../../core/services/websocket/websocket.service';
import { LiveKitService } from '../../core/services/livekit.service';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { Participant } from '../../core/models/participant.model';
import { RoomParticipantsEvent } from '../../core/models/room-participants-event.model';
import { RoomEvent } from '../../core/models/room-event.model';
import { VideoTileComponent } from '../../shared/components/video-tile/video-tile.component';
import { ChatPanelComponent } from '../../shared/components/chat-panel/chat-panel.component';
import { PomodoroTimerComponent } from '../../shared/components/pomodoro-timer/pomodoro-timer.component';
import { NotesPanelComponent } from '../../shared/components/notes-panel/notes-panel.component';
import { RoomService } from '../../core/services/room.service';

type SidebarTab = 'participants' | 'chat' | 'timer' | 'notes';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    VideoTileComponent,
    ChatPanelComponent,
    PomodoroTimerComponent,
    NotesPanelComponent,
  ],
  templateUrl: './room.component.html',
  styleUrl: './room.component.scss',
})
export class RoomComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ws = inject(WebSocketService);
  private roomService = inject(RoomService);
  private authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private platformId = inject(PLATFORM_ID);
  lk = inject(LiveKitService);

  @ViewChild('previewVideo') previewVideoEl?: ElementRef<HTMLVideoElement>;
  private previewStream?: MediaStream;

  roomId!: number;
  roomName = signal<string>('Live Study Room');

  // WebSocket signals
  wsParticipants = signal<Participant[]>([]);
  roomEvents = signal<RoomEvent[]>([]);
  unreadChat = signal(0);

  participantCount = computed(() => {
    const wsCount = this.wsParticipants().length;
    const lkCount = this.lk.participants().length;
    return Math.max(wsCount, lkCount, 1);
  });

  // UI state
  videoJoined = signal(false);
  isJoining = signal(false);
  lkError = signal<string | null>(null);
  activeTab = signal<SidebarTab>('chat');
  sidebarOpen = signal(true);
  previewCamOn = signal(false);
  previewMicOn = signal(true);
  focusModeOn = signal(false);

  // Pinned participant
  pinnedIdentity = signal<string | null>(null);

  pinnedParticipant = computed(() => {
    const pin = this.pinnedIdentity();
    if (!pin) return null;
    return this.lk.participants().find(p => p.identity === pin) ?? null;
  });

  thumbnailParticipants = computed(() => {
    const pinned = this.pinnedParticipant();
    if (!pinned) return [];
    return this.lk.participants().filter(p => p.identity !== pinned.identity);
  });

  ngOnInit(): void {
    this.roomId = Number(this.route.snapshot.paramMap.get('id'));

    const nav = this.router.getCurrentNavigation();
    const stateRoomName = nav?.extras?.state?.['roomName'];
    if (stateRoomName) {
      this.roomName.set(stateRoomName);
    } else if (isPlatformBrowser(this.platformId)) {
      this.roomService.joinRoom(this.roomId).subscribe({
        next: (res) => {
          if (res?.roomName) this.roomName.set(res.roomName);
        },
        error: () => { }
      });
    }

    if (!isPlatformBrowser(this.platformId)) return;

    this.ws.connect();

    this.ws.subscribeToRoom(this.roomId, (event: RoomEvent) => {
      this.roomEvents.update(events => [event, ...events].slice(0, 100));
    });

    this.ws.subscribeToParticipants(this.roomId, (event: RoomParticipantsEvent) => {
      this.wsParticipants.set(event.participants);
    });

    const wasJoined = sessionStorage.getItem(`vsr_joined_room_${this.roomId}`) === 'true';
    if (wasJoined) {
      this.joinVideo();
    } else {
      this.startPreviewCamera();
    }
  }

  async startPreviewCamera(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.previewStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (this.previewVideoEl?.nativeElement) {
          this.previewVideoEl.nativeElement.srcObject = this.previewStream;
        }
        this.previewCamOn.set(true);
      }
    } catch {
      this.previewCamOn.set(false);
    }
  }

  stopPreviewCamera(): void {
    if (this.previewStream) {
      this.previewStream.getTracks().forEach(track => track.stop());
      this.previewStream = undefined;
    }
    this.previewCamOn.set(false);
  }

  async joinVideo(): Promise<void> {
    this.isJoining.set(true);
    this.lkError.set(null);
    this.stopPreviewCamera();

    try {
      const { token, url } = await this.lk.getLiveKitToken(this.roomId, this.roomName());
      await this.lk.connect(url, token);
      await this.lk.enableCameraAndMicrophone();
      this.videoJoined.set(true);
      if (isPlatformBrowser(this.platformId)) {
        sessionStorage.setItem(`vsr_joined_room_${this.roomId}`, 'true');
      }
    } catch (err: any) {
      console.warn('[RoomComponent] LiveKit connection notice:', err);
      // Still set videoJoined so user enters the live room layout
      this.videoJoined.set(true);
    } finally {
      this.isJoining.set(false);
    }
  }

  async toggleMic(): Promise<void> { await this.lk.toggleMicrophone(); }
  async toggleCamera(): Promise<void> { await this.lk.toggleCamera(); }
  async toggleScreenShare(): Promise<void> { await this.lk.toggleScreenShare(); }

  async toggleRaiseHand(): Promise<void> {
    if (this.lk.isRaisingHand()) await this.lk.lowerHand();
    else await this.lk.raiseHand();
  }

  toggleFocusMode(): void {
    this.focusModeOn.update(v => !v);
    if (this.focusModeOn()) {
      this.switchTab('timer');
    }
  }

  togglePreviewMic(): void {
    this.previewMicOn.update(v => !v);
  }

  togglePreviewCam(): void {
    if (this.previewCamOn()) {
      this.stopPreviewCamera();
    } else {
      this.startPreviewCamera();
    }
  }

  getUserInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'ME';
    const parts = user.name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return user.name.substring(0, 2).toUpperCase();
  }

  pinParticipant(identity: string): void {
    this.pinnedIdentity.set(
      this.pinnedIdentity() === identity ? null : identity
    );
  }

  switchTab(tab: SidebarTab): void {
    this.activeTab.set(tab);
    if (tab === 'chat') this.unreadChat.set(0);
  }

  leaveRoom(): void {
    this.stopPreviewCamera();
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(`vsr_joined_room_${this.roomId}`);
    }
    this.roomService.leaveRoom(this.roomId).subscribe({
      next: () => { },
      error: () => { }
    });
    this.lk.disconnect();
    this.ws.disconnect();
    this.router.navigate(['/dashboard']);
  }

  ngOnDestroy(): void {
    this.stopPreviewCamera();
    this.lk.disconnect();
    this.ws.disconnect();
  }
}
