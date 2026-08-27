import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

const YES_NO = /^(sim|não|nao|n\/a|na|validado|true|false)$/i;

/** Remove respostas do tipo "Sim"/"Não" e prefixos como "Validado:". */
export function cleanValue(v: any): string {
  const s = String(v ?? "").trim().replace(/^validado\s*:\s*/i, "").trim();
  if (!s || YES_NO.test(s)) return "";
  return s;
}

const LEVELS = ["Básico", "Intermediário", "Avançado", "Nativo"];

/** Normaliza o nível do idioma para Básico / Intermediário / Avançado / Nativo. */
export function normalizeLanguageLevel(v: any): string {
  const s = cleanValue(v).toLowerCase();
  if (!s) return "";
  if (/nativ|matern|fluent|bilíng|biling/.test(s)) return /fluent|bilíng|biling/.test(s) && !/nativ|matern/.test(s) ? "Avançado" : "Nativo";
  if (/avan|advanc|c1|c2|profic/.test(s)) return "Avançado";
  if (/inter|b1|b2|medi/.test(s)) return "Intermediário";
  if (/bás|bas|basic|a1|a2|inici/.test(s)) return "Básico";
  const found = LEVELS.find((l) => l.toLowerCase() === s);
  return found ?? "";
}

export function LanguageList({ items }: { items: any[] }) {
  const rows = (items ?? [])
    .map((e: any) => ({ language: cleanValue(e?.language ?? e?.name), level: normalizeLanguageLevel(e?.level) }))
    .filter((r) => r.language);
  if (rows.length === 0) return null;
  return (
    <div className="space-y-1">
      {rows.map((r, i) => (
        <div key={i} className="text-sm">
          {r.language}
          {r.level && <span className="text-muted-foreground"> | {r.level}</span>}
        </div>
      ))}
    </div>
  );
}

export function SkillTags({ items }: { items: any[] }) {
  const list = (items ?? []).map((i: any) => cleanValue(typeof i === "string" ? i : i?.name)).filter(Boolean).slice(0, 15);
  if (list.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((t, i) => (
        <Badge key={i} variant="secondary" className="rounded-md px-2.5 py-1 text-xs font-normal">{t}</Badge>
      ))}
    </div>
  );
}

/** Reúne responsabilidades, entregas e resultados em bullets únicos, respeitando o limite. */
export function experienceBullets(exp: any, max: number): string[] {
  const raw = [
    ...(Array.isArray(exp?.responsibilities) ? exp.responsibilities : []),
    ...(Array.isArray(exp?.deliveries) ? exp.deliveries : []),
    ...(Array.isArray(exp?.results) ? exp.results : []),
  ]
    .map((s: any) => cleanValue(s))
    .filter((s) => s.length > 0);
  const seen = new Set<string>();
  const unique = raw.filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const withPeriod = unique.map((s) => (/[.!?]$/.test(s) ? s : `${s}.`));
  if (withPeriod.length <= max) return withPeriod;
  // Agrupa o excedente no último bullet para não perder informação.
  const head = withPeriod.slice(0, max - 1);
  const tail = withPeriod.slice(max - 1).join("; ");
  return [...head, tail];
}

