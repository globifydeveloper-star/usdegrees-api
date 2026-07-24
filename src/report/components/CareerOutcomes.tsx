import React from "react";
import type { C1LitePayload, C1LiteNarrative } from "../services/reportPrompt";
import { theme } from "./theme";
import { pageStyle, PageHeader, PageFooter } from "./PageChrome";

export interface CareerOutcomesProps {
  payload: C1LitePayload;
  narrative: C1LiteNarrative;
  reportId: string;
  generatedDate: string;
  pageNumber: number;
  totalPages: number;
}

export default function CareerOutcomes({
  payload,
  narrative,
  reportId,
  generatedDate,
  pageNumber,
  totalPages,
}: CareerOutcomesProps) {
  const { schools } = payload;

  return (
    <div style={pageStyle}>
      <div>
        <PageHeader
          sectionLabel="SECTION 03 · EARNINGS & DEBT"
          title="Program Earnings & Typical Debt"
        />

        {/* Narrative */}
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
          <div
            style={{
              fontWeight: 700,
              color: theme.color.navy,
              textTransform: "uppercase",
              fontSize: "10px",
              marginBottom: "4px",
            }}
          >
            Program Earnings
          </div>
          <p style={{ margin: "0 0 12px 0", color: theme.color.ink }}>
            {narrative.earnings_paragraph}
          </p>
          <div
            style={{
              fontWeight: 700,
              color: theme.color.navy,
              textTransform: "uppercase",
              fontSize: "10px",
              marginBottom: "4px",
            }}
          >
            Typical Debt at Completion
          </div>
          {/* debt_ratio_text is a reported federal label, not this report's
              verdict on a school — rendered plain, no warning styling. */}
          <p style={{ margin: 0, color: theme.color.ink }}>
            {narrative.debt_burden_paragraph}
          </p>
        </div>

        {/* Outcomes Data Table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "10.5px",
            marginBottom: "25px",
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
              <th style={{ padding: "8px", fontWeight: 600 }}>College</th>
              <th
                style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}
              >
                Program Earnings (Yr 10)
              </th>
              <th
                style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}
              >
                Typical Debt
              </th>
              <th
                style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}
              >
                Debt-to-Income Label
              </th>
              <th
                style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}
              >
                20-Yr ROI
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
                    padding: "8px",
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
                    padding: "8px",
                    textAlign: "right",
                    color: theme.color.navy,
                    fontWeight: 700,
                  }}
                >
                  {s.program_earnings != null
                    ? `$${s.program_earnings.toLocaleString()}`
                    : "Not published"}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    color: theme.color.ink,
                  }}
                >
                  {s.avg_debt != null
                    ? `$${s.avg_debt.toLocaleString()}`
                    : "Not published"}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    color: theme.color.ink,
                    fontWeight: 600,
                  }}
                >
                  {s.debt_ratio_text ?? "Not published"}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    color: theme.color.ink,
                    fontWeight: 700,
                  }}
                >
                  {s.roi_ratio ?? "Not published"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Vintage footnotes — every figure above traces to a payload vintage tag */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {schools.map((s, i) => (
            <div
              key={i}
              style={{ fontSize: "9px", color: theme.color.inkFaint }}
            >
              {s.display_name}: earnings {s.earnings_vintage ?? "n/a"}
              {s.earnings_method_flag ? ` (${s.earnings_method_flag})` : ""},
              debt {s.debt_vintage ?? "n/a"}
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
