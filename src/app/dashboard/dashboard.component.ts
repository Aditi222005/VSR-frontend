import { Component, OnInit, signal, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { RoomService, Room } from '../core/services/room.service';
import { RoomCardComponent } from '../shared/components/room-card/room-card.component';
import { ScrollRevealDirective } from '../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, RoomCardComponent, ScrollRevealDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  // Inject services
  private authService = inject(AuthService);
  private roomService = inject(RoomService);
  private router = inject(Router);

  // Signals
  dropdownOpen = signal(false);
  categories = ['All', 'Coding', 'Exam Prep', 'Reading', 'Design', 'General Focus'];

  categoriesWithIcons = [
    { name: 'All', icon: '🌐' },
    { name: 'Coding', icon: '💻' },
    { name: 'Exam Prep', icon: '📚' },
    { name: 'Reading', icon: '📖' },
    { name: 'Design', icon: '🎨' },
    { name: 'General Focus', icon: '🎯' },
  ];

  // Signals from services
  currentUser = this.authService.currentUser;
  rooms = this.roomService.rooms;
  filteredRooms = this.roomService.filteredRooms;
  activeFilter = this.roomService.activeFilter;
  isLoading = this.roomService.isLoading;

  // Computed signal for recommended rooms
  recommendedRooms = computed(() => {
    const user = this.currentUser();
    if (!user || !user.studyPreference) {
      return [];
    }
    return this.roomService.getRecommendedRooms(user.studyPreference);
  });

  constructor() {}

  ngOnInit(): void {
    // If not logged in, auto log in for demo purposes (or redirect)
    if (!this.currentUser()) {
      this.authService.login('Alex Johnson', 'alex.johnson@example.com');
    }
  }

  // Get user's initials for the avatar circle
  getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return 'U';
    const parts = user.name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  }

  // Time-aware greeting
  getTimeGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // Formatted today's date
  getTodayFormatted(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  // Total online participants
  getTotalOnline(): number {
    return this.rooms().reduce((sum, room) => sum + room.currentParticipants, 0);
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.dropdownOpen.update((v) => !v);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  // Close dropdown on click outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.closeDropdown();
  }

  setFilter(category: string): void {
    this.roomService.setFilter(category);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Demo helper: Toggle preference to see dynamic signal updates
  toggleMockPreference(): void {
    const user = this.currentUser();
    if (user) {
      const newPref = user.studyPreference ? null : 'Coding';
      this.authService.updateStudyPreference(newPref);
    }
  }
}
