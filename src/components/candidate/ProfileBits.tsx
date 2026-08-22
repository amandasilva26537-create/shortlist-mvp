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
}: {
  exp: any;
  defaultOpen?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const bullets = experienceBullets(exp, compact ? 3 : 6);
  const meta = compact
    ? []
    : [exp.segment, exp.location, exp.work_model].map(cleanValue).filter(Boolean);
  const period = [cleanValue(exp.start), cleanValue(exp.end)].filter(Boolean).join(" — ");
  const duration = cleanValue(exp.duration);

  return (
    <div className="card-elevated p-5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between gap-3 text-left">
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
