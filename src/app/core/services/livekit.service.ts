import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrack,
  LocalTrack,
  Track,
  LocalVideoTrack,
  LocalAudioTrack,
  ConnectionQuality,
  Participant,
} from 'livekit-client';
import { environment } from '../../../environments/environment';
import { LiveKitTokenResponse } from '../models/livekit-token-response.model';

export type ConnectionQualityLevel = 'excellent' | 'good' | 'poor' | 'unknown';

export interface LKParticipant {
  identity: string;
  name: string;
  isLocal: boolean;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  videoTrack?: RemoteTrack | LocalTrack;
  audioTrack?: RemoteTrack | LocalTrack;
  isSpeaking: boolean;
  isHandRaised: boolean;
  connectionQuality: ConnectionQualityLevel;
}

@Injectable({
  providedIn: 'root',
})
export class LiveKitService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/livekit`;
  private platformId = inject(PLATFORM_ID);

  // Lazy Room instance — only created in the browser
  private _room: Room | null = null;

  get room(): Room {
    if (!this._room) {
      this._room = new Room({ adaptiveStream: true, dynacast: true });
    }
    return this._room;
  }

  set room(value: Room) {
    this._room = value;
  }

  // ── Signals ─────────────────────────────────────────────────────────────────
  private _participants = signal<LKParticipant[]>([]);
  participants = this._participants.asReadonly();

  private _isConnected = signal(false);
  isConnected = this._isConnected.asReadonly();

  private _isMicEnabled = signal(false);
  isMicEnabled = this._isMicEnabled.asReadonly();

  private _isCameraEnabled = signal(false);
  isCameraEnabled = this._isCameraEnabled.asReadonly();

  private _isScreenSharing = signal(false);
  isScreenSharing = this._isScreenSharing.asReadonly();

  // Speaking identities (from LiveKit active speakers)
  private _speakingIdentities = signal<Set<string>>(new Set());

  // Raised-hand identities (via LiveKit data channel)
  private _raisedHands = signal<Set<string>>(new Set());

  // Computed: is local user raising their hand?
  isRaisingHand = computed(() =>
    this._raisedHands().has(this._room?.localParticipant?.identity ?? '__none__')
  );

  // ── Token fetch ─────────────────────────────────────────────────────────────
  async getLiveKitToken(roomId: number, roomName: string): Promise<LiveKitTokenResponse> {
    return firstValueFrom(
      this.http.post<LiveKitTokenResponse>(`${this.apiUrl}/token`, { roomId, roomName })
    );
  }

  // ── Connect ─────────────────────────────────────────────────────────────────
  async connect(url: string, token: string): Promise<void> {
    this._registerRoomEvents();
    await this.room.connect(url, token);
    this._isConnected.set(true);
    this._syncParticipants();
  }

  // ── Camera & Microphone ──────────────────────────────────────────────────────
  async enableCameraAndMicrophone(): Promise<void> {
    await this.room.localParticipant.enableCameraAndMicrophone();
    this._isCameraEnabled.set(this.room.localParticipant.isCameraEnabled);
    this._isMicEnabled.set(this.room.localParticipant.isMicrophoneEnabled);
    this._syncParticipants();
  }

  async toggleMicrophone(): Promise<void> {
    const enabled = !this.room.localParticipant.isMicrophoneEnabled;
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
    this._isMicEnabled.set(enabled);
    this._syncParticipants();
  }

  async toggleCamera(): Promise<void> {
    const enabled = !this.room.localParticipant.isCameraEnabled;
    await this.room.localParticipant.setCameraEnabled(enabled);
    this._isCameraEnabled.set(enabled);
    this._syncParticipants();
  }

  async toggleScreenShare(): Promise<void> {
    const sharing = !this._isScreenSharing();
    await this.room.localParticipant.setScreenShareEnabled(sharing);
    this._isScreenSharing.set(sharing);
  }

  // ── Raise Hand (via LiveKit data channel) ─────────────────────────────────
  async raiseHand(): Promise<void> {
    const identity = this.room.localParticipant.identity;
    const hands = new Set(this._raisedHands());
    hands.add(identity);
    this._raisedHands.set(hands);
    try {
      const data = new TextEncoder().encode(JSON.stringify({ type: 'RAISE_HAND', raised: true }));
      await this.room.localParticipant.publishData(data, { reliable: true });
    } catch { /* ignore */ }
    this._syncParticipants();
  }

  async lowerHand(): Promise<void> {
    const identity = this.room.localParticipant.identity;
    const hands = new Set(this._raisedHands());
    hands.delete(identity);
    this._raisedHands.set(hands);
    try {
      const data = new TextEncoder().encode(JSON.stringify({ type: 'RAISE_HAND', raised: false }));
      await this.room.localParticipant.publishData(data, { reliable: true });
    } catch { /* ignore */ }
    this._syncParticipants();
  }

  // ── Disconnect ───────────────────────────────────────────────────────────────
  disconnect(): void {
    if (this._room) {
      this._room.disconnect();
    }
    this._isConnected.set(false);
    this._isMicEnabled.set(false);
    this._isCameraEnabled.set(false);
    this._isScreenSharing.set(false);
    this._participants.set([]);
    this._speakingIdentities.set(new Set());
    this._raisedHands.set(new Set());
    this._room = new Room({ adaptiveStream: true, dynacast: true });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private _registerRoomEvents(): void {
    this.room
      .on(RoomEvent.ParticipantConnected, () => this._syncParticipants())
      .on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
        // Remove hand when participant leaves
        const hands = new Set(this._raisedHands());
        hands.delete(p.identity);
        this._raisedHands.set(hands);
        this._syncParticipants();
      })
      .on(RoomEvent.TrackSubscribed, () => this._syncParticipants())
      .on(RoomEvent.TrackUnsubscribed, () => this._syncParticipants())
      .on(RoomEvent.TrackPublished, () => this._syncParticipants())
      .on(RoomEvent.TrackUnpublished, () => this._syncParticipants())
      .on(RoomEvent.LocalTrackPublished, () => this._syncParticipants())
      .on(RoomEvent.LocalTrackUnpublished, () => this._syncParticipants())
      .on(RoomEvent.TrackMuted, () => this._syncParticipants())
      .on(RoomEvent.TrackUnmuted, () => this._syncParticipants())
      .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        const ids = new Set(speakers.map(s => s.identity));
        this._speakingIdentities.set(ids);
        this._syncParticipants();
      })
      .on(RoomEvent.ConnectionQualityChanged, () => this._syncParticipants())
      .on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        if (!participant) return;
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload));
          if (msg.type === 'RAISE_HAND') {
            const hands = new Set(this._raisedHands());
            if (msg.raised) hands.add(participant.identity);
            else hands.delete(participant.identity);
            this._raisedHands.set(hands);
            this._syncParticipants();
          }
        } catch { /* ignore malformed data */ }
      })
      .on(RoomEvent.Disconnected, () => {
        this._isConnected.set(false);
        this._participants.set([]);
        this._speakingIdentities.set(new Set());
      });
  }

  private _syncParticipants(): void {
    const all: LKParticipant[] = [];
    const speaking = this._speakingIdentities();
    const raised = this._raisedHands();

    // Local participant
    const local = this.room.localParticipant;
    if (local) {
      const camPub = local.getTrackPublication(Track.Source.Camera);
      const micPub = local.getTrackPublication(Track.Source.Microphone);
      all.push({
        identity: local.identity,
        name: local.name || local.identity || 'You',
        isLocal: true,
        isCameraEnabled: local.isCameraEnabled,
        isMicEnabled: local.isMicrophoneEnabled,
        videoTrack: camPub?.track as LocalVideoTrack | undefined,
        audioTrack: micPub?.track as LocalAudioTrack | undefined,
        isSpeaking: speaking.has(local.identity),
        isHandRaised: raised.has(local.identity),
        connectionQuality: this._mapQuality(local.connectionQuality),
      });
    }

    // Remote participants
    this.room.remoteParticipants.forEach((p: RemoteParticipant) => {
      const camPub = p.getTrackPublication(Track.Source.Camera);
      const micPub = p.getTrackPublication(Track.Source.Microphone);
      all.push({
        identity: p.identity,
        name: p.name || p.identity,
        isLocal: false,
        isCameraEnabled: p.isCameraEnabled,
        isMicEnabled: p.isMicrophoneEnabled,
        videoTrack: camPub?.track as RemoteTrack | undefined,
        audioTrack: micPub?.track as RemoteTrack | undefined,
        isSpeaking: speaking.has(p.identity),
        isHandRaised: raised.has(p.identity),
        connectionQuality: this._mapQuality(p.connectionQuality),
      });
    });

    this._participants.set(all);
  }

  private _mapQuality(q: ConnectionQuality): ConnectionQualityLevel {
    switch (q) {
      case ConnectionQuality.Excellent: return 'excellent';
      case ConnectionQuality.Good:      return 'good';
      case ConnectionQuality.Poor:      return 'poor';
      default:                          return 'unknown';
    }
  }
}
