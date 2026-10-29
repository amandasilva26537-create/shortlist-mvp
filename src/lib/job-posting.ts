/**
 * Divulgação da vaga — lógica pura (sem banco, sem IA), testável.
 *
 * Regra de ouro: a divulgação só usa dados REAIS da vaga/empresa. A IA escreve
 * apenas dois textos corridos (resumo da oportunidade e apresentação da empresa);
 * listas, modelo de contratação, local e remuneração vêm direto do cadastro e
 * são montados por código, nunca "inventados" por IA.
 */

export interface PostingContent {
  title: string;
  intro: string;
  company_intro: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  differentials: string[];
  /** Só o que a recrutadora digitar. Nunca preenchido pela IA. */
  benefits: string[];
  show_company_name: boolean;
  show_salary: boolean;
  /** Opcional: https://... ou mailto:... para onde o botão "Candidatar-se" leva. */
  apply_url: string;
}

export const EMPTY_CONTENT: PostingContent = {
  title: "", intro: "", company_intro: "", responsibilities: [], requirements: [], skills: [],
  differentials: [], benefits: [], show_company_name: false, show_salary: false, apply_url: "",
};

/** Dados da vaga/empresa que podem alimentar a divulgação (lista fechada). */
export interface PostingSources {
  title: string;
  area: string | null;
  seniority: string | null;
  location: string | null;
  work_model: string | null;
  contract_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  summary: string;
  mission: string;
  responsibilities: string[];
  must_have: string[];
  nice_to_have: string[];
  hard_skills: string[];
  soft_skills: string[];
  tools: string[];
  differentials: string[];
  education: { level: string; area: string; required: boolean }[];
  languages: { language: string; level: string; required: boolean }[];
  company: { name: string; segment: string | null; city: string | null; state: string | null; website: string | null; brand: "moove" | "portus" };
}

/** Parte congelada na aprovação: é a única coisa que a página pública enxerga. */
export interface ApprovedSnapshot {
  content: PostingContent;
  employment: {
    area: string | null; seniority: string | null; location: string | null;
    work_model: string | null; contract_type: string | null;
    salary_min: number | null; salary_max: number | null; // só preenchidos se show_salary
  };
  company: { name: string | null; segment: string | null; city: string | null; state: string | null; brand: "moove" | "portus" };
  source_hash: string;
}

/* ------------------------------ utilidades ------------------------------ */

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : (x as any)?.name ?? "")).map((s) => String(s).trim()).filter(Boolean) : [];

export function uniq(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    const k = s.toLowerCase().replace(/\s+/g, " ").trim();
    if (k && !seen.has(k)) { seen.add(k); out.push(s.trim()); }
  }
  return out;
}

/** Monta as fontes permitidas a partir das linhas do banco. Campos internos NÃO entram. */
export function collectSources(job: any, client: any): PostingSources {
  const ais = (job?.ai_structure && typeof job.ai_structure === "object" ? job.ai_structure : {}) as any;
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : v != null && v !== "" && isFinite(Number(v)) ? Number(v) : null);
  return {
    title: str(job?.title),
    area: str(job?.area) || null,
    seniority: str(job?.seniority) || null,
    location: str(job?.location) || null,
    work_model: str(job?.work_model) || null,
    contract_type: str(job?.contract_type) || null,
    salary_min: num(job?.salary_min),
    salary_max: num(job?.salary_max),
    summary: str(ais.summary) || str(job?.description),
    mission: str(ais.mission),
    responsibilities: strArr(ais.responsibilities),
    must_have: strArr(ais.must_have?.length ? ais.must_have : job?.must_have),
    nice_to_have: strArr(ais.nice_to_have?.length ? ais.nice_to_have : job?.nice_to_have),
    hard_skills: strArr(job?.hard_skills?.length ? job.hard_skills : ais.hard_skills),
    soft_skills: strArr(job?.soft_skills?.length ? job.soft_skills : ais.soft_skills),
    tools: strArr(ais.tools),
    differentials: strArr(ais.differentials),
    education: Array.isArray(ais.education)
      ? ais.education.map((e: any) => ({ level: str(e?.level), area: str(e?.area), required: !!e?.required })).filter((e: any) => e.level || e.area)
      : [],
    languages: Array.isArray(ais.languages)
      ? ais.languages.map((l: any) => ({ language: str(l?.language), level: str(l?.level), required: !!l?.required })).filter((l: any) => l.language)
      : [],
    company: {
      name: str(client?.name),
      segment: str(client?.segment) || null,
      city: str(client?.city) || null,
      state: str(client?.state) || null,
      website: str(client?.website) || null,
      brand: String(client?.brand ?? "portus").toLowerCase() === "moove" ? "moove" : "portus",
    },
  };
}

