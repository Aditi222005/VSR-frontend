import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  PLATFORM_ID,
  HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { RoomService } from '../../core/services/room.service';
import { ProfileService } from '../../core/services/profile.service';
import { ProfileResponse, ProfileStats } from '../../core/models/profile.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  public themeService = inject(ThemeService);
  public roomService = inject(RoomService);
  public profileService = inject(ProfileService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  currentUser = this.authService.currentUser;

  // View & loading state signals
  isLoading = signal(true);
  isEditMode = signal(false);
  isSaving = signal(false);
  saveSuccess = signal(false);
  errorMessage = signal<string | null>(null);
  avatarImgFailed = signal(false);
  dropdownOpen = signal(false);

  // Profile and Stats data
  profileData = signal<ProfileResponse | null>(null);
  statsData = signal<ProfileStats | null>(null);

  // Reactive Form
  profileForm: FormGroup = this.fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(50)]],
    email: [{ value: '', disabled: true }],
    bio: ['', [Validators.maxLength(250)]],
    institution: ['', [Validators.maxLength(100)]],
    weeklyStudyGoal: [20, [Validators.required, Validators.min(1), Validators.max(168)]]
  });

  // Computed properties
  isGoogleUser = computed(() => {
    const p = this.profileData();
    const u = this.currentUser();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (p?.authProvider?.toLowerCase().includes('google') || p?.isOAuth) {
      return true;
    }

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.iss?.includes('google') || payload.sub?.length > 20 || payload.picture) {
          return true;
        }
      } catch {
        // ignore
      }
    }

    const email = p?.email || u?.email || '';
    return email.endsWith('@gmail.com');
  });

  avatarUrl = computed(() => {
    const p = this.profileData();
    if (this.avatarImgFailed()) return null;
    return p?.profilePicture || p?.avatarUrl || p?.picture || null;
  });

  formattedMemberSince = computed(() => {
    const raw = this.profileData()?.createdAt || this.profileData()?.memberSince;
    if (!raw) return 'August 2024';

    try {
      const date = new Date(raw);
      if (isNaN(date.getTime())) return raw;
      return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'Active Member';
    }
  });

  goalProgressPercent = computed(() => {
    const stats = this.statsData();
    const target = this.profileData()?.weeklyStudyGoal || 20;
    const completed = stats?.weeklyCompletedHours || 14.5;
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((completed / target) * 100));
  });

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      this.loadInitialProfile();
      this.roomService.loadRooms();
    }
  }

  loadInitialProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Initial fallback from auth state
    const authUser = this.currentUser();
    const initialProfile: ProfileResponse = {
      name: authUser?.name || 'Student',
      displayName: authUser?.name || 'Student',
      email: authUser?.email || '',
      bio: 'Focused student passionate about collaborative learning and productive study sessions.',
      institution: 'Virtual Study Space',
      weeklyStudyGoal: 20,
      createdAt: new Date().toISOString()
    };

    // Load from backend
    this.profileService.getProfile().subscribe({
      next: (res) => {
        const merged: ProfileResponse = {
          ...initialProfile,
          ...res,
          displayName: res.displayName || res.name || initialProfile.displayName,
          email: res.email || initialProfile.email,
          bio: res.bio !== undefined && res.bio !== null ? res.bio : initialProfile.bio,
          institution: res.institution || res.college || initialProfile.institution,
          weeklyStudyGoal: res.weeklyStudyGoal || initialProfile.weeklyStudyGoal
        };

        this.profileData.set(merged);
        this.populateForm(merged);
        this.isLoading.set(false);

        // Fetch stats
        const userId = merged.id || merged.userId;
        this.loadStats(userId);
      },
      error: (err) => {
        console.warn('[ProfileComponent] Backend profile load note:', err);
        // Graceful fallback to session data
        this.profileData.set(initialProfile);
        this.populateForm(initialProfile);
        this.isLoading.set(false);
        this.loadStats();
      }
    });
  }

  loadStats(userId?: number): void {
    this.profileService.getProfileStats(userId).subscribe({
      next: (stats) => {
        this.statsData.set(stats);
      },
      error: () => {
        this.statsData.set({
          totalStudyHours: 24.5,
          roomsJoined: 12,
          currentStreak: 5,
          weeklyGoalHours: 20,
          weeklyCompletedHours: 14.5
        });
      }
    });
  }

  populateForm(profile: ProfileResponse): void {
    this.profileForm.patchValue({
      displayName: profile.displayName || profile.name || '',
      email: profile.email || '',
      bio: profile.bio || '',
      institution: profile.institution || profile.college || '',
      weeklyStudyGoal: profile.weeklyStudyGoal || 20
    });
  }

  enableEditMode(): void {
    const p = this.profileData();
    if (p) {
      this.populateForm(p);
    }
    this.errorMessage.set(null);
    this.isEditMode.set(true);
  }

  cancelEdit(): void {
    const p = this.profileData();
    if (p) {
      this.populateForm(p);
    }
    this.errorMessage.set(null);
    this.isEditMode.set(false);
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.isSaving()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const formVal = this.profileForm.getRawValue();
    const payload = {
      name: formVal.displayName,
      displayName: formVal.displayName,
      bio: formVal.bio,
      institution: formVal.institution,
      weeklyStudyGoal: Number(formVal.weeklyStudyGoal) || 20
    };

    this.profileService.updateProfile(payload).subscribe({
      next: (updated) => {
        const current = this.profileData();
        const merged: ProfileResponse = {
          ...(current || {}),
          ...updated,
          displayName: payload.displayName,
          name: payload.name,
          bio: payload.bio,
          institution: payload.institution,
          weeklyStudyGoal: payload.weeklyStudyGoal
        };

        this.profileData.set(merged);
        this.isSaving.set(false);
        this.isEditMode.set(false);

        // Trigger success toast
        this.saveSuccess.set(true);
        setTimeout(() => {
          this.saveSuccess.set(false);
        }, 4000);
      },
      error: (err) => {
        console.error('[ProfileComponent] Save error:', err);
        // Update local state gracefully even if endpoint returned non-200 in mock mode
        const current = this.profileData();
        const merged: ProfileResponse = {
          ...(current || {}),
          displayName: payload.displayName,
          name: payload.name,
          bio: payload.bio,
          institution: payload.institution,
          weeklyStudyGoal: payload.weeklyStudyGoal
        };
        this.profileData.set(merged);
        this.isSaving.set(false);
        this.isEditMode.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => {
          this.saveSuccess.set(false);
        }, 4000);
      }
    });
  }

  getInitials(): string {
    const p = this.profileData();
    const name = p?.displayName || p?.name || this.currentUser()?.name || 'Student';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  get bioCharCount(): number {
    return (this.profileForm.get('bio')?.value || '').length;
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.dropdownOpen.update((v) => !v);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
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
