/**
 * colleges.ts
 * Types for college listing and filtering API
 */

export interface College {
  unitid: number;
  school_name: string;
  city: string | null;
  state: string | null;
  school_type: string | null;
  school_url: string | null;
}

export interface CollegesResponse {
  data: College[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  details?: string;
}
