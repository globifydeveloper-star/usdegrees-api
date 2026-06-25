import React from "react";
import { ReportCalculatedData } from "../utils/reportCalculations";

export interface StudentProfileProps {
  data: ReportCalculatedData;
}

export default function StudentProfile({ data }: StudentProfileProps) {
  // SVG Bar Chart Math
  const maxNetPrice = Math.max(...data.colleges.map((c) => c.netPrice || 30000), 20000);
  const chartHeight = 120;
  const chartWidth = 320;
  const barWidth = 40;
  const gap = 30;

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
          <div style={{ fontSize: "10px", color: "#64748B" }}>SECTION 2: STUDENT PROFILE & COSTS</div>
        </div>
        <div style={{ width: "100%", height: "2px", backgroundColor: "#E2E8F0", marginBottom: "20px" }}></div>

        {/* Page Title */}
        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A", margin: "0 0 20px 0" }}>
          Student Profile & Core Metrics
        </h2>

        {/* Profile Card */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", marginBottom: "25px" }}>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "18px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Target Academic Profile
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
              <div>
                <span style={{ color: "#64748B" }}>Name: </span>
                <strong style={{ color: "#334155" }}>{data.student.name}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B" }}>Major: </span>
                <strong style={{ color: "#334155" }}>{data.student.major}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B" }}>GPA: </span>
                <strong style={{ color: "#334155" }}>{data.student.gpa}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B" }}>SAT Score: </span>
                <strong style={{ color: "#334155" }}>{data.student.sat}</strong>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "18px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Demographic & Bounds
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
              <div>
                <span style={{ color: "#64748B" }}>Income Tier: </span>
                <strong style={{ color: "#334155" }}>{data.student.income}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B" }}>Preferred States: </span>
                <strong style={{ color: "#334155" }}>
                  {data.student.preferredStates.join(", ") || "No preference"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#0F172A", margin: "0 0 10px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Metrics Matrix
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "30px", border: "1px solid #E2E8F0" }}>
          <thead>
            <tr style={{ backgroundColor: "#0F172A", color: "#FFFFFF", textAlign: "left" }}>
              <th style={{ padding: "10px", fontWeight: "600" }}>College</th>
              <th style={{ padding: "10px", fontWeight: "600", textAlign: "right" }}>Sticker Price</th>
              <th style={{ padding: "10px", fontWeight: "600", textAlign: "right" }}>Average Net Price</th>
              <th style={{ padding: "10px", fontWeight: "600", textAlign: "right" }}>Graduation Rate</th>
              <th style={{ padding: "10px", fontWeight: "600", textAlign: "right" }}>Acceptance Rate</th>
              <th style={{ padding: "10px", fontWeight: "600", textAlign: "right" }}>Student-Faculty</th>
            </tr>
          </thead>
          <tbody>
            {data.colleges.map((c, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                <td style={{ padding: "10px", fontWeight: "700", color: "#1E3A8A" }}>{c.name}</td>
                <td style={{ padding: "10px", textAlign: "right", color: "#475569" }}>
                  {c.stickerPrice ? `$${c.stickerPrice.toLocaleString()}` : "N/A"}
                </td>
                <td style={{ padding: "10px", textAlign: "right", color: "#1E3A8A", fontWeight: "bold" }}>
                  {c.netPrice ? `$${c.netPrice.toLocaleString()}` : "N/A"}
                </td>
                <td style={{ padding: "10px", textAlign: "right", color: "#10B981", fontWeight: "600" }}>
                  {c.graduationRate ? `${(c.graduationRate * 100).toFixed(0)}%` : "N/A"}
                </td>
                <td style={{ padding: "10px", textAlign: "right", color: "#475569" }}>
                  {c.admissionRate ? `${(c.admissionRate * 100).toFixed(0)}%` : "N/A"}
                </td>
                <td style={{ padding: "10px", textAlign: "right", color: "#475569" }}>
                  {c.studentFacultyRatio ? `${c.studentFacultyRatio}:1` : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Visual Charts Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
          {/* Net Price Chart */}
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h4 style={{ fontSize: "11px", fontWeight: "700", color: "#1E3A8A", margin: "0 0 12px 0", textTransform: "uppercase" }}>
              Annual Average Net Price ($)
            </h4>
            <svg width={chartWidth} height={chartHeight + 20}>
              {data.colleges.map((c, i) => {
                const height = c.netPrice ? (c.netPrice / maxNetPrice) * chartHeight : 10;
                const x = i * (barWidth + gap) + 40;
                const y = chartHeight - height;
                return (
                  <g key={i}>
                    <rect x={x} y={y} width={barWidth} height={height} fill="#3B82F6" rx="4" />
                    <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="9px" fontWeight="bold" fill="#1E293B">
                      {c.netPrice ? `$${Math.round(c.netPrice / 1000)}k` : "N/A"}
                    </text>
                    <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" fontSize="8px" fontWeight="600" fill="#64748B">
                      {c.name.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#CBD5E1" strokeWidth="1" />
            </svg>
          </div>

          {/* Graduation Rate Chart */}
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h4 style={{ fontSize: "11px", fontWeight: "700", color: "#1E3A8A", margin: "0 0 12px 0", textTransform: "uppercase" }}>
              Completion & Graduation Rate (%)
            </h4>
            <svg width={chartWidth} height={chartHeight + 20}>
              {data.colleges.map((c, i) => {
                const height = c.graduationRate ? c.graduationRate * chartHeight : 10;
                const x = i * (barWidth + gap) + 40;
                const y = chartHeight - height;
                return (
                  <g key={i}>
                    <rect x={x} y={y} width={barWidth} height={height} fill="#10B981" rx="4" />
                    <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="9px" fontWeight="bold" fill="#1E293B">
                      {c.graduationRate ? `${Math.round(c.graduationRate * 100)}%` : "N/A"}
                    </text>
                    <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" fontSize="8px" fontWeight="600" fill="#64748B">
                      {c.name.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#CBD5E1" strokeWidth="1" />
            </svg>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div>
        <div style={{ width: "100%", height: "1px", backgroundColor: "#E2E8F0", marginBottom: "10px" }}></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94A3B8" }}>
          <span>USDegrees Decision Report | ID: {data.student.gpa !== "Not Provided" ? "USD-REP-01" : "USD-MOCK"}</span>
          <span>Page 3 of 6</span>
        </div>
      </div>
    </div>
  );
}