/** Conteúdo inicial determinístico (sem IA): listas copiadas dos dados reais. */
export function defaultContent(src: PostingSources): PostingContent {
  const reqEdu = src.education.filter((e) => e.required).map((e) => [e.level, e.area].filter(Boolean).join(" em "));
  const reqLang = src.languages.filter((l) => l.required).map((l) => [l.language, l.level].filter(Boolean).join(" — "));
  return {
    ...EMPTY_CONTENT,
    title: src.title,
    intro: "",
    company_intro: "",
    responsibilities: uniq(src.responsibilities),
    requirements: uniq([...src.must_have, ...reqEdu, ...reqLang]),
    skills: uniq([...src.hard_skills, ...src.tools, ...src.soft_skills]),
    differentials: uniq([...src.nice_to_have, ...src.differentials]),
  };
}

/** Valida/normaliza conteúdo vindo do navegador ou da IA. */
export function normalizeContent(raw: any): PostingContent {
  const c = raw && typeof raw === "object" ? raw : {};
  const lim = (s: string, n: number) => s.slice(0, n);
  const list = (v: unknown, n = 40) => uniq(strArr(v).map((s) => lim(s, 500))).slice(0, n);
  const apply = str(c.apply_url);
  return {
    title: lim(str(c.title), 160),
    intro: lim(str(c.intro), 3000),
    company_intro: lim(str(c.company_intro), 3000),
    responsibilities: list(c.responsibilities),
    requirements: list(c.requirements),
    skills: list(c.skills, 60),
    differentials: list(c.differentials),
    benefits: list(c.benefits),
    show_company_name: c.show_company_name === true,
    show_salary: c.show_salary === true,
    apply_url: isSafeApplyUrl(apply) ? apply : "",
  };
}

/** Só aceita https:// ou mailto: (nada de javascript:, data:, http:). */
export function isSafeApplyUrl(u: string): boolean {
  if (!u || u.length > 500) return false;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(u)) return true;
  try { const p = new URL(u); return p.protocol === "https:" && !!p.hostname; } catch { return false; }
}

/* ------------------------------ remuneração / modelo ------------------------------ */

const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

export function formatSalary(min: number | null, max: number | null): string | null {
  if (min != null && max != null && min !== max) return `${brl(min)} a ${brl(max)}`;
  if (min != null && max != null) return brl(min);
  if (min != null) return `A partir de ${brl(min)}`;
  if (max != null) return `Até ${brl(max)}`;
  return null;
}

export function buildSnapshot(src: PostingSources, content: PostingContent, sourceHash: string): ApprovedSnapshot {
  return {
    content,
    employment: {
      area: src.area, seniority: src.seniority, location: src.location, work_model: src.work_model, contract_type: src.contract_type,
      salary_min: content.show_salary ? src.salary_min : null,
      salary_max: content.show_salary ? src.salary_max : null,
    },
    company: {
      // Todas as vagas são divulgadas em nome da Moove Talent: o nome do cliente nunca é publicado.
      name: null,
      segment: src.company.segment, city: src.company.city, state: src.company.state, brand: "moove",
    },
    source_hash: sourceHash,
  };
}

/** Linhas "Modelo de contratação, trabalho e remuneração" montadas só com dados cadastrados. */
export function employmentLines(s: ApprovedSnapshot): { label: string; value: string }[] {
  const e = s.employment;
  const out: { label: string; value: string }[] = [];
  if (e.contract_type) out.push({ label: "Modelo de contratação", value: e.contract_type });
  if (e.work_model) out.push({ label: "Modelo de trabalho", value: e.work_model });
  if (e.location) out.push({ label: "Local", value: e.location });
  if (e.seniority) out.push({ label: "Senioridade", value: e.seniority });
  if (e.area) out.push({ label: "Área", value: e.area });
  const sal = formatSalary(e.salary_min, e.salary_max);
  if (sal) out.push({ label: "Remuneração", value: sal });
  return out;
}

/* ------------------------------ hash das fontes ------------------------------ */

