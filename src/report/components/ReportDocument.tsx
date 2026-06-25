import React from "react";
import Cover from "./Cover";
import ExecutiveSummary from "./ExecutiveSummary";
import StudentProfile from "./StudentProfile";
import CareerOutcomes from "./CareerOutcomes";
import Recommendation from "./Recommendation";
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
  return (
    <div style={{ margin: 0, padding: 0, boxSizing: "border-box" }}>
      <Cover data={data} reportId={reportId} generatedDate={generatedDate} />
      <ExecutiveSummary data={data} ai={ai} />
      <StudentProfile data={data} />
      <CareerOutcomes data={data} ai={ai} />
      <Recommendation data={data} ai={ai} />
      <Methodology data={data} generatedDate={generatedDate} />
    </div>
  );
}
