import React from "react";
import { ReportCalculatedData } from "../utils/reportCalculations";
import { AiReportContent } from "../services/ai.service";
import { theme } from "./theme";
import { pageStyle, PageHeader, PageFooter } from "./PageChrome";

export interface RecommendationProps {
  data: ReportCalculatedData;
  ai: AiReportContent;
  reportId: string;
  generatedDate: string;
  pageNumber: number;
  totalPages: number;
}

export default function Recommendation({
  data,
  ai,
  reportId,
  generatedDate,
  pageNumber,
  totalPages,
}: RecommendationProps) {
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
    <div style={pageStyle}>
      <div>
        <PageHeader sectionLabel="SECTION 04 · RECOMMENDATION & FIT" title="Recommendation & Institutional Fit" />

        {/* AI Strategic Recommendation Box */}
        <div style={{ backgroundColor: theme.color.panelBgAlt, border: `1px solid ${theme.color.goldSoft}`, borderLeft: `3px solid ${theme.color.gold}`, borderRadius: "12px", padding: "20px", marginBottom: "25px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: theme.color.gold, margin: "0 0 10px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Adviser Strategic Recommendation
          </h3>
          <p style={{ fontSize: "12.5px", lineHeight: "1.65", color: theme.color.navy, fontWeight: 500, margin: 0 }}>
            {ai.recommendation}
          </p>
        </div>

        {/* Admissions Fit Comparison */}
        <h3 style={{ fontSize: "13px", fontWeight: 700, color: theme.color.navy, margin: "0 0 15px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          College Compatibility Breakdown
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {data.colleges.map((c, i) => {
            const { strengths, weaknesses } = getCollegesAnalysis(c);
            const fitColors = {
              Safety: { text: theme.color.positive, bg: theme.color.positiveBg, border: theme.color.hairline },
              Match: { text: theme.color.navy, bg: theme.color.panelBgAlt, border: theme.color.goldSoft },
              Reach: { text: theme.color.risk, bg: theme.color.riskBg, border: theme.color.hairline },
              Unavailable: { text: theme.color.inkMuted, bg: theme.color.panelBg, border: theme.color.hairline },
            };
            const fColor = fitColors[c.admissionFit.category] || fitColors.Unavailable;

            return (
              <div key={i} style={{ border: `1px solid ${theme.color.hairline}`, borderRadius: "12px", padding: "16px", backgroundColor: theme.color.panelBg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ fontFamily: theme.font.family, fontSize: "15px", fontWeight: 700, color: theme.color.navy, margin: "0 0 4px 0" }}>
                      {c.name}
                    </h4>
                    <span style={{ fontSize: "11px", color: theme.color.inkMuted }}>{c.city}, {c.state}</span>
                  </div>
                  {/* Fit Badge */}
                  <div style={{
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: fColor.text,
                    backgroundColor: fColor.bg,
                    border: `1px solid ${fColor.border}`
                  }}>
                    {c.admissionFit.category} (Fit Score: {c.admissionFit.score}%)
                  </div>
                </div>

                <p style={{ fontSize: "11.5px", color: theme.color.inkMuted, lineHeight: "1.4", margin: "0 0 12px 0" }}>
                  {c.admissionFit.explanation}
                </p>

                {/* Strengths & Weaknesses Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", borderTop: `1px solid ${theme.color.hairline}`, paddingTop: "12px" }}>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: theme.color.positive, textTransform: "uppercase", marginBottom: "6px" }}>Strengths</div>
                    {strengths.map((str, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "6px", fontSize: "11px", color: theme.color.ink, marginBottom: "4px" }}>
                        <span style={{ color: theme.color.positive }}>•</span>
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: theme.color.risk, textTransform: "uppercase", marginBottom: "6px" }}>Key Considerations</div>
                    {weaknesses.map((weak, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "6px", fontSize: "11px", color: theme.color.ink, marginBottom: "4px" }}>
                        <span style={{ color: theme.color.risk }}>•</span>
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

      <PageFooter
        reportId={reportId}
        generatedDate={generatedDate}
        pageNumber={pageNumber}
        totalPages={totalPages}
      />
    </div>
  );
}
