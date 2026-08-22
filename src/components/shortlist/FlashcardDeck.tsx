import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { CandidateFlashcard } from "./CandidateFlashcard";
import { AnalysisContent } from "./AnalysisContent";
import { CandidateSectionMenu, type CandidateSection } from "./CandidateSectionMenu";
import { ProfessionalProfileView } from "@/components/candidate/ProfessionalProfileView";
import { DiscSection } from "@/components/candidate/DiscSection";


interface Props {
  shortlistId: string;
  jobId: string;
  links: any[];
  evaluations: any[];
  initialCandidateId?: string;
  readOnly?: boolean;
  onReorder?: (orderedIds: string[]) => void;
  analysisBasePath?: string; // e.g. "/shortlists/{id}/analysis" or "/s/{token}/analysis"
  profileBasePath?: string;  // e.g. "/candidates" or "/s/{token}/c"
  returnTo?: string;
  actionsSlot?: (candidate: any, evaluation: any) => React.ReactNode;
  onCurrentChange?: (candidate: any) => void;
}

export function FlashcardDeck({
  shortlistId, jobId, links, evaluations, initialCandidateId, readOnly, onReorder,
  analysisBasePath, profileBasePath, returnTo, actionsSlot, onCurrentChange,
}: Props) {
  const navigate = useNavigate();

  const ordered = useMemo(() => {
    const byId = new Map(evaluations.map((e) => [e.candidate_id, e]));
    return [...links].sort((a, b) => {
      const ma = byId.get(a.candidate_id)?.overall_match ?? -1;
      const mb = byId.get(b.candidate_id)?.overall_match ?? -1;
      if (mb !== ma) return mb - ma;
      return (a.position ?? 0) - (b.position ?? 0);
    });
  }, [links, evaluations]);

  const [idx, setIdx] = useState(0);
  const [analysisCandidateId, setAnalysisCandidateId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialCandidateId) return;
    const i = ordered.findIndex((l) => l.candidate_id === initialCandidateId);
    if (i >= 0) setIdx(i);
  }, [initialCandidateId, ordered]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const currentId = ordered[Math.max(0, Math.min(idx, ordered.length - 1))]?.candidate_id;
  useEffect(() => {
    if (!currentId) return;
    const link = ordered.find((l) => l.candidate_id === currentId);
    if (link) onCurrentChange?.(link.candidates);
  }, [currentId, ordered, onCurrentChange]);

  if (ordered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Nenhum candidato nesta shortlist ainda.
      </div>
    );
  }

  const safeIdx = Math.max(0, Math.min(idx, ordered.length - 1));
  const current = ordered[safeIdx];
  const candidate = current.candidates;
  const evaluation = evaluations.find((e) => e.candidate_id === current.candidate_id) ?? null;

  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(ordered.length - 1, i + 1));

  const onDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -80) next();
    else if (info.offset.x > 80) prev();
  };

  const moveUp = () => {
    if (safeIdx === 0) return;
    const ids = ordered.map((o) => o.candidate_id);
    [ids[safeIdx - 1], ids[safeIdx]] = [ids[safeIdx], ids[safeIdx - 1]];
    onReorder?.(ids);
    setIdx(safeIdx - 1);
  };
  const moveDown = () => {
    if (safeIdx === ordered.length - 1) return;
    const ids = ordered.map((o) => o.candidate_id);
    [ids[safeIdx], ids[safeIdx + 1]] = [ids[safeIdx + 1], ids[safeIdx]];
    onReorder?.(ids);
    setIdx(safeIdx + 1);
  };

  const [section, setSection] = useState<CandidateSection | null>(null);


  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Candidato <b className="text-foreground">{safeIdx + 1}</b> de <b className="text-foreground">{ordered.length}</b>
        </div>
        <div className="flex items-center gap-1">
          {!readOnly && onReorder && (
            <>
              <Button variant="ghost" size="sm" onClick={moveUp} disabled={safeIdx === 0} title="Mover para cima">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={moveDown} disabled={safeIdx === ordered.length - 1} title="Mover para baixo">
                <ArrowDown className="h-4 w-4" />
              </Button>
              <div className="mx-1 h-5 w-px bg-border" />
            </>
          )}
          <Button variant="outline" size="sm" onClick={prev} disabled={safeIdx === 0}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={next} disabled={safeIdx === ordered.length - 1}>
            Próximo <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <button onClick={prev} disabled={safeIdx === 0}
          className="hidden lg:grid absolute -left-14 top-1/2 -translate-y-1/2 h-12 w-12 place-items-center rounded-full border border-border bg-card shadow-sm transition hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Anterior">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={next} disabled={safeIdx === ordered.length - 1}
          className="hidden lg:grid absolute -right-14 top-1/2 -translate-y-1/2 h-12 w-12 place-items-center rounded-full border border-border bg-card shadow-sm transition hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Próximo">
          <ChevronRight className="h-5 w-5" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.candidate_id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
          >
            <CandidateFlashcard
              candidate={candidate}
              evaluation={evaluation}
              readOnly={readOnly}
            />
            {actionsSlot && (
              <div className="mt-4">{actionsSlot(candidate, evaluation)}</div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          {ordered.map((o, i) => (
            <button
              key={o.candidate_id}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === safeIdx ? "w-8 bg-primary" : "w-1.5 bg-muted hover:bg-muted-foreground/40"}`}
              aria-label={`Ir para candidato ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Menu com os três botões — abre o conteúdo na mesma tela */}
      <div className="mt-4 space-y-4">
        <CandidateSectionMenu value={section} onChange={setSection} />

        {section === "analysis" && (
          <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
            <AnalysisContent
              candidate={candidate}
              jobId={jobId}
              shortlistId={shortlistId}
              evaluation={evaluation}
              readOnly={readOnly}
            />
          </div>
        )}

        {section === "profile" && <ProfessionalProfileView candidate={candidate} />}

        {section === "behavior" && <DiscSection candidate={candidate} readOnly={readOnly} />}
      </div>

    </div>
  );
}
