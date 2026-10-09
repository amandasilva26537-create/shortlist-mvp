/** Etapas do processo seletivo (independentes do "Status da vaga"). */
export const PROCESS_STAGES = [
  { value: "published", label: "Vaga divulgada" },
  { value: "receiving_cvs", label: "Recebimento de currículos" },
  { value: "screening", label: "Triagem de currículos" },
  { value: "interviews", label: "Entrevistas" },
  { value: "tests", label: "Testes e avaliações" },
  { value: "shortlist_sent", label: "Shortlist enviada" },
  { value: "post_interview_feedback", label: "Feedback pós-entrevista" },
  { value: "decision_offer", label: "Decisão e proposta" },
  { value: "closed", label: "Vaga encerrada" },
] as const;

export type ProcessStage = (typeof PROCESS_STAGES)[number]["value"];

export const stageIndex = (v: unknown) => PROCESS_STAGES.findIndex((s) => s.value === v);
export const stageLabel = (v: unknown) => PROCESS_STAGES.find((s) => s.value === v)?.label ?? null;
