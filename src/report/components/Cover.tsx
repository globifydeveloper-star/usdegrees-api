import React from "react";
import { ReportCalculatedData } from "../utils/reportCalculations";

export interface CoverProps {
  data: ReportCalculatedData;
  reportId: string;
  generatedDate: string;
}

export default function Cover({ data, reportId, generatedDate }: CoverProps) {
  return (
    <div
      style={{
        width: "210mm",
        height: "297mm",
        padding: "25mm 20mm 20mm 20mm",
        boxSizing: "border-box",
        backgroundColor: "#0F172A", // Dark Slate corporate background
        color: "#FFFFFF",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        pageBreakAfter: "always",
      }}
    >
      {/* Top Header Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: "900", letterSpacing: "-0.05em", color: "#3B82F6" }}>
            US<span style={{ color: "#FFFFFF" }}>Degrees</span>
          </div>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#94A3B8", letterSpacing: "0.1em" }}>
            CONFIDENTIAL REPORT
          </div>
        </div>
        <div style={{ width: "100%", height: "1px", backgroundColor: "#334155", marginTop: "15px" }}></div>
      </div>

      {/* Middle Hero Section */}
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: "40px" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: "#60A5FA", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "15px" }}>
          Academic Strategy Group
        </div>
        <h1 style={{ fontSize: "48px", fontWeight: "800", lineHeight: "1.1", letterSpacing: "-0.02em", color: "#FFFFFF", margin: "0 0 25px 0" }}>
          AI College Decision Report
        </h1>
        <p style={{ fontSize: "18px", color: "#94A3B8", fontWeight: "400", lineHeight: "1.5", margin: "0 0 50px 0", maxWidth: "550px" }}>
          A comparative multi-dimensional study evaluating tuition investment, admissions compatibility, and career outcomes.
        </p>

        {/* Selected Colleges Panel */}
        <div style={{ backgroundColor: "#1E293B", borderRadius: "16px", padding: "24px", border: "1px solid #334155" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#60A5FA", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
            Institutions Evaluated
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.colleges.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "#3B82F6", fontSize: "18px", fontWeight: "bold" }}>•</span>
                <span style={{ fontSize: "15px", fontWeight: "600", color: "#F8FAFC" }}>{c.name}</span>
                <span style={{ fontSize: "13px", color: "#64748B" }}>({c.city}, {c.state})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Footer Section */}
      <div>
        <div style={{ width: "100%", height: "1px", backgroundColor: "#334155", marginBottom: "20px" }}></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", fontSize: "12px", color: "#94A3B8" }}>
          <div>
            <div style={{ fontWeight: "700", color: "#E2E8F0", marginBottom: "4px" }}>Prepared For</div>
            <div>{data.student.name}</div>
            <div>Major: {data.student.major}</div>
          </div>
          <div>
            <div style={{ fontWeight: "700", color: "#E2E8F0", marginBottom: "4px" }}>Report Reference</div>
            <div>ID: {reportId}</div>
            <div>Database: College Scorecard (2026)</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: "700", color: "#E2E8F0", marginBottom: "4px" }}>Generated Date</div>
            <div>{generatedDate}</div>
            <div style={{ color: "#60A5FA", fontWeight: "600" }}>System Verified</div>
          </div>
        </div>
      </div>
    </div>
  );
}
