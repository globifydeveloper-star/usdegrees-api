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
  program_title: string;
  cip_code: string;
  credential_title: string;
  credential_level: number;
  school_type: string;

  school_name: string;
  city: string;
  state: string;
  unitid: number;
  is_active: boolean;

  admission_rate: number | null;
  school_min_range: number | null;
  school_max_range: number | null;
  emp_factor: number | null;
  earnings_year_5: number | null;

  roi_20yr: number | null;
}
export interface SearchQueryParams {
  credential_title?: string;
  state?: string;
  title?: string;
}