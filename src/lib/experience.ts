/** Utilitários de datas das experiências profissionais (entrada, saída e tempo na empresa). */

const MONTHS: Record<string, number> = {
  jan: 1, janeiro: 1, january: 1,
  fev: 2, fevereiro: 2, feb: 2, february: 2,
  mar: 3, março: 3, marco: 3, march: 3,
  abr: 4, abril: 4, apr: 4, april: 4,
  mai: 5, maio: 5, may: 5,
  jun: 6, junho: 6, june: 6,
  jul: 7, julho: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  set: 9, setembro: 9, sep: 9, sept: 9, september: 9,
  out: 10, outubro: 10, oct: 10, october: 10,
  nov: 11, novembro: 11, november: 11,
  dez: 12, dezembro: 12, dec: 12, december: 12,
};

const CURRENT_RE = /(atual|atualmente|presente|present|hoje|current|momento)/i;

export type YM = { year: number; month: number | null };

/** Interpreta "março de 2022", "03/2022", "2022-03", "mar 2022", "2022". */
export function parseMonthYear(value: any): YM | null {
  const s = String(value ?? "").trim().toLowerCase();
  if (!s || CURRENT_RE.test(s)) return null;

  let m = s.match(/(\d{4})[-/.](\d{1,2})/); // 2022-03
  if (m) return { year: Number(m[1]), month: clampMonth(Number(m[2])) };

  m = s.match(/(\d{1,2})[-/.](\d{4})/); // 03/2022
  if (m) return { year: Number(m[2]), month: clampMonth(Number(m[1])) };

  const yearMatch = s.match(/(19|20)\d{2}/);
  if (!yearMatch) return null;
  const year = Number(yearMatch[0]);

  const nameMatch = s.match(/[a-zçãé]+/gi);
  let month: number | null = null;
  for (const word of nameMatch ?? []) {
    const found = MONTHS[word.toLowerCase()];
    if (found) {
      month = found;
      break;
    }
  }
  return { year, month };
}

function clampMonth(n: number): number | null {
  return n >= 1 && n <= 12 ? n : null;
}

export function isCurrentExperience(exp: any): boolean {
  if (exp?.current === true || exp?.is_current === true) return true;
  const end = String(exp?.end ?? exp?.end_date ?? "").trim();
  if (!end) return false;
  return CURRENT_RE.test(end);
}

/** Formata "março de 2022" para exibição. */
export function formatMonthYear(value: any): string {
  const ym = parseMonthYear(value);
  if (!ym) {
    const s = String(value ?? "").trim();
    return CURRENT_RE.test(s) ? "Atual" : s;
  }
  if (!ym.month) return String(ym.year);
  const names = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${names[ym.month - 1]} de ${ym.year}`;
}

/** Diferença exata em meses, sem arredondamento. */
export function monthsBetween(start: YM, end: YM): number {
  const sm = start.month ?? 1;
  const em = end.month ?? 12;
  return (end.year - start.year) * 12 + (em - sm);
}

/** "2 anos e 5 meses", "8 meses", "1 ano". */
export function formatDuration(totalMonths: number): string {
  const months = Math.max(0, Math.trunc(totalMonths));
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearPart = years === 1 ? "1 ano" : `${years} anos`;
  const monthPart = rest === 1 ? "1 mês" : `${rest} meses`;
  if (years === 0) return rest === 0 ? "menos de 1 mês" : monthPart;
  if (rest === 0) return yearPart;
  return `${yearPart} e ${monthPart}`;
}

/** Tempo na empresa calculado a partir das datas (usa a data atual quando é o emprego atual). */
export function experienceDuration(exp: any): string {
  const start = parseMonthYear(exp?.start ?? exp?.start_date);
  if (!start) return "";
  const current = isCurrentExperience(exp);
  const now = new Date();
  const end = current
    ? { year: now.getFullYear(), month: now.getMonth() + 1 }
    : parseMonthYear(exp?.end ?? exp?.end_date);
  if (!end) return "";
  const months = monthsBetween(start, end);
  if (months < 0) return "";
  return formatDuration(months);
}

/** Período legível: "março de 2022 — agosto de 2024" ou "março de 2022 — Atual". */
export function experiencePeriod(exp: any): string {
  const start = formatMonthYear(exp?.start ?? exp?.start_date);
  const end = isCurrentExperience(exp) ? "Atual" : formatMonthYear(exp?.end ?? exp?.end_date);
  return [start, end].filter(Boolean).join(" — ");
}
