/**
 * Indicadores de recrutamento — cálculos puros (sem banco), testáveis.
 * Só usa dados REGISTRADOS. Quando falta dado, devolve null ("Sem dados"); nunca estima.
 *
 * Fontes e regras
 * - Abertura da vaga: jobs.created_at. Fechamento real: último registro da etapa "closed" (Vaga encerrada) no histórico do processo,
 *   somente quando a vaga está com status "Fechada". A data prevista de entrega da shortlist NÃO é prazo de fechamento.
 * - Shortlist enviada: tem published_at e não é rascunho. Contada uma vez por id; ordenada pela data real de envio.
 * - Contratação: candidato com status "contratado" em shortlist da vaga OU candidatura (ATS) com status "hired"; 1 por (vaga, candidato).
 * - Recrutador responsável: responsável informado na shortlist enviada mais recente; senão, o dono dessa shortlist (perfil);
 *   senão, quem criou a vaga; senão "Sem responsável".
 */

export type Brand = "moove" | "portus";
export const normBrand = (b: unknown): Brand => (String(b ?? "").toLowerCase().startsWith("moove") ? "moove" : "portus");
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export interface JobRow { id: string; title: string; status: string | null; created_at: string; client_id: string; created_by: string | null }
export interface ClientRow { id: string; name: string; brand: string | null }
export interface ShortlistRow { id: string; job_id: string; status: string; published_at: string | null; created_at: string; responsible: string | null; owner_id: string | null }
export interface LinkRow { shortlist_id: string; candidate_id: string; status: string }
export interface HiredApp { job_id: string; candidate_id: string }

export interface Dataset {
  jobs: JobRow[]; clients: ClientRow[]; shortlists: ShortlistRow[]; hiredLinks: LinkRow[]; hiredApps: HiredApp[];
  /** job_id → datas (ISO) em que a etapa "Vaga encerrada" foi registrada */
  closedStageDates: Record<string, string[]>;
  /** user_id → nome */
  people: Record<string, string>;
}
export interface Filters { brands: Brand[]; brand?: Brand | "all"; from?: string | null; to?: string | null; clientId?: string | null; recruiter?: string | null }

const NO_RECRUITER = "Sem responsável";
const jobStatus = (s: unknown): "open" | "closed" | "paused" | "cancelled" => (s === "paused" || s === "cancelled" || s === "closed" ? s : "open");
const t = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);
const DAY = 86_400_000;

export interface JobComputed {
  id: string; title: string; clientId: string; client: string; brand: Brand; status: "open" | "closed" | "paused" | "cancelled";
  recruiter: string; recruiterKey: string;
  openedAt: string; closedAt: string | null; daysToClose: number | null;
  sent: { id: string; at: string }[]; hires: number;
  /** n = nº da shortlist; "in_progress" = vaga aberta; "unknown" = não identificado; "na" = pausada/cancelada */
  closedOn: { kind: "n"; n: number } | { kind: "in_progress" } | { kind: "unknown" } | { kind: "na" };
  hireDate: string | null;
}

