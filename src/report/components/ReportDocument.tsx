import React from "react";
import Cover from "./Cover";
import AnalystNote from "./AnalystNote";
import ExecutiveSummary from "./ExecutiveSummary";
import StudentProfile from "./StudentProfile";
import CareerOutcomes from "./CareerOutcomes";
import Recommendation from "./Recommendation";
import SourcesMethodology from "./SourcesMethodology";
import Methodology from "./Methodology";
import { ReportCalculatedData } from "../utils/reportCalculations";
import { AiReportContent } from "../services/ai.service";

export interface ReportDocumentProps {
  data: ReportCalculatedData;
  ai: AiReportContent;
  reportId: string;
  generatedDate: string;
}

export default function ReportDocument({
  data,
  ai,
  reportId,
  generatedDate,
}: ReportDocumentProps) {
  // Cover is page 1 (no chrome); the remaining pages share the same footer
  // numbering. Total includes every rendered page, Cover included.
  const totalPages = 8;
  const chrome = { reportId, generatedDate, totalPages };

  return (
    <div style={{ margin: 0, padding: 0, boxSizing: "border-box" }}>
      <Cover data={data} reportId={reportId} generatedDate={generatedDate} />
      <AnalystNote data={data} ai={ai} pageNumber={2} {...chrome} />
      <ExecutiveSummary data={data} ai={ai} pageNumber={3} {...chrome} />
      <StudentProfile data={data} pageNumber={4} {...chrome} />
      <CareerOutcomes data={data} ai={ai} pageNumber={5} {...chrome} />
      <Recommendation data={data} ai={ai} pageNumber={6} {...chrome} />
      <SourcesMethodology data={data} pageNumber={7} {...chrome} />
      <Methodology data={data} pageNumber={8} {...chrome} />
    </div>
  );
}
