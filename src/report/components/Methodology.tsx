import React from "react";
import { ReportCalculatedData } from "../utils/reportCalculations";

export interface MethodologyProps {
  data: ReportCalculatedData;
  generatedDate: string;
}

export default function Methodology({ data, generatedDate }: MethodologyProps) {
  return (
    <div
      style={{
        width: "210mm",
        height: "297mm",
        padding: "20mm",
        boxSizing: "border-box",
        backgroundColor: "#FFFFFF",
        color: "#1E293B",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        pageBreakAfter: "always",
      }}
    >
      {/* Header */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ fontSize: "14px", fontWeight: "800", color: "#1E3A8A", letterSpacing: "-0.02em" }}>
            USDegrees Decision Report
          </div>
          <div style={{ fontSize: "10px", color: "#64748B" }}>SECTION 5: METHODOLOGY & SOURCES</div>
        </div>
        <div style={{ width: "100%", height: "2px", backgroundColor: "#E2E8F0", marginBottom: "20px" }}></div>

        {/* Page Title */}
        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A", margin: "0 0 20px 0" }}>
          Data Methodology & Disclaimers
        </h2>

        {/* Data Sources Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "30px" }}>
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#1E3A8A", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Core Data Sources
            </h3>
            <p style={{ fontSize: "12px", lineHeight: "1.5", color: "#334155", margin: 0 }}>
              The analysis in this report is constructed using integrated microdata sourced from official government databases and federal audits. Key sources include the <strong>U.S. Department of Education College Scorecard API</strong>, the <strong>Integrated Postsecondary Education Data System (IPEDS)</strong>, and federal student loan program outcomes. Financial aid parameters utilize average net price distribution indices mapped by student family income brackets.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#1E3A8A", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Calculation Methodology
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "#334155", lineHeight: "1.4" }}>
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
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#1E3A8A", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Disclaimer & Limits
            </h3>
            <p style={{ fontSize: "11px", lineHeight: "1.5", color: "#64748B", margin: 0 }}>
              This report is designed for comparative analysis only. Calculations and rankings represent historical data points and projections rather than guaranteed personal outcomes. Net price benchmarks reflect average distributions and do not constitute an official financial aid offer. Individual admissions compatibility and professional starting salaries depend on student-specific qualifications, market trends, and localized economic dynamics.
            </p>
          </div>
        </div>

        {/* Branding Sign-off */}
        <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>Report Status</div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#1E3A8A" }}>SYSTEM VERIFIED & LOCKED</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#64748B" }}>Generated on: <strong>{generatedDate}</strong></div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>Reference ID: <strong>{data.student.gpa !== "Not Provided" ? "USD-REP-01" : "USD-MOCK"}</strong></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div>
        <div style={{ width: "100%", height: "1px", backgroundColor: "#E2E8F0", marginBottom: "10px" }}></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94A3B8" }}>
          <span>USDegrees Decision Report | ID: {data.student.gpa !== "Not Provided" ? "USD-REP-01" : "USD-MOCK"}</span>
          <span>Page 6 of 6</span>
        </div>
      </div>
    </div>
  );
}
