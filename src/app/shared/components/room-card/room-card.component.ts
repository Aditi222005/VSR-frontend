import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Room } from '../../../core/services/room.service';

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

  constructor(private router: Router) {}

  joinRoom(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/rooms', this.room.id]);
  }

  getCategoryClass(category: string): string {
    switch (category) {
      case 'Coding': return 'badge--coding';
      case 'Exam Prep': return 'badge--exam';
      case 'Reading': return 'badge--reading';
      case 'Design': return 'badge--design';
      case 'General Focus': return 'badge--focus';
      default: return '';
    }
  }

  getCategoryTintClass(category: string): string {
    switch (category) {
      case 'Coding': return 'room-card--coding';
      case 'Exam Prep': return 'room-card--exam';
      case 'Reading': return 'room-card--reading';
      case 'Design': return 'room-card--design';
      case 'General Focus': return 'room-card--focus';
      default: return '';
    }
  }
}
