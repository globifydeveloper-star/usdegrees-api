// routes/schoollevelsearch/types.ts

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
  // earnings_against_courses
  year_5: number | null;
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
  };
}
