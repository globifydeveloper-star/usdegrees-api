import React from "react";
import { ReportCalculatedData } from "../utils/reportCalculations";
import { AiReportContent } from "../services/ai.service";
import { theme } from "./theme";
import { pageStyle, PageHeader, PageFooter } from "./PageChrome";

export interface PageProps {
  data: ReportCalculatedData;
  ai: AiReportContent;
  reportId: string;
  generatedDate: string;
  pageNumber: number;
  totalPages: number;
}

export default function ExecutiveSummary({
  data,
  ai,
  reportId,
  generatedDate,
  pageNumber,
  totalPages,
}: PageProps) {
  return (
    <div style={pageStyle}>
      <div>
        <PageHeader sectionLabel="SECTION 01 · EXECUTIVE SUMMARY" title="Executive Summary & Analysis" />

        {/* Narrative Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", marginBottom: "22px" }}>
          {/* Executive Summary Block */}
          <div style={{ backgroundColor: theme.color.panelBg, borderRadius: "12px", padding: "18px", border: `1px solid ${theme.color.hairline}` }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: theme.color.navy, margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Decision Context
            </h3>
            <p style={{ fontSize: "12.5px", lineHeight: "1.6", margin: 0, color: theme.color.ink }}>
              {ai.executiveSummary}
            </p>
          </div>

          {/* Recommendation Block */}
          <div style={{ backgroundColor: theme.color.panelBgAlt, borderRadius: "12px", padding: "18px", border: `1px solid ${theme.color.goldSoft}`, borderLeft: `3px solid ${theme.color.gold}` }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: theme.color.gold, margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Strategic Recommendation
            </h3>
            <p style={{ fontSize: "12.5px", lineHeight: "1.6", margin: 0, color: theme.color.navy, fontWeight: 500 }}>
              {ai.recommendation}
            </p>
          </div>
        </div>

        {/* Rankings KPI Grid */}
        <h3 style={{ fontSize: "13px", fontWeight: 700, color: theme.color.navy, margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Calculated Decision Scorecard
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "22px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: theme.color.positiveBg, border: `1px solid ${theme.color.hairline}`, borderRadius: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: theme.color.positive }}></div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: "10px", color: theme.color.positive, fontWeight: 700, textTransform: "uppercase" }}>Best Value (ROI)</div>
                <div style={{ fontSize: "12.5px", fontWeight: 700, color: theme.color.ink }}>{data.rankings.bestValue}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: theme.color.panelBg, border: `1px solid ${theme.color.hairline}`, borderRadius: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: theme.color.gold }}></div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: "10px", color: theme.color.warning, fontWeight: 700, textTransform: "uppercase" }}>Lowest Cost</div>
                <div style={{ fontSize: "12.5px", fontWeight: 700, color: theme.color.ink }}>{data.rankings.lowestCost}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: theme.color.panelBg, border: `1px solid ${theme.color.hairline}`, borderRadius: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: theme.color.navy }}></div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: "10px", color: theme.color.navy, fontWeight: 700, textTransform: "uppercase" }}>Highest Avg Graduate Salary</div>
                <div style={{ fontSize: "12.5px", fontWeight: 700, color: theme.color.ink }}>{data.rankings.highestSalary}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: theme.color.riskBg, border: `1px solid ${theme.color.hairline}`, borderRadius: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: theme.color.risk }}></div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: "10px", color: theme.color.risk, fontWeight: 700, textTransform: "uppercase" }}>Highest Financial Risk</div>
                <div style={{ fontSize: "12.5px", fontWeight: 700, color: theme.color.ink }}>{data.rankings.biggestRisk}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Findings List */}
        <h3 style={{ fontSize: "13px", fontWeight: 700, color: theme.color.navy, margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Key Research Findings
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {ai.keyFindings.map((finding, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "12px", color: theme.color.ink, lineHeight: "1.5" }}>
              <span style={{ color: theme.color.gold, fontWeight: "bold", fontSize: "14px", marginTop: "-2px" }}>✓</span>
              <span>{finding}</span>
            </div>
          ))}
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
