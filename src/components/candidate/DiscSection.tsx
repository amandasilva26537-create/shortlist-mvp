import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Pencil, Save } from "lucide-react";
import { generateDiscResult } from "@/lib/ai/ai.functions";
import { updateCandidateDisc } from "@/lib/db/candidates.functions";
import { toast } from "sonner";

const DISC_FACTORS = [
  { key: "D", label: "Dominância", color: "#dc2626" },
  { key: "I", label: "Influência", color: "#f59e0b" },
  { key: "S", label: "Estabilidade", color: "#16a34a" },
  { key: "C", label: "Conformidade", color: "#2563eb" },
] as const;

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-elevated p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">{title}</div>
        {action}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  );
}

function ClampText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 420;
  return (
    <div>
      <div className={`whitespace-pre-wrap text-sm ${!open && long ? "line-clamp-6" : ""}`}>{text}</div>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-xs font-medium text-primary hover:underline">
          {open ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  );
}

const linesToArray = (v: string) =>
  v
    .split("\n")
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

const arrayToLines = (v: any) => (Array.isArray(v) ? v.map((s: any) => String(s ?? "")).join("\n") : String(v ?? ""));

/** Bloco do perfil comportamental com edição e salvamento no banco. */
function EditableBlock({
  title,
  field,
  value,
  kind,
  readOnly,
  onSave,
}: {
  title: string;
  field: string;
  value: any;
  kind: "text" | "line" | "list";
  readOnly: boolean;
  onSave: (patch: Record<string, any>) => Promise<any>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const hasValue = kind === "list" ? Array.isArray(value) && value.length > 0 : !!String(value ?? "").trim();
  if (readOnly && !hasValue) return null;

  const start = () => {
    setDraft(kind === "list" ? arrayToLines(value) : String(value ?? ""));
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ [field]: kind === "list" ? linesToArray(draft) : draft.trim() });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <Card title={title}>
        <div className="space-y-2">
          {kind === "line" ? (
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} />
          ) : (
            <Textarea
              rows={kind === "list" ? 5 : 5}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={kind === "list" ? "Um item por linha" : ""}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={title}
      action={
        readOnly ? undefined : (
          <Button size="sm" variant="outline" onClick={start}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
        )
      }
    >
      {!hasValue ? (
        <span className="text-muted-foreground">Sem informações nesta seção.</span>
      ) : kind === "list" ? (
        <Bullets items={value as string[]} />
      ) : kind === "text" ? (
        <ClampText text={String(value)} />
      ) : (
        <div className="whitespace-pre-wrap text-sm">{String(value)}</div>
      )}
    </Card>
  );
}

interface DiscSectionProps {
  candidate: any;
  readOnly?: boolean;
}

