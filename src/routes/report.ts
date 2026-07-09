import { Router, Response } from "express";
import * as fs from "fs";
import { fetchReportData } from "../report/utils/reportCalculations";
import { generateReportAiContent } from "../report/services/ai.service";
import { generateReportPdf, getReportPdfPath } from "../report/services/pdf.service";
import {
  persistGeneratedReport,
  listReportsForUser,
  getReportForUser,
  getReportPdfSourceByReferenceId,
} from "../report/services/reportHistory.service";
import { signReportDownloadToken, verifyReportDownloadToken } from "../utils/reportDownloadToken";
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

function toPositiveInt(val: unknown, fallback: number): number {
  const n = typeof val === "string" ? parseInt(val, 10) : Number(val);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Express 5 types route params as `string | string[]` (for `foo[]`-style segments); a single `:x` segment is always a plain string at runtime. */
function toParamString(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

/** Resolve the verified firebase_uid to the integer usdusers.id. */
async function resolveUserId(firebaseUid: string): Promise<number | null> {
  const r = await pool.query<{ id: number }>(
    "SELECT id FROM usdusers WHERE firebase_uid = $1",
    [firebaseUid],
  );
  return r.rows.length ? r.rows[0].id : null;
}

// TODO(follow-up): no rate-limiting middleware exists anywhere in this codebase
// yet (src/middleware only has auth.ts). Report generation triggers an LLM call
// and a headless-Chrome PDF render per request, so this endpoint should be
// rate-limited per user before it's exposed broadly. Flagging rather than
// silently skipping — needs a decision on a shared rate-limit middleware
// (e.g. express-rate-limit) since none is currently installed.
router.post(
  "/generate",
  verifyToken,
  async (
    req: AuthRequest,
    res: Response<{ reportId: string } | ApiError>
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

      // 3. Define metadata parameters. This is a throwaway id used only to
      // label the PDF's internal title/filename during rendering — the
      // durable, frontend-facing identifier is the report_reference_id
      // generated in persistGeneratedReport (with a DB uniqueness check).
      const renderId = crypto.randomBytes(6).toString("hex").toUpperCase();
      const generatedDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // 4. Render to a PDF buffer using Puppeteer — kept in memory, never
      // written to disk.
      const pdfBuffer = await generateReportPdf({
        data: reportData,
        ai: aiContent,
        reportId: renderId,
        generatedDate,
      });

      // 5. Persist report metadata, PDF bytes, and selected colleges in one
      // transaction so we never end up with a report row that has zero
      // colleges or missing PDF data.
      const reportReferenceId = await persistGeneratedReport({
        userId,
        pdfData: pdfBuffer,
        colleges: reportData.colleges.map((c) => ({ unitid: c.unitid })),
      });

      console.log(`[report/generate] Report persisted: ${reportReferenceId}`);

      // The report_reference_id is the only identifier the frontend should
      // ever see or use — fetch the PDF via GET /report/:reportId, which
      // mints a fresh short-lived signed download URL.
      return res.status(200).json({ reportId: reportReferenceId });
    } catch (error) {
      console.error("Error generating college decision report:", error);
      return res.status(500).json({
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

interface ReportListResponse {
  reports: { reportId: string; createdAt: string; colleges: { unitid: number; name: string }[] }[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * GET /report — current user's report history, newest first.
 * Auth required; scoped to req.user via resolveUserId, never a query param.
 */
router.get(
  "/",
  verifyToken,
  async (req: AuthRequest, res: Response<ReportListResponse | ApiError>) => {
    try {
      const firebaseUid = req.userId;
      if (!firebaseUid) {
        return res.status(401).json({ error: "Unauthorized: Missing user authentication context." });
      }
      const userId = await resolveUserId(firebaseUid);
      if (!userId) {
        return res.status(404).json({ error: "User not found." });
      }

      const page = Math.max(1, toPositiveInt(req.query.page, 1));
      const limit = Math.min(50, Math.max(1, toPositiveInt(req.query.limit, 10)));

      const { reports, total } = await listReportsForUser(userId, page, limit);
      const hasMore = (page - 1) * limit + reports.length < total;

      return res.status(200).json({ reports, total, page, limit, hasMore });
    } catch (error) {
      console.error("Error listing reports:", error);
      return res.status(500).json({
        error: "Failed to list reports",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

interface ReportDetailResponse {
  reportId: string;
  createdAt: string;
  colleges: { unitid: number; name: string }[];
  downloadUrl: string;
  expiresAt: string;
}

/**
 * GET /report/:reportId — single report for re-viewing/re-downloading.
 * :reportId is report_reference_id. Ownership mismatches 404 (not 403) so a
 * probing request can't distinguish "not yours" from "doesn't exist".
 */
router.get(
  "/:reportId",
  verifyToken,
  async (req: AuthRequest, res: Response<ReportDetailResponse | ApiError>) => {
    try {
      const firebaseUid = req.userId;
      if (!firebaseUid) {
        return res.status(401).json({ error: "Unauthorized: Missing user authentication context." });
      }
      const userId = await resolveUserId(firebaseUid);
      if (!userId) {
        return res.status(404).json({ error: "User not found." });
      }

      const reportId = toParamString(req.params.reportId);
      const report = await getReportForUser(userId, reportId);
      if (!report) {
        return res.status(404).json({ error: "Report not found." });
      }

      const { token, expiresAt } = signReportDownloadToken(report.reportId);
      const host = req.get("host") || "localhost:8000";
      const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const downloadUrl = `${proto}://${host}/report/${report.reportId}/download?token=${token}`;

      return res.status(200).json({
        reportId: report.reportId,
        createdAt: report.createdAt,
        colleges: report.colleges,
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error("Error fetching report:", error);
      return res.status(500).json({
        error: "Failed to fetch report",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /report/:reportId/download — streams the PDF for a signed, short-lived
 * token minted by GET /report/:reportId. Possession of a valid token is the
 * authorization (same semantics as a cloud signed URL), so this route is
 * intentionally not behind verifyToken.
 */
router.get("/:reportId/download", async (req, res: Response<Buffer | ApiError | void>) => {
  try {
    const reportId = toParamString(req.params.reportId);
    const token = req.query.token;

    if (typeof token !== "string" || !token) {
      return res.status(401).json({ error: "Missing download token." });
    }

    const tokenReportRef = verifyReportDownloadToken(token);
    if (!tokenReportRef || tokenReportRef !== reportId) {
      return res.status(401).json({ error: "Invalid or expired download link." });
    }

    const source = await getReportPdfSourceByReferenceId(reportId);
    if (!source) {
      return res.status(404).json({ error: "Report not found." });
    }

    // DB-stored PDF (pdf_data) is the source of truth for every row created
    // after the storage migration.
    if (source.pdfData && source.pdfData.length > 0) {
      res.setHeader("Content-Type", source.mimeType || "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="report-${reportId}.pdf"`);
      return res.send(source.pdfData);
    }

    // Legacy fallback: rows created before the migration only ever had
    // pdf_storage_path populated. Serve those from disk rather than 404ing
    // on every report generated before this fix shipped.
    if (source.pdfStoragePath) {
      const absolutePath = getReportPdfPath(source.pdfStoragePath);
      if (fs.existsSync(absolutePath)) {
        return res.download(absolutePath, `report-${reportId}.pdf`);
      }
    }

    return res.status(404).json({ error: "Report file not found." });
  } catch (error) {
    console.error("Error downloading report:", error);
    return res.status(500).json({
      error: "Failed to download report",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
