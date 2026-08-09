import { Component, Input, signal, computed } from '@angular/core';
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
  @Input() cardIndex = 0;

  isJoining = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(private router: Router, private roomService: RoomService) {}

  joinRoom(event: Event): void {
    event.stopPropagation();
    if (this.isJoining()) return;
    this.isJoining.set(true);

    this.roomService.joinRoom(this.room.id).subscribe({
      next: (response) => {
        this.router.navigate(['/rooms', response.roomId || this.room.id], {
          state: { roomName: response.roomName || this.room.name }
        }).then(() => this.isJoining.set(false));
      },
      error: (err) => {
        console.warn('[RoomCard] Join API notice, navigating directly to room:', err);
        this.router.navigate(['/rooms', this.room.id], {
          state: { roomName: this.room.name }
        }).then(() => this.isJoining.set(false));
      }
    });
  }

  getCategoryLabel(roomType: string): string {
    switch (roomType) {
      case 'CODING':        return '💻 Coding & Tech';
      case 'EXAM_PREP':     return '📝 Exam Prep';
      case 'READING':       return '📖 Reading';
      case 'DESIGN':        return '🎨 Design';
      case 'GENERAL_FOCUS': return '🎯 Deep Focus';
      default:              return '🚀 Study Space';
    }
  }

  getCategoryBadgeClass(roomType: string): string {
    switch (roomType) {
      case 'CODING':        return 'badge-cat--coding';
      case 'EXAM_PREP':     return 'badge-cat--exam';
      case 'READING':       return 'badge-cat--reading';
      case 'DESIGN':        return 'badge-cat--design';
      default:              return 'badge-cat--general';
    }
  }

  /** Generate seeded avatar initials from room name for visual variety */
  getAvatarInitials(): string[] {
    const seedNames = ['AL', 'JK', 'MR', 'PS', 'KD', 'NV', 'TS', 'RW'];
    // Use room id as a seed to deterministically pick 2-4 "participants"
    const count = 2 + (this.room.id % 3); // 2, 3, or 4
    const start = this.room.id % seedNames.length;
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(seedNames[(start + i) % seedNames.length]);
    }
    return result;
  }

  /** Get a seeded hue for an avatar based on its index + room id */
  getAvatarHue(index: number): number {
    return ((this.room.id * 47 + index * 83) % 360);
  }

  /** Visual capacity indicator */
  getCapacityPercent(): number {
    const cap = this.room.capacity || 10;
    return Math.min(100, (cap / 20) * 100);
  }

  /** Get activity text seeded per room */
  getActivityText(): string {
    const activities = [
      'Studying together now',
      'Deep focus session',
      'Group study in progress',
      'Active study session',
      'Focused & productive'
    ];
    return activities[this.room.id % activities.length];
  }
}
