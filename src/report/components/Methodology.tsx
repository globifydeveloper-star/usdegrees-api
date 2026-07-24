import React from "react";
import type { C1LitePayload } from "../services/reportPrompt";
import { theme } from "./theme";
import { pageStyle, PageHeader, PageFooter } from "./PageChrome";

export interface MethodologyProps {
  payload: C1LitePayload;
  reportId: string;
  generatedDate: string;
  pageNumber: number;
  totalPages: number;
}

export default function Methodology({
  reportId,
  generatedDate,
  pageNumber,
  totalPages,
}: MethodologyProps) {
  return (
    <div style={pageStyle}>
      <div>
        <PageHeader
          sectionLabel="SECTION 09 · MODELS & DISCLAIMERS"
          title="Calculation Methodology & Disclaimers"
        />

        {/* Methodology Details */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: theme.color.navy,
                margin: "0 0 6px 0",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Calculation Methodology
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "12px",
                color: theme.color.ink,
                lineHeight: "1.4",
              }}
            >
              <div>
                <strong>• 20-Year ROI:</strong> A precomputed figure reported
                directly from federal cohort data (avg_salary and total_cost
                inputs, keyed by school and credential level). Not estimated or
                projected by this report.
              </div>
              <div>
                <strong>• Admission Fit:</strong> Measures student academic
                placement (GPA, SAT) compared to the middle 50% range of the
                historical freshman cohort. Not applicable at open-admission,
                test-not-used, or closed institutions.
              </div>
              <div>
                <strong>• Debt-to-Income Ratio:</strong> A published federal
                outcome label (avg_debt vs. cohort earnings) — reported as-is,
                not computed or interpreted by this report.
              </div>
            </div>
          </div>

          <div>
            <h3
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: theme.color.navy,
                margin: "0 0 6px 0",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Disclaimer & Limits
            </h3>
            <p
              style={{
                fontSize: "11px",
                lineHeight: "1.5",
                color: theme.color.inkMuted,
                margin: 0,
              }}
            >
              This report is neutral and comparative only — it does not rank,
              recommend, or select a school. Every figure shown is drawn
              directly from public federal datasets; none are computed,
              estimated, or rounded by this report. Where a figure is not
              published for a school, it is shown as "Not published," never
              substituted with a typical or estimated value. Confirm all figures
              directly with each institution before making a decision.
            </p>
          </div>
        </div>

        {/* Branding Sign-off */}
        <div
          style={{
            backgroundColor: theme.color.panelBg,
            border: `1px solid ${theme.color.hairline}`,
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: theme.color.inkMuted,
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              Report Status
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: theme.color.navy,
              }}
            >
              SYSTEM VERIFIED & LOCKED
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: theme.color.inkMuted }}>
              Generated on: <strong>{generatedDate}</strong>
            </div>
            <div style={{ fontSize: "11px", color: theme.color.inkMuted }}>
              Reference ID: <strong>{reportId}</strong>
            </div>
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