export function computeJobs(d: Dataset): JobComputed[] {
  const clientById = new Map(d.clients.map((c) => [c.id, c]));
  const sentByJob = new Map<string, ShortlistRow[]>();
  const seen = new Set<string>();
  for (const s of d.shortlists) {
    if (seen.has(s.id)) continue; seen.add(s.id);
    if (!s.published_at || s.status === "draft" || isNaN(t(s.published_at))) continue;
    (sentByJob.get(s.job_id) ?? sentByJob.set(s.job_id, []).get(s.job_id)!).push(s);
  }
  for (const l of sentByJob.values()) l.sort((a, b) => t(a.published_at) - t(b.published_at) || t(a.created_at) - t(b.created_at) || a.id.localeCompare(b.id));
  const hiredBy = new Map<string, Map<string, string[]>>(); // job → candidate → shortlist ids
  const slJob = new Map(d.shortlists.map((s) => [s.id, s.job_id]));
  for (const l of d.hiredLinks) {
    const jid = slJob.get(l.shortlist_id); if (!jid) continue;
    const m = hiredBy.get(jid) ?? hiredBy.set(jid, new Map()).get(jid)!;
    m.set(l.candidate_id, [...(m.get(l.candidate_id) ?? []), l.shortlist_id]);
  }
  const hiredApps = new Map<string, Set<string>>();
  for (const a of d.hiredApps) (hiredApps.get(a.job_id) ?? hiredApps.set(a.job_id, new Set()).get(a.job_id)!).add(a.candidate_id);

  return d.jobs.flatMap((j): JobComputed[] => {
    const c = clientById.get(j.client_id);
    if (!c) return [];
    const status = jobStatus(j.status);
    const sent = sentByJob.get(j.id) ?? [];
    const last = [...sent].reverse().find((s) => s.responsible?.trim());
    const label = last?.responsible?.trim() || (sent.length && sent[sent.length - 1]!.owner_id ? d.people[sent[sent.length - 1]!.owner_id!] : "") || (j.created_by ? d.people[j.created_by] : "") || NO_RECRUITER;
    const dates = (d.closedStageDates[j.id] ?? []).filter((x) => !isNaN(t(x))).sort();
    const closedAt = status === "closed" && dates.length ? dates[dates.length - 1]! : null;
    const days = closedAt && t(closedAt) >= t(j.created_at) ? Math.round((t(closedAt) - t(j.created_at)) / DAY) : null;
    const hm = hiredBy.get(j.id) ?? new Map<string, string[]>();
    const candidates = new Set<string>([...hm.keys(), ...(hiredApps.get(j.id) ?? [])]);
    // shortlist de fechamento: a mais antiga (por envio) que contém candidato contratado
    let closedOn: JobComputed["closedOn"];
    if (status === "open") closedOn = { kind: "in_progress" };
    else if (status !== "closed") closedOn = { kind: "na" };
    else {
      const hiredSl = new Set([...hm.values()].flat());
      const idx = sent.findIndex((s) => hiredSl.has(s.id));
      closedOn = idx >= 0 ? { kind: "n", n: idx + 1 } : { kind: "unknown" };
    }
    // data da contratação: fechamento da vaga, ou envio da shortlist em que o candidato consta como contratado
    const hiredSent = sent.find((s) => [...hm.values()].flat().includes(s.id));
    const hireDate = closedAt ?? hiredSent?.published_at ?? null;
    return [{
      id: j.id, title: j.title, clientId: c.id, client: c.name, brand: normBrand(c.brand), status, recruiter: label, recruiterKey: norm(label),
      openedAt: j.created_at, closedAt, daysToClose: days, sent: sent.map((s) => ({ id: s.id, at: s.published_at! })), hires: candidates.size, closedOn, hireDate,
    }];
  });
}

export const inPeriod = (iso: string | null, from?: string | null, to?: string | null): boolean => {
  if (!from && !to) return true;
  if (!iso) return false; // sem data não entra em período filtrado
  const x = t(iso);
  if (from && x < t(from + "T00:00:00")) return false;
  if (to && x > t(to + "T23:59:59.999")) return false;
  return true;
};

export interface Stats {
  open: number; closed: number; closedUndated: number; avgDays: number | null; avgDaysBase: number; closedWithDate: number;
  sentShortlists: number; hires: number; avgShortlistsPerClosed: number | null; shortlistsInClosed: number;
}

