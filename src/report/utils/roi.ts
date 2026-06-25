/**
 * Utility to format and analyze Return on Investment (ROI) data.
 */
export interface RoiData {
  unitid: number;
  totalCost: number | null;
  avgSalary: number | null;
  roi20Yr: number | null;
}

export interface RoiResult {
  roi20Yr: number | null;
  roiFormatted: string;
  totalCostFormatted: string;
  annualReturnRate: string;
  investmentTier: "High" | "Moderate" | "Low" | "Unknown";
}

export function analyzeRoi(data: RoiData): RoiResult {
  const { totalCost, avgSalary, roi20Yr } = data;

  let formattedRoi = "N/A";
  let formattedCost = "N/A";
  let annualRateStr = "N/A";
  let tier: "High" | "Moderate" | "Low" | "Unknown" = "Unknown";

  if (roi20Yr !== null && roi20Yr !== undefined) {
    formattedRoi = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(roi20Yr);

    // Rate tiering based on standard 20yr ROI amounts
    if (roi20Yr >= 500000) tier = "High";
    else if (roi20Yr >= 200000) tier = "Moderate";
    else tier = "Low";
  }

  if (totalCost !== null && totalCost !== undefined) {
    formattedCost = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(totalCost);
  }

  // Calculate annual rate of return: (ROI_20yr / TotalCost) / 20 * 100
  if (roi20Yr && totalCost && totalCost > 0) {
    // Annualized return (simple rate)
    const annualReturn = (roi20Yr / totalCost / 20) * 100;
    annualRateStr = `${annualReturn.toFixed(1)}%`;
  }

  return {
    roi20Yr,
    roiFormatted: formattedRoi,
    totalCostFormatted: formattedCost,
    annualReturnRate: annualRateStr,
    investmentTier: tier,
  };
}
