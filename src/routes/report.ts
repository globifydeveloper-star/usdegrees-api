import { Router, Response } from "express";
import { fetchReportData } from "../report/utils/reportCalculations";
import { generateReportAiContent } from "../report/services/ai.service";
import { generateReportPdf } from "../report/services/pdf.service";
import { verifyToken } from "../middleware/auth";
import { AuthRequest } from "../types/user";
import pool from "../db/client";
import * as crypto from "crypto";

const router = Router();

interface GenerateReportRequest {
  selectedColleges: number[];
  programId: number;
}

interface ApiError {
  error: string;
  details?: string;
}

/** Resolve the verified firebase_uid to the integer usdusers.id. */
async function resolveUserId(firebaseUid: string): Promise<number | null> {
  const r = await pool.query<{ id: number }>(
    "SELECT id FROM usdusers WHERE firebase_uid = $1",
    [firebaseUid],
  );
  return r.rows.length ? r.rows[0].id : null;
}

router.post(
  "/generate",
  verifyToken,
  async (
    req: AuthRequest,
    res: Response<{ pdfUrl: string } | ApiError>
  ) => {
    try {
      const { selectedColleges, programId } = req.body as GenerateReportRequest;
      const firebaseUid = req.userId;

      if (!firebaseUid) {
        return res.status(401).json({ error: "Unauthorized: Missing user authentication context." });
      }

      // Resolve the authenticated user's real id. Never fall back to another
      // user's row — the report must only ever contain this user's own data.
      const userId = await resolveUserId(firebaseUid);
      if (!userId) {
        return res.status(404).json({ error: "User not found." });
      }

      if (!selectedColleges || !Array.isArray(selectedColleges) || selectedColleges.length === 0) {
        return res.status(400).json({ error: "A non-empty selectedColleges array of integers is required." });
      }

      const progId = programId || 20015; // default to computer science if missing

      // 1. Fetch data & perform mathematical calculations in backend
      const reportData = await fetchReportData(userId, selectedColleges, progId);

      if (reportData.colleges.length === 0) {
        return res.status(404).json({ error: "None of the specified selectedColleges were found in the database." });
      }

      // 2. Call LLM for summary commentary (strict JSON output)
      const aiContent = await generateReportAiContent(reportData);

      // 3. Define metadata parameters
      const reportId = crypto.randomBytes(6).toString("hex").toUpperCase();
      const generatedDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // 4. Render to static HTML & compile PDF using Puppeteer
      const fileName = await generateReportPdf({
        data: reportData,
        ai: aiContent,
        reportId,
        generatedDate,
      });

      // 5. Construct static file URL
      const host = req.get("host") || "localhost:8000";
      
      // Support secure protocol check if routed through proxy
      const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const pdfUrl = `${proto}://${host}/public/reports/${fileName}`;

      console.log(`[report/generate] Report generated successfully: ${pdfUrl}`);

      return res.status(200).json({ pdfUrl });
    } catch (error) {
      console.error("Error generating college decision report:", error);
      return res.status(500).json({
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
