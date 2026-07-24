import React from "react";
import type { C1LitePayload } from "../services/reportPrompt";
import { theme } from "./theme";
import { pageStyle, PageHeader, PageFooter } from "./PageChrome";

export interface AthleticsProps {
  payload: C1LitePayload;
  reportId: string;
  generatedDate: string;
  pageNumber: number;
  totalPages: number;
}

function money(v: number | null): string {
  return v != null ? `$${v.toLocaleString()}` : "Not published";
}

function num(v: number | null): string {
  return v != null ? v.toLocaleString() : "Not published";
}

/**
 * One card per unique college (payload.college_details is already deduped by
 * unitid) — athletics data is school-level (EADA reporting), so it doesn't
 * repeat when a college is compared under multiple programs.
 */
export default function Athletics({
  payload,
  reportId,
  generatedDate,
  pageNumber,
  totalPages,
}: AthleticsProps) {
  const { college_details } = payload;

  return (
    <div style={pageStyle}>
      <div>
        <PageHeader
          sectionLabel="SECTION 06 · ATHLETICS"
          title="Athletics Program Overview"
        />

        <p
          style={{
            fontSize: "11.5px",
            lineHeight: "1.6",
            color: theme.color.ink,
            margin: "0 0 20px 0",
          }}
        >
          Sourced from EADA (Equity in Athletics Data Analysis) filings, the
          most recent survey year on file per institution. Shown for
          informational context only — not a factor in academic fit or cost
          comparisons elsewhere in this report.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {college_details.map((c) => {
            const a = c.athletics;
            if (!a) {
              return (
                <div
                  key={c.unitid}
                  style={{
                    border: `1px solid ${theme.color.hairline}`,
                    borderRadius: "12px",
                    padding: "16px",
                    backgroundColor: theme.color.panelBg,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: theme.color.navy,
                      marginBottom: "4px",
                      fontSize: "13px",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{ fontSize: "11px", color: theme.color.inkMuted }}
                  >
                    No athletics data on file for this institution.
                  </div>
                </div>
              );
            }
            return (
              <div
                key={c.unitid}
                style={{
                  border: `1px solid ${theme.color.hairline}`,
                  borderRadius: "12px",
                  padding: "16px",
                  backgroundColor: theme.color.panelBg,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: theme.color.navy,
                        fontSize: "13px",
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: theme.color.inkMuted,
                      }}
                    >
                      Survey year {a.surveyYear}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: theme.color.navy,
                      backgroundColor: theme.color.panelBgAlt,
                      border: `1px solid ${theme.color.hairline}`,
                    }}
                  >
                    {a.division}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "10px",
                    fontSize: "10.5px",
                    marginBottom: "10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: theme.color.inkMuted,
                        textTransform: "uppercase",
                        fontSize: "9px",
                        fontWeight: 700,
                      }}
                    >
                      Sports Offered
                    </div>
                    <div style={{ color: theme.color.ink, fontWeight: 700 }}>
                      {a.sportsOffered}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: theme.color.inkMuted,
                        textTransform: "uppercase",
                        fontSize: "9px",
                        fontWeight: 700,
                      }}
                    >
                      Athletes (M / W)
                    </div>
                    <div style={{ color: theme.color.ink, fontWeight: 700 }}>
                      {num(a.summary.athletesMen)} /{" "}
                      {num(a.summary.athletesWomen)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: theme.color.inkMuted,
                        textTransform: "uppercase",
                        fontSize: "9px",
                        fontWeight: 700,
                      }}
                    >
                      Athletic Revenue
                    </div>
                    <div style={{ color: theme.color.ink, fontWeight: 700 }}>
                      {money(a.summary.athleticRevenue)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: theme.color.inkMuted,
                        textTransform: "uppercase",
                        fontSize: "9px",
                        fontWeight: 700,
                      }}
                    >
                      Athletic Expense
                    </div>
                    <div style={{ color: theme.color.ink, fontWeight: 700 }}>
                      {money(a.summary.athleticExpense)}
                    </div>
                  </div>
                </div>

                {a.divisionBenchmark && (
                  <div
                    style={{
                      fontSize: "9.5px",
                      color: theme.color.inkFaint,
                      borderTop: `1px solid ${theme.color.hairline}`,
                      paddingTop: "8px",
                    }}
                  >
                    {a.divisionBenchmark.division} division average:{" "}
                    {num(a.divisionBenchmark.avgAthletesTotal)} athletes,{" "}
                    {money(a.divisionBenchmark.avgAidPerAthlete)} aid/athlete
                  </div>
                )}
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
