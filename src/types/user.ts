import { Request } from "express";

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
  password?: string | null;
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

export interface AuthRequest extends Request {
  user?: {
    id: number;
    userId?: number;
    email: string;
    role: string;
  };
}

