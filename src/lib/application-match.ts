/**
 * Match da CANDIDATURA (separado do Match das shortlists).
 * Ferramenta de apoio à triagem — nunca decide contratação ou reprovação.
 *
 * - A IA (ou a busca por palavras-chave) só classifica cada requisito REAL da vaga e cita evidência.
 * - A nota é calculada aqui, por código, a partir dessas classificações e dos pesos configurados.
 * - "Sem evidência no currículo" NÃO é tratado como "não possui": a nota mínima (piso) conta como 0, a máxima (teto) como atendido.
 */
import type { PostingSources } from "./job-posting.ts";

export type Category = "obrigatorios" | "tecnicas" | "experiencia" | "diferenciais";
export type Status = "met" | "partial" | "no_evidence" | "not_met";

export const CATEGORY_LABEL: Record<Category, string> = {
  obrigatorios: "Requisitos obrigatórios", tecnicas: "Competências técnicas e ferramentas",
  experiencia: "Experiência", diferenciais: "Diferenciais",
};
export const STATUS_LABEL: Record<Status, string> = {
  met: "Atende", partial: "Atende parcialmente", no_evidence: "Sem evidência no currículo", not_met: "Não atende (evidência contrária)",
};
export type Weights = Record<Category, number>;
export const DEFAULT_WEIGHTS: Weights = { obrigatorios: 40, tecnicas: 25, experiencia: 25, diferenciais: 10 };
export const DEFAULT_PRESCREEN_MIN = 70;
/** Versão do método de cálculo/prompt (para rastreabilidade). */
export const MATCH_VERSION = "match-2026-10-v1";

export interface Criterion { id: string; category: Category; text: string }
export interface Assessment {
  criterion_id: string; status: Status; evidence: string | null; note: string | null;
  /** status proposto pela análise antes de qualquer correção do recrutador */
  ai_status?: Status; overridden?: boolean;
}
export interface ExtractedProfile {
  total_experience_years: number | null;
  experiences: { role: string; company: string; period: string }[];
  skills: string[]; tools: string[]; education: string[]; languages: string[];
  salary_expectation: number | null;
  summary: string;
}
export const EMPTY_PROFILE: ExtractedProfile = { total_experience_years: null, experiences: [], skills: [], tools: [], education: [], languages: [], salary_expectation: null, summary: "" };

/* ------------------------------ util ------------------------------ */
export const normText = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