export function computeStats(jobs: JobComputed[], f: Pick<Filters, "from" | "to">): Stats {
  const open = jobs.filter((j) => j.status === "open" && (!f.to || t(j.openedAt) <= t(f.to + "T23:59:59.999"))).length;
  const closedAll = jobs.filter((j) => j.status === "closed");
  const hasPeriod = !!(f.from || f.to);
  const closed = closedAll.filter((j) => (hasPeriod ? inPeriod(j.closedAt, f.from, f.to) : true));
  const dated = closed.filter((j) => j.daysToClose != null);
  const avg = dated.length ? Math.round((dated.reduce((s, j) => s + (j.daysToClose as number), 0) / dated.length) * 10) / 10 : null;
  const sent = jobs.reduce((n, j) => n + j.sent.filter((s) => inPeriod(s.at, f.from, f.to)).length, 0);
  const hires = jobs.reduce((n, j) => n + (j.hires > 0 && inPeriod(j.hireDate, f.from, f.to) ? j.hires : 0), 0);
  const slClosed = closed.reduce((n, j) => n + j.sent.length, 0);
  return {
    open, closed: closed.length, closedUndated: hasPeriod ? 0 : closedAll.filter((j) => !j.closedAt).length, avgDays: avg, avgDaysBase: dated.length, closedWithDate: dated.length,
    sentShortlists: sent, hires, shortlistsInClosed: slClosed, avgShortlistsPerClosed: closed.length ? Math.round((slClosed / closed.length) * 10) / 10 : null,
  };
}

/** Vagas fechadas por mês (só as que têm data de fechamento registrada). */
export function closedByMonth(jobs: JobComputed[], f: Pick<Filters, "from" | "to">): { month: string; count: number }[] {
  const m = new Map<string, number>();
  for (const j of jobs) if (j.status === "closed" && j.closedAt && inPeriod(j.closedAt, f.from, f.to)) { const k = j.closedAt.slice(0, 7); m.set(k, (m.get(k) ?? 0) + 1); }
  if (!m.size) return [];
  const keys = [...m.keys()].sort();
  const out: { month: string; count: number }[] = [];
  let [y, mo] = keys[0]!.split("-").map(Number) as [number, number];
  const [ey, em] = keys[keys.length - 1]!.split("-").map(Number) as [number, number];
  while (y < ey || (y === ey && mo <= em)) { const k = `${y}-${String(mo).padStart(2, "0")}`; out.push({ month: k, count: m.get(k) ?? 0 }); mo += 1; if (mo > 12) { mo = 1; y += 1; } }
  return out;
}

export interface RecruiterRow { recruiter: string; key: string; jobs: number; closed: number; avgDays: number | null; avgDaysBase: number; sent: number; avgShortlistsPerClosed: number | null; hires: number }
export function byRecruiter(jobs: JobComputed[], f: Pick<Filters, "from" | "to">): RecruiterRow[] {
  const groups = new Map<string, JobComputed[]>();
  for (const j of jobs) (groups.get(j.recruiterKey) ?? groups.set(j.recruiterKey, []).get(j.recruiterKey)!).push(j);
  return [...groups.entries()].map(([key, list]) => {
    const s = computeStats(list, f);
    return { recruiter: list[0]!.recruiter, key, jobs: list.length, closed: s.closed, avgDays: s.avgDays, avgDaysBase: s.avgDaysBase, sent: s.sentShortlists, avgShortlistsPerClosed: s.avgShortlistsPerClosed, hires: s.hires };
  }).sort((a, b) => b.jobs - a.jobs || a.recruiter.localeCompare(b.recruiter, "pt-BR"));
}

/** Filtra por empresa/cliente/recrutador (o período é aplicado em cada métrica). */
export function applyFilters(jobs: JobComputed[], f: Filters): JobComputed[] {
  const brands = new Set(f.brands);
  return jobs.filter((j) => brands.has(j.brand) && (!f.brand || f.brand === "all" || j.brand === f.brand) && (!f.clientId || j.clientId === f.clientId) && (!f.recruiter || j.recruiterKey === f.recruiter));
}

/** Linhas da tabela "Desempenho das Shortlists": vagas com envio no período ou fechadas no período. */
export function shortlistRows(jobs: JobComputed[], f: Pick<Filters, "from" | "to">): JobComputed[] {
  const hasPeriod = !!(f.from || f.to);
  return jobs
    .filter((j) => j.sent.length > 0 && (!hasPeriod || j.sent.some((s) => inPeriod(s.at, f.from, f.to)) || (j.status === "closed" && inPeriod(j.closedAt, f.from, f.to))))
    .sort((a, b) => t(b.sent[b.sent.length - 1]!.at) - t(a.sent[a.sent.length - 1]!.at));
}
