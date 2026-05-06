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
  title: string;
  school_name: string;
  credential_title: string;
  state_code: string;
}