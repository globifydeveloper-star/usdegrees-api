import React from "react";
import Cover from "./Cover";
import AnalystNote from "./AnalystNote";
import ExecutiveSummary from "./ExecutiveSummary";
import StudentProfile from "./StudentProfile";
import CareerOutcomes from "./CareerOutcomes";
import Recommendation from "./Recommendation";
import CampusStudents from "./CampusStudents";
import Athletics from "./Athletics";
import TuitionCosts from "./TuitionCosts";
import SourcesMethodology from "./SourcesMethodology";
import Methodology from "./Methodology";
import type { C1LitePayload, C1LiteNarrative } from "../services/reportPrompt";

export interface ReportDocumentProps {
  payload: C1LitePayload;
  narrative: C1LiteNarrative;
  reportId: string;
  generatedDate: string;
  logoDataUri: string;
}

export default function ReportDocument({
  payload,
  narrative,
  reportId,
  generatedDate,
  logoDataUri,
}: ReportDocumentProps) {
  // Cover is page 1 (no chrome); the remaining pages share the same footer
  // numbering. Total includes every rendered page, Cover included.
  const totalPages = 11;
  const chrome = { reportId, generatedDate, totalPages };

  return (
    <div style={{ margin: 0, padding: 0, boxSizing: "border-box" }}>
      <Cover
        payload={payload}
        reportId={reportId}
        generatedDate={generatedDate}
        logoDataUri={logoDataUri}
      />
      <AnalystNote
        payload={payload}
        narrative={narrative}
        pageNumber={2}
        {...chrome}
      />
      <ExecutiveSummary
        payload={payload}
        narrative={narrative}
        pageNumber={3}
        {...chrome}
      />
      <StudentProfile
        payload={payload}
        narrative={narrative}
        pageNumber={4}
        {...chrome}
      />
      <CareerOutcomes
        payload={payload}
        narrative={narrative}
        pageNumber={5}
        {...chrome}
      />
      <Recommendation
        payload={payload}
        narrative={narrative}
        pageNumber={6}
        {...chrome}
      />
      <CampusStudents payload={payload} pageNumber={7} {...chrome} />
      <Athletics payload={payload} pageNumber={8} {...chrome} />
      <TuitionCosts payload={payload} pageNumber={9} {...chrome} />
      <SourcesMethodology payload={payload} pageNumber={10} {...chrome} />
      <Methodology payload={payload} pageNumber={11} {...chrome} />
    </div>
  );
}
