import React from "react";
import ReactDOMServer from "react-dom/server";
import chromium from "@sparticuz/chromium";
import puppeteerCore, { Browser } from "puppeteer-core";
import * as path from "path";
import ReportDocument from "../components/ReportDocument";
import type { C1LitePayload, C1LiteNarrative } from "./reportPrompt";

/**
 * Render environments (Render, most PaaS/serverless platforms) have no
 * reliable place to cache a full downloaded Chrome binary between build and
 * runtime — that mismatch is what produces "Could not find Chrome" in
 * production. @sparticuz/chromium ships a prebuilt Chromium binary inside
 * the npm package itself, so there's no download step and no cache-path
 * dependency at all.
 *
 * Locally, `puppeteer` (full package, devDependency only) is used instead so
 * development doesn't require installing serverless-Chromium — `npm install`
 * skips devDependencies when NODE_ENV=production, which Render sets, so the
 * heavy `puppeteer` package (and its own Chrome download) is never pulled in
 * on the server at all.
 */
async function launchBrowser(): Promise<Browser> {
  if (process.env.NODE_ENV === "production") {
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const puppeteer = require("puppeteer") as typeof import("puppeteer");
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }) as unknown as Browser;
}

export interface GeneratePdfOptions {
  payload: C1LitePayload;
  narrative: C1LiteNarrative;
  reportId: string;
  generatedDate: string;
}

/** Private storage directory for generated report PDFs (not statically served). */
export function getReportsDir(): string {
  return path.join(__dirname, "..", "..", "..", "storage", "reports");
}

/** Resolve the absolute path on disk for a report PDF given its stored file name. */
export function getReportPdfPath(fileName: string): string {
  return path.join(getReportsDir(), fileName);
}

/**
 * Renders the report to a PDF and returns it as an in-memory Buffer — the PDF
 * is no longer written to disk. usdreports.pdf_data (bytea) is the sole
 * source of truth for report downloads; pdf_storage_path only still matters
 * for pre-migration legacy rows.
 */
export async function generateReportPdf(options: GeneratePdfOptions): Promise<Buffer> {
  const { payload, narrative, reportId, generatedDate } = options;

  // 1. Render the React component tree to static HTML markup
  const element = React.createElement(ReportDocument, {
    payload,
    narrative,
    reportId,
    generatedDate,
  });
  const bodyHtml = ReactDOMServer.renderToStaticMarkup(element);

  // 2. Wrap it in a clean HTML document shell with proper print-specific resets
  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Decision Report - ${reportId}</title>
    <style>
      @page {
        size: A4;
        margin: 0;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        background-color: #FFFFFF;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      /* Clean scrollbar for preview */
      ::-webkit-scrollbar {
        width: 6px;
      }
      ::-webkit-scrollbar-thumb {
        background: #CBD5E1;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>
  `;

  // 3. Puppeteer generation — rendered straight into memory (no `path`
  // option), so nothing touches disk.
  console.log(`Starting Puppeteer PDF rendering for report ID ${reportId}...`);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();

    // Set viewport to match standard A4 screen resolution at 96 DPI
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2, // Retinal high resolution scaling
    });

    // Load content and wait for network/styles to settle
    await page.setContent(fullHtml, { waitUntil: "load" });

    // Print A4 PDF into a buffer
    const pdfUint8Array = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    const pdfBuffer = Buffer.from(pdfUint8Array);

    console.log(`PDF successfully generated in memory for report ID ${reportId} (${pdfBuffer.length} bytes)`);
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