/** Hash simples e estável (FNV-1a 64 bits em 2×32) das fontes — detecta mudança no cadastro. */
export function hashSources(src: PostingSources): string {
  const s = JSON.stringify(src);
  let h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0xdeadbeef;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

/* ------------------------------ anti-invenção ------------------------------ */

const BENEFIT_TERMS = [
  "vale-refeição", "vale refeição", "vale-alimentação", "vale alimentação", "vale-transporte", "vale transporte",
  "plano de saúde", "plano odontológico", "assistência médica", "seguro de vida", "participação nos lucros", "plr",
  "bônus", "bonus", "comissão", "comissões", "stock option", "gympass", "wellhub", "day off", "auxílio", "auxilio",
  "home office", "horário flexível", "horario flexivel", "férias", "13º", "décimo terceiro", "previdência", "creche",
  "licença", "folga", "premiação", "participação em resultados",
];
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

/**
 * Procura, no texto gerado/editado, afirmações sem lastro nos dados permitidos:
 * números, valores em reais e benefícios que não aparecem em `allowedText`.
 * Retorna mensagens em português (lista vazia = nada suspeito).
 */
export function findUnsupportedClaims(text: string, allowedText: string): string[] {
  const issues: string[] = [];
  const allowed = norm(allowedText);
  const allowedDigits = allowedText.replace(/[^\d]/g, " ");
  const nums = (text.match(/\d[\d.,]*/g) ?? []).map((n) => n.replace(/[^\d]/g, "")).filter(Boolean);
  const bad = new Set<string>();
  for (const n of nums) {
    const found = new RegExp(`(^|\\D)${n}(\\D|$)`).test(allowedDigits.replace(/\s+/g, " ")) || allowedText.replace(/[.,\s]/g, "").includes(n);
    if (!found) bad.add(n);
  }
  if (bad.size) issues.push(`Número(s) que não constam nos dados da vaga: ${[...bad].slice(0, 6).join(", ")}.`);
  if (/R\$/.test(text) && !/R\$/.test(allowedText)) issues.push("Valor em reais (R$) no texto, mas a remuneração não está autorizada/informada.");
  const t = norm(text);
  const hits = BENEFIT_TERMS.filter((b) => { const nb = norm(b); const re = new RegExp(`(^|[^a-z])${nb.replace(/[-\s]/g, "[-\\s]?")}([^a-z]|$)`); return re.test(t) && !re.test(allowed); });
  if (hits.length) issues.push(`Benefício(s) citado(s) sem constar nos dados informados: ${uniq(hits).slice(0, 5).join(", ")}.`);
  return issues;
}

/** Texto que serve de base para a checagem (tudo que é permitido afirmar). */
export function allowedTextFor(src: PostingSources, content: Pick<PostingContent, "benefits" | "show_salary"> & { company_authorized?: string }): string {
  const sal = content.show_salary ? formatSalary(src.salary_min, src.salary_max) ?? "" : "";
  return [JSON.stringify(src), content.company_authorized ?? "", content.benefits.join(" "), sal].join("\n");
}

/** Todos os textos de uma divulgação, para checagem em bloco. */
export function contentToCheckText(c: PostingContent): string {
  return [c.intro, c.company_intro, ...c.responsibilities, ...c.requirements, ...c.skills, ...c.differentials].join("\n");
}

/* ------------------------------ saídas: texto, LinkedIn, ATS ------------------------------ */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bullets = (l: string[]) => l.map((x) => `• ${x}`).join("\n");

export function companyDisplay(_s: ApprovedSnapshot): string {
  return "Moove Talent";
}

export function brandName(_brand?: "moove" | "portus"): string { return "Moove Talent"; }

/** Texto organizado para colar no LinkedIn e em sites de emprego. */
export function buildPlainText(s: ApprovedSnapshot, link: string | null): string {
  const c = s.content;
  const parts: string[] = [];
  parts.push(c.title);
  parts.push(`${companyDisplay(s)}${s.employment.location ? " · " + s.employment.location : ""}`);
  if (c.intro) parts.push(c.intro);
  if (c.company_intro) parts.push(`Sobre a empresa\n${c.company_intro}`);
  if (c.responsibilities.length) parts.push(`Responsabilidades\n${bullets(c.responsibilities)}`);
  if (c.requirements.length) parts.push(`Requisitos obrigatórios\n${bullets(c.requirements)}`);
  if (c.skills.length) parts.push(`Competências\n${bullets(c.skills)}`);
  if (c.differentials.length) parts.push(`Diferenciais\n${bullets(c.differentials)}`);
  const emp = employmentLines(s);
  if (emp.length) parts.push(`Contratação e trabalho\n${emp.map((l) => `• ${l.label}: ${l.value}`).join("\n")}`);
  if (c.benefits.length) parts.push(`Benefícios\n${bullets(c.benefits)}`);
  if (link) parts.push(`Candidate-se: ${link}`);
  return parts.join("\n\n");
}

const EMPLOYMENT_TYPE: [RegExp, string][] = [
  [/clt|efetiv/i, "FULL_TIME"], [/pj|pessoa jur|prestador|freela|autônom|autonom/i, "CONTRACTOR"],
  [/est[aá]gio/i, "INTERN"], [/tempor[aá]rio/i, "TEMPORARY"], [/meio per[ií]odo|part/i, "PART_TIME"],
];

/** Versão estruturada para sistemas ATS/buscadores: schema.org JobPosting (JSON-LD). */
export function buildJobPostingJsonLd(s: ApprovedSnapshot, o: { url: string; datePosted: string }): Record<string, unknown> {
  const c = s.content;
  const html: string[] = [];
  if (c.intro) html.push(`<p>${esc(c.intro)}</p>`);
  if (c.company_intro) html.push(`<h3>Sobre a empresa</h3><p>${esc(c.company_intro)}</p>`);
  const ul = (t: string, l: string[]) => l.length && html.push(`<h3>${t}</h3><ul>${l.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`);
  ul("Responsabilidades", c.responsibilities); ul("Requisitos obrigatórios", c.requirements);
  ul("Competências", c.skills); ul("Diferenciais", c.differentials); ul("Benefícios", c.benefits);
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org", "@type": "JobPosting",
    title: c.title, description: html.join("") || esc(c.title),
    datePosted: o.datePosted, url: o.url, directApply: false,
    hiringOrganization: { "@type": "Organization", name: "Moove Talent" },
    identifier: { "@type": "PropertyValue", name: brandName(s.company.brand), value: o.url.split("/").pop() },
  };
  const et = EMPLOYMENT_TYPE.find(([re]) => re.test(s.employment.contract_type ?? ""))?.[1];
  if (et) ld.employmentType = et;
  const remote = /remot/i.test(s.employment.work_model ?? "");
  if (remote) ld.jobLocationType = "TELECOMMUTE";
  const city = s.employment.location ?? [s.company.city, s.company.state].filter(Boolean).join(", ");
  if (city && !(remote && !s.employment.location)) {
    ld.jobLocation = { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: city, addressCountry: "BR" } };
  }
  if (remote) ld.applicantLocationRequirements = { "@type": "Country", name: "BR" };
  if (c.skills.length) ld.skills = c.skills.join(", ");
  if (s.employment.area) ld.occupationalCategory = s.employment.area;
  if (c.responsibilities.length) ld.responsibilities = c.responsibilities.join("; ");
  if (c.requirements.length) ld.qualifications = c.requirements.join("; ");
  const { salary_min: mn, salary_max: mx } = s.employment;
  if (mn != null || mx != null) {
    ld.baseSalary = { "@type": "MonetaryAmount", currency: "BRL", value: { "@type": "QuantitativeValue", ...(mn != null ? { minValue: mn } : {}), ...(mx != null ? { maxValue: mx } : {}), unitText: "MONTH" } };
  }
  return ld;
}

