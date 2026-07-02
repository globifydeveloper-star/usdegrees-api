import React from "react";
import { ReportCalculatedData } from "../utils/reportCalculations";
import { theme } from "./theme";
import { pageStyle, PageHeader, PageFooter } from "./PageChrome";

export interface MethodologyProps {
  data: ReportCalculatedData;
  reportId: string;
  generatedDate: string;
  pageNumber: number;
  totalPages: number;
}

export default function Methodology({
  reportId,
  generatedDate,
  pageNumber,
  totalPages,
}: MethodologyProps) {
  return (
    <div style={pageStyle}>
      <div>
        <PageHeader sectionLabel="SECTION 06 · MODELS & DISCLAIMERS" title="Calculation Methodology & Disclaimers" />

        {/* Methodology Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "30px" }}>
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: theme.color.navy, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Calculation Methodology
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: theme.color.ink, lineHeight: "1.4" }}>
              <div>
                <strong>• 20-Year Return on Investment (ROI):</strong> Calculated using a 20-year net present value projection model. It factors in average total cost (tuition, fees, room, and board) subtracted from median cohort earnings relative to a high school graduate baseline.
              </div>
              <div>
                <strong>• Admission Fit:</strong> Measures student academic placement (GPA, SAT) compared to the middle 50% range of the historical freshman cohort. High selectivity caps fit margins to prevent safety miscategorizations.
              </div>
              <div>
                <strong>• Debt-to-Income Ratio:</strong> Focuses on field-of-study CIP program debt compared to first-year post-graduation median earnings. Standard monthly payments are modeled under a 10-year standard repayment program.
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: theme.color.navy, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Disclaimer & Limits
            </h3>
            <p style={{ fontSize: "11px", lineHeight: "1.5", color: theme.color.inkMuted, margin: 0 }}>
              This report is designed for comparative analysis only. Calculations and rankings represent historical data points and projections rather than guaranteed personal outcomes. Net price benchmarks reflect average distributions and do not constitute an official financial aid offer. Individual admissions compatibility and professional starting salaries depend on student-specific qualifications, market trends, and localized economic dynamics.
            </p>
          </div>
        </div>

        {/* Branding Sign-off */}
        <div style={{ backgroundColor: theme.color.panelBg, border: `1px solid ${theme.color.hairline}`, borderRadius: "12px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: theme.color.inkMuted, textTransform: "uppercase", marginBottom: "4px" }}>Report Status</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: theme.color.navy }}>SYSTEM VERIFIED & LOCKED</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: theme.color.inkMuted }}>Generated on: <strong>{generatedDate}</strong></div>
            <div style={{ fontSize: "11px", color: theme.color.inkMuted }}>Reference ID: <strong>{reportId}</strong></div>
          </div>
        </div>
      </div>

      <PageFooter
        reportId={reportId}
        generatedDate={generatedDate}
        pageNumber={pageNumber}
        totalPages={totalPages}
      />
    </div>
  );
}
