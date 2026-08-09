import { Component, OnInit, signal, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { RoomService } from '../core/services/room.service';
import { ThemeService } from '../core/services/theme.service';
import { RoomCardComponent } from '../shared/components/room-card/room-card.component';
import { CreateRoomModalComponent } from '../shared/components/create-room-modal/create-room-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RoomCardComponent,
    CreateRoomModalComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  public roomService = inject(RoomService);
  public themeService = inject(ThemeService);
  private router = inject(Router);

  dropdownOpen = signal(false);
  createModalOpen = signal(false);

  // Filters
  selectedCategory = signal<string>('ALL');
  searchQuery = signal<string>('');

  currentUser = this.authService.currentUser;
  rooms = this.roomService.rooms;
  isLoading = this.roomService.isLoading;

  // Filtered rooms computed signal
  filteredRooms = computed(() => {
    const all = this.rooms();
    const cat = this.selectedCategory();
    const q = this.searchQuery().toLowerCase().trim();

    return all.filter(r => {
      const matchCat = cat === 'ALL' || r.roomType === cat;
      const matchQ = !q || r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  });

  categories = [
    { value: 'ALL', label: '🌐 All Spaces' },
    { value: 'CODING', label: '💻 Coding' },
    { value: 'EXAM_PREP', label: '📝 Exam Prep' },
    { value: 'READING', label: '📖 Reading' },
    { value: 'DESIGN', label: '🎨 Design' },
    { value: 'GENERAL_FOCUS', label: '🎯 General Focus' }
  ];

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
    }
    this.roomService.loadRooms();
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return 'ST';
    const parts = user.name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  }

  setCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  updateSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.dropdownOpen.update((v) => !v);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  openCreateModal(): void {
    this.createModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.createModalOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeDropdown();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