function hash8(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(36);
}
const uniq = (l: string[]) => { const seen = new Set<string>(); return l.filter((x) => { const k = normText(x); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };

/* ------------------------------ critérios (só dados reais da vaga) ------------------------------ */
export function buildCriteria(src: PostingSources & { title: string }): Criterion[] {
  const out: Criterion[] = [];
  const seen = new Set<string>();
  const add = (category: Category, text: string) => {
    const t = text.trim().slice(0, 300); const k = normText(t);
    if (!k || seen.has(k)) return; seen.add(k);
    out.push({ id: `${category.slice(0, 3)}-${hash8(k)}`, category, text: t });
  };
  for (const t of src.must_have) add("obrigatorios", t);
  for (const e of src.education.filter((x) => x.required)) add("obrigatorios", `Formação: ${[e.level, e.area].filter(Boolean).join(" em ")}`);
  for (const l of src.languages.filter((x) => x.required)) add("obrigatorios", `Idioma: ${[l.language, l.level].filter(Boolean).join(" — ")}`);
  for (const t of [...src.hard_skills, ...src.tools]) add("tecnicas", t);
  add("experiencia", `Experiência relevante como ${src.title}${src.area ? ` na área de ${src.area}` : ""}${src.seniority ? ` (nível ${src.seniority})` : ""}`);
  for (const t of src.responsibilities.slice(0, 5)) add("experiencia", `Experiência com: ${t}`);
  for (const t of [...src.nice_to_have, ...src.differentials]) add("diferenciais", t);
  for (const e of src.education.filter((x) => !x.required)) add("diferenciais", `Formação: ${[e.level, e.area].filter(Boolean).join(" em ")}`);
  for (const l of src.languages.filter((x) => !x.required)) add("diferenciais", `Idioma: ${[l.language, l.level].filter(Boolean).join(" — ")}`);
  return out;
}
export const criteriaHash = (c: Criterion[]) => hash8(c.map((x) => x.id).join("|"));

/* ------------------------------ pesos ------------------------------ */
export function normalizeWeights(w: Partial<Record<string, unknown>> | null | undefined): Weights {
  const out = { ...DEFAULT_WEIGHTS };
  for (const k of Object.keys(out) as Category[]) {
    const v = Number((w as any)?.[k]);
    if (isFinite(v) && v >= 0 && v <= 100) out[k] = Math.round(v);
  }
  if (Object.values(out).reduce((a, b) => a + b, 0) <= 0) return { ...DEFAULT_WEIGHTS };
  return out;
}

/* ------------------------------ cálculo ------------------------------ */
const CREDIT: Record<Status, [number, number]> = { met: [1, 1], partial: [0.5, 1], no_evidence: [0, 1], not_met: [0, 0] };

export interface MatchResult {
  score: number; score_max: number; coverage: number;
  breakdown: { category: Category; weight: number; score: number; score_max: number; items: number; no_evidence: number }[];
  gaps: string[];            // lacunas de informação (sem evidência)
  unmet: string[];           // evidência contrária
  blocking_unmet: boolean;   // algum obrigatório com evidência contrária
}

export function computeMatch(criteria: Criterion[], assessments: Assessment[], weightsIn: Partial<Weights>): MatchResult {
  const weights = normalizeWeights(weightsIn);
  const byId = new Map(assessments.map((a) => [a.criterion_id, a]));
  const cats = (Object.keys(weights) as Category[]).map((category) => {
    const items = criteria.filter((c) => c.category === category);
    let lo = 0, hi = 0, noEv = 0;
    for (const c of items) {
      const s = byId.get(c.id)?.status ?? "no_evidence";
      const [a, b] = CREDIT[s]; lo += a; hi += b; if (s === "no_evidence") noEv += 1;
    }
    const n = items.length;
    return { category, weight: weights[category], items: n, no_evidence: noEv, lo: n ? lo / n : 0, hi: n ? hi / n : 0 };
  });
  const active = cats.filter((c) => c.items > 0 && c.weight > 0);
  const total = active.reduce((s, c) => s + c.weight, 0);
  const pct = (f: (c: (typeof cats)[number]) => number) => (total ? Math.round(active.reduce((s, c) => s + f(c) * c.weight, 0) / total * 100) : 0);
  const allItems = criteria.length;
  const known = criteria.filter((c) => (byId.get(c.id)?.status ?? "no_evidence") !== "no_evidence").length;
  const gaps = criteria.filter((c) => (byId.get(c.id)?.status ?? "no_evidence") === "no_evidence").map((c) => c.text);
  const unmetC = criteria.filter((c) => byId.get(c.id)?.status === "not_met");
  return {
    score: pct((c) => c.lo), score_max: pct((c) => c.hi), coverage: allItems ? Math.round((known / allItems) * 100) : 0,
    breakdown: cats.map((c) => ({ category: c.category, weight: c.weight, score: Math.round(c.lo * 100), score_max: Math.round(c.hi * 100), items: c.items, no_evidence: c.no_evidence })),
    gaps, unmet: unmetC.map((c) => c.text), blocking_unmet: unmetC.some((c) => c.category === "obrigatorios"),
  };
}

/** Pré-triado = nota mínima ≥ limite e nenhum obrigatório com evidência contrária. É só um selo de apoio. */
export function isPrescreened(r: Pick<MatchResult, "score" | "blocking_unmet">, min: number): boolean {
  return r.score >= min && !r.blocking_unmet;
}

/* ------------------------------ privacidade / viés ------------------------------ */
/** Remove contatos, links e o nome do candidato antes de enviar texto a qualquer análise. */
export function redactResumeText(text: string, fullName?: string | null): string {
  let t = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
  t = t.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
  t = t.replace(/https?:\/\/\S+|www\.\S+|linkedin\.com\/\S+/gi, "[link]");
  t = t.replace(/(\+?\d[\d\s().-]{7,}\d)/g, (m) => (m.replace(/\D/g, "").length >= 8 ? "[telefone]" : m));
  for (const part of (fullName ?? "").split(/\s+/).filter((p) => p.length >= 3)) {
    t = t.replace(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[candidato]");
  }
  return t;
}

/** Atributos protegidos que nunca entram na pontuação: removidos de qualquer lista extraída. */
const PROTECTED = /\b(idade|anos de idade|nascid[oa]|data de nascimento|estado civil|solteir[oa]|casad[oa]|filhos|g[eê]nero|sexo|masculino|feminino|ra[cç]a|cor da pele|etnia|religi[aã]o|cat[oó]lic|evang[eé]lic|espírita|deficiente|pcd|defici[eê]ncia|nacionalidade|foto)\b/i;
export const stripProtected = (l: string[]) => l.filter((x) => !PROTECTED.test(x));

/* ------------------------------ evidência verificável ------------------------------ */
/** A citação precisa existir no texto do currículo (sem inventar). */
export function evidenceInText(evidence: string | null | undefined, resumeText: string): boolean {
  const e = normText(evidence ?? "").replace(/^[\W_]+|[\W_]+$/g, "");
  if (e.length < 3) return false;
  return normText(resumeText).includes(e);
}

/** Garante coerência: met/partial/not_met exigem evidência real; senão vira "sem evidência". */
export function sanitizeAssessments(criteria: Criterion[], raw: any[], resumeText: string): { items: Assessment[]; warnings: string[] } {
  const warnings: string[] = [];
  const valid = new Set<Status>(["met", "partial", "no_evidence", "not_met"]);
  const by = new Map<string, any>((Array.isArray(raw) ? raw : []).map((r) => [String(r?.criterion_id ?? r?.id ?? ""), r]));
  const items = criteria.map((c): Assessment => {
    const r = by.get(c.id);
    let status: Status = valid.has(r?.status) ? r.status : "no_evidence";
    const evidence = typeof r?.evidence === "string" && r.evidence.trim() ? r.evidence.trim().slice(0, 300) : null;
    if (status !== "no_evidence" && !evidenceInText(evidence, resumeText)) {
      if (r) warnings.push(`Evidência não localizada no currículo para: ${c.text}`);
      status = "no_evidence";
    }
    const note = typeof r?.note === "string" && r.note.trim() ? r.note.trim().slice(0, 300) : null;
    return { criterion_id: c.id, status, evidence: status === "no_evidence" ? null : evidence, note, ai_status: status };
  });
  return { items, warnings };
}

/* ------------------------------ busca por palavras-chave (sem IA) ------------------------------ */
const STOP = new Set(["de", "da", "do", "das", "dos", "em", "com", "para", "por", "e", "ou", "a", "o", "as", "os", "na", "no", "nas", "nos", "um", "uma", "experiencia", "conhecimento", "formacao", "idioma", "como", "nivel", "area", "relevante"]);
const tokens = (s: string) => normText(s).replace(/[^a-z0-9+#.\s]/g, " ").split(" ").filter((w) => w.length >= 2 && !STOP.has(w));

/** Classificação simples e transparente: todos os termos do requisito aparecem no texto → "partial" com trecho; senão "sem evidência". */
export function keywordAssess(criteria: Criterion[], resumeText: string): Assessment[] {
  const flat = resumeText.replace(/\s+/g, " ");
  const nflat = normText(flat);
  return criteria.map((c) => {
    const toks = tokens(c.text.replace(/^(Experiência com|Formação|Idioma|Experiência relevante como):?\s*/i, ""));
    if (!toks.length) return { criterion_id: c.id, status: "no_evidence", evidence: null, note: null, ai_status: "no_evidence" };
    const hit = toks.every((t) => new RegExp(`(^|[^a-z0-9])${t.replace(/[.+#]/g, "\\$&")}([^a-z0-9]|$)`).test(nflat));
    if (!hit) return { criterion_id: c.id, status: "no_evidence", evidence: null, note: "Termos não encontrados no texto (não significa ausência da competência).", ai_status: "no_evidence" };
    const idx = nflat.indexOf(toks[0]!);
    const approx = flat.slice(Math.max(0, idx - 40), idx + 100).trim();
    return { criterion_id: c.id, status: "partial", evidence: approx, note: "Termos localizados por palavra-chave; confirme o contexto.", ai_status: "partial" };
  });
}

/* ------------------------------ filtros / ordenação ------------------------------ */
export interface MatchRow {
  score: number | null; score_max: number | null; prescreened: boolean;
  skills: string[]; years: number | null; salary: number | null;
}
export interface MatchFilters { minScore?: number; skill?: string; minYears?: number; maxSalary?: number; onlyPrescreened?: boolean }

export function matchesFilters(r: MatchRow, f: MatchFilters): boolean {
  if (f.onlyPrescreened && !r.prescreened) return false;
  if (f.minScore != null && f.minScore > 0 && (r.score == null || r.score < f.minScore)) return false;
  if (f.skill?.trim()) {
    const terms = f.skill.split(",").map((t) => normText(t)).filter(Boolean);
    const hay = normText(r.skills.join(" | "));
    if (!terms.every((t) => hay.includes(t))) return false;
  }
  if (f.minYears != null && f.minYears > 0 && (r.years == null || r.years < f.minYears)) return false;
  // sem pretensão informada não é excluído pelo filtro de salário
  if (f.maxSalary != null && f.maxSalary > 0 && r.salary != null && r.salary > f.maxSalary) return false;
  return true;
}

/** Maior nota primeiro; sem análise por último; desempate pelo teto e depois pela data. */
export function compareByMatch(a: { score: number | null; score_max: number | null; applied_at: string }, b: typeof a): number {
  if ((a.score == null) !== (b.score == null)) return a.score == null ? 1 : -1;
  return ((b.score ?? 0) - (a.score ?? 0)) || ((b.score_max ?? 0) - (a.score_max ?? 0)) || (a.applied_at < b.applied_at ? 1 : -1);
}

/** Normaliza o perfil extraído (IA ou edição manual). Atributos protegidos nunca passam. */
export function normalizeProfile(raw: any): ExtractedProfile {
  const list = (v: unknown, n = 60) => stripProtected(uniq((Array.isArray(v) ? v : []).map((x) => String(typeof x === "string" ? x : (x as any)?.name ?? "")).map((s) => s.trim().slice(0, 120)))).slice(0, n);
  const num = (v: unknown, max: number) => { const n = Number(v); return isFinite(n) && n >= 0 && n <= max && v !== null && v !== "" ? n : null; };
  return {
    total_experience_years: num(raw?.total_experience_years, 60),
    experiences: (Array.isArray(raw?.experiences) ? raw.experiences : []).slice(0, 15).map((e: any) => ({
      role: String(e?.role ?? "").slice(0, 120), company: String(e?.company ?? "").slice(0, 120), period: String(e?.period ?? "").slice(0, 60),
    })).filter((e: any) => e.role || e.company),
    skills: list(raw?.skills), tools: list(raw?.tools), education: list(raw?.education, 20), languages: list(raw?.languages, 20),
    salary_expectation: num(raw?.salary_expectation, 10_000_000),
    summary: stripProtected([String(raw?.summary ?? "").slice(0, 600)])[0] ?? "",
  };
}