/** Serializa JSON-LD com segurança para dentro de <script> (evita fechar a tag). */
export function jsonLdScript(ld: Record<string, unknown>): string {
  return JSON.stringify(ld).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028|\u2029/g, "");
}

/** Slug público: título legível + sufixo aleatório (não revela cliente nem ids). */
export function slugify(title: string, rand: string): string {
  const base = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "vaga";
  return `${base}-${rand}`;
}
export const isValidSlug = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 8 && s.length <= 80;

/** Texto institucional (employer brand) exibido na Página de Carreiras. Sem números ou promessas. */
export const MOOVE_EMPLOYER_BRAND = {
  headline: "Conectamos pessoas e empresas sem fronteiras.",
  paragraphs: [
    "A Moove Talent é uma consultoria de recrutamento especializada em times remotos e contratação global. Acreditamos que o talento certo pode estar em qualquer lugar — e que um bom processo seletivo é claro, humano e respeitoso com quem se candidata.",
    "Trabalhamos lado a lado com empresas para entender o contexto de cada posição, o perfil da equipe e o que realmente importa para o sucesso na função. Do lado de quem busca uma oportunidade, valorizamos transparência, feedback e uma comunicação honesta em cada etapa.",
  ],
  values: ["Transparência", "Respeito ao candidato", "Trabalho remoto e global", "Decisões baseadas em evidências"],
};
