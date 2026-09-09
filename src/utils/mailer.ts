import nodemailer, { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

/**
 * Lazily built so importing this module never fails a boot that doesn't need
 * email (e.g. local dev without SMTP configured) — the failure only surfaces
 * when a route actually tries to send.
 */
function getTransporter(): Transporter {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error(
      "SMTP is not configured: SMTP_HOST, SMTP_USER and SMTP_PASSWORD are required to send email.",
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return transporter;
}

export interface ReportEmailParams {
  to: string;
  reportId: string;
  createdAt: string;
  collegeNames: string[];
  downloadUrl: string;
}

export async function sendReportDownloadEmail(params: ReportEmailParams): Promise<void> {
  const { to, reportId, createdAt, collegeNames, downloadUrl } = params;
  const reportName = `report-${reportId}.pdf`;
  const createdDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const collegeListHtml = collegeNames.map((name) => `<li>${name}</li>`).join("");
  const collegeListText = collegeNames.join(", ");

  const html = `
    <p>Your college comparison report is ready.</p>
    <p>
      <strong>Report:</strong> ${reportName}<br/>
      <strong>Created:</strong> ${createdDate}<br/>
      <strong>Colleges compared:</strong>
    </p>
    <ul>${collegeListHtml}</ul>
    <p><a href="${downloadUrl}">Download your report</a></p>
    <p>This link expires shortly, so download it soon.</p>
  `;

  const text =
    `Your college comparison report is ready.\n\n` +
    `Report: ${reportName}\n` +
    `Created: ${createdDate}\n` +
    `Colleges compared: ${collegeListText}\n\n` +
    `Download your report: ${downloadUrl}\n\n` +
    `This link expires shortly, so download it soon.`;

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Your report is ready: ${reportName}`,
    text,
    html,
  });
}
