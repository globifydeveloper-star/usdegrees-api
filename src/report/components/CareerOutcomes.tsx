import React from "react";
import { ReportCalculatedData } from "../utils/reportCalculations";
import { AiReportContent } from "../services/ai.service";

export interface CareerOutcomesProps {
  data: ReportCalculatedData;
  ai: AiReportContent;
}

export default function CareerOutcomes({ data, ai }: CareerOutcomesProps) {
  // SVG Salary Growth Curve
  const chartHeight = 120;
  const chartWidth = 320;
  const maxSalary = Math.max(...data.colleges.map((c) => c.median5YrEarnings || 90000), 75000);

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
          <div style={{ fontSize: "10px", color: "#64748B" }}>SECTION 3: CAREER OUTCOMES & DEBT</div>
        </div>
        <div style={{ width: "100%", height: "2px", backgroundColor: "#E2E8F0", marginBottom: "20px" }}></div>

        {/* Page Title */}
        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0F172A", margin: "0 0 15px 0" }}>
          Career Outcomes & Debt Projections
        </h2>

        {/* AI Analyses */}
        <div style={{ backgroundColor: "#F8FAFC", borderRadius: "10px", padding: "14px", border: "1px solid #E2E8F0", marginBottom: "20px", fontSize: "11.5px", lineHeight: "1.5" }}>
          <div style={{ fontWeight: "700", color: "#1E3A8A", textTransform: "uppercase", fontSize: "10px", marginBottom: "4px" }}>
            Financial & Aid Analysis
          </div>
          <p style={{ margin: "0 0 12px 0", color: "#334155" }}>{ai.financialAnalysis}</p>
          <div style={{ fontWeight: "700", color: "#1E3A8A", textTransform: "uppercase", fontSize: "10px", marginBottom: "4px" }}>
            Career Outlook & Growth
          </div>
          <p style={{ margin: 0, color: "#334155" }}>{ai.careerOutlook}</p>
        </div>

        {/* Outcomes Data Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px", marginBottom: "25px", border: "1px solid #E2E8F0" }}>
          <thead>
            <tr style={{ backgroundColor: "#0F172A", color: "#FFFFFF", textAlign: "left" }}>
              <th style={{ padding: "8px", fontWeight: "600" }}>College</th>
              <th style={{ padding: "8px", fontWeight: "600", textAlign: "right" }}>Starting Salary</th>
              <th style={{ padding: "8px", fontWeight: "600", textAlign: "right" }}>5-Year Salary</th>
              <th style={{ padding: "8px", fontWeight: "600", textAlign: "right" }}>Average Graduate Debt</th>
              <th style={{ padding: "8px", fontWeight: "600", textAlign: "right" }}>Monthly Payment</th>
              <th style={{ padding: "8px", fontWeight: "600", textAlign: "right" }}>Debt-to-Income</th>
              <th style={{ padding: "8px", fontWeight: "600", textAlign: "right" }}>20-Yr ROI</th>
            </tr>
          </thead>
          <tbody>
            {data.colleges.map((c, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                <td style={{ padding: "8px", fontWeight: "700", color: "#1E3A8A" }}>{c.name}</td>
                <td style={{ padding: "8px", textAlign: "right", color: "#334155" }}>
                  {c.median1YrEarnings ? `$${c.median1YrEarnings.toLocaleString()}` : "N/A"}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: "#1E3A8A", fontWeight: "700" }}>
                  {c.median5YrEarnings ? `$${c.median5YrEarnings.toLocaleString()}` : "N/A"}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: "#334155" }}>
                  {c.averageDebtFormatted}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: "#334155" }}>
                  {c.monthlyPaymentFormatted}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: c.debtIncomeRatio && c.debtIncomeRatio > 0.5 ? "#DC2626" : "#334155", fontWeight: "600" }}>
                  {c.debtIncomeRatioFormatted}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: "#10B981", fontWeight: "700" }}>
                  {c.roi20YrFormatted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Charts Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
          {/* Salary Progression Line Chart */}
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h4 style={{ fontSize: "11px", fontWeight: "700", color: "#1E3A8A", margin: "0 0 12px 0", textTransform: "uppercase" }}>
              Salary Progression curve
            </h4>
            <svg width={chartWidth} height={chartHeight + 20}>
              {/* Lines connecting points */}
              {data.colleges.map((c, i) => {
                const s1 = c.median1YrEarnings || 45000;
                const s5 = c.median5YrEarnings || 75000;
                const y1 = chartHeight - (s1 / maxSalary) * chartHeight;
                const y5 = chartHeight - (s5 / maxSalary) * chartHeight;
                const colors = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B"];
                const color = colors[i % colors.length];

                return (
                  <g key={i}>
                    <line x1="50" y1={y1} x2="250" y2={y5} stroke={color} strokeWidth="3" />
                    <circle cx="50" cy={y1} r="5" fill={color} />
                    <circle cx="250" cy={y5} r="5" fill={color} />
                    {/* Tooltip Labels */}
                    <text x="45" y={y1 - 6} fontSize="8px" fontWeight="bold" fill="#1E293B" textAnchor="end">
                      ${Math.round(s1 / 1000)}k
                    </text>
                    <text x="255" y={y5 - 6} fontSize="8px" fontWeight="bold" fill="#1E293B" textAnchor="start">
                      ${Math.round(s5 / 1000)}k
                    </text>
                    {/* Legend text */}
                    <text x="150" y={((y1 + y5) / 2) - 8} fontSize="7.5px" fontWeight="600" fill={color} textAnchor="middle">
                      {c.name.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
              {/* X Axis Labels */}
              <text x="50" y={chartHeight + 14} fontSize="9px" fontWeight="600" fill="#64748B" textAnchor="middle">Year 1</text>
              <text x="250" y={chartHeight + 14} fontSize="9px" fontWeight="600" fill="#64748B" textAnchor="middle">Year 5</text>
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#CBD5E1" strokeWidth="1" />
            </svg>
          </div>

          {/* ROI vs. Debt Comparison */}
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h4 style={{ fontSize: "11px", fontWeight: "700", color: "#1E3A8A", margin: "0 0 12px 0", textTransform: "uppercase" }}>
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
                    <rect x={x} y={yRoi} width="20" height={roiHeight} fill="#10B981" rx="2" />
                    {/* Debt Bar */}
                    <rect x={x + 24} y={yDebt} width="20" height={debtHeight} fill="#EF4444" rx="2" />
                    {/* Text values */}
                    <text x={x + 10} y={yRoi - 4} fontSize="7.5px" fontWeight="bold" fill="#10B981" textAnchor="middle">
                      ${c.roi20Yr ? Math.round(c.roi20Yr / 1000) : "0"}k
                    </text>
                    <text x={x + 34} y={yDebt - 4} fontSize="7.5px" fontWeight="bold" fill="#EF4444" textAnchor="middle">
                      ${c.averageDebt ? Math.round(c.averageDebt / 1000) : "0"}k
                    </text>
                    <text x={x + 22} y={chartHeight + 14} fontSize="8px" fontWeight="600" fill="#64748B" textAnchor="middle">
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
          <span>Page 4 of 6</span>
        </div>
      </div>
    </div>
  );
}
