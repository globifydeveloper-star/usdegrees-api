import React from "react";
import { ReportCalculatedData } from "../utils/reportCalculations";
import { AiReportContent } from "../services/ai.service";

export interface PageProps {
  data: ReportCalculatedData;
  ai: AiReportContent;
}

export default function ExecutiveSummary({ data, ai }: PageProps) {
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
          <div style={{ fontSize: "10px", color: "#64748B" }}>SECTION 1: EXECUTIVE SUMMARY</div>
        </div>
        <div style={{ width: "100%", height: "2px", backgroundColor: "#E2E8F0", marginBottom: "25px" }}></div>

        {/* Page Title */}
        <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0F172A", margin: "0 0 20px 0" }}>
          Executive Summary & Analysis
        </h2>

        {/* Narrative Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px", marginBottom: "25px" }}>
          {/* Executive Summary Block */}
          <div style={{ backgroundColor: "#F8FAFC", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#1E3A8A", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Decision Context
            </h3>
            <p style={{ fontSize: "12.5px", lineHeight: "1.6", margin: 0, color: "#334155" }}>
              {ai.executiveSummary}
            </p>
          </div>

          {/* Recommendation Block */}
          <div style={{ backgroundColor: "#EFF6FF", borderRadius: "12px", padding: "18px", border: "1px solid #BFDBFE" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#1E40AF", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Strategic Recommendation
            </h3>
            <p style={{ fontSize: "12.5px", lineHeight: "1.6", margin: 0, color: "#1E3A8A", fontWeight: "500" }}>
              {ai.recommendation}
            </p>
          </div>
        </div>

        {/* Rankings KPI Grid */}
        <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Calculated Decision Scorecard
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "25px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#15803D" }}></div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: "10px", color: "#15803D", fontWeight: "700", textTransform: "uppercase" }}>Best Value (ROI)</div>
                <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#166534" }}>{data.rankings.bestValue}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: "#F0FDFA", border: "1px solid #99F6E4", borderRadius: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#0F766E" }}></div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: "10px", color: "#0F766E", fontWeight: "700", textTransform: "uppercase" }}>Lowest Cost</div>
                <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#115E59" }}>{data.rankings.lowestCost}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#4338CA" }}></div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: "10px", color: "#4338CA", fontWeight: "700", textTransform: "uppercase" }}>Highest Avg Graduate Salary</div>
                <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#3730A3" }}>{data.rankings.highestSalary}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#B91C1C" }}></div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: "10px", color: "#B91C1C", fontWeight: "700", textTransform: "uppercase" }}>Highest Financial Risk</div>
                <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#991B1B" }}>{data.rankings.biggestRisk}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Findings List */}
        <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Key Research Findings
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {ai.keyFindings.map((finding, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "12px", color: "#334155", lineHeight: "1.5" }}>
              <span style={{ color: "#3B82F6", fontWeight: "bold", fontSize: "14px", marginTop: "-2px" }}>✓</span>
              <span>{finding}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div>
        <div style={{ width: "100%", height: "1px", backgroundColor: "#E2E8F0", marginBottom: "10px" }}></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94A3B8" }}>
          <span>USDegrees Decision Report | ID: {data.student.gpa !== "Not Provided" ? "USD-REP-01" : "USD-MOCK"}</span>
          <span>Page 2 of 6</span>
        </div>
      </div>
    </div>
  );
}
