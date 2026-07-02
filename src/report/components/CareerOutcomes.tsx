import React from "react";
import { ReportCalculatedData } from "../utils/reportCalculations";
import { AiReportContent } from "../services/ai.service";
import { theme } from "./theme";
import { pageStyle, PageHeader, PageFooter } from "./PageChrome";

export interface CareerOutcomesProps {
  data: ReportCalculatedData;
  ai: AiReportContent;
  reportId: string;
  generatedDate: string;
  pageNumber: number;
  totalPages: number;
}

export default function CareerOutcomes({
  data,
  ai,
  reportId,
  generatedDate,
  pageNumber,
  totalPages,
}: CareerOutcomesProps) {
  const chartHeight = 120;
  const chartWidth = 320;

  return (
    <div style={pageStyle}>
      <div>
        <PageHeader sectionLabel="SECTION 03 · CAREER OUTCOMES & DEBT" title="Career Outcomes & Debt Projections" />

        {/* AI Analyses */}
        <div style={{ backgroundColor: theme.color.panelBg, borderRadius: "10px", padding: "14px", border: `1px solid ${theme.color.hairline}`, marginBottom: "20px", fontSize: "11.5px", lineHeight: "1.5" }}>
          <div style={{ fontWeight: 700, color: theme.color.navy, textTransform: "uppercase", fontSize: "10px", marginBottom: "4px" }}>
            Financial & Aid Analysis
          </div>
          <p style={{ margin: "0 0 12px 0", color: theme.color.ink }}>{ai.financialAnalysis}</p>
          <div style={{ fontWeight: 700, color: theme.color.navy, textTransform: "uppercase", fontSize: "10px", marginBottom: "4px" }}>
            Career Outlook & Growth
          </div>
          <p style={{ margin: 0, color: theme.color.ink }}>{ai.careerOutlook}</p>
        </div>

        {/* Outcomes Data Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px", marginBottom: "25px", border: `1px solid ${theme.color.hairline}` }}>
          <thead>
            <tr style={{ backgroundColor: theme.color.navy, color: theme.color.white, textAlign: "left" }}>
              <th style={{ padding: "8px", fontWeight: 600 }}>College</th>
              <th style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}>Starting Salary</th>
              <th style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}>5-Year Salary</th>
              <th style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}>Average Graduate Debt</th>
              <th style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}>Monthly Payment</th>
              <th style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}>Debt-to-Income</th>
              <th style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}>20-Yr ROI</th>
            </tr>
          </thead>
          <tbody>
            {data.colleges.map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${theme.color.hairline}`, backgroundColor: i % 2 === 0 ? theme.color.panelBgAlt : theme.color.panelBg }}>
                <td style={{ padding: "8px", fontWeight: 700, color: theme.color.navy }}>{c.name}</td>
                <td style={{ padding: "8px", textAlign: "right", color: theme.color.ink }}>
                  {c.median1YrEarnings ? `$${c.median1YrEarnings.toLocaleString()}` : "N/A"}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: theme.color.navy, fontWeight: 700 }}>
                  {c.median5YrEarnings ? `$${c.median5YrEarnings.toLocaleString()}` : "N/A"}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: theme.color.ink }}>
                  {c.averageDebtFormatted}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: theme.color.ink }}>
                  {c.monthlyPaymentFormatted}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: c.debtIncomeRatio && c.debtIncomeRatio > 0.5 ? theme.color.risk : theme.color.ink, fontWeight: 600 }}>
                  {c.debtIncomeRatioFormatted}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: theme.color.positive, fontWeight: 700 }}>
                  {c.roi20YrFormatted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Charts Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
          {/* Salary Progression by Year — table (Year 1 / Year 5 / Growth) */}
          <div style={{ backgroundColor: theme.color.panelBg, border: `1px solid ${theme.color.hairline}`, borderRadius: "12px", padding: "16px" }}>
            <h4 style={{ fontSize: "11px", fontWeight: 700, color: theme.color.navy, margin: "0 0 12px 0", textTransform: "uppercase", textAlign: "center" }}>
              Salary Progression by Year
            </h4>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr style={{ color: theme.color.inkMuted, textAlign: "right", borderBottom: `1px solid ${theme.color.hairline}` }}>
                  <th style={{ padding: "6px 4px", fontWeight: 600, textAlign: "left" }}>College</th>
                  <th style={{ padding: "6px 4px", fontWeight: 600 }}>Year 1</th>
                  <th style={{ padding: "6px 4px", fontWeight: 600 }}>Year 5</th>
                  <th style={{ padding: "6px 4px", fontWeight: 600 }}>5-Yr Growth</th>
                </tr>
              </thead>
              <tbody>
                {data.colleges.map((c, i) => {
                  const y1 = c.median1YrEarnings;
                  const y5 = c.median5YrEarnings;
                  const hasBoth = y1 != null && y5 != null && y1 > 0;
                  const growth = hasBoth ? ((y5 - y1) / y1) * 100 : null;
                  const growthColor =
                    growth == null
                      ? theme.color.inkMuted
                      : growth >= 0
                      ? theme.color.positive
                      : theme.color.risk;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${theme.color.hairline}` }}>
                      <td style={{ padding: "6px 4px", fontWeight: 700, color: theme.color.navy }}>
                        {c.name.split(" ")[0]}
                      </td>
                      <td style={{ padding: "6px 4px", textAlign: "right", color: theme.color.ink }}>
                        {y1 != null ? `$${y1.toLocaleString()}` : "N/A"}
                      </td>
                      <td style={{ padding: "6px 4px", textAlign: "right", color: theme.color.ink }}>
                        {y5 != null ? `$${y5.toLocaleString()}` : "N/A"}
                      </td>
                      <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: 700, color: growthColor }}>
                        {growth != null ? `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%` : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ROI vs. Debt Comparison */}
          <div style={{ backgroundColor: theme.color.panelBg, border: `1px solid ${theme.color.hairline}`, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h4 style={{ fontSize: "11px", fontWeight: 700, color: theme.color.navy, margin: "0 0 12px 0", textTransform: "uppercase" }}>
              20-Year ROI vs. Loan Debt ($)
            </h4>
            <svg width={chartWidth} height={chartHeight + 20}>
              {data.colleges.map((c, i) => {
                const maxRoi = Math.max(...data.colleges.map((col) => col.roi20Yr || 500000), 300000);
                const roiHeight = c.roi20Yr ? (c.roi20Yr / maxRoi) * chartHeight : 10;
                const debtHeight = c.averageDebt ? (c.averageDebt / (maxRoi / 5)) * chartHeight : 5; // scaled up for visibility

                const x = i * 90 + 35;
                const yRoi = chartHeight - roiHeight;
                const yDebt = chartHeight - debtHeight;

                return (
                  <g key={i}>
                    {/* ROI Bar */}
                    <rect x={x} y={yRoi} width="20" height={roiHeight} fill={theme.color.gold} rx="2" />
                    {/* Debt Bar */}
                    <rect x={x + 24} y={yDebt} width="20" height={debtHeight} fill={theme.color.risk} rx="2" />
                    {/* Text values */}
                    <text x={x + 10} y={yRoi - 4} fontSize="7.5px" fontWeight="bold" fill={theme.color.gold} textAnchor="middle">
                      ${c.roi20Yr ? Math.round(c.roi20Yr / 1000) : "0"}k
                    </text>
                    <text x={x + 34} y={yDebt - 4} fontSize="7.5px" fontWeight="bold" fill={theme.color.risk} textAnchor="middle">
                      ${c.averageDebt ? Math.round(c.averageDebt / 1000) : "0"}k
                    </text>
                    <text x={x + 22} y={chartHeight + 14} fontSize="8px" fontWeight="600" fill={theme.color.inkMuted} textAnchor="middle">
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
