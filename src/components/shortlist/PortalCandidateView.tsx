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
  const [section, setSection] = useState<CandidateSection | null>(null);

  return (
    <div className="space-y-4">
      {/* Mesmo quadro compacto usado pelo recrutador (somente leitura para o cliente) */}
      <CandidateFlashcard
        candidate={c}
        evaluation={ev}
        readOnly
        jobId={jobId}
        shortlistId={shortlistId}
      />


      {/* Menu com os botões */}
      <CandidateSectionMenu
        value={section}
        onChange={setSection}
        hasTestResults={testResults.length > 0}
      />

      {/* Conteúdo selecionado (um por vez, na mesma tela) */}
      {section === "analysis" && (
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <AnalysisContent
            candidate={c}
            jobId={jobId}
            shortlistId={shortlistId}
            evaluation={ev}
            readOnly
          />
        </div>
      )}

      {section === "profile" && <ProfessionalProfileView candidate={c} />}

      {section === "behavior" && <DiscSection candidate={c} readOnly />}

      {section === "test_results" && (
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <TestResultsSection items={testResults} />
        </div>
      )}

      {!section && (
        <p className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
          Escolha uma das opções acima para ver a análise, o perfil completo ou o perfil
          comportamental.
        </p>
      )}
    </div>
  );
}

function Chip({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}
