/**
 * testReport.ts — end-to-end smoke test (Gemini).
 * Run:  GEMINI_API_KEY=... npx tsx src/report/testReport.ts
 */
import { buildC1LitePayload } from "./services/reportPayload.service";
import { generateC1LiteNarrative, runGates } from "./services/reportPrompt";

const ARGS = {
  userId: 1,
  // Must be a report_reference_id that already exists in usdreports (the
  // route reserves this row via createPendingReport() before generation).
  reportReferenceId: "REPLACE_WITH_REAL_ID",
  incomeBracket: "75001_110000" as const, // or null — no income intake field exists yet
  schools: [
    { unitid: 100751 /*, programCip: "52.0201"*/ },
    { unitid: 139959 },
  ],
};

async function main() {
  console.log("1) Building payload from DB…");
  const payload = await buildC1LitePayload(ARGS);
  console.log(JSON.stringify(payload, null, 2));

  console.log("\n2) Calling Gemini…");
  const narrative = await generateC1LiteNarrative(payload);
  console.log(JSON.stringify(narrative, null, 2));

  console.log("\n3) Acceptance gates:");
  const errors = runGates(narrative, payload);
  if (!errors.length) console.log("✅ PASS — ship-ready");
  else { console.log("❌ FAIL:"); errors.forEach((e) => console.log("   - " + e)); }
}
main().catch((e) => { console.error(e); process.exit(1); });