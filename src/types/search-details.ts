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
  city: string | null;
  state: string | null;
  unitid: number;
  is_active: boolean;
  accreditor: string | null;

  admission_rate: number | null;
  school_min_range: number | null;
  school_max_range: number | null;
  emp_factor: number | null;
  earnings_year_5: number | null;

  roi_20yr: number | null;
  tuition_in_state: number | null;
}
export interface SearchQueryParams {
  credential_title?: string;
  state?: string;
  title?: string;
  school_type?: string;
  sort?: string;
}