export function ExperienceItem({
  exp,
  defaultOpen,
  compact,
  editable,
  onSave,
}: {
  exp: any;
  defaultOpen?: boolean;
  compact?: boolean;
  editable?: boolean;
  onSave?: (next: any) => Promise<any> | any;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [editing, setEditing] = useState(false);
  const bullets = experienceBullets(exp, compact ? 3 : 6);
  const meta = compact
    ? []
    : [exp.segment, exp.location, exp.work_model].map(cleanValue).filter(Boolean);
  const period = experiencePeriod(exp);
  const duration = experienceDuration(exp);

  if (editing) {
    return (
      <ExperienceEditor
        exp={exp}
        onCancel={() => setEditing(false)}
        onSave={async (next) => {
          await onSave?.(next);
          setEditing(false);
          setOpen(true);
        }}
      />
    );
  }

  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <div className="font-semibold">{[cleanValue(exp.role), cleanValue(exp.company)].filter(Boolean).join(" — ")}</div>
            {meta.length > 0 && <div className="text-xs text-muted-foreground">{meta.join(" · ")}</div>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {period}
              {duration ? ` (${duration})` : ""}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </button>
        {editable && onSave && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
        )}
      </div>
      {open && (
        <div className="mt-3 border-t border-border pt-3">
          {cleanValue(exp.scope) && <div className="text-sm">{cleanValue(exp.scope)}</div>}
          {bullets.length > 0 && (
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
              {bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
          {!compact && cleanValue(exp.team_size) && (
            <div className="mt-2 text-xs text-muted-foreground">Equipe: {cleanValue(exp.team_size)}</div>
          )}
        </div>
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

function ExperienceEditor({
  exp,
  onCancel,
  onSave,
}: {
  exp: any;
  onCancel: () => void;
  onSave: (next: any) => Promise<void> | void;
}) {
  const [form, setForm] = useState({
    role: String(exp.role ?? ""),
    company: String(exp.company ?? ""),
    segment: String(exp.segment ?? ""),
    location: String(exp.location ?? ""),
    work_model: String(exp.work_model ?? ""),
    start: String(exp.start ?? ""),
    end: isCurrentExperience(exp) ? "" : String(exp.end ?? ""),
    current: isCurrentExperience(exp),
    team_size: String(exp.team_size ?? ""),
    scope: String(exp.scope ?? ""),
    responsibilities: arrayToLines(exp.responsibilities),
    deliveries: arrayToLines(exp.deliveries),
    results: arrayToLines(exp.results),
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const preview = experienceDuration({ start: form.start, end: form.end, current: form.current });

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        role: form.role,
        company: form.company,
        segment: form.segment,
        location: form.location,
        work_model: form.work_model,
        start: form.start,
        end: form.current ? "Atual" : form.end,
        current: form.current,
        team_size: form.team_size,
        scope: form.scope,
        responsibilities: linesToArray(form.responsibilities),
        deliveries: linesToArray(form.deliveries),
        results: linesToArray(form.results),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-elevated space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cargo"><Input value={form.role} onChange={(e) => set("role", e.target.value)} /></Field>
        <Field label="Empresa"><Input value={form.company} onChange={(e) => set("company", e.target.value)} /></Field>
        <Field label="Segmento da empresa"><Input value={form.segment} onChange={(e) => set("segment", e.target.value)} /></Field>
        <Field label="Localização"><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Modelo de trabalho"><Input value={form.work_model} onChange={(e) => set("work_model", e.target.value)} /></Field>
        <Field label="Tamanho da equipe"><Input value={form.team_size} onChange={(e) => set("team_size", e.target.value)} /></Field>
        <Field label="Data de entrada (ex: março de 2022 ou 03/2022)">
          <Input value={form.start} onChange={(e) => set("start", e.target.value)} placeholder="março de 2022" />
        </Field>
        <Field label="Data de saída">
          <Input
            value={form.end}
            onChange={(e) => set("end", e.target.value)}
            placeholder="agosto de 2024"
            disabled={form.current}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.current}
          onChange={(e) => set("current", e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        Emprego atual
      </label>
      {preview && <div className="text-xs text-muted-foreground">Tempo nesta empresa: {preview}</div>}
      <Field label="Descrição / escopo">
        <Textarea rows={3} value={form.scope} onChange={(e) => set("scope", e.target.value)} />
      </Field>
      <Field label="Atividades (uma por linha)">
        <Textarea rows={4} value={form.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} />
      </Field>
      <Field label="Entregas (uma por linha)">
        <Textarea rows={3} value={form.deliveries} onChange={(e) => set("deliveries", e.target.value)} />
      </Field>
      <Field label="Resultados (um por linha)">
        <Textarea rows={3} value={form.results} onChange={(e) => set("results", e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={saving}>
          <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
