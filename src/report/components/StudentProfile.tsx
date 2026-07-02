import React from "react";
import { ReportCalculatedData } from "../utils/reportCalculations";
import { theme } from "./theme";
import { pageStyle, PageHeader, PageFooter } from "./PageChrome";

export interface StudentProfileProps {
  data: ReportCalculatedData;
  reportId: string;
  generatedDate: string;
  pageNumber: number;
  totalPages: number;
}

export default function StudentProfile({
  data,
  reportId,
  generatedDate,
  pageNumber,
  totalPages,
}: StudentProfileProps) {
  // SVG Bar Chart Math
  const maxNetPrice = Math.max(...data.colleges.map((c) => c.netPrice || 30000), 20000);
  const chartHeight = 120;
  const chartWidth = 320;
  const barWidth = 40;
  const gap = 30;

  return (
    <div style={pageStyle}>
      <div>
        <PageHeader sectionLabel="SECTION 02 · STUDENT PROFILE & COSTS" title="Student Profile & Core Metrics" />

        {/* Profile Card */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", marginBottom: "25px" }}>
          <div style={{ backgroundColor: theme.color.panelBg, border: `1px solid ${theme.color.hairline}`, borderRadius: "12px", padding: "18px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 700, color: theme.color.inkMuted, margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Target Academic Profile
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
              <div>
                <span style={{ color: theme.color.inkMuted }}>Name: </span>
                <strong style={{ color: theme.color.ink }}>{data.student.name}</strong>
              </div>
              <div>
                <span style={{ color: theme.color.inkMuted }}>Major: </span>
                <strong style={{ color: theme.color.ink }}>{data.student.major}</strong>
              </div>
              <div>
                <span style={{ color: theme.color.inkMuted }}>GPA: </span>
                <strong style={{ color: theme.color.ink }}>{data.student.gpa}</strong>
              </div>
              <div>
                <span style={{ color: theme.color.inkMuted }}>SAT Score: </span>
                <strong style={{ color: theme.color.ink }}>{data.student.sat}</strong>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: theme.color.panelBg, border: `1px solid ${theme.color.hairline}`, borderRadius: "12px", padding: "18px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 700, color: theme.color.inkMuted, margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Demographic & Bounds
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
              <div>
                <span style={{ color: theme.color.inkMuted }}>Income Tier: </span>
                <strong style={{ color: theme.color.ink }}>{data.student.income}</strong>
              </div>
              <div>
                <span style={{ color: theme.color.inkMuted }}>Preferred States: </span>
                <strong style={{ color: theme.color.ink }}>
                  {data.student.preferredStates.join(", ") || "No preference"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <h3 style={{ fontSize: "13px", fontWeight: 700, color: theme.color.navy, margin: "0 0 10px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Metrics Matrix
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "30px", border: `1px solid ${theme.color.hairline}` }}>
          <thead>
            <tr style={{ backgroundColor: theme.color.navy, color: theme.color.white, textAlign: "left" }}>
              <th style={{ padding: "10px", fontWeight: 600 }}>College</th>
              <th style={{ padding: "10px", fontWeight: 600, textAlign: "right" }}>Sticker Price</th>
              <th style={{ padding: "10px", fontWeight: 600, textAlign: "right" }}>Average Net Price</th>
              <th style={{ padding: "10px", fontWeight: 600, textAlign: "right" }}>Graduation Rate</th>
              <th style={{ padding: "10px", fontWeight: 600, textAlign: "right" }}>Acceptance Rate</th>
              <th style={{ padding: "10px", fontWeight: 600, textAlign: "right" }}>Student-Faculty</th>
            </tr>
          </thead>
          <tbody>
            {data.colleges.map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${theme.color.hairline}`, backgroundColor: i % 2 === 0 ? theme.color.panelBgAlt : theme.color.panelBg }}>
                <td style={{ padding: "10px", fontWeight: 700, color: theme.color.navy }}>{c.name}</td>
                <td style={{ padding: "10px", textAlign: "right", color: theme.color.inkMuted }}>
                  {c.stickerPrice ? `$${c.stickerPrice.toLocaleString()}` : "N/A"}
                </td>
                <td style={{ padding: "10px", textAlign: "right", color: theme.color.navy, fontWeight: "bold" }}>
                  {c.netPrice ? `$${c.netPrice.toLocaleString()}` : "N/A"}
                </td>
                <td style={{ padding: "10px", textAlign: "right", color: c.graduationRate ? theme.color.positive : theme.color.inkMuted, fontWeight: 600 }}>
                  {c.graduationRate ? `${(c.graduationRate * 100).toFixed(0)}%` : "N/A"}
                </td>
                <td style={{ padding: "10px", textAlign: "right", color: theme.color.inkMuted }}>
                  {c.admissionRate ? `${(c.admissionRate * 100).toFixed(0)}%` : "N/A"}
                </td>
                <td style={{ padding: "10px", textAlign: "right", color: theme.color.inkMuted }}>
                  {c.studentFacultyRatio ? `${c.studentFacultyRatio}:1` : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Visual Charts Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
          {/* Net Price Chart */}
          <div style={{ backgroundColor: theme.color.panelBg, border: `1px solid ${theme.color.hairline}`, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h4 style={{ fontSize: "11px", fontWeight: 700, color: theme.color.navy, margin: "0 0 12px 0", textTransform: "uppercase" }}>
              Annual Average Net Price ($)
            </h4>
            <svg width={chartWidth} height={chartHeight + 20}>
              {data.colleges.map((c, i) => {
                const height = c.netPrice ? (c.netPrice / maxNetPrice) * chartHeight : 10;
                const x = i * (barWidth + gap) + 40;
                const y = chartHeight - height;
                return (
                  <g key={i}>
                    <rect x={x} y={y} width={barWidth} height={height} fill={theme.color.navy} rx="4" />
                    <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="9px" fontWeight="bold" fill={theme.color.ink}>
                      {c.netPrice ? `$${Math.round(c.netPrice / 1000)}k` : "N/A"}
                    </text>
                    <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" fontSize="8px" fontWeight="600" fill={theme.color.inkMuted}>
                      {c.name.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke={theme.color.hairline} strokeWidth="1" />
            </svg>
          </div>

          {/* Graduation Rate Chart */}
          <div style={{ backgroundColor: theme.color.panelBg, border: `1px solid ${theme.color.hairline}`, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h4 style={{ fontSize: "11px", fontWeight: 700, color: theme.color.navy, margin: "0 0 12px 0", textTransform: "uppercase" }}>
              Completion & Graduation Rate (%)
            </h4>
            <svg width={chartWidth} height={chartHeight + 20}>
              {data.colleges.map((c, i) => {
                const height = c.graduationRate ? c.graduationRate * chartHeight : 10;
                const x = i * (barWidth + gap) + 40;
                const y = chartHeight - height;
                return (
                  <g key={i}>
                    <rect x={x} y={y} width={barWidth} height={height} fill={theme.color.positive} rx="4" />
                    <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="9px" fontWeight="bold" fill={theme.color.ink}>
                      {c.graduationRate ? `${Math.round(c.graduationRate * 100)}%` : "N/A"}
                    </text>
                    <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" fontSize="8px" fontWeight="600" fill={theme.color.inkMuted}>
                      {c.name.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke={theme.color.hairline} strokeWidth="1" />
            </svg>
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
