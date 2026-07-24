import React from "react";
import type { C1LitePayload, C1LiteNarrative } from "../services/reportPrompt";
import { theme } from "./theme";
import { pageStyle, PageHeader, PageFooter } from "./PageChrome";

export interface StudentProfileProps {
  payload: C1LitePayload;
  narrative: C1LiteNarrative;
  reportId: string;
  generatedDate: string;
  pageNumber: number;
  totalPages: number;
}

export default function StudentProfile({
  payload,
  narrative,
  reportId,
  generatedDate,
  pageNumber,
  totalPages,
}: StudentProfileProps) {
  const { student, schools } = payload;

  // SVG Bar Chart Math — net price only (the one number that changes with
  // the family's income bracket).
  const netPrices = schools
    .map((s) => s.net_price_bracket)
    .filter((v): v is number => v != null);
  const maxNetPrice = Math.max(...netPrices, 20000);
  const chartHeight = 120;
  const chartWidth = 320;
  const barWidth = 40;
  const gap = 30;

  return (
    <div style={pageStyle}>
      <div>
        <PageHeader
          sectionLabel="SECTION 02 · STUDENT PROFILE & NET PRICE"
          title="Student Profile & Net Price"
        />

        {/* Profile Card */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "20px",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              backgroundColor: theme.color.panelBg,
              border: `1px solid ${theme.color.hairline}`,
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: theme.color.inkMuted,
                margin: "0 0 12px 0",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Academic Profile
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                fontSize: "12px",
              }}
            >
              <div>
                <span style={{ color: theme.color.inkMuted }}>Name: </span>
                <strong style={{ color: theme.color.ink }}>
                  {student.display_name}
                </strong>
              </div>
              <div>
                <span style={{ color: theme.color.inkMuted }}>
                  Preferred degree level:{" "}
                </span>
                <strong style={{ color: theme.color.ink }}>
                  {student.preferred_degree_level ?? "Not provided"}
                </strong>
              </div>
              <div>
                <span style={{ color: theme.color.inkMuted }}>GPA: </span>
                <strong style={{ color: theme.color.ink }}>
                  {student.gpa ?? "Not provided"}
                </strong>
              </div>
              <div>
                <span style={{ color: theme.color.inkMuted }}>SAT Score: </span>
                <strong style={{ color: theme.color.ink }}>
                  {student.sat_score ?? "Not provided"}
                </strong>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: theme.color.panelBg,
              border: `1px solid ${theme.color.hairline}`,
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: theme.color.inkMuted,
                margin: "0 0 12px 0",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Net Price Basis
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                fontSize: "12px",
              }}
            >
              <div>
                <span style={{ color: theme.color.inkMuted }}>
                  Income bracket:{" "}
                </span>
                <strong style={{ color: theme.color.ink }}>
                  {student.income_bracket_label ??
                    "Not personalized — posted figure shown"}
                </strong>
              </div>
              <div>
                <span style={{ color: theme.color.inkMuted }}>
                  High school:{" "}
                </span>
                <strong style={{ color: theme.color.ink }}>
                  {student.high_school_name ?? "Not provided"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: theme.color.panelBg,
            borderRadius: "10px",
            padding: "14px",
            border: `1px solid ${theme.color.hairline}`,
            marginBottom: "20px",
            fontSize: "11.5px",
            lineHeight: "1.5",
          }}
        >
          <p style={{ margin: 0, color: theme.color.ink }}>
            {narrative.net_price_note}
          </p>
        </div>

        {/* Comparison Table */}
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: theme.color.navy,
            margin: "0 0 10px 0",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Net Price & Admissions Matrix
        </h3>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "11px",
            marginBottom: "30px",
            border: `1px solid ${theme.color.hairline}`,
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: theme.color.navy,
                color: theme.color.white,
                textAlign: "left",
              }}
            >
              <th style={{ padding: "10px", fontWeight: 600 }}>College</th>
              <th
                style={{ padding: "10px", fontWeight: 600, textAlign: "right" }}
              >
                Sticker Price
              </th>
              <th
                style={{ padding: "10px", fontWeight: 600, textAlign: "right" }}
              >
                Net Price
              </th>
              <th
                style={{ padding: "10px", fontWeight: 600, textAlign: "right" }}
              >
                Admit Rate
              </th>
              <th
                style={{ padding: "10px", fontWeight: 600, textAlign: "right" }}
              >
                SAT (25th–75th)
              </th>
            </tr>
          </thead>
          <tbody>
            {schools.map((s, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: `1px solid ${theme.color.hairline}`,
                  backgroundColor:
                    i % 2 === 0 ? theme.color.panelBgAlt : theme.color.panelBg,
                }}
              >
                <td
                  style={{
                    padding: "10px",
                    fontWeight: 700,
                    color: theme.color.navy,
                  }}
                >
                  {s.name}
                  {s.program_name && (
                    <div
                      style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        color: theme.color.inkMuted,
                      }}
                    >
                      {s.program_name}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: "10px",
                    textAlign: "right",
                    color: theme.color.inkMuted,
                  }}
                >
                  {s.sticker_price != null
                    ? `$${s.sticker_price.toLocaleString()}`
                    : "Not published"}
                </td>
                <td
                  style={{
                    padding: "10px",
                    textAlign: "right",
                    color: theme.color.navy,
                    fontWeight: "bold",
                  }}
                >
                  {s.net_price_bracket != null
                    ? `$${s.net_price_bracket.toLocaleString()}`
                    : "Not published"}
                </td>
                <td
                  style={{
                    padding: "10px",
                    textAlign: "right",
                    color: theme.color.inkMuted,
                  }}
                >
                  {s.admit_rate != null ? `${s.admit_rate}%` : "Not published"}
                </td>
                <td
                  style={{
                    padding: "10px",
                    textAlign: "right",
                    color: theme.color.inkMuted,
                  }}
                >
                  {s.sat_25 != null && s.sat_75 != null
                    ? `${s.sat_25}–${s.sat_75}`
                    : "Not published"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Net Price Chart */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              backgroundColor: theme.color.panelBg,
              border: `1px solid ${theme.color.hairline}`,
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <h4
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: theme.color.navy,
                margin: "0 0 12px 0",
                textTransform: "uppercase",
              }}
            >
              Net Price by School ($)
            </h4>
            <svg width={chartWidth} height={chartHeight + 20}>
              {schools.map((s, i) => {
                const height = s.net_price_bracket
                  ? (s.net_price_bracket / maxNetPrice) * chartHeight
                  : 10;
                const x = i * (barWidth + gap) + 40;
                const y = chartHeight - height;
                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={height}
                      fill={theme.color.navy}
                      rx="4"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 6}
                      textAnchor="middle"
                      fontSize="9px"
                      fontWeight="bold"
                      fill={theme.color.ink}
                    >
                      {s.net_price_bracket
                        ? `$${Math.round(s.net_price_bracket / 1000)}k`
                        : "N/P"}
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 14}
                      textAnchor="middle"
                      fontSize="8px"
                      fontWeight="600"
                      fill={theme.color.inkMuted}
                    >
                      {s.name.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
              <line
                x1="0"
                y1={chartHeight}
                x2={chartWidth}
                y2={chartHeight}
                stroke={theme.color.hairline}
                strokeWidth="1"
              />
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
