// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

/**
 * Raw shape returned directly from the PostgreSQL query (single flat row).
 * All LEFT-JOIN fields are typed as nullable since they may not exist for
 * every unitid / cip_code combination.
 */
export interface OverviewRow {
  // schools
  unitid: number;
  program_count: number | null;

  // admissions
  admission_rate: number | null;

  // students
  size: number | null;
  student_faculty_ratio: string | null;
  retention_rate: number | null;
  fafsa_applications: number | null;

  // completion
  completion_rate: number | null;

  // earnings_against_courses (keyed by unitid + cip_code)
  year_1: number | null;
  year_10: number | null;
  growth_rate: number | null;

  // roi (keyed by unitid + credential_level)
  roi_20yr: number | null;

  // costs (used for ROI supplementary data)
  for_roi_data: Record<string, unknown> | null;
}

/**
 * Nested response shape sent back to the client.
 */
export interface OverviewResponse {
  school: {
    unitid: number;
    program_count: number | null;
  };
  admissions: {
    admission_rate: number | null;
  };
  students: {
    size: number | null;
    student_faculty_ratio: string | null;
    retention_rate: number | null;
    fafsa_applications: number | null;
  };
  completion: {
    completion_rate: number | null;
  };
  earnings: {
    year_1: number | null;
    year_10: number | null;
    growth_rate: number | null;
  };
  roi: {
    roi_20yr: number | null;
    for_roi_data: Record<string, unknown> | null;
  };
}
