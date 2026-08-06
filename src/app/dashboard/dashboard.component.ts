import { Component, OnInit, signal, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { RoomService } from '../core/services/room.service';
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

  // Signals from services
  currentUser = this.authService.currentUser;
  rooms = this.roomService.rooms;
  isLoading = this.roomService.isLoading;

  constructor() {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
    }
    this.roomService.loadRooms();
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return 'U';
    const parts = user.name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
