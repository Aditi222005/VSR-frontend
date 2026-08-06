import { Injectable } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

type SubscribeRequest = {
  destination: string;
  callback: (message: any) => void;
};

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {

  private client: Client | null = null;

  // Subscriptions queued before the STOMP handshake completed
  private pendingSubscriptions: SubscribeRequest[] = [];
  private activeSubscriptions: StompSubscription[] = [];
  private connected = false;

  connect(): void {
    if (this.client?.active || this.connected) return;

    const token = localStorage.getItem('token');

    this.client = new Client({
      // Restrict to websocket transport only — prevents the iframe/jsonp fallback storm
      webSocketFactory: () => new SockJS('http://localhost:8080/ws', null, {
        transports: ['websocket']
      }),

      // JWT in STOMP header for Spring Security channel authentication
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},

      // No auto-reconnect — component controls lifecycle to prevent request floods
      reconnectDelay: 0,

      onConnect: () => {
        console.log('[WS] ✅ STOMP connected');
        this.connected = true;

        // Flush subscriptions queued before connection was ready
        for (const req of this.pendingSubscriptions) {
          const sub = this.client!.subscribe(req.destination, msg => {
            req.callback(JSON.parse(msg.body));
          });
          this.activeSubscriptions.push(sub);
        }
        this.pendingSubscriptions = [];
      },

      onStompError: frame => {
        console.error('[WS] STOMP error:', frame.headers['message'], frame.body);
      },

      onWebSocketError: event => {
        console.error('[WS] WebSocket error:', event);
      },

      onDisconnect: () => {
        console.log('[WS] Disconnected');
        this.connected = false;
      }
    });

    this.client.activate();
  }

  // ── Room events ────────────────────────────────────────────────────────────

  subscribeToRoom(roomId: number, callback: (message: any) => void): void {
    this._subscribe(`/topic/rooms/${roomId}`, callback);
  }

  subscribeToParticipants(roomId: number, callback: (participants: any) => void): void {
    this._subscribe(`/topic/rooms/${roomId}/participants`, callback);
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  subscribeToChat(roomId: number, callback: (message: any) => void): void {
    this._subscribe(`/topic/chat/${roomId}`, callback);
  }

  sendChatMessage(roomId: number, content: string): void {
    if (!this.client?.connected) {
      console.warn('[WS] Cannot send — STOMP not connected');
      return;
    }
    this.client.publish({
      destination: `/app/chat/${roomId}`,
      body: JSON.stringify({ content })
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  disconnect(): void {
    for (const sub of this.activeSubscriptions) {
      try { sub.unsubscribe(); } catch { /* ignore */ }
    }
    this.activeSubscriptions = [];
    this.pendingSubscriptions = [];
    this.connected = false;

    if (this.client?.active) {
      this.client.deactivate();
    }
    this.client = null;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _subscribe(destination: string, callback: (message: any) => void): void {
    if (this.connected && this.client?.connected) {
      const sub = this.client.subscribe(destination, msg => {
        callback(JSON.parse(msg.body));
      });
      this.activeSubscriptions.push(sub);
    } else {
      this.pendingSubscriptions.push({ destination, callback });
    }
  }
}
