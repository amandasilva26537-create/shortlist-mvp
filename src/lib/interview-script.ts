/** Roteiro de entrevista do RECRUTADOR — lógica pura (sem banco/IA), testável. */

export type QuestionType = "tecnica" | "comportamental" | "situacional";
export const TYPE_LABEL: Record<QuestionType, string> = { tecnica: "Técnica", comportamental: "Comportamental", situacional: "Situacional" };

export interface ScriptQuestion {
  type: QuestionType;
  text: string;
  /** Requisito/competência real da vaga que a pergunta avalia. */
  evaluates: string;
  /** Sinais de uma boa resposta (objetivos). */
  good_signs: string[];
  /** Pontos de atenção (aprofundar, não eliminar). */
  watch_for: string[];
}
export interface ScriptSection { title: string; minutes: number; questions: ScriptQuestion[] }
export interface ScriptCriterion { name: string; weak: string; adequate: string; strong: string }
export interface InterviewScript {
  duration_min: number;
  leadership: boolean;
  opening: string;
  sections: ScriptSection[];
  /** Critérios objetivos 1 / 3 / 5 para pontuar as respostas. */
  criteria: ScriptCriterion[];
  closing: string;
}

const LEADERSHIP_RE = /\b(gerente|gestor|gestora|coordenador|coordenadora|l[ií]der|lideran[cç]a|diretor|diretora|head|supervisor|supervisora|manager|lead|chefe|superintendente)\b/i;

/** Vaga de liderança → 45 min; operacional → 30 min. */
export function isLeadership(title: string, seniority?: string | null): boolean {
  return LEADERSHIP_RE.test(title) || LEADERSHIP_RE.test(seniority ?? "");
}
export const defaultDuration = (leadership: boolean) => (leadership ? 45 : 30);

/** Perguntas que nunca devem aparecer (atributos protegidos / vida privada). */
const FORBIDDEN = new RegExp(
  [
    "sua idade", "qual (?:a )?idade", "quantos anos (?:voc[eê] )?tem", "data de nascimento", "ano (?:em que )?nasceu",
    "estado civil", "casad[oa]", "solteir[oa]", "namorad[oa]", "marido|esposa|c[oô]njuge", "tem filhos|quantos filhos|pretende ter filhos|planeja ter filhos",
    "gr[aá]vid\\w*", "engravid\\w*", "gesta[cç][aã]o", "sua religi[aã]o", "igreja|culto", "ra[cç]a|cor da pele|etnia",
    "orienta[cç][aã]o sexual", "identidade de g[eê]nero", "(?:possui|tem|tem alguma|possui alguma) defici[eê]ncia|sua defici[eê]ncia|\\bpcd\\b", "problemas? de sa[uú]de|doen[cç]a cr[oô]nica|sa[uú]de mental",
    "opini[aã]o pol[ií]tica|partido pol[ií]tico|em quem (?:voc[eê] )?vota", "sindicat\\w*", "nacionalidade|naturalidade", "origem familiar",
  ].join("|"),
  "i",
);
export const hasForbiddenTopic = (s: string) => FORBIDDEN.test(s);

const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const strList = (v: unknown, n = 6) => (Array.isArray(v) ? v.map((x) => str(x, 240)).filter(Boolean).slice(0, n) : []);

/** Normaliza o roteiro (IA ou edição). Remove perguntas com temas proibidos e retorna o que foi removido. */
export function normalizeScript(raw: any, fallbackDuration = 30, leadership = false): { script: InterviewScript; removed: string[] } {
  const removed: string[] = [];
  const types = new Set<QuestionType>(["tecnica", "comportamental", "situacional"]);
  const dur = Number(raw?.duration_min);
  const sections: ScriptSection[] = (Array.isArray(raw?.sections) ? raw.sections : []).slice(0, 10).map((s: any) => ({
    title: str(s?.title, 120) || "Seção",
    minutes: Math.max(1, Math.min(90, Math.round(Number(s?.minutes) || 5))),
    questions: (Array.isArray(s?.questions) ? s.questions : []).slice(0, 12).flatMap((q: any): ScriptQuestion[] => {
      const text = str(q?.text, 500);
      if (!text) return [];
      if (hasForbiddenTopic(text)) { removed.push(text); return []; }
      return [{
        type: types.has(q?.type) ? q.type : "comportamental", text, evaluates: str(q?.evaluates, 240),
        good_signs: strList(q?.good_signs), watch_for: strList(q?.watch_for),
      }];
    }),
  }));
  const script: InterviewScript = {
    duration_min: isFinite(dur) && dur >= 10 && dur <= 180 ? Math.round(dur) : fallbackDuration,
    leadership: typeof raw?.leadership === "boolean" ? raw.leadership : leadership,
    opening: str(raw?.opening, 800), sections,
    criteria: (Array.isArray(raw?.criteria) ? raw.criteria : []).slice(0, 12).map((c: any) => ({
      name: str(c?.name, 160), weak: str(c?.weak, 300), adequate: str(c?.adequate, 300), strong: str(c?.strong, 300),
    })).filter((c: ScriptCriterion) => c.name),
    closing: str(raw?.closing, 800),
  };
  return { script, removed };
}

export const totalMinutes = (s: InterviewScript) => s.sections.reduce((a, x) => a + x.minutes, 0);
export const totalQuestions = (s: InterviewScript) => s.sections.reduce((a, x) => a + x.questions.length, 0);

/** Texto limpo para copiar/colar. */
export function scriptToText(title: string, s: InterviewScript): string {
  const L: string[] = [];
  L.push(`ROTEIRO DE ENTREVISTA — ${title}`, `Duração aproximada: ${s.duration_min} min${s.leadership ? " (vaga de liderança)" : ""}`, "");
  if (s.opening) L.push("ABERTURA", s.opening, "");
  s.sections.forEach((sec, i) => {
    L.push(`${i + 1}. ${sec.title.toUpperCase()} (${sec.minutes} min)`);
    sec.questions.forEach((q, j) => {
      L.push(`${i + 1}.${j + 1} [${TYPE_LABEL[q.type]}] ${q.text}`);
      if (q.evaluates) L.push(`   Avalia: ${q.evaluates}`);
      q.good_signs.forEach((g) => L.push(`   + ${g}`));
      q.watch_for.forEach((w) => L.push(`   ! ${w}`));
    });
    L.push("");
  });
  if (s.criteria.length) {
    L.push("CRITÉRIOS DE AVALIAÇÃO (1 = fraco · 3 = adequado · 5 = forte)");
    s.criteria.forEach((c) => L.push(`• ${c.name}`, `  1: ${c.weak}`, `  3: ${c.adequate}`, `  5: ${c.strong}`));
    L.push("");
  }
  if (s.closing) L.push("ENCERRAMENTO", s.closing);
  return L.join("\n").trim();
}

/** Ajusta os minutos das seções para somarem a duração do roteiro (mantém a proporção). */
export function rescaleMinutes(s: InterviewScript): InterviewScript {
  const sum = totalMinutes(s);
  if (!sum || !s.sections.length) return s;
  const f = s.duration_min / sum;
  let left = s.duration_min;
  const sections = s.sections.map((sec, i) => {
    const m = i === s.sections.length - 1 ? left : Math.max(1, Math.round(sec.minutes * f));
    left -= m;
    return { ...sec, minutes: Math.max(1, m) };
  });
  return { ...s, sections };
}
