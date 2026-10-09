/** Status da vaga. "open" já era o valor usado pelas vagas existentes (= Em andamento). */
export const JOB_STATUSES = [
  { value: "open", label: "Em andamento", dot: "bg-emerald-500" },
  { value: "paused", label: "Pausada", dot: "bg-amber-500" },
  { value: "cancelled", label: "Cancelada", dot: "bg-red-500" },
  { value: "closed", label: "Fechada", dot: "bg-slate-500" },
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number]["value"];

/** Qualquer valor antigo/vazio (ex.: "draft") é tratado como "Em andamento". */
export function normalizeJobStatus(v: unknown): JobStatus {
  return v === "paused" || v === "cancelled" || v === "closed" ? v : "open";
}

export function jobStatusInfo(v: unknown) {
  const s = normalizeJobStatus(v);
  return JOB_STATUSES.find((x) => x.value === s)!;
}
