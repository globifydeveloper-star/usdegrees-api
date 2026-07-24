import React from "react";
import { theme } from "./theme";

/**
 * Shared page chrome for every content page (all pages except the Cover).
 *
 * `PageHeader` renders the recurring gold kicker + section label + hairline
 * rule + serif page title. `PageFooter` renders the hairline rule + per-page
 * disclaimer footer. Both replace the copy-pasted inline markup that used to
 * live in each page component.
 *
 * `pageStyle` is the shared A4 page container style so every page keeps
 * identical dimensions, cream background, and pageBreakAfter behavior.
 */

export const pageStyle: React.CSSProperties = {
  width: "210mm",
  height: "297mm",
  padding: "20mm",
  boxSizing: "border-box",
  backgroundColor: theme.color.pageBg,
  color: theme.color.ink,
  fontFamily: theme.font.sans,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  pageBreakAfter: "always",
};

export interface PageHeaderProps {
  sectionLabel: string; // e.g. "SECTION 04 · TRUE COST"
  title: string; // e.g. "True Cost Comparison"
}

export function PageHeader({ sectionLabel, title }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: theme.color.gold,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          U.S.&nbsp;DEGREES · COLLEGE DECISION REPORT
        </div>
        <div
          style={{
            fontSize: "9.5px",
            color: theme.color.inkMuted,
            letterSpacing: "0.08em",
            textAlign: "right",
          }}
        >
          {sectionLabel}
        </div>
      </div>
      <div
        style={{
          width: "100%",
          height: "1px",
          backgroundColor: theme.color.hairline,
          marginBottom: "14px",
        }}
      ></div>
      <h2
        style={{
          fontFamily: theme.font.family,
          fontSize: "23px",
          fontWeight: 700,
          color: theme.color.navy,
          margin: 0,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
    </div>
  );
}

export interface PageFooterProps {
  reportId: string;
  generatedDate: string;
  pageNumber: number;
  totalPages: number;
}

export function PageFooter({
  reportId,
  pageNumber,
  totalPages,
}: PageFooterProps) {
  const footNote: React.CSSProperties = {
    fontSize: "8.5px",
    color: theme.color.inkFaint,
  };

  return (
    <div>
      <div
        style={{
          textAlign: "center",
          fontSize: "11.5px",
          fontWeight: 700,
          letterSpacing: "0.28em",
          color: theme.color.inkFaint,
          opacity: 0.55,
          marginBottom: "8px",
          textTransform: "uppercase",
        }}
      >
        USDEGREES.COM
      </div>
      <div
        style={{
          width: "100%",
          height: "1px",
          backgroundColor: theme.color.hairline,
          marginBottom: "8px",
        }}
      ></div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span style={{ ...footNote, whiteSpace: "nowrap" }}>
          Report {reportId} · Rev 1
        </span>
        <span
          style={{
            ...footNote,
            fontStyle: "italic",
            textAlign: "center",
            flexGrow: 1,
          }}
        >
          Informational only — not financial, legal, or educational consulting
          advice.
        </span>
        <span style={{ ...footNote, whiteSpace: "nowrap" }}>
          Page {pageNumber} of {totalPages}
        </span>
      </div>
    </div>
  );
}
