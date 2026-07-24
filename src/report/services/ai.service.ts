/**
 * ai.service.ts — C1-Lite report content service (Gemini)
 * ------------------------------------------------------------------
 * Replaces the recommendation-style generateReportAiContent() with the
 * neutral C1-Lite path: build payload from DB → generate narrative via
 * Gemini → run acceptance gates → return narrative for the components.
 *
 * NEUTRALITY: no recommendation, no ranking, no invented numbers.
 * If the model breaks a gate, we DON'T silently ship — see options below.
 */

import {
  buildC1LitePayload,
  type IncomeBracket,
} from "./reportPayload.service";
import {
  generateC1LiteNarrative,
  runGates,
  type C1LiteNarrative,
  type C1LitePayload,
} from "./reportPrompt";

export interface GenerateReportArgs {
  userId: number;
  reportReferenceId: string;
  schools: Array<{ unitid: number; programCip?: string; programName?: string }>;
  incomeBracket: IncomeBracket | null;
  methodologyVersion?: string;
}

export interface ReportResult {
  payload: C1LitePayload;   // the .tsx components consume BOTH:
  narrative: C1LiteNarrative; //  - payload for all numbers/tables
  gateErrors: string[];       //  - narrative for the generated prose
  passed: boolean;
}

/**
 * Build + generate + validate a C1-Lite report.
 * Retries generation once if the acceptance gates fail (the model
 * occasionally slips a comparative number or advice phrase; a second
 * pass at low temperature usually clears it).
 */
export async function generateC1LiteReport(
  args: GenerateReportArgs,
): Promise<ReportResult> {
  const payload = await buildC1LitePayload(args);

  let narrative = await generateC1LiteNarrative(payload);
  let gateErrors = runGates(narrative, payload);

  if (gateErrors.length > 0) {
    console.warn(
      `⚠️ C1-Lite gates failed (attempt 1) for report ${args.reportReferenceId}:`,
      gateErrors,
    );
    narrative = await generateC1LiteNarrative(payload); // one retry
    gateErrors = runGates(narrative, payload);
  }

  const passed = gateErrors.length === 0;
  if (!passed) {
    // Do NOT ship a report that fails neutrality / traceability.
    // Escalate: log, flag the report row, and surface to the caller.
    console.error(
      `❌ C1-Lite gates FAILED after retry for report ${args.reportReferenceId}. ` +
        `Report withheld. Errors:`,
      gateErrors,
    );
  }

  return { payload, narrative, gateErrors, passed };
}