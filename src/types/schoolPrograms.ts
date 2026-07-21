// routes/schoollevelsearch/types.ts

import { EarningsFillMethod, RawEarningsFillMethod } from "./earnings";

// ── API #1 – Autocomplete ─────────────────────────────────────────────────────

export interface AutocompleteRow {
  title: string;
}

export interface AutocompleteResponse {
  programs: AutocompleteRow[];
}

// ── API #2 – Degree Levels ────────────────────────────────────────────────────

export interface DegreeLevelRow {
  credential_title: string;
  credential_level: number;
}

export interface DegreeLevelsResponse {
  degrees: DegreeLevelRow[];
}

// ── API #3 – Program Search ───────────────────────────────────────────────────

export interface ProgramSearchRow {
  // schools
  school_name: string;
  city: string;
  state: string;
  // programs
  program_title: string;
  cip_code: string;
  credential_title: string;
  credential_level: number;
  school_type: string | null;
  // admissions
  admission_rate: number | null;
  // completion
  emp_factor: number | null;
  // earnings_against_courses_merged
  year_5: number | null;
  year_5_method: RawEarningsFillMethod;
}

export interface ProgramSearchResponse {
  school: {
    name: string;
    city: string;
    state: string;
  };
  program: {
    title: string;
    cip_code: string;
    credential_title: string;
    credential_level: number;
    school_type: string | null;
  };
  admissions: {
    admission_rate: number | null;
  };
  employment: {
    emp_factor: number | null;
  };
  earnings: {
    year_5: number | null;
    year_5_method: EarningsFillMethod;
  };
}

// ── API #4 – All Programs (keyword + degree-level search) ─────────────────────

export interface AllProgramsRow {
  title: string;
  cip_code: string;
  credential_title: string;
  credential_level: number;
  degree_level_category: string;
}

export type AllProgramsResponse = AllProgramsRow[];

// ── API #5 – Credentials (distinct credential levels at a school) ─────────────

export interface CredentialRow {
  credential_title: string;
  credential_level: number;
}

export interface CredentialsResponse {
  credentials: CredentialRow[];
}
