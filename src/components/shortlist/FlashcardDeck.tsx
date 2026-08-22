import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, User } from "lucide-react";
import { CandidateFlashcard } from "./CandidateFlashcard";
import { AnalysisContent } from "./AnalysisContent";
import { useNavigate } from "@tanstack/react-router";

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

  const openAnalysis = () => {
    setAnalysisCandidateId(candidate.id);
  };

  const openProfile = () => {
    if (profileBasePath) {
      navigate({ to: `${profileBasePath}/${candidate.id}` as any });
    } else {
      navigate({
        to: "/candidates/$candidateId",
        params: { candidateId: candidate.id },
        search: { returnTo: returnTo ?? `/shortlists/${shortlistId}`, cursor: candidate.id } as any,
      });
    }
  };

  const analysisLink = analysisCandidateId
    ? ordered.find((l) => l.candidate_id === analysisCandidateId)
    : null;
  const analysisCandidate = analysisLink?.candidates ?? null;
  const analysisEvaluation = analysisCandidateId
    ? evaluations.find((e) => e.candidate_id === analysisCandidateId) ?? null
    : null;
  const initials = (analysisCandidate?.full_name ?? "")
    .split(" ")
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase();

  const openAnalysisProfile = () => {
    if (!analysisCandidate) return;
    if (profileBasePath) {
      navigate({ to: `${profileBasePath}/${analysisCandidate.id}` as any });
    } else {
      navigate({
        to: "/candidates/$candidateId",
        params: { candidateId: analysisCandidate.id },
        search: { returnTo: returnTo ?? `/shortlists/${shortlistId}`, cursor: analysisCandidate.id } as any,
      });
    }
  };

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
              onOpenAnalysis={openAnalysis}
              onOpenProfile={openProfile}
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

      <Sheet open={!!analysisCandidate} onOpenChange={(open) => !open && setAnalysisCandidateId(null)}>
        <SheetContent
          side="right"
          className="left-0 right-0 w-auto translate-x-0 overflow-y-auto p-0 duration-0 data-[state=closed]:translate-x-0 data-[state=open]:translate-x-0 sm:left-auto sm:w-full sm:max-w-3xl"
        >
          {analysisCandidate && (
            <div className="min-h-full bg-background">
              <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4 backdrop-blur print:hidden">
                <SheetHeader className="pr-10 text-left">
                  <SheetTitle>Análise do candidato</SheetTitle>
                  <SheetDescription>{analysisCandidate.full_name}</SheetDescription>
                </SheetHeader>
              </div>

              <div className="px-5 py-6 md:px-8">
                <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    {analysisCandidate.photo_url ? (
                      <img
                        src={analysisCandidate.photo_url}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
                      />
                    ) : (
                      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary-soft text-xl font-semibold text-primary">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-widest text-primary">Análise da vaga</div>
                      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{analysisCandidate.full_name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {analysisCandidate.headline || analysisCandidate.current_position || "—"}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={openAnalysisProfile} className="shrink-0 print:hidden">
                    <User className="mr-1.5 h-4 w-4" /> Ver perfil completo
                  </Button>
                </div>

                <AnalysisContent
                  candidate={analysisCandidate}
                  jobId={jobId}
                  shortlistId={shortlistId}
                  evaluation={analysisEvaluation}
                  readOnly={readOnly}
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
