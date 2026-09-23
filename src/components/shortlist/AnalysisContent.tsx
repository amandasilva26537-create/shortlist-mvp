import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MatchRing } from "@/components/candidate/MatchRing";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Check,
  Minus,
  X,
  HelpCircle,
  RefreshCw,
  Pencil,
  Gauge,
  FileText,
  AlertTriangle,
  Target,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { upsertEvaluation } from "@/lib/db/shortlists.functions";
import { evaluateCandidateForJob } from "@/lib/ai/ai.functions";
import { buildCandidateSummary } from "@/lib/candidate-summary";
import { EditableBlock, linesToObjects, objectsToLines } from "@/components/candidate/EditableField";
import { toast } from "sonner";

const CHECKLIST_FIELDS = ["criterion", "status", "evidence"];
const STRENGTH_FIELDS = ["title", "evidence"];
const CASE_FIELDS: { key: string; label: string }[] = [
  { key: "context", label: "Contexto" },
  { key: "challenge", label: "Desafio" },
  { key: "action", label: "Ação" },
  { key: "result", label: "Resultado" },
  { key: "relation_to_job", label: "Relação com a vaga" },
];

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
  const scoresDirty =
    JSON.stringify(recruiterScores) !== JSON.stringify(evaluation?.recruiter_scores ?? {});

  const setScore = (key: string, raw: string) => {
    const value = raw.trim() === "" ? null : Math.max(0, Math.min(10, Math.round(Number(raw))));
    const nextScores = { ...recruiterScores, [key]: value };
    setDraft({ ...draft, recruiter_scores: nextScores });
  };

  const saveScores = () => {
    const nextOverall = computeOverallMatch(recruiterScores);
    save.mutate({ recruiter_scores: recruiterScores, overall_match: nextOverall });
  };

  const candidateSummary = buildCandidateSummary(candidate);

  return (
    <div className="space-y-7">
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

      {evaluation && !readOnly && (
        <section>
          <SectionTitle icon={Gauge}>Compatibilidade</SectionTitle>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <div className="flex shrink-0 flex-col items-center gap-2 md:w-[150px]">
                {match != null ? (
                  <MatchRing value={match} size={116} label="match" />
                ) : (
                  <div className="grid h-[116px] w-[116px] shrink-0 place-items-center rounded-full border border-dashed border-border text-center text-[11px] text-muted-foreground">
                    Avaliação
                    <br />
                    incompleta
                  </div>
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Match geral
                </span>
              </div>

              <div className="min-w-[240px] flex-1 space-y-4">
                <div className="text-xs text-muted-foreground print:hidden">
                  {!hasAnyScore
                    ? "Atribua uma nota de 0 a 10 para cada competência abaixo."
                    : "As notas vêm sugeridas pela análise. Ajuste o que quiser e salve."}
                </div>

                <div className="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
                  {Object.entries(DIMENSION_LABELS).map(([k, label]) => (
                    <ScoreRow
                      key={k}
                      label={label}
                      value={recruiterScores[k]}
                      onChange={(raw) => setScore(k, raw)}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border pt-3 print:hidden">
                  {scoresDirty && (
                    <span className="text-xs text-muted-foreground">Alterações não salvas</span>
                  )}
                  <Button size="sm" onClick={saveScores} disabled={save.isPending || !scoresDirty}>
                    {save.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Salvar avaliação
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <EditableSection
        title="Parecer do recrutador"
        icon={FileText}
        value={draft.recruiter_opinion}
        onChange={(v) => setDraft({ ...draft, recruiter_opinion: v })}
        onSave={() => persist("recruiter_opinion", draft.recruiter_opinion)}
        placeholder="Percepção consultiva do recrutador após análise, entrevista e validação."
        readOnly={readOnly}
        rows={9}
      />

      <section>
        <SectionTitle icon={AlertTriangle}>Riscos &amp; Trade-offs</SectionTitle>
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
        title="Fator motivacional para a vaga"
        icon={Target}
        value={draft.motivational_factor}
        onChange={(v) => setDraft({ ...draft, motivational_factor: v })}
        onSave={() => persist("motivational_factor", draft.motivational_factor)}
        placeholder="Por que o candidato demonstrou interesse por esta oportunidade específica."
        readOnly={readOnly}
        rows={4}
      />

      <section>
        <SectionTitle icon={ListChecks}>Critérios eliminatórios</SectionTitle>
        <EditableBlock
          title="Critérios avaliados"
          editable={!readOnly}
          isEmpty={!((evaluation?.eliminatory_checklist?.length ?? 0) > 0)}
          toDraft={() => objectsToLines(evaluation?.eliminatory_checklist ?? [], CHECKLIST_FIELDS)}
          fromDraft={(v) => linesToObjects(v, CHECKLIST_FIELDS)}
          hint="Um critério por linha: critério | situação (yes, partial, no, unknown) | evidência"
          onSave={(items) => persist("eliminatory_checklist", items)}
        >
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {(evaluation?.eliminatory_checklist ?? []).map((item: any, i: number) => (
              <ChecklistRow key={i} item={item} />
            ))}
          </div>
        </EditableBlock>
      </section>
    </div>
  );
}

function hydrate(ev: any) {
  return {
    job_specific_summary: ev?.job_specific_summary ?? "",
    recruiter_opinion: ev?.recruiter_opinion ?? "",
    motivational_factor: ev?.motivational_factor ?? "",
    risk_items: Array.isArray(ev?.risk_items) ? ev.risk_items : [],
    recruiter_scores: initialScores(ev),
  };
}

/** Notas de 0 a 10: usa as notas já salvas pela recrutadora e completa
 * as demais com a sugestão do sistema (dimension_scores em escala 0-100). */
function initialScores(ev: any): Record<string, number | null> {
  const saved: Record<string, any> =
    ev?.recruiter_scores && typeof ev.recruiter_scores === "object" ? ev.recruiter_scores : {};
  const suggested: Record<string, any> =
    ev?.dimension_scores && typeof ev.dimension_scores === "object" ? ev.dimension_scores : {};
  const out: Record<string, number | null> = {};
  for (const key of Object.keys(DIMENSION_LABELS)) {
    if (typeof saved[key] === "number") {
      out[key] = saved[key];
      continue;
    }
    const raw = suggested[key];
    if (typeof raw === "number" && !Number.isNaN(raw)) {
      const value = raw > 10 ? raw / 10 : raw;
      out[key] = Math.max(0, Math.min(10, Math.round(value)));
    } else if (key in saved) {
      out[key] = null;
    }
  }
  return out;
}


function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />}
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {children}
      </h3>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Nota de 0 a 10 com barra de progresso discreta (valores idênticos aos salvos). */
function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (raw: string) => void;
}) {
  const v = typeof value === "number" ? Math.max(0, Math.min(10, value)) : null;
  const color =
    v == null
      ? "var(--muted)"
      : v >= 8.5
        ? "var(--success)"
        : v >= 7
          ? "var(--primary)"
          : v >= 5
            ? "var(--warning)"
            : "var(--destructive)";
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums" style={{ color }}>
            {v ?? "–"}
          </span>
          <Input
            type="number"
            min={0}
            max={10}
            step={1}
            placeholder="–"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 w-14 text-center text-xs print:hidden"
          />
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${((v ?? 0) / 10) * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

function EditableSection({
  title,
  icon,
  value,
  onChange,
  onSave,
  placeholder,
  readOnly,
  rows = 4,
}: {
  title: string;
  icon?: any;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  placeholder?: string;
  readOnly?: boolean;
  rows?: number;
}) {
  return (
    <section>
      <SectionTitle icon={icon}>{title}</SectionTitle>
      {readOnly ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm">
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
  const cfg: Record<
    string,
    { icon: any; glyph?: string; bg: string; text: string; label: string }
  > = {
    yes: {
      icon: Check,
      bg: "bg-[color:var(--success)]/10",
      text: "text-[color:var(--success)]",
      label: "Atende",
    },
    partial: {
      icon: null,
      glyph: "◐",
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
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${s.bg} ${s.text}`}>
        {Icon ? (
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <span className="text-[13px] leading-none">{s.glyph}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{item.criterion}</div>
        {item.evidence && (
          <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.evidence}</div>
        )}
      </div>
      <span className={`shrink-0 text-[11px] font-semibold uppercase tracking-wide ${s.text}`}>
        {s.label}
      </span>
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
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((it, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="flex items-start gap-3 p-4">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--warning)]/15 text-[color:var(--warning)]">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Ponto de atenção
                </div>
                {readOnly ? (
                  <div className="text-[13px] leading-relaxed">{it.point}</div>
                ) : (
                  <Textarea
                    rows={2}
                    value={it.point ?? ""}
                    onChange={(e) => update(i, { point: e.target.value })}
                  />
                )}
              </div>
              {!readOnly && (
                <Button variant="ghost" size="sm" onClick={() => remove(i)} className="print:hidden">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="flex items-start gap-3 border-t border-border bg-muted/30 p-4">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--success)]/10 text-[color:var(--success)]">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Mitigação (validada na entrevista)
                </div>
                {readOnly ? (
                  <div className="text-[13px] leading-relaxed text-muted-foreground">
                    {it.mitigation}
                  </div>
                ) : (
                  <Textarea
                    rows={3}
                    value={it.mitigation ?? ""}
                    onChange={(e) => update(i, { mitigation: e.target.value })}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={add} className="print:hidden">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar risco
        </Button>
      )}
    </div>
  );
}

/** Case principal com edição campo a campo pela recrutadora. */
function MainCaseBlock({
  value,
  readOnly,
  onSave,
}: {
  value: any;
  readOnly?: boolean;
  onSave: (v: any) => void;
}) {
  const data = value && typeof value === "object" ? value : {};
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const isEmpty = !CASE_FIELDS.some((f) => String(data[f.key] ?? "").trim());

  if (readOnly && isEmpty) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Sem informações nesta seção.
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        {CASE_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {f.label}
            </div>
            <Textarea
              rows={3}
              value={draft[f.key] ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const next: Record<string, string> = {};
              CASE_FIELDS.forEach((f) => (next[f.key] = (draft[f.key] ?? "").trim()));
              onSave(next);
              setEditing(false);
            }}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" /> Salvar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-5 text-sm">
      {!readOnly && (
        <div className="flex justify-end print:hidden">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const d: Record<string, string> = {};
              CASE_FIELDS.forEach((f) => (d[f.key] = String(data[f.key] ?? "")));
              setDraft(d);
              setEditing(true);
            }}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
        </div>
      )}
      {isEmpty ? (
        <div className="text-muted-foreground">Sem informações nesta seção.</div>
      ) : (
        CASE_FIELDS.map((f) => (
          <CaseField
            key={f.key}
            label={f.label}
            value={data[f.key]}
            highlight={f.key === "relation_to_job"}
          />
        ))
      )}
    </div>
  );
}
