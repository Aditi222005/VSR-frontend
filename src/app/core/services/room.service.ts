import { Injectable, signal, computed } from '@angular/core';

export interface Room {
  id: string;
  name: string;
  description: string;
  category: 'Coding' | 'Exam Prep' | 'Reading' | 'Design' | 'General Focus';
  capacity: number;
  currentParticipants: number;
}

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  // Mock rooms list
  private roomsSignal = signal<Room[]>([
    {
      id: 'room-1',
      name: 'TypeScript Wizards',
      description: 'Deep dive into advanced TypeScript types and generic patterns. Quiet working session.',
      category: 'Coding',
      capacity: 15,
      currentParticipants: 8,
    },
    {
      id: 'room-2',
      name: 'Algorithm Prep & LeetCode',
      description: 'Solving daily challenges and preparing for technical interviews together.',
      category: 'Coding',
      capacity: 20,
      currentParticipants: 12,
    },
    {
      id: 'room-3',
      name: 'MCAT Study Group',
      description: 'Silent study and active recall session for medical school aspirants.',
      category: 'Exam Prep',
      capacity: 10,
      currentParticipants: 6,
    },
    {
      id: 'room-4',
      name: 'Bar Exam Grind',
      description: 'Heavy reading and essay drafting. Absolute silence requested.',
      category: 'Exam Prep',
      capacity: 12,
      currentParticipants: 9,
    },
    {
      id: 'room-5',
      name: 'Deep Work: Classic Literature',
      description: 'Reading classic novels, philosophy, or articles. Focus on reading comprehension.',
      category: 'Reading',
      capacity: 8,
      currentParticipants: 4,
    },
    {
      id: 'room-6',
      name: 'UI/UX Design Studio',
      description: 'Figma sketching, component creation, and visual design feedback.',
      category: 'Design',
      capacity: 10,
      currentParticipants: 3,
    },
    {
      id: 'room-7',
      name: 'Late Night Pomodoro',
      description: '50-minute work sessions with 10-minute breaks. Perfect for all tasks.',
      category: 'General Focus',
      capacity: 30,
      currentParticipants: 18,
    },
    {
      id: 'room-8',
      name: 'Morning Routine & Coffee',
      description: 'Get your day started with planning and light focus tasks.',
      category: 'General Focus',
      capacity: 25,
      currentParticipants: 11,
    },
  ]);

  // Loading state
  private loadingSignal = signal<boolean>(false);
  isLoading = this.loadingSignal.asReadonly();

  // Filter state
  private filterSignal = signal<string>('All');
  activeFilter = this.filterSignal.asReadonly();

  // All rooms exposed
  rooms = this.roomsSignal.asReadonly();

  // Filtered rooms computed automatically based on activeFilter signal
  filteredRooms = computed(() => {
    const filter = this.filterSignal();
    const rooms = this.roomsSignal();
    if (filter === 'All') {
      return rooms;
    }
    return rooms.filter((room) => room.category.toLowerCase() === filter.toLowerCase());
  });

  constructor() {}

  setFilter(category: string): void {
    this.filterSignal.set(category);
  }

  // Helper to fetch recommended rooms based on preference
  getRecommendedRooms(preference: string | null | undefined): Room[] {
    if (!preference) return [];
    return this.roomsSignal().filter(
      (room) => room.category.toLowerCase() === preference.toLowerCase()
    );
  }
}
