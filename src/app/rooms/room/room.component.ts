import {
  Component, OnInit, OnDestroy, signal, inject, PLATFORM_ID, computed
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { WebSocketService } from '../../core/services/websocket/websocket.service';
import { LiveKitService } from '../../core/services/livekit.service';
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
    VideoTileComponent,
    ChatPanelComponent,
    PomodoroTimerComponent,
    NotesPanelComponent,
  ],
  templateUrl: './room.component.html',
  styleUrl: './room.component.scss',
})
export class RoomComponent implements OnInit, OnDestroy {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private ws          = inject(WebSocketService);
  private roomService = inject(RoomService);
  private platformId  = inject(PLATFORM_ID);
  lk                  = inject(LiveKitService);

  roomId!: number;
  roomName = signal<string>('Study Room');

  // ── WebSocket signals ──────────────────────────────────────────────────────
  wsParticipants = signal<Participant[]>([]);
  roomEvents     = signal<RoomEvent[]>([]);
  unreadChat     = signal(0);

  // Computed — always in sync, never needs manual .set()
  // Prefer the authoritative WS list; fall back to LiveKit when WS hasn't fired yet
  participantCount = computed(() =>
    this.wsParticipants().length || this.lk.participants().length
  );

  // ── UI state ──────────────────────────────────────────────────────────────
  videoJoined   = signal(false);
  isJoining     = signal(false);
  lkError       = signal<string | null>(null);
  activeTab     = signal<SidebarTab>('participants');
  sidebarOpen   = signal(true);

  // Pinned participant identity (null = auto = first/speaking)
  pinnedIdentity = signal<string | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  // Explicitly pinned participant (null = no pin -> equal grid view)
  pinnedParticipant = computed(() => {
    const pin = this.pinnedIdentity();
    if (!pin) return null;
    return this.lk.participants().find(p => p.identity === pin) ?? null;
  });

  // Remaining participants for bottom thumbnail strip when pinned
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
      // On page refresh / direct URL load: fetch room details & join backend session
      this.roomService.joinRoom(this.roomId).subscribe({
        next: (res) => {
          if (res?.roomName) this.roomName.set(res.roomName);
        },
        error: (err) => {
          console.warn('[RoomComponent] Room auto-join call on refresh failed:', err);
        }
      });
    }

    if (!isPlatformBrowser(this.platformId)) return;

    this.ws.connect();

    this.ws.subscribeToRoom(this.roomId, (event: RoomEvent) => {
      this.roomEvents.update(events => [event, ...events].slice(0, 100));
    });

    this.ws.subscribeToParticipants(this.roomId, (event: RoomParticipantsEvent) => {
      // participantCount auto-updates as a computed() — just update the array
      this.wsParticipants.set(event.participants);
    });

    // Auto-reconnect to video session if user was joined before refresh
    const wasJoined = sessionStorage.getItem(`vsr_joined_room_${this.roomId}`) === 'true';
    if (wasJoined) {
      this.joinVideo();
    }
  }

  // ── LiveKit ───────────────────────────────────────────────────────────────
  async joinVideo(): Promise<void> {
    this.isJoining.set(true);
    this.lkError.set(null);
    try {
      const { token, url } = await this.lk.getLiveKitToken(this.roomId, this.roomName());
      await this.lk.connect(url, token);
      await this.lk.enableCameraAndMicrophone();
      this.videoJoined.set(true);
      if (isPlatformBrowser(this.platformId)) {
        sessionStorage.setItem(`vsr_joined_room_${this.roomId}`, 'true');
      }
    } catch (err: any) {
      this.lkError.set(err?.message ?? 'Could not join video session.');
      if (isPlatformBrowser(this.platformId)) {
        sessionStorage.removeItem(`vsr_joined_room_${this.roomId}`);
      }
    } finally {
      this.isJoining.set(false);
    }
  }

  async toggleMic(): Promise<void>          { await this.lk.toggleMicrophone(); }
  async toggleCamera(): Promise<void>       { await this.lk.toggleCamera(); }
  async toggleScreenShare(): Promise<void>  { await this.lk.toggleScreenShare(); }

  async toggleRaiseHand(): Promise<void> {
    if (this.lk.isRaisingHand()) await this.lk.lowerHand();
    else                          await this.lk.raiseHand();
  }

  pinParticipant(identity: string): void {
    this.pinnedIdentity.set(
      this.pinnedIdentity() === identity ? null : identity
    );
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  switchTab(tab: SidebarTab): void {
    this.activeTab.set(tab);
    if (tab === 'chat') this.unreadChat.set(0);
  }

  onChatMessage(): void {
    if (this.activeTab() !== 'chat') {
      this.unreadChat.update(n => n + 1);
    }
  }

  // ── Leave ─────────────────────────────────────────────────────────────────
  leaveRoom(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(`vsr_joined_room_${this.roomId}`);
    }
    this.roomService.leaveRoom(this.roomId).subscribe({
      next: () => console.log(`[RoomComponent] Left room ${this.roomId} (DB member removed)`),
      error: err => console.warn(`[RoomComponent] Leave room API error:`, err)
    });
    this.lk.disconnect();
    this.ws.disconnect();
    this.router.navigate(['/dashboard']);
  }

  ngOnDestroy(): void {
    this.lk.disconnect();
    this.ws.disconnect();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  trackByIdentity(_: number, p: { identity: string }) { return p.identity; }
  trackByTimestamp(_: number, e: RoomEvent) { return e.timestamp; }

  // Expose Math for template
  protected readonly Math = Math;
}
