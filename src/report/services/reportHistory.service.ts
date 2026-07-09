import * as crypto from "crypto";
import { PoolClient } from "pg";
import pool from "../../db/client";

export interface ReportCollege {
  unitid: number;
  name: string;
}

export interface ReportHistoryEntry {
  reportId: string;
  createdAt: string;
  colleges: ReportCollege[];
}

const REFERENCE_ID_MAX_ATTEMPTS = 5;

function generateCandidateReferenceId(): string {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

async function isReferenceIdTaken(client: PoolClient, candidate: string): Promise<boolean> {
  const result = await client.query("SELECT 1 FROM usdreports WHERE report_reference_id = $1", [candidate]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Insert the usdreports row and its usdreport_colleges rows in a single
 * transaction, so a failure partway through never leaves a report with zero
 * colleges. Returns the report_reference_id — the only identifier callers
 * should hand back to the frontend.
 */
export async function persistGeneratedReport(params: {
  userId: number;
  pdfData: Buffer;
  colleges: Array<{ unitid: number }>;
}): Promise<string> {
  const { userId, pdfData, colleges } = params;
  if (colleges.length === 0) {
    throw new Error("Cannot persist a report with zero colleges");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let reportReferenceId: string | null = null;
    for (let attempt = 0; attempt < REFERENCE_ID_MAX_ATTEMPTS; attempt++) {
      const candidate = generateCandidateReferenceId();
      if (!(await isReferenceIdTaken(client, candidate))) {
        reportReferenceId = candidate;
        break;
      }
    }
    if (!reportReferenceId) {
      throw new Error("Failed to generate a unique report_reference_id after several attempts");
    }

    // pdf_storage_path is intentionally left NULL for new rows — pdf_data is
    // now the sole source of truth for downloads. It only still exists on
    // pre-migration legacy rows.
    const insertReportResult = await client.query<{ id: number }>(
      `INSERT INTO usdreports (user_id, report_reference_id, pdf_data, pdf_size, mime_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, reportReferenceId, pdfData, pdfData.length, "application/pdf"],
    );
    const reportId = insertReportResult.rows[0].id;

    const values: number[] = [];
    const placeholders = colleges
      .map((college, index) => {
        const base = index * 3;
        values.push(reportId, college.unitid, index);
        return `($${base + 1}, $${base + 2}, $${base + 3})`;
      })
      .join(", ");

    await client.query(
      `INSERT INTO usdreport_colleges (report_id, unitid, display_order) VALUES ${placeholders}`,
      values,
    );

    await client.query("COMMIT");
    return reportReferenceId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listReportsForUser(
  userId: number,
  page: number,
  limit: number,
): Promise<{ reports: ReportHistoryEntry[]; total: number }> {
  const offset = (page - 1) * limit;

  const countResult = await pool.query<{ total: string }>(
    "SELECT COUNT(*)::text AS total FROM usdreports WHERE user_id = $1",
    [userId],
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const dataResult = await pool.query<{
    report_reference_id: string;
    created_at: string;
    colleges: ReportCollege[];
  }>(
    `SELECT
       r.report_reference_id,
       r.created_at,
       COALESCE(
         (
           SELECT json_agg(json_build_object('unitid', rc.unitid, 'name', s.name) ORDER BY rc.display_order)
           FROM usdreport_colleges rc
           JOIN schools s ON s.unitid = rc.unitid
           WHERE rc.report_id = r.id
         ),
         '[]'::json
       ) AS colleges
     FROM usdreports r
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  const reports: ReportHistoryEntry[] = dataResult.rows.map((row) => ({
    reportId: row.report_reference_id,
    createdAt: new Date(row.created_at).toISOString(),
    colleges: row.colleges,
  }));

  return { reports, total };
}

export interface ReportDetail extends ReportHistoryEntry {
  pdfStoragePath: string;
}

/** Returns null if no report with this reference id belongs to this user (caller should respond 404). */
export async function getReportForUser(userId: number, reportReferenceId: string): Promise<ReportDetail | null> {
  const result = await pool.query<{
    report_reference_id: string;
    created_at: string;
    pdf_storage_path: string;
    colleges: ReportCollege[];
  }>(
    `SELECT
       r.report_reference_id,
       r.created_at,
       r.pdf_storage_path,
       COALESCE(
         (
           SELECT json_agg(json_build_object('unitid', rc.unitid, 'name', s.name) ORDER BY rc.display_order)
           FROM usdreport_colleges rc
           JOIN schools s ON s.unitid = rc.unitid
           WHERE rc.report_id = r.id
         ),
         '[]'::json
       ) AS colleges
     FROM usdreports r
     WHERE r.report_reference_id = $1 AND r.user_id = $2
     LIMIT 1`,
    [reportReferenceId, userId],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    reportId: row.report_reference_id,
    createdAt: new Date(row.created_at).toISOString(),
    colleges: row.colleges,
    pdfStoragePath: row.pdf_storage_path,
  };
}

export interface ReportPdfSource {
  /** Present for rows generated after the DB-storage migration. */
  pdfData: Buffer | null;
  mimeType: string | null;
  /** Only ever set on pre-migration legacy rows; new rows leave this NULL. */
  pdfStoragePath: string | null;
}

/**
 * Looks up the PDF source for a report by reference id only — used by the
 * signed download route, which authorizes via token possession (minted only
 * after an ownership check) rather than re-checking user_id on every request.
 * Returns both pdf_data and the legacy pdf_storage_path so the caller can
 * prefer the DB column and fall back to disk only for rows predating the
 * migration.
 */
export async function getReportPdfSourceByReferenceId(reportReferenceId: string): Promise<ReportPdfSource | null> {
  const result = await pool.query<{
    pdf_data: Buffer | null;
    mime_type: string | null;
    pdf_storage_path: string | null;
  }>(
    "SELECT pdf_data, mime_type, pdf_storage_path FROM usdreports WHERE report_reference_id = $1 LIMIT 1",
    [reportReferenceId],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { pdfData: row.pdf_data, mimeType: row.mime_type, pdfStoragePath: row.pdf_storage_path };
}
