import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Room } from '../../../core/models/room.model';
import { RoomService } from '../../../core/services/room.service';

@Component({
  selector: 'app-room-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room-card.component.html',
  styleUrl: './room-card.component.scss',
})
export class RoomCardComponent {
  @Input({ required: true }) room!: Room;
  @Input() isRecommended = false;

  isJoining = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(private router: Router, private roomService: RoomService) {}

  joinRoom(event: Event): void {
    event.stopPropagation();

    if (this.isJoining()) return;  // prevent double-click
    this.isJoining.set(true);

    console.log('[RoomCard] Calling POST /join for room', this.room.id);

    this.roomService.joinRoom(this.room.id).subscribe({
      next: (response) => {
        console.log('[RoomCard] Join API succeeded:', response);
        console.log('[RoomCard] Navigating to /rooms/' + response.roomId);

        this.router.navigate(['/rooms', response.roomId], {
          state: { roomName: response.roomName }
        }).then(success => {
          console.log('[RoomCard] Navigation result:', success ? '✅ SUCCESS' : '❌ BLOCKED by guard');
          this.isJoining.set(false);
        });
      },
      error: err => {
        console.error('[RoomCard] Join API failed:', err);
        // Extract backend message from the response body
        const backendMsg = err?.error?.message || err?.error?.error || err?.statusText;
        this.errorMessage.set(backendMsg || 'Failed to join room. Please try again.');
        this.isJoining.set(false);
        // Auto-clear after 4 seconds
        setTimeout(() => this.errorMessage.set(null), 4000);
      }
    });
  }

  getBadgeClass(roomType: string): string {
    switch (roomType) {
      case 'CODING':        return 'badge--coding';
      case 'EXAM_PREP':     return 'badge--exam';
      case 'READING':       return 'badge--reading';
      case 'DESIGN':        return 'badge--design';
      case 'GENERAL_FOCUS': return 'badge--focus';
      default:              return '';
    }
  }

  getRoomTypeClass(roomType: string): string {
    switch (roomType) {
      case 'CODING':        return 'room-card--coding';
      case 'EXAM_PREP':     return 'room-card--exam';
      case 'READING':       return 'room-card--reading';
      case 'DESIGN':        return 'room-card--design';
      case 'GENERAL_FOCUS': return 'room-card--focus';
      default:              return '';
    }
  }
}
