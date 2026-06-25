import React from "react";
import ReactDOMServer from "react-dom/server";
import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import ReportDocument from "../components/ReportDocument";
import { ReportCalculatedData } from "../utils/reportCalculations";
import { AiReportContent } from "./ai.service";

export interface GeneratePdfOptions {
  data: ReportCalculatedData;
  ai: AiReportContent;
  reportId: string;
  generatedDate: string;
}

export async function generateReportPdf(options: GeneratePdfOptions): Promise<string> {
  const { data, ai, reportId, generatedDate } = options;

  // 1. Render the React component tree to static HTML markup
  const element = React.createElement(ReportDocument, {
    data,
    ai,
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

  // 3. Define output paths
  const publicDir = path.join(__dirname, "..", "..", "..", "public");
  const reportsDir = path.join(publicDir, "reports");

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const fileName = `report-${reportId}.pdf`;
  const outputPath = path.join(reportsDir, fileName);

  // 4. Puppeteer generation
  console.log(`Starting Puppeteer PDF rendering for report ID ${reportId}...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

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

    // Print A4 PDF
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    console.log(`PDF successfully created at: ${outputPath}`);
    return fileName;
  } finally {
    await browser.close();
  }
}
