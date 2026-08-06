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

  private pendingSubscriptions: SubscribeRequest[] = [];
  private activeSubscriptions: StompSubscription[] = [];
  private connected = false;

  connect(): void {

    if (this.client?.active || this.connected) {
      return;
    }

    const token = localStorage.getItem('token');

    this.client = new Client({

      // ✅ STOMP Debug Logs
      debug: (msg: string) => {
        console.log('[STOMP]', msg);
      },

      webSocketFactory: () =>
        new SockJS('http://localhost:8080/ws', null, {
          transports: ['websocket']
        }),

      connectHeaders: token
        ? { Authorization: `Bearer ${token}` }
        : {},

      reconnectDelay: 0,

      onConnect: () => {

        console.log('[WS] Connected');
        console.log('[WS] Pending subscriptions:', this.pendingSubscriptions);

        this.connected = true;

        for (const req of this.pendingSubscriptions) {

          console.log('[WS] Subscribing to:', req.destination);

          const sub = this.client!.subscribe(req.destination, msg => {

            console.log('[WS] Message received:', msg.body);

            req.callback(JSON.parse(msg.body));

          });

          this.activeSubscriptions.push(sub);
        }

        this.pendingSubscriptions = [];
      },

      onDisconnect: () => {
        console.log('[WS] Disconnected');
        this.connected = false;
      },

      onStompError: frame => {
        console.error('[WS] STOMP Error', frame);
      },

      onWebSocketError: err => {
        console.error('[WS] WebSocket Error', err);
      },

      // ✅ Added for debugging
      onWebSocketClose: event => {
        console.error('[WS] WebSocket Closed', event);
      }

    });

    this.client.activate();
  }

  // --------------------------------------------------
  // Room Events
  // --------------------------------------------------

  subscribeToRoom(
    roomId: number,
    callback: (message: any) => void
  ): void {

    this._subscribe(`/topic/rooms/${roomId}`, callback);

  }

  subscribeToParticipants(
    roomId: number,
    callback: (participants: any) => void
  ): void {

    this._subscribe(`/topic/rooms/${roomId}/participants`, callback);

  }

  // --------------------------------------------------
  // Chat
  // --------------------------------------------------

  subscribeToChat(
    roomId: number,
    callback: (message: any) => void
  ): void {

    console.log('[CHAT] subscribeToChat called for room', roomId);

    this._subscribe(`/topic/rooms/${roomId}/chat`, callback);

  }

  sendChatMessage(
    roomId: number,
    message: string
  ): void {

    console.log('[CHAT] Sending message...');
    console.log('[CHAT] Connected:', this.client?.connected);

    if (!this.client?.connected) {
      console.warn('[WS] STOMP not connected');
      return;
    }

    const payload = {
      roomId,
      message
    };

    console.log('[CHAT] Payload:', payload);

    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(payload)
    });

    console.log('[CHAT] Published successfully');

  }

  // --------------------------------------------------
  // Disconnect
  // --------------------------------------------------

  disconnect(): void {

    this.activeSubscriptions.forEach(sub => {

      try {
        sub.unsubscribe();
      } catch {}

    });

    this.activeSubscriptions = [];
    this.pendingSubscriptions = [];
    this.connected = false;

    if (this.client?.active) {
      this.client.deactivate();
    }

    this.client = null;

  }

  // --------------------------------------------------
  // Internal Subscribe
  // --------------------------------------------------

  private _subscribe(
    destination: string,
    callback: (message: any) => void
  ): void {

    if (this.connected && this.client?.connected) {

      console.log('[WS] Immediate subscribe:', destination);

      const sub = this.client.subscribe(destination, msg => {

        console.log('[WS] Chat/Event received:', msg.body);

        callback(JSON.parse(msg.body));

      });

      this.activeSubscriptions.push(sub);

    } else {

      console.log('[WS] Queueing subscription:', destination);

      this.pendingSubscriptions.push({
        destination,
        callback
      });

    }

  }

}