import jwt from "jsonwebtoken";

const SECRET = process.env.REPORT_DOWNLOAD_SECRET || process.env.JWT_SECRET || "your_secret_key";
const EXPIRES_IN_MINUTES = 12; // within the required 10-15 min window

interface ReportDownloadTokenPayload {
  reportRef: string;
}

/** Issue a short-lived, single-purpose token authorizing download of one report's PDF. */
export function signReportDownloadToken(reportReferenceId: string): { token: string; expiresAt: Date } {
  const token = jwt.sign({ reportRef: reportReferenceId } as ReportDownloadTokenPayload, SECRET, {
    expiresIn: `${EXPIRES_IN_MINUTES}m`,
  });
  const expiresAt = new Date(Date.now() + EXPIRES_IN_MINUTES * 60 * 1000);
  return { token, expiresAt };
}

/** Verify a download token, returning the report_reference_id it authorizes, or null if invalid/expired. */
export function verifyReportDownloadToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, SECRET) as ReportDownloadTokenPayload;
    return payload.reportRef || null;
  } catch {
    return null;
  }
}
