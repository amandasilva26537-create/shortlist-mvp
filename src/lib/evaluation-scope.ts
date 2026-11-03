/**
 * Avaliação candidato × vaga: sempre escopada pela VAGA da shortlist.
 * - só vale a avaliação cujo job_id é o da vaga da shortlist (nunca a de outra vaga);
 * - se houver duplicadas antigas do mesmo (candidato, vaga), vale a mais recente.
 */
export function latestPerCandidate<T extends { candidate_id: string; job_id: string; updated_at?: string | null }>(rows: T[], jobId: string): T[] {
  const best = new Map<string, T>();
  for (const r of rows) {
    if (r.job_id !== jobId) continue;
    const cur = best.get(r.candidate_id);
    if (!cur || String(r.updated_at ?? "") > String(cur.updated_at ?? "")) best.set(r.candidate_id, r);
  }
  return [...best.values()];
}

/** Avaliação a exibir numa shortlist da vaga `jobId`: ignora qualquer avaliação ligada a outra vaga. */
export function evaluationForJob<T extends { job_id?: string | null }>(ev: T | null | undefined, jobId: string | undefined): T | null {
  if (!ev) return null;
  return !jobId || ev.job_id === jobId ? ev : null;
}
