import { Component, Input, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Room } from '../../../core/models/room.model';
import { RoomService } from '../../../core/services/room.service';
import { JoinRoomResponse } from '../../../core/models/join-room-response.model';

@Component({
  selector: 'app-room-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room-card.component.html',
  styleUrl: './room-card.component.scss',
})
export class RoomCardComponent implements OnInit {
  @Input({ required: true }) room!: Room;
  @Input() isRecommended = false;
  @Input() cardIndex = 0;

  isJoining = signal(false);
  errorMessage = signal<string | null>(null);
  members = signal<JoinRoomResponse[]>([]);

  /** Slice to max 4 avatars for display */
  visibleMembers = computed(() => this.members().slice(0, 4));
  extraCount = computed(() => Math.max(0, this.members().length - 4));

  constructor(private router: Router, private roomService: RoomService) {}

  ngOnInit(): void {
    this.roomService.getRoomMembers(this.room.id).subscribe({
      next: (list) => this.members.set(list ?? []),
      error: () => this.members.set([])
    });
  }

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

  /** Get initials for a member's avatar */
  getMemberInitials(member: JoinRoomResponse): string {
    const name = member.username || '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  /** Get a deterministic hue for an avatar based on userId */
  getAvatarHue(userId: number): number {
    return ((userId * 47 + this.room.id * 83) % 360);
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
