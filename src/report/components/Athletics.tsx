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

function formatSportsLineFromRoster(roster: { sport: string }[], maxItems = 6) {
  if (!roster || roster.length === 0) return "Not published";
  const names = roster.map((r) => r.sport);
  if (names.length <= maxItems) return names.join(", ");
  return names.slice(0, maxItems).join(", ") + ", and so on";
}

function getSportsCount(
  roster: { sport: string }[] | undefined,
  sportsOffered: string | number | null | undefined,
) {
  if (roster && roster.length > 0) return roster.length;

  if (typeof sportsOffered === "string") {
    const trimmed = sportsOffered.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(/[,/]/).map((part) => part.trim()).filter(Boolean);
    return parts.length > 0 ? parts.length : null;
  }

  return null;
}

function truncateWithEllipsis(s: string | number | null | undefined, max = 100) {
  if (s == null) return "Not published";
  const text = typeof s === "number" ? s.toLocaleString() : s;
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + ", and so on";
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
  const athleticsCount = college_details.filter((c) => c.athletics).length;
  const compact = athleticsCount === 5;

  return (
    <div style={pageStyle}>
      <div>
        <PageHeader
          sectionLabel="SECTION 06 · ATHLETICS"
          title="Athletics Program Overview"
        />

        <p
          style={{
            fontSize: compact ? "10.5px" : "11.5px",
            lineHeight: "1.5",
            color: theme.color.ink,
            margin: compact ? "0 0 12px 0" : "0 0 20px 0",
          }}
        >
          Sourced from EADA (Equity in Athletics Data Analysis) filings, the
          most recent survey year on file per institution. Shown for
          informational context only — not a factor in academic fit or cost
          comparisons elsewhere in this report.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: compact ? "8px" : "14px" }}>
          {college_details.map((c) => {
            const a = c.athletics;
            const sportsCount = getSportsCount(a?.roster, a?.sportsOffered);
            const sportsList = a?.hasRosterData
              ? formatSportsLineFromRoster(a.roster, 6)
              : truncateWithEllipsis(a?.sportsOffered, 80);
            const showSportsList = !compact && (a?.hasRosterData || a?.sportsOffered != null);

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
                  padding: compact ? "10px" : "16px",
                  backgroundColor: theme.color.panelBg,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: compact ? "6px" : "10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: theme.color.navy,
                        fontSize: compact ? "12px" : "13px",
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: compact ? "9.5px" : "10.5px",
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
                    gridTemplateColumns: compact ? "repeat(3, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
                    gap: compact ? "6px" : "10px",
                    fontSize: compact ? "9.5px" : "10.5px",
                    marginBottom: compact ? "6px" : "10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: theme.color.inkMuted,
                        textTransform: "uppercase",
                        fontSize: compact ? "8px" : "9px",
                        fontWeight: 700,
                      }}
                    >
                      Sports Offered
                    </div>
                    <div style={{ color: theme.color.ink, fontWeight: 700 }}>
                      {sportsCount != null
                        ? `${sportsCount} ${sportsCount === 1 ? "sport" : "sports"}`
                        : "Not published"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: theme.color.inkMuted,
                        textTransform: "uppercase",
                        fontSize: compact ? "8px" : "9px",
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
                        fontSize: compact ? "8px" : "9px",
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
                        fontSize: compact ? "8px" : "9px",
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

                {showSportsList && (
                  <div
                    style={{
                      marginBottom: compact ? "4px" : "6px",
                      paddingTop: "5px",
                      borderTop: `1px solid ${theme.color.hairline}`,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      lineHeight: 1.2,
                    }}
                  >
                    <div
                      style={{
                        color: theme.color.inkMuted,
                        textTransform: "uppercase",
                        fontSize: compact ? "8px" : "9px",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      Sports Offered
                    </div>
                    <div
                      style={{
                        color: theme.color.navy,
                        fontWeight: 700,
                        fontSize: "9px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flex: 1,
                      }}
                    >
                      {sportsList}
                    </div>
                  </div>
                )}

                {a.divisionBenchmark && (
                  <div
                    style={{
                      fontSize: compact ? "8.5px" : "9.5px",
                      color: theme.color.inkFaint,
                      borderTop: `1px solid ${theme.color.hairline}`,
                      paddingTop: "8px",
                    }}
                  >
                    {a.divisionBenchmark.division} division average: {num(a.divisionBenchmark.avgAthletesTotal)} athletes, {money(a.divisionBenchmark.avgAidPerAthlete)} aid/athlete
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
