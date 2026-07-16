import { Request } from "express";

export interface User {
  id: number;
  firebase_uid: string | null;
  display_name: string | null;
  email: string;
  profile_image: string | null;
  auth_provider: string | null;
  role: string;
  email_verified: boolean;
  provider_user_id: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  created_at: string;
  last_login: string | null;
  password_hash?: string | null;
  age_consent: boolean;
}

export interface UserProfile {
  id: number;
  display_name: string | null;
  email: string;
  profile_image: string | null;
  role: string;
  email_verified: boolean;
  age_consent: boolean;
}

export interface UpsertUserBody {
  display_name?: string;
  email: string;
  profile_image?: string;
  auth_provider?: string;
  role?: string;
  email_verified?: boolean;
  provider_user_id?: string;
  age_consent?: boolean;
}

export interface ApiError {
  error: string;
  details?: string;
}

/**
 * Request carrying the authenticated Firebase UID, extracted from the
 * app JWT `sub` claim by the verifyToken middleware.
 */
export interface AuthRequest extends Request {
  userId?: string;
}

export interface UpdateProfileBody {
  display_name?: string;
  profile_image?: string;
}
