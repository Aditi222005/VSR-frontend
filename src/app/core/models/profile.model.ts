export interface ProfileResponse {
  id?: number;
  userId?: number;
  name?: string;
  displayName?: string;
  username?: string;
  email?: string;
  bio?: string | null;
  institution?: string | null;
  college?: string | null;
  weeklyStudyGoal?: number | null;
  profilePicture?: string | null;
  avatarUrl?: string | null;
  picture?: string | null;
  createdAt?: string | null;
  memberSince?: string | null;
  authProvider?: string | null;
  isOAuth?: boolean | null;
  roles?: string[];
}

export interface UpdateProfileRequest {
  name?: string;
  displayName?: string;
  bio?: string | null;
  institution?: string | null;
  weeklyStudyGoal?: number | null;
}

export interface ProfileStats {
  userId?: number;
  totalStudyHours: number;
  roomsJoined: number;
  currentStreak: number;
  weeklyGoalHours: number;
  weeklyCompletedHours: number;
}
