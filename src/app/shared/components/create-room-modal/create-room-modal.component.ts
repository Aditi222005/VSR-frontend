import { Component, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../../../core/services/room.service';
import { Room } from '../../../core/models/room.model';

@Component({
  selector: 'app-create-room-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-room-modal.component.html',
  styleUrl: './create-room-modal.component.scss'
})
export class CreateRoomModalComponent {
  private roomService = inject(RoomService);

  @Output() closeModal = new EventEmitter<void>();
  @Output() roomCreated = new EventEmitter<Room>();

  name = signal('');
  description = signal('');
  roomType = signal<string>('GENERAL_FOCUS');
  capacity = signal<number>(10);
  musicEnabled = signal<boolean>(false);

  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  categories = [
    { value: 'GENERAL_FOCUS', label: '🎯 General Focus', desc: 'All study topics & quiet co-working' },
    { value: 'CODING', label: '💻 Coding & Tech', desc: 'Software engineering, algorithms & web dev' },
    { value: 'EXAM_PREP', label: '📝 Exam Prep', desc: 'Intense study, flashcards & problem sets' },
    { value: 'READING', label: '📖 Reading & Research', desc: 'Textbook reading, research papers & writing' },
    { value: 'DESIGN', label: '🎨 Design & Creative', desc: 'UI/UX, digital art & creative brainstorming' }
  ];

  onClose(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (!this.name().trim() || !this.description().trim()) {
      this.errorMessage.set('Please fill out the room title and description.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const roomPayload: Partial<Room> = {
      name: this.name().trim(),
      description: this.description().trim(),
      roomType: this.roomType(),
      capacity: this.capacity(),
      musicEnabled: this.musicEnabled(),
      active: true
    };

    this.roomService.createRoom(roomPayload).subscribe({
      next: (createdRoom) => {
        this.isSubmitting.set(false);
        this.roomCreated.emit(createdRoom);
        this.onClose();
      },
      error: (err) => {
        console.warn('[CreateRoomModal] API create room error:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set('Failed to create room. Please check backend connection.');
      }
    });
  }
}
