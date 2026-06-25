import React from "react";
import { ReportCalculatedData } from "../utils/reportCalculations";
import { AiReportContent } from "../services/ai.service";

export interface RecommendationProps {
  data: ReportCalculatedData;
  ai: AiReportContent;
}

export default function Recommendation({ data, ai }: RecommendationProps) {
  // Simple rule-based logic to dynamically extract strengths & weaknesses based on DB metrics
  const getCollegesAnalysis = (c: typeof data.colleges[0]) => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Strengths
    if (c.graduationRate && c.graduationRate >= 0.8) {
      strengths.push(`Outstanding Graduation Rate (${Math.round(c.graduationRate * 100)}%)`);
    } else if (c.graduationRate && c.graduationRate >= 0.65) {
      strengths.push(`Strong Graduation Rate (${Math.round(c.graduationRate * 100)}%)`);
    }

    if (c.roi20Yr && c.roi20Yr >= 500000) {
      strengths.push(`Top-tier 20-Year ROI (${c.roi20YrFormatted})`);
    } else if (c.roi20Yr && c.roi20Yr >= 250000) {
      strengths.push(`Favorable 20-Year ROI (${c.roi20YrFormatted})`);
    }

    if (c.netPrice && c.netPrice <= 18000) {
      strengths.push(`Highly Competitive Net Cost ($${c.netPrice.toLocaleString()}/yr)`);
    }

    if (c.admissionFit.category === "Safety") {
      strengths.push("High Admissions Probability (Safety Choice)");
    } else if (c.admissionFit.category === "Match") {
      strengths.push("Excellent Academic Alignment (Match Choice)");
    }

    if (c.studentFacultyRatio && c.studentFacultyRatio <= 12) {
      strengths.push(`Low Student-to-Faculty Ratio (${c.studentFacultyRatio}:1)`);
    }

    // Weaknesses
    if (c.stickerPrice && c.stickerPrice >= 55000) {
      weaknesses.push("Premium sticker price limits financial flexibility");
    }

    if (c.debtIncomeRatio && c.debtIncomeRatio > 0.5) {
      weaknesses.push(`Elevated debt-to-income ratio (${c.debtIncomeRatioFormatted})`);
    }

    if (c.admissionFit.category === "Reach") {
      weaknesses.push("Highly competitive admissions profile (Reach Choice)");
    }

    if (c.graduationRate && c.graduationRate < 0.6) {
      weaknesses.push(`Below-average program completion rate (${Math.round(c.graduationRate * 100)}%)`);
    }

    // Fallbacks
    if (strengths.length === 0) strengths.push("Consistent middle-tier program outcomes");
    if (weaknesses.length === 0) weaknesses.push("No significant financial or completion risks identified");

    return { strengths: strengths.slice(0, 2), weaknesses: weaknesses.slice(0, 2) };
  };

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
          <div style={{ fontSize: "10px", color: "#64748B" }}>SECTION 4: RECOMMENDATION & FIT</div>
        </div>
        <div style={{ width: "100%", height: "2px", backgroundColor: "#E2E8F0", marginBottom: "20px" }}></div>

        {/* Page Title */}
        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A", margin: "0 0 20px 0" }}>
          Recommendation & Institutional Fit
        </h2>

        {/* AI Strategic Recommendation Box */}
        <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "12px", padding: "20px", marginBottom: "25px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "18px" }}>💡</span>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#166534", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Adviser Strategic Recommendation
            </h3>
          </div>
          <p style={{ fontSize: "12.5px", lineHeight: "1.65", color: "#14532D", fontWeight: "500", margin: 0 }}>
            {ai.recommendation}
          </p>
        </div>

        {/* Admissions Fit Comparison */}
        <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0F172A", margin: "0 0 15px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          College Compatibility Breakdown
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {data.colleges.map((c, i) => {
            const { strengths, weaknesses } = getCollegesAnalysis(c);
            const fitColors = {
              Safety: { text: "#166534", bg: "#DCFCE7", border: "#BBF7D0" },
              Match: { text: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE" },
              Reach: { text: "#991B1B", bg: "#FEE2E2", border: "#FCA5A5" },
              Unavailable: { text: "#374151", bg: "#F3F4F6", border: "#E5E7EB" },
            };
            const fColor = fitColors[c.admissionFit.category] || fitColors.Unavailable;

            return (
              <div key={i} style={{ border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", backgroundColor: "#F8FAFC" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#0F172A", margin: "0 0 4px 0" }}>
                      {c.name}
                    </h4>
                    <span style={{ fontSize: "11px", color: "#64748B" }}>{c.city}, {c.state}</span>
                  </div>
                  {/* Fit Badge */}
                  <div style={{
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: fColor.text,
                    backgroundColor: fColor.bg,
                    border: `1px solid ${fColor.border}`
                  }}>
                    {c.admissionFit.category} (Fit Score: {c.admissionFit.score}%)
                  </div>
                </div>

                <p style={{ fontSize: "11.5px", color: "#475569", lineHeight: "1.4", margin: "0 0 12px 0" }}>
                  {c.admissionFit.explanation}
                </p>

                {/* Strengths & Weaknesses Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", borderTop: "1px solid #E2E8F0", paddingTop: "12px" }}>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "700", color: "#166534", textTransform: "uppercase", marginBottom: "6px" }}>Strengths</div>
                    {strengths.map((str, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "6px", fontSize: "11px", color: "#334155", marginBottom: "4px" }}>
                        <span style={{ color: "#10B981" }}>•</span>
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "700", color: "#991B1B", textTransform: "uppercase", marginBottom: "6px" }}>Key Considerations</div>
                    {weaknesses.map((weak, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "6px", fontSize: "11px", color: "#334155", marginBottom: "4px" }}>
                        <span style={{ color: "#EF4444" }}>•</span>
                        <span>{weak}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div>
        <div style={{ width: "100%", height: "1px", backgroundColor: "#E2E8F0", marginBottom: "10px" }}></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94A3B8" }}>
          <span>USDegrees Decision Report | ID: {data.student.gpa !== "Not Provided" ? "USD-REP-01" : "USD-MOCK"}</span>
          <span>Page 5 of 6</span>
        </div>
      </div>
    </div>
  );
}
