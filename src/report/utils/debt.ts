/**
 * Utility to analyze student debt and debt-to-income ratios.
 */
export interface DebtData {
  medianDebt: number | null;
  averageDebt: number | null;
  medianPayment: number | null;
  overallAvgDebt: number | null;
  overallAvgIncome: number | null;
  overallDebtIncomeRatio: number | null;
  ratioText: string | null;
}

export interface DebtResult {
  medianDebtFormatted: string;
  averageDebtFormatted: string;
  monthlyPaymentFormatted: string;
  debtIncomeRatioFormatted: string;
  riskCategory: "Low" | "Moderate" | "High";
  riskExplanation: string;
}

export function analyzeDebt(data: DebtData): DebtResult {
  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const medianDebtFormatted = formatCurrency(data.medianDebt ?? data.overallAvgDebt);
  const averageDebtFormatted = formatCurrency(data.averageDebt ?? data.overallAvgDebt);
  const monthlyPaymentFormatted = formatCurrency(data.medianPayment);

  // If program-specific debt-to-income is missing, fallback to overall school ratio
  const ratioVal = data.overallDebtIncomeRatio;
  let ratioStr = "N/A";
  if (ratioVal !== null && ratioVal !== undefined) {
    ratioStr = `${(ratioVal * 100).toFixed(1)}%`;
  }

  let riskCategory: "Low" | "Moderate" | "High" = "Moderate";
  let riskExplanation = "";

  const checkRatio = ratioVal ?? (data.medianDebt && data.overallAvgIncome && data.overallAvgIncome > 0
    ? data.medianDebt / data.overallAvgIncome
    : 0.35);

  if (checkRatio < 0.3) {
    riskCategory = "Low";
    riskExplanation = "The projected debt burden is well within safe thresholds relative to average graduate earnings, posing low financial strain.";
  } else if (checkRatio < 0.6) {
    riskCategory = "Moderate";
    riskExplanation = "Projects a manageable debt-to-income profile. Standard repayment terms can be satisfied comfortably, though caution is recommended.";
  } else {
    riskCategory = "High";
    riskExplanation = "Projections indicate high student debt relative to average graduate salaries. This represents a significant financial risk.";
  }

  return {
    medianDebtFormatted,
    averageDebtFormatted,
    monthlyPaymentFormatted,
    debtIncomeRatioFormatted: ratioStr,
    riskCategory,
    riskExplanation,
  };
}