export function DiscSection({ candidate, readOnly = false }: DiscSectionProps) {
  const qc = useQueryClient();
  const genFn = useServerFn(generateDiscResult);
  const saveFn = useServerFn(updateCandidateDisc);
  const d: any = candidate.disc_scores && typeof candidate.disc_scores === "object" ? candidate.disc_scores : {};
  const num = (v: any) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));
  const values = DISC_FACTORS.map((f) => ({ ...f, value: num(d[f.key]) }));
  const max = Math.max(100, ...values.map((v) => v.value ?? 0));
  const hasRaw = values.some((v) => v.value !== null) || !!candidate.disc_raw;

  const [editingScores, setEditingScores] = useState(false);
  const [scoreDraft, setScoreDraft] = useState<Record<string, string>>({});
  const [profileDraft, setProfileDraft] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["candidate", candidate.id] });
    qc.invalidateQueries({ queryKey: ["portal-candidate"] });
    qc.invalidateQueries({ queryKey: ["shortlist"] });
  };

  const patch = async (p: Record<string, any>) => {
    try {
      await saveFn({ data: { id: candidate.id, patch: p } });
      invalidate();
      toast.success("Alteração salva");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar");
      throw e;
    }
  };

  const gen = useMutation({
    mutationFn: () => genFn({ data: { candidate_id: candidate.id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Resultado DISC atualizado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar resultado DISC"),
  });

  if (!hasRaw && readOnly) {
    return (
      <Card title="Perfil comportamental (DISC)">
        <div className="text-sm text-muted-foreground">Nenhuma informação comportamental disponível.</div>
      </Card>
    );
  }

  const startScoreEdit = () => {
    setScoreDraft({
      D: String(d.D ?? ""),
      I: String(d.I ?? ""),
      S: String(d.S ?? ""),
      C: String(d.C ?? ""),
    });
    setProfileDraft(String(candidate.disc_profile ?? ""));
    setEditingScores(true);
  };

  const saveScores = async () => {
    await patch({
      D: num(scoreDraft.D),
      I: num(scoreDraft.I),
      S: num(scoreDraft.S),
      C: num(scoreDraft.C),
      disc_profile: profileDraft.trim(),
    });
    setEditingScores(false);
  };

  return (
    <div className="space-y-4">
      <Card
        title="Perfil comportamental (DISC)"
        action={
          readOnly || editingScores ? undefined : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={startScoreEdit}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
              </Button>
              <Button size="sm" onClick={() => gen.mutate()} disabled={gen.isPending}>
                <Sparkles className="mr-1.5 h-4 w-4" />
                {gen.isPending ? "Gerando…" : d.generated_at ? "Atualizar resultado" : "Gerar resultado DISC"}
              </Button>
            </div>
          )
        }
      >
        {editingScores ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Perfil predominante (texto)</div>
              <Input value={profileDraft} onChange={(e) => setProfileDraft(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {DISC_FACTORS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">{f.key} · {f.label}</div>
                  <Input
                    value={scoreDraft[f.key] ?? ""}
                    onChange={(e) => setScoreDraft((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditingScores(false)}>Cancelar</Button>
              <Button size="sm" onClick={saveScores}>
                <Save className="mr-1.5 h-3.5 w-3.5" /> Salvar
              </Button>
            </div>
          </div>
        ) : (
          <>
            {candidate.disc_profile && <div className="mb-4 text-lg font-semibold">{candidate.disc_profile}</div>}

            {/* Gráfico com os quatro fatores */}
            <div className="space-y-3">
              {values.map((f) => (
                <div key={f.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{f.key} · {f.label}</span>
                    <span className="text-muted-foreground">{f.value ?? "—"}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${((f.value ?? 0) / max) * 100}%`, background: f.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {!readOnly && candidate.disc_raw && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted-foreground">Resultado bruto</summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs">{candidate.disc_raw}</pre>
              </details>
            )}
          </>
        )}
      </Card>

      <EditableBlock title="Fator predominante" field="dominant" value={d.dominant} kind="line" readOnly={readOnly} onSave={patch} />
      <EditableBlock title="Fator secundário" field="secondary" value={d.secondary} kind="line" readOnly={readOnly} onSave={patch} />
      <EditableBlock title="Resumo do resultado" field="behavior_summary" value={d.behavior_summary} kind="text" readOnly={readOnly} onSave={patch} />
      <EditableBlock title="Pontos fortes" field="strengths" value={d.strengths} kind="list" readOnly={readOnly} onSave={patch} />
      <EditableBlock title="Pontos de atenção" field="attention_points" value={d.attention_points} kind="list" readOnly={readOnly} onSave={patch} />
      <EditableBlock title="Forma de comunicação" field="communication_style" value={d.communication_style} kind="text" readOnly={readOnly} onSave={patch} />
      <EditableBlock title="Estilo de trabalho" field="work_style" value={d.work_style} kind="text" readOnly={readOnly} onSave={patch} />
      <EditableBlock title="Estilo de liderança" field="leadership_style" value={d.leadership_style} kind="text" readOnly={readOnly} onSave={patch} />
      <EditableBlock title="Motivadores" field="motivators" value={d.motivators} kind="list" readOnly={readOnly} onSave={patch} />
      <EditableBlock title="Ambiente de melhor desempenho" field="ideal_environment" value={d.ideal_environment} kind="text" readOnly={readOnly} onSave={patch} />
      <EditableBlock title="Observações da recrutadora" field="recruiter_notes" value={d.recruiter_notes} kind="text" readOnly={readOnly} onSave={patch} />
    </div>
  );
}
