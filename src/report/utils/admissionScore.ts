/**
 * Determines the admission fit category ("Safety", "Match", "Reach") and fit score (0-100)
 * based on the student's academic profile and the college's admission statistics.
 */
export interface StudentAcademics {
  gpa: number | null;
  satMath: number | null;
  satReadingWriting: number | null;
  actScore: number | null;
}

export interface CollegeAdmissions {
  admissionRate: number | null;
  satAvg: number | null;
  sat25Math: number | null;
  sat75Math: number | null;
  sat25Reading: number | null;
  sat75Reading: number | null;
}

export interface FitResult {
  category: "Safety" | "Match" | "Reach" | "Unavailable";
  score: number;
  explanation: string;
}

export function calculateAdmissionFit(
  student: StudentAcademics,
  college: CollegeAdmissions
): FitResult {
  // If no college admission rate or SAT averages are available, return unavailable
  if (college.admissionRate === null && college.satAvg === null) {
    return {
      category: "Unavailable",
      score: 50,
      explanation: "Insufficient college admission data to calculate academic fit.",
    };
  }

  // Fallbacks if student SAT is missing but GPA is provided
  const studentTotalSat =
    student.satMath && student.satReadingWriting
      ? student.satMath + student.satReadingWriting
      : student.satMath
      ? student.satMath * 2
      : student.satReadingWriting
      ? student.satReadingWriting * 2
      : null;

  let satScore = 50;
  let gpaScore = 50;
  let hasSat = false;
  let hasGpa = false;

  // 1. Calculate SAT fit
  if (studentTotalSat !== null) {
    hasSat = true;
    if (college.satAvg !== null) {
      const diff = studentTotalSat - college.satAvg;
      // Map difference of -200 to +200 onto a score of 0 to 100
      satScore = Math.max(0, Math.min(100, 50 + diff / 4));
    } else if (college.sat25Math !== null && college.sat75Math !== null) {
      const p25 = (college.sat25Math || 500) + (college.sat25Reading || 500);
      const p75 = (college.sat75Math || 700) + (college.sat75Reading || 700);
      if (studentTotalSat >= p75) {
        satScore = 85 + ((studentTotalSat - p75) / (1600 - p75)) * 15;
      } else if (studentTotalSat < p25) {
        satScore = Math.max(10, (studentTotalSat / p25) * 60);
      } else {
        satScore = 60 + ((studentTotalSat - p25) / (p75 - p25)) * 25;
      }
    }
  }

  // 2. Calculate GPA fit (assume standard 4.0 scale)
  // GPA comparison: average GPA for colleges usually correlates with acceptance rates
  if (student.gpa !== null) {
    hasGpa = true;
    let expectedAvgGpa = 3.5; // default fallback
    const rate = college.admissionRate !== null ? college.admissionRate : 0.5;

    if (rate < 0.1) expectedAvgGpa = 3.9;
    else if (rate < 0.25) expectedAvgGpa = 3.75;
    else if (rate < 0.5) expectedAvgGpa = 3.5;
    else if (rate < 0.75) expectedAvgGpa = 3.2;
    else expectedAvgGpa = 3.0;

    const diff = student.gpa - expectedAvgGpa;
    gpaScore = Math.max(0, Math.min(100, 50 + diff * 50));
  }

  // Determine overall score based on available academic components
  let score = 50;
  if (hasSat && hasGpa) {
    score = satScore * 0.6 + gpaScore * 0.4;
  } else if (hasSat) {
    score = satScore;
  } else if (hasGpa) {
    score = gpaScore;
  } else {
    // If student has no academic data, base score strictly on college acceptance rate
    score = college.admissionRate !== null ? college.admissionRate * 100 : 50;
  }

  // Factor in college selectivity (harder to get in = reach even with good scores)
  if (college.admissionRate !== null) {
    const selectivityPenalty = Math.max(0, (1 - college.admissionRate) * 20);
    score = score - selectivityPenalty;
    // Cap score at 95 for highly selective schools (acceptance rate < 10%)
    if (college.admissionRate < 0.1 && score > 90) {
      score = 90;
    }
  }

  score = Math.max(5, Math.min(99, Math.round(score)));

  let category: "Safety" | "Match" | "Reach";
  let explanation = "";

  if (score >= 75) {
    category = "Safety";
    explanation = "Your academic profile is well above this institution's average threshold, indicating a very high probability of admission.";
  } else if (score >= 45) {
    category = "Match";
    explanation = "Your scores align well with the middle 50% range of admitted students. This is a solid target choice.";
  } else {
    category = "Reach";
    explanation = college.admissionRate !== null && college.admissionRate < 0.12
      ? "This is an ultra-selective institution with high competition. Admission remains a reach for all applicants."
      : "Your academic credentials sit below the historical averages of admitted students, making admission competitive.";
  }

  return {
    category,
    score,
    explanation,
  };
}
