import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MatchRing } from "@/components/candidate/MatchRing";
import { MatchBar } from "./MatchBar";
import { Loader2, Save, Plus, Trash2, Check, Minus, X, HelpCircle, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { upsertEvaluation } from "@/lib/db/shortlists.functions";
import { evaluateCandidateForJob } from "@/lib/ai/ai.functions";
import { buildCandidateSummary } from "@/lib/candidate-summary";
import { toast } from "sonner";

interface Props {
  candidate: any;
  jobId: string;
  shortlistId: string;
  evaluation: any | null;
  readOnly?: boolean;
}

/**
 * Competências/requisitos avaliados pela recrutadora (nota de 0 a 10).
 * "Fit cultural" foi removido de propósito: não aparece no gráfico, não
 * recebe nota e não entra no cálculo de compatibilidade.
 */
const DIMENSION_LABELS: Record<string, string> = {
  hard_skills: "Hard Skills",
  soft_skills: "Soft Skills",
  experience: "Experiência",
  leadership: "Liderança",
  communication: "Comunicação",
  strategy: "Estratégia",
  execution: "Execução",
  adaptability: "Potencial de adaptação",
};

/** Compatibilidade = soma das notas ÷ quantidade de competências avaliadas, em escala 0-100.
 * Campos ainda não preenchidos (null/undefined) não entram na conta. */
function computeOverallMatch(scores: Record<string, number | null | undefined>): number | null {
  const values = Object.values(scores ?? {}).filter(
    (v): v is number => typeof v === "number" && !Number.isNaN(v),
  );
  if (values.length === 0) return null;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.round(Math.max(0, Math.min(10, avg)) * 10);
}

export function AnalysisContent({ candidate, jobId, shortlistId, evaluation, readOnly }: Props) {
  const qc = useQueryClient();
  const evalFn = useServerFn(evaluateCandidateForJob);
  const saveFn = useServerFn(upsertEvaluation);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState<any>(() => hydrate(evaluation));
  const evalKey = evaluation?.id ?? candidate?.id;
  const [lastKey, setLastKey] = useState<any>(evalKey);
  if (lastKey !== evalKey) {
    setDraft(hydrate(evaluation));
    setLastKey(evalKey);
  }

  const generate = async () => {
    setBusy(true);
    try {
      await evalFn({
        data: { candidate_id: candidate.id, job_id: jobId, shortlist_id: shortlistId },
      });
      await qc.invalidateQueries({ queryKey: ["shortlist-evaluations", shortlistId] });
      toast.success("Análise atualizada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar");
    } finally {
      setBusy(false);
    }
  };

  const save = useMutation({
    mutationFn: (patch: any) =>
      saveFn({
        data: { candidate_id: candidate.id, job_id: jobId, shortlist_id: shortlistId, ...patch },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shortlist-evaluations", shortlistId] });
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const persist = (field: string, value: any) => save.mutate({ [field]: value });

  const recruiterScores: Record<string, number | null> = draft.recruiter_scores ?? {};
  const match = computeOverallMatch(recruiterScores);
  const hasAnyScore = Object.values(recruiterScores).some((v) => typeof v === "number");

  const setScore = (key: string, raw: string) => {
    const value = raw.trim() === "" ? null : Math.max(0, Math.min(10, Math.round(Number(raw))));
    const nextScores = { ...recruiterScores, [key]: value };
    const nextDraft = { ...draft, recruiter_scores: nextScores };
    setDraft(nextDraft);
    const nextOverall = computeOverallMatch(nextScores);
    save.mutate({ recruiter_scores: nextScores, overall_match: nextOverall });
  };

  const candidateSummary = buildCandidateSummary(candidate);

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="flex justify-end print:hidden">
          <Button size="sm" variant="outline" onClick={generate} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            {evaluation ? "Recalcular análise" : "Gerar análise"}
          </Button>
        </div>
      )}

      {!evaluation && !busy && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          Análise ainda não gerada.{" "}
          {readOnly ? (
            "Aguarde o recrutador finalizar a análise."
          ) : (
            <>
              Clique em <b>Gerar análise</b> para calcular a compatibilidade específica desta vaga.
            </>
          )}
        </div>
      )}

      {evaluation && (
        <section>
          <SectionTitle>1. Compatibilidade</SectionTitle>
          <div className="flex flex-wrap items-start gap-6 rounded-xl border border-border bg-card p-5">
            {match != null ? (
              <MatchRing value={match} size={112} label="match" />
            ) : (
              <div className="grid h-[112px] w-[112px] shrink-0 place-items-center rounded-full border border-dashed border-border text-center text-[11px] text-muted-foreground">
                Avaliação
                <br />
                incompleta
              </div>
            )}
            <div className="flex-1 min-w-[240px] space-y-3">
              {!hasAnyScore && (
                <div className="text-xs text-muted-foreground">
                  {readOnly
                    ? "A recrutadora ainda não avaliou as competências desta vaga."
                    : "Atribua uma nota de 0 a 10 para cada competência abaixo."}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {Object.entries(DIMENSION_LABELS).map(([k, label]) => {
                  const score = recruiterScores[k];
                  if (readOnly) {
                    return score == null ? (
                      <div key={k}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-medium text-foreground">{label}</span>
                          <span className="text-muted-foreground">Não avaliado</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted" />
                      </div>
                    ) : (
                      <MatchBar
                        key={k}
                        label={label}
                        value={score * 10}
                        hint={`Nota: ${score}/10`}
                      />
                    );
                  }
                  return (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={1}
                        placeholder="–"
                        value={score ?? ""}
                        onChange={(e) => setScore(k, e.target.value)}
                        className="h-8 w-16 text-center print:hidden"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionTitle>2. Resumo do candidato</SectionTitle>
        <div className="rounded-xl border border-border bg-card p-4 text-sm whitespace-pre-wrap">
          {candidateSummary || (
            <span className="text-muted-foreground">
              Sem informações suficientes no cadastro para gerar o resumo.
            </span>
          )}
        </div>
      </section>

      <EditableSection
        title="3. Parecer do recrutador"
        value={draft.recruiter_opinion}
        onChange={(v) => setDraft({ ...draft, recruiter_opinion: v })}
        onSave={() => persist("recruiter_opinion", draft.recruiter_opinion)}
        placeholder="Percepção consultiva do recrutador após análise, entrevista e validação."
        readOnly={readOnly}
        rows={9}
      />

      {evaluation?.main_case && (
        <section>
          <SectionTitle>4. Principal case relacionado à vaga</SectionTitle>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm">
            <CaseField label="Contexto" value={evaluation.main_case.context} />
            <CaseField label="Desafio" value={evaluation.main_case.challenge} />
            <CaseField label="Ação" value={evaluation.main_case.action} />
            <CaseField label="Resultado" value={evaluation.main_case.result} />
            <CaseField
              label="Relação com a vaga"
              value={evaluation.main_case.relation_to_job}
              highlight
            />
          </div>
        </section>
      )}

      <section>
        <SectionTitle>5. Riscos &amp; Trade-offs</SectionTitle>
        <RiskEditor
          items={draft.risk_items ?? []}
          onChange={(items) => {
            setDraft({ ...draft, risk_items: items });
            persist("risk_items", items);
          }}
          readOnly={readOnly}
        />
      </section>

      <EditableSection
        title="6. Fator motivacional para a vaga"
        value={draft.motivational_factor}
        onChange={(v) => setDraft({ ...draft, motivational_factor: v })}
        onSave={() => persist("motivational_factor", draft.motivational_factor)}
        placeholder="Por que o candidato demonstrou interesse por esta oportunidade específica."
        readOnly={readOnly}
        rows={4}
      />

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

      {(evaluation?.top_strengths?.length ?? 0) > 0 && (
        <section>
          <SectionTitle>8. Principais pontos fortes para esta vaga</SectionTitle>
          <div className="space-y-2">
            {(evaluation.top_strengths as any[]).map((s, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3">
                <div className="text-sm font-semibold">{s.title}</div>
                {s.evidence && (
                  <div className="mt-1 text-xs text-muted-foreground">{s.evidence}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function hydrate(ev: any) {
  return {
    job_specific_summary: ev?.job_specific_summary ?? "",
    recruiter_opinion: ev?.recruiter_opinion ?? "",
    motivational_factor: ev?.motivational_factor ?? "",
    risk_items: Array.isArray(ev?.risk_items) ? ev.risk_items : [],
    recruiter_scores:
      ev?.recruiter_scores && typeof ev.recruiter_scores === "object" ? ev.recruiter_scores : {},
  };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function EditableSection({
  title,
  value,
  onChange,
  onSave,
  placeholder,
  readOnly,
  rows = 4,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  placeholder?: string;
  readOnly?: boolean;
  rows?: number;
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
          <Textarea
            rows={rows}
            placeholder={placeholder}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="flex justify-end print:hidden">
            <Button size="sm" variant="outline" onClick={onSave}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> Salvar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function CaseField({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={highlight ? "rounded-lg border border-primary/30 bg-primary-soft/40 p-3" : ""}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function ChecklistRow({ item }: { item: any }) {
  const cfg: Record<string, { icon: any; bg: string; text: string; label: string }> = {
    yes: {
      icon: Check,
      bg: "bg-[color:var(--success)]/10",
      text: "text-[color:var(--success)]",
      label: "Atende",
    },
    partial: {
      icon: Minus,
      bg: "bg-[color:var(--warning)]/15",
      text: "text-[color:var(--warning)]",
      label: "Parcial",
    },
    no: { icon: X, bg: "bg-destructive/10", text: "text-destructive", label: "Não atende" },
    unknown: {
      icon: HelpCircle,
      bg: "bg-muted",
      text: "text-muted-foreground",
      label: "Não avaliado",
    },
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
        {item.evidence && (
          <div className="mt-0.5 text-xs text-muted-foreground">{item.evidence}</div>
        )}
      </div>
      <span className={`shrink-0 text-xs font-semibold ${s.text}`}>{s.label}</span>
    </div>
  );
}

function RiskEditor({
  items,
  onChange,
  readOnly,
}: {
  items: any[];
  onChange: (items: any[]) => void;
  readOnly?: boolean;
}) {
  const update = (i: number, patch: any) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { point: "", mitigation: "" }]);

  if (items.length === 0 && readOnly) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Sem riscos apontados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ponto de atenção
            </div>
            {!readOnly && (
              <Button variant="ghost" size="sm" onClick={() => remove(i)} className="print:hidden">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {readOnly ? (
            <div className="text-sm">{it.point}</div>
          ) : (
            <Textarea
              rows={2}
              value={it.point ?? ""}
              onChange={(e) => update(i, { point: e.target.value })}
            />
          )}
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary mt-2">
            Mitigação (validada na entrevista)
          </div>
          {readOnly ? (
            <div className="text-sm text-muted-foreground">{it.mitigation}</div>
          ) : (
            <Textarea
              rows={3}
              value={it.mitigation ?? ""}
              onChange={(e) => update(i, { mitigation: e.target.value })}
            />
          )}
        </div>
      ))}
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={add} className="print:hidden">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar risco
        </Button>
      )}
    </div>
  );
}
