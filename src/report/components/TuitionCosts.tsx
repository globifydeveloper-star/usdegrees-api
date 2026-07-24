import React from "react";
import type { C1LitePayload } from "../services/reportPrompt";
import { theme } from "./theme";
import { pageStyle, PageHeader, PageFooter } from "./PageChrome";

export interface TuitionCostsProps {
  payload: C1LitePayload;
  reportId: string;
  generatedDate: string;
  pageNumber: number;
  totalPages: number;
}

function money(v: number | null): string {
  return v != null ? `$${v.toLocaleString()}` : "Not published";
}

/**
 * One row per unique college (payload.college_details is already deduped by
 * unitid) — the full sticker/tuition/living-cost breakdown is school-level,
 * so it doesn't repeat when a college is compared under multiple programs.
 */
export default function TuitionCosts({
  payload,
  reportId,
  generatedDate,
  pageNumber,
  totalPages,
}: TuitionCostsProps) {
  const { college_details } = payload;

  return (
    <div style={pageStyle}>
      <div>
        <PageHeader
          sectionLabel="SECTION 07 · TUITION & COSTS"
          title="Tuition & Cost of Attendance"
        />

        <p
          style={{
            fontSize: "11.5px",
            lineHeight: "1.6",
            color: theme.color.ink,
            margin: "0 0 20px 0",
          }}
        >
          Posted sticker price and cost-of-attendance components, as reported to
          IPEDS. These are published figures, not the student's personalized net
          price (see Section 02).
        </p>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "10.5px",
            marginBottom: "24px",
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
                Sticker Price
              </th>
              <th
                style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}
              >
                Tuition (In-State)
              </th>
              <th
                style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}
              >
                Tuition (Out-of-State)
              </th>
              <th
                style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}
              >
                Room & Board (On-Campus)
              </th>
              <th
                style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}
              >
                Books & Supplies
              </th>
            </tr>
          </thead>
          <tbody>
            {college_details.map((c, i) => (
              <tr
                key={c.unitid}
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
                  {c.name}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    color: theme.color.navy,
                    fontWeight: 700,
                  }}
                >
                  {money(c.tuition.sticker_price)}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    color: theme.color.ink,
                  }}
                >
                  {money(c.tuition.tuition_in_state)}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    color: theme.color.ink,
                  }}
                >
                  {money(c.tuition.tuition_out_state)}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    color: theme.color.ink,
                  }}
                >
                  {money(c.tuition.room_board_on_campus)}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    color: theme.color.ink,
                  }}
                >
                  {money(c.tuition.books_supply)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: theme.color.navy,
            margin: "0 0 12px 0",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Average Net Price on File (Unpersonalized)
        </h3>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "10.5px",
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
                Avg Net Price (Public)
              </th>
              <th
                style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}
              >
                Avg Net Price (Private)
              </th>
              <th
                style={{ padding: "8px", fontWeight: 600, textAlign: "right" }}
              >
                Avg Net Price (Overall)
              </th>
            </tr>
          </thead>
          <tbody>
            {college_details.map((c, i) => (
              <tr
                key={c.unitid}
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
                  {c.name}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    color: theme.color.ink,
                  }}
                >
                  {money(c.tuition.avg_net_price_public)}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    color: theme.color.ink,
                  }}
                >
                  {money(c.tuition.avg_net_price_private)}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    color: theme.color.ink,
                  }}
                >
                  {money(c.tuition.avg_net_price_overall)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
