import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MatchRing } from "@/components/candidate/MatchRing";
import { CompetencyRadar } from "@/components/candidate/CompetencyRadar";
import { MatchBar } from "./MatchBar";
import { Sparkles, Loader2, Save, Plus, Trash2, Check, Minus, X, HelpCircle, Pencil } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { upsertEvaluation } from "@/lib/db/shortlists.functions";
import { evaluateCandidateForJob } from "@/lib/ai/ai.functions";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidate: any;
  jobId: string;
  shortlistId: string;
  evaluation: any | null;
  readOnly?: boolean;
}

const DIMENSION_LABELS: Record<string, string> = {
  hard_skills: "Hard Skills",
  soft_skills: "Soft Skills",
  experience: "Experiência",
  leadership: "Liderança",
  communication: "Comunicação",
  strategy: "Estratégia",
  execution: "Execução",
  cultural_fit: "Fit cultural",
  adaptability: "Potencial de adaptação",
};

export function AnalysisPanel({ open, onOpenChange, candidate, jobId, shortlistId, evaluation, readOnly }: Props) {
  const qc = useQueryClient();
  const evalFn = useServerFn(evaluateCandidateForJob);
  const saveFn = useServerFn(upsertEvaluation);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState<any>(() => hydrate(evaluation));

  // Re-hidrata quando muda de candidato
  const evalKey = evaluation?.id ?? candidate?.id;
  const [lastKey, setLastKey] = useState<any>(evalKey);
  if (lastKey !== evalKey) {
    setDraft(hydrate(evaluation));
    setLastKey(evalKey);
  }

  const generate = async () => {
    setBusy(true);
    try {
      await evalFn({ data: { candidate_id: candidate.id, job_id: jobId, shortlist_id: shortlistId } });
      await qc.invalidateQueries({ queryKey: ["shortlist-evaluations", shortlistId] });
      toast.success("Análise gerada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar");
    } finally {
      setBusy(false);
    }
  };

  const save = useMutation({
    mutationFn: (patch: any) => saveFn({ data: { candidate_id: candidate.id, job_id: jobId, shortlist_id: shortlistId, ...patch } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shortlist-evaluations", shortlistId] }); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  const persist = (field: string, value: any) => save.mutate({ [field]: value });

  const match = typeof evaluation?.overall_match === "number" ? evaluation.overall_match : null;
  const dims = evaluation?.dimension_scores ?? {};
  const radarObj = evaluation?.radar_scores ?? {};
  const radarSeries = [{
    name: candidate.full_name,
    color: "var(--primary)",
    data: Object.entries(radarObj).map(([k, v]) => ({ competency: k, value: Number(v) || 0 })),
  }];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto p-0">
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-card p-5">
          <SheetTitle className="flex items-center justify-between gap-3">
            <span className="truncate">Análise para a vaga</span>
            {!readOnly && (
              <Button size="sm" onClick={generate} disabled={busy}>
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                {evaluation ? "Recalcular com IA" : "Gerar análise com IA"}
              </Button>
            )}
          </SheetTitle>
          <div className="text-sm text-muted-foreground">{candidate.full_name} · {candidate.current_position || "—"}</div>
        </SheetHeader>

        <div className="p-5 space-y-6">
          {!evaluation && !busy && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Nenhuma análise gerada ainda. Clique em <b>Gerar análise com IA</b> para criar a compatibilidade específica desta vaga.
            </div>
          )}

          {/* 1. Compatibilidade */}
          {evaluation && (
            <section>
              <SectionTitle>1. Compatibilidade</SectionTitle>
              <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card p-5">
                {match != null && <MatchRing value={match} size={96} label="match" />}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[240px]">
                  {Object.entries(DIMENSION_LABELS).map(([k, label]) => (
                    <MatchBar key={k} label={label} value={Number(dims?.[k] ?? 0)} />
                  ))}
                </div>
              </div>
              {radarSeries[0].data.length > 0 && (
                <div className="mt-4 rounded-xl border border-border bg-card p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Competências avaliadas
                  </div>
                  <CompetencyRadar series={radarSeries} height={280} />
                </div>
              )}
            </section>
          )}

          {/* 2. Resumo executivo */}
          <EditableSection
            title="2. Resumo executivo para a vaga"
            value={draft.job_specific_summary}
            onChange={(v) => setDraft({ ...draft, job_specific_summary: v })}
            onSave={() => persist("job_specific_summary", draft.job_specific_summary)}
            placeholder="Resumo curto (até 4 linhas) específico desta vaga."
            readOnly={readOnly}
            rows={5}
          />

          {/* 3. Parecer do recrutador */}
          <EditableSection
            title="3. Parecer do recrutador"
            value={draft.recruiter_opinion}
            onChange={(v) => setDraft({ ...draft, recruiter_opinion: v })}
            onSave={() => persist("recruiter_opinion", draft.recruiter_opinion)}
            placeholder="Percepção consultiva do recrutador após análise, entrevista e validação."
            readOnly={readOnly}
            rows={9}
          />

          {/* 4. Principal case */}
          {evaluation?.main_case && (
            <section>
              <SectionTitle>4. Principal case relacionado à vaga</SectionTitle>
              <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm">
                <CaseField label="Contexto" value={evaluation.main_case.context} />
                <CaseField label="Desafio" value={evaluation.main_case.challenge} />
                <CaseField label="Ação" value={evaluation.main_case.action} />
                <CaseField label="Resultado" value={evaluation.main_case.result} />
                <CaseField label="Relação com a vaga" value={evaluation.main_case.relation_to_job} highlight />
              </div>
            </section>
          )}

          {/* 5. Riscos & Trade-offs */}
          <section>
            <SectionTitle>5. Riscos &amp; Trade-offs</SectionTitle>
            <RiskEditor
              items={draft.risk_items ?? []}
              onChange={(items) => { setDraft({ ...draft, risk_items: items }); persist("risk_items", items); }}
              readOnly={readOnly}
            />
          </section>

          {/* 6. Fator motivacional */}
          <EditableSection
            title="6. Fator motivacional para a vaga"
            value={draft.motivational_factor}
            onChange={(v) => setDraft({ ...draft, motivational_factor: v })}
            onSave={() => persist("motivational_factor", draft.motivational_factor)}
            placeholder="Por que o candidato demonstrou interesse por esta oportunidade específica."
            readOnly={readOnly}
            rows={4}
          />

          {/* 7. Critérios eliminatórios */}
          {(evaluation?.eliminatory_checklist?.length ?? 0) > 0 && (
            <section>
              <SectionTitle>7. Critérios eliminatórios</SectionTitle>
              <div className="space-y-2">
                {(evaluation.eliminatory_checklist as any[]).map((item, i) => (
                  <ChecklistRow key={i} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* 8. Pontos fortes */}
          {(evaluation?.top_strengths?.length ?? 0) > 0 && (
            <section>
              <SectionTitle>8. Principais pontos fortes para esta vaga</SectionTitle>
              <div className="space-y-2">
                {(evaluation.top_strengths as any[]).map((s, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3">
                    <div className="text-sm font-semibold">{s.title}</div>
                    {s.evidence && <div className="mt-1 text-xs text-muted-foreground">{s.evidence}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function hydrate(ev: any) {
  return {
    job_specific_summary: ev?.job_specific_summary ?? "",
    recruiter_opinion: ev?.recruiter_opinion ?? "",
    motivational_factor: ev?.motivational_factor ?? "",
    risk_items: Array.isArray(ev?.risk_items) ? ev.risk_items : [],
  };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{children}</h3>;
}

function EditableSection({
  title, value, onChange, onSave, placeholder, readOnly, rows = 4,
}: {
  title: string; value: string; onChange: (v: string) => void; onSave: () => void;
  placeholder?: string; readOnly?: boolean; rows?: number;
}) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      {readOnly ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm whitespace-pre-wrap">
          {value || <span className="text-muted-foreground">—</span>}
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea rows={rows} placeholder={placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={onSave}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> Salvar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function CaseField({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div className={highlight ? "rounded-lg border border-primary/30 bg-primary-soft/40 p-3" : ""}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function ChecklistRow({ item }: { item: any }) {
  const cfg: Record<string, { icon: any; bg: string; text: string; label: string }> = {
    yes: { icon: Check, bg: "bg-[color:var(--success)]/10", text: "text-[color:var(--success)]", label: "Atende" },
    partial: { icon: Minus, bg: "bg-[color:var(--warning)]/15", text: "text-[color:var(--warning)]", label: "Parcial" },
    no: { icon: X, bg: "bg-destructive/10", text: "text-destructive", label: "Não atende" },
    unknown: { icon: HelpCircle, bg: "bg-muted", text: "text-muted-foreground", label: "Não avaliado" },
  };
  const s = cfg[item.status] ?? cfg.unknown;
  const Icon = s.icon;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${s.bg} ${s.text}`}>
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{item.criterion}</div>
        {item.evidence && <div className="mt-0.5 text-xs text-muted-foreground">{item.evidence}</div>}
      </div>
      <span className={`shrink-0 text-xs font-semibold ${s.text}`}>{s.label}</span>
    </div>
  );
}

function RiskEditor({ items, onChange, readOnly }: { items: any[]; onChange: (items: any[]) => void; readOnly?: boolean }) {
  const update = (i: number, patch: any) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { point: "", mitigation: "" }]);

  if (items.length === 0 && readOnly) {
    return <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Sem riscos apontados.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ponto de atenção</div>
            {!readOnly && (
              <Button variant="ghost" size="sm" onClick={() => remove(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {readOnly ? (
            <div className="text-sm">{it.point}</div>
          ) : (
            <Textarea rows={2} value={it.point ?? ""} onChange={(e) => update(i, { point: e.target.value })} />
          )}
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary mt-2">Mitigação (validada na entrevista)</div>
          {readOnly ? (
            <div className="text-sm text-muted-foreground">{it.mitigation}</div>
          ) : (
            <Textarea rows={3} value={it.mitigation ?? ""} onChange={(e) => update(i, { mitigation: e.target.value })} />
          )}
        </div>
      ))}
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar risco
        </Button>
      )}
    </div>
  );
}
