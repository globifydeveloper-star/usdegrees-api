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
          sectionLabel="SECTION 08 · TUITION & COSTS"
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
              <th style={{ padding: "6px", fontWeight: 600 }}>College</th>
              <th style={{ padding: "6px", fontWeight: 600, textAlign: "right" }}>
                Net Price (Avg)
              </th>
              <th style={{ padding: "6px", fontWeight: 600, textAlign: "right" }}>
                Sticker Price
              </th>
              <th style={{ padding: "6px", fontWeight: 600, textAlign: "right" }}>
                Tuition (In-State)
              </th>
              <th style={{ padding: "6px", fontWeight: 600, textAlign: "right" }}>
                Tuition (Out-of-State)
              </th>
              <th style={{ padding: "6px", fontWeight: 600, textAlign: "right" }}>
                Room & Board (On-Campus)
              </th>
              <th style={{ padding: "6px", fontWeight: 600, textAlign: "right" }}>
                Room & Board (Off-Campus)
              </th>
              <th style={{ padding: "6px", fontWeight: 600, textAlign: "right" }}>
                Books & Supplies
              </th>
              <th style={{ padding: "6px", fontWeight: 600, textAlign: "right" }}>
                Other Expense (On-Campus)
              </th>
              <th style={{ padding: "6px", fontWeight: 600, textAlign: "right" }}>
                Other Expense (Off-Campus)
              </th>
              <th style={{ padding: "6px", fontWeight: 600, textAlign: "right" }}>
                Other Expense (With Family)
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
                    padding: "6px",
                    fontWeight: 700,
                    color: theme.color.navy,
                  }}
                >
                  {c.name}
                </td>
                <td
                  style={{
                    padding: "6px",
                    textAlign: "right",
                    color: theme.color.navy,
                    fontWeight: 700,
                  }}
                >
                  {money(c.tuition.sticker_price)}
                </td>
                <td style={{ padding: "6px", textAlign: "right", color: theme.color.ink }}>
                  {money(c.tuition.net_price)}
                </td>
                <td style={{ padding: "6px", textAlign: "right", color: theme.color.ink }}>
                  {money(c.tuition.tuition_in_state)}
                </td>
                <td style={{ padding: "6px", textAlign: "right", color: theme.color.ink }}>
                  {money(c.tuition.tuition_out_state)}
                </td>
                <td style={{ padding: "6px", textAlign: "right", color: theme.color.ink }}>
                  {money(c.tuition.room_board_on_campus)}
                </td>
                <td style={{ padding: "6px", textAlign: "right", color: theme.color.ink }}>
                  {money(c.tuition.room_board_off_campus)}
                </td>
                <td style={{ padding: "6px", textAlign: "right", color: theme.color.ink }}>
                  {money(c.tuition.books_supply)}
                </td>
                <td style={{ padding: "6px", textAlign: "right", color: theme.color.ink }}>
                  {money(c.tuition.other_expense_on_campus)}
                </td>
                <td style={{ padding: "6px", textAlign: "right", color: theme.color.ink }}>
                  {money(c.tuition.other_expense_off_campus)}
                </td>
                <td style={{ padding: "6px", textAlign: "right", color: theme.color.ink }}>
                  {money(c.tuition.other_expense_with_family)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p
          style={{
            fontSize: "10px",
            lineHeight: "1.5",
            color: theme.color.inkMuted,
            margin: 0,
          }}
        >
          Net Price is the estimated average price after student aid. Sticker Price is the figure on file before estimated financial-aid
          calculations.
        </p>
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
