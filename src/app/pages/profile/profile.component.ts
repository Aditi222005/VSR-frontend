import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { RoomService } from '../../core/services/room.service';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private roomService = inject(RoomService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  currentUser = this.authService.currentUser;

  // Dynamic signals derived from actual user session and room activity
  roomsCount = signal(0);
  sessionNotesCount = signal(0);

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
    }

    if (isPlatformBrowser(this.platformId)) {
      // Calculate dynamic count of rooms
      this.roomService.loadRooms();

      // Count local notes stored
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vsr_notes_room_')) {
          count++;
        }
      }
      this.sessionNotesCount.set(count);
    }
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return 'ST';
    const parts = user.name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return user.name.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
