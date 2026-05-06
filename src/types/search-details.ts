export interface State {
  id: number;
  state_code: string;
  state_title: string;
}

export interface CredentialLevel {
  id: number;
  name: string;
}

export interface Course {
  title: string;
}

export interface SearchResult {
  program_id: number;
  program_title: string;
  cip_code: string;
  credential_title: string;
  credential_level: number | null;
  school_type: string | null;
  school_name: string;
  city: string | null;
  state: string | null;
  admission_rate: number | null;   // LEFT JOIN
  emp_factor: number | null;       // LEFT JOIN
  earnings_year_5: number | null;  // LEFT JOIN
}
export interface SearchQueryParams {
  credential_title?: string;
  state?: string;
  title?: string;
}