export interface User {
  id: number;
  display_name: string | null;
  email: string;
  profile_image: string | null;
  auth_provider: string | null;
  role: string;
  email_verified: boolean;
  provider_user_id: string | null;
  created_at: string;
  last_login: string | null;
}

export interface UserProfile {
  id: number;
  display_name: string | null;
  email: string;
  profile_image: string | null;
  role: string;
  email_verified: boolean;
}

export interface UpsertUserBody {
  display_name?: string;
  email: string;
  profile_image?: string;
  auth_provider?: string;
  role?: string;
  email_verified?: boolean;
  provider_user_id?: string;
}

export interface ApiError {
  error: string;
  details?: string;
}
