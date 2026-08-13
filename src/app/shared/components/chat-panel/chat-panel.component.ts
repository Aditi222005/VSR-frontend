import {
  Component, Input, OnInit, OnDestroy,
  signal, inject, ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebSocketService } from '../../../core/services/websocket/websocket.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChatMessage } from '../../../core/models/chat-message.model';
import { ChatService } from '../../../core/services/chat.service';
import { Participant } from '../../../core/models/participant.model';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-panel.component.html',
  styleUrl: './chat-panel.component.scss',
})
export class ChatPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input({ required: true }) roomId!: number;
  @Input() participants: Participant[] = [];
  @ViewChild('messageList') messageList!: ElementRef<HTMLDivElement>;

  private ws = inject(WebSocketService);
  private auth = inject(AuthService);
  private chatService = inject(ChatService);

  messages = signal<ChatMessage[]>([]);
  draftMessage = '';
  private shouldScrollToBottom = false;

  ngOnInit(): void {

    console.log("ChatPanel ngOnInit");

    this.ws.subscribeToChat(this.roomId, (msg: ChatMessage) => {

      console.log("CHAT MESSAGE RECEIVED:", msg);

      this.messages.update(prev => [...prev, msg]);

      console.log("MESSAGES ARRAY:", this.messages());

      this.shouldScrollToBottom = true;
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this._scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    // Subscription cleanup is handled by WebSocketService.disconnect()
  }

  sendMessage(): void {
    const content = this.draftMessage.trim();
    if (!content) return;
    this.ws.sendChatMessage(this.roomId, content);
    this.draftMessage = '';
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  isOwnMessage(msg: ChatMessage): boolean {
    const user = this.auth.currentUser();
    return !!user && msg.username === user.name;
  }

  formatTime(ts: string): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private _scrollToBottom(): void {
    const el = this.messageList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
