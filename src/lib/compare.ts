import { availabilityLabel, salaryLabel } from "@/lib/format";

/** Competências avaliadas na análise da shortlist (nota 0-10). "Fit cultural" não é avaliado. */
export const DIMENSION_LABELS: Record<string, string> = {
  hard_skills: "Hard Skills",
  soft_skills: "Soft Skills",
  experience: "Experiência",
  leadership: "Liderança",
  communication: "Comunicação",
  strategy: "Estratégia",
  execution: "Execução",
  adaptability: "Potencial de adaptação",
};

export type CompareItem = { candidate: any; evaluation: any | null };

const isNum = (v: any): v is number => typeof v === "number" && !Number.isNaN(v);

/** Notas 0-10 já existentes na análise: nota da recrutadora, ou a sugestão salva (dimension_scores). */
export function dimensionScores(ev: any): Record<string, number> {
  const saved = ev?.recruiter_scores && typeof ev.recruiter_scores === "object" ? ev.recruiter_scores : {};
  const suggested = ev?.dimension_scores && typeof ev.dimension_scores === "object" ? ev.dimension_scores : {};
  const out: Record<string, number> = {};
  for (const key of Object.keys(DIMENSION_LABELS)) {
    if (isNum(saved[key])) out[key] = saved[key];
    else if (isNum(suggested[key])) out[key] = Math.max(0, Math.min(10, Math.round(suggested[key] > 10 ? suggested[key] / 10 : suggested[key])));
  }
  return out;
}

export type RadarSeriesInput = { competency: string; value: number }[];

/**
 * Radar: usa somente eixos avaliados para TODOS os candidatos selecionados.
 * 1º as competências da vaga (radar_scores); 2º as competências da análise (notas 0-10).
 * Retorna null quando não há dados suficientes (mínimo de 3 eixos em comum).
 */
export function buildRadar(items: CompareItem[]): { axes: string[]; data: RadarSeriesInput[] } | null {
  if (items.length < 2) return null;

  // 1) competências da vaga
  const maps = items.map((it) => {
    const rs = it.evaluation?.radar_scores;
    const m = new Map<string, number>();
    if (rs && typeof rs === "object") for (const [k, v] of Object.entries(rs)) if (isNum(v)) m.set(k, v as number);
    return m;
  });
  const common = [...maps[0]!.keys()].filter((k) => maps.every((m) => m.has(k)));
  if (common.length >= 3) {
    const allSmall = maps.every((m) => common.every((k) => (m.get(k) as number) <= 10));
    const scale = allSmall ? 10 : 1;
    return {
      axes: common,
      data: maps.map((m) => common.map((k) => ({ competency: k, value: (m.get(k) as number) * scale }))),
    };
  }

  // 2) competências avaliadas na shortlist
  const dims = items.map((it) => dimensionScores(it.evaluation));
  const keys = Object.keys(DIMENSION_LABELS).filter((k) => dims.every((d) => k in d));
  if (keys.length >= 3) {
    return {
      axes: keys.map((k) => DIMENSION_LABELS[k]!),
      data: dims.map((d) => keys.map((k) => ({ competency: DIMENSION_LABELS[k]!, value: d[k]! * 10 }))),
    };
  }
  return null;
}

export type TableRow = { label: string; values: (string | null)[] };

function cityLabel(c: any) {
  return c?.city && c?.state && !String(c.city).toLowerCase().includes(String(c.state).toLowerCase())
    ? `${c.city} - ${c.state}`
    : c?.city || c?.state || null;
}

function experienceLabel(c: any): string | null {
  const t: any[] = Array.isArray(c?.trajectory) ? c.trajectory : [];
  const roles = t
    .filter((x) => x?.role || x?.title || x?.position)
    .slice(0, 2)
    .map((x) => [x.role ?? x.title ?? x.position, x.company].filter(Boolean).join(" · "));
  if (roles.length) return roles.join("\n");
  if (c?.current_position) return [c.current_position, c.current_company].filter(Boolean).join(" · ");
  return null;
}

/** Linhas da tabela: só entram linhas em que ao menos um candidato tem dado real. */
export function buildTable(items: CompareItem[]): TableRow[] {
  const dims = items.map((it) => dimensionScores(it.evaluation));
  const rows: TableRow[] = [
    { label: "Match geral", values: items.map((it) => (isNum(it.evaluation?.overall_match) ? `${it.evaluation.overall_match}%` : null)) },
    { label: "DISC", values: items.map((it) => it.candidate?.disc_profile || null) },
    { label: "Cidade", values: items.map((it) => cityLabel(it.candidate)) },
    { label: "Modelo de trabalho", values: items.map((it) => it.candidate?.work_model || null) },
    { label: "Pretensão salarial", values: items.map((it) => salaryLabel(it.candidate)) },
    {
      label: "Disponibilidade",
      values: items.map((it) => {
        const pm = it.candidate?.professional_moment && typeof it.candidate.professional_moment === "object" ? it.candidate.professional_moment : {};
        return availabilityLabel(pm.availability ?? it.candidate?.availability);
      }),
    },
    { label: "Experiência relevante", values: items.map((it) => experienceLabel(it.candidate)) },
    ...Object.entries(DIMENSION_LABELS).map(([k, label]) => ({
      label,
      values: dims.map((d) => (k in d ? `${d[k]}/10` : null)),
    })),
  ];
  return rows.filter((r) => r.values.some((v) => v != null));
}

export type ChecklistRowModel = { criterion: string; statuses: (string | null)[] };

/** Critérios eliminatórios já avaliados na shortlist (união, na ordem em que aparecem). */
export function buildChecklist(items: CompareItem[]): ChecklistRowModel[] {
  const order: string[] = [];
  const byCand = items.map((it) => {
    const m = new Map<string, string>();
    const list: any[] = Array.isArray(it.evaluation?.eliminatory_checklist) ? it.evaluation.eliminatory_checklist : [];
    for (const x of list) {
      const name = String(x?.criterion ?? "").trim();
      if (!name) continue;
      if (!order.includes(name)) order.push(name);
      m.set(name, String(x?.status ?? "unknown"));
    }
    return m;
  });
  return order.map((criterion) => ({ criterion, statuses: byCand.map((m) => m.get(criterion) ?? null) }));
}

/** Texto da própria shortlist usado se a IA não estiver disponível. */
export function fallbackStrength(ev: any): string | null {
  if (ev?.key_differentiator) return String(ev.key_differentiator);
  const t = Array.isArray(ev?.top_strengths) ? ev.top_strengths[0] : null;
  if (t?.title) return t.evidence ? `${t.title}: ${t.evidence}` : String(t.title);
  return null;
}
