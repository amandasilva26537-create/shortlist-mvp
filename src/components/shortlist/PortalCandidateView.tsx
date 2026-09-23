import { useState } from "react";
import { DiscSection } from "@/components/candidate/DiscSection";
import { TestResultsSection } from "@/components/candidate/TestResultsSection";
import { ProfessionalProfileView } from "@/components/candidate/ProfessionalProfileView";
import { AnalysisContent } from "@/components/shortlist/AnalysisContent";
import { CandidateFlashcard } from "@/components/shortlist/CandidateFlashcard";
import {
  CandidateSectionMenu,
  type CandidateSection,
} from "@/components/shortlist/CandidateSectionMenu";

interface Props {
  candidate: any;
  evaluation: any | null;
  testResults?: any[];
  jobId: string;
  shortlistId: string;
}

/** Resumo do candidato + menu de três botões que abre o conteúdo detalhado na mesma tela. */
export function PortalCandidateView({
  candidate: c,
  evaluation: ev,
  testResults = [],
  jobId,
  shortlistId,
}: Props) {
  const [section, setSection] = useState<CandidateSection | null>("analysis");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <CandidateFlashcard
        candidate={c}
        evaluation={ev}
        readOnly
        jobId={jobId}
        shortlistId={shortlistId}
      />
      <CandidateSectionMenu
        value={section}
        onChange={setSection}
        hasTestResults={testResults.length > 0}
      />

      {section === "analysis" && (
        <div className="p-4 md:p-5">
          <AnalysisContent
            candidate={c}
            jobId={jobId}
            shortlistId={shortlistId}
            evaluation={ev}
            readOnly
          />
        </div>
      )}

      {section === "profile" && <div className="p-4 md:p-5"><ProfessionalProfileView candidate={c} /></div>}

      {section === "behavior" && <div className="p-4 md:p-5"><DiscSection candidate={c} readOnly /></div>}

      {section === "test_results" && (
        <div className="p-4 md:p-5">
          <TestResultsSection items={testResults} />
        </div>
      )}
    </div>
  );
}
