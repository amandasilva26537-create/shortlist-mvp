import { useEffect, useState } from "react";

export type FeedbackStatus = "approved" | "rejected" | "pending";

export const FEEDBACK_STATUS: Record<FeedbackStatus, { label: string; cls: string }> = {
  approved: { label: "Aprovado", cls: "bg-emerald-500/10 text-emerald-700" },
  rejected: { label: "Reprovado", cls: "bg-red-500/10 text-red-700" },
  pending: { label: "Em análise", cls: "bg-amber-500/10 text-amber-700" },
};

/** Traduz a decisão já salva pelo cliente (manager_feedback.decision) para os 3 status da central. */
export function feedbackStatus(decision: unknown): FeedbackStatus {
  if (decision === "rejected") return "rejected";
  if (decision === "approved" || decision === "approved_stage" || decision === "second_interview" || decision === "favorite_approved")
    return "approved";
  return "pending";
}

export type FeedbackRow = {
  id: string;
  shortlist_id: string;
  candidate_id: string;
  comment: string | null;
  decision: string | null;
  favorite: boolean | null;
  created_at: string;
  updated_at: string | null;
  candidates?: { full_name?: string | null } | null;
  shortlists?: {
    number?: number;
    title?: string | null;
    brand?: string | null;
    jobs?: { id: string; title: string } | null;
    clients?: { id: string; name: string; brand?: string | null } | null;
  } | null;
};

export const feedbackDate = (f: FeedbackRow) => f.updated_at ?? f.created_at;
/** Chave inclui a data: se o cliente atualizar o feedback, volta a aparecer como novo. */
export const feedbackKey = (f: FeedbackRow) => `${f.id}:${feedbackDate(f)}`;

// ---- Estado de "lido" (guardado neste navegador; não altera nenhum dado do sistema) ----
const STORAGE_KEY = "feedback-read-keys";
const EVENT = "feedback-reads-changed";

function load(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function save(keys: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    /* sem armazenamento disponível */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useFeedbackReads() {
  const [read, setRead] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const sync = () => setRead(load());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return {
    isRead: (f: FeedbackRow) => read.has(feedbackKey(f)),
    markRead: (f: FeedbackRow) => save(new Set([...load(), feedbackKey(f)])),
    markUnread: (f: FeedbackRow) => {
      const k = load();
      k.delete(feedbackKey(f));
      save(k);
    },
    markAllRead: (rows: FeedbackRow[]) => save(new Set([...load(), ...rows.map(feedbackKey)])),
  };
}
