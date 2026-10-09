import { Star } from "lucide-react";
import { FEEDBACK_STATUS, feedbackStatus, feedbackDate, type FeedbackRow } from "@/lib/feedback-center";

export function FeedbackItem({ r, unread, onOpen, onToggle }: { r: FeedbackRow; unread: boolean; onOpen: () => void; onToggle?: () => void }) {
  const st = FEEDBACK_STATUS[feedbackStatus(r.decision)];
  const brand = (r.shortlists?.brand ?? r.shortlists?.clients?.brand ?? "portus") === "moove" ? "Moove Talent" : "Portus";
  return (
    <div className={"flex items-start gap-3 px-5 py-4 " + (unread ? "bg-primary-soft/40" : "")}>
      <span className={"mt-2 h-2 w-2 shrink-0 rounded-full " + (unread ? "bg-primary" : "bg-transparent")} aria-label={unread ? "Não lido" : "Lido"} />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className={"text-sm " + (unread ? "font-semibold" : "font-medium")}>{r.candidates?.full_name ?? "Candidato"}</span>
          <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + st.cls}>{st.label}</span>
          {r.favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{brand}</span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {r.shortlists?.clients?.name ?? "—"} · {r.shortlists?.jobs?.title ?? "—"}
        </div>
        {r.comment && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-foreground/80">{r.comment}</p>}
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
        <span>{new Date(feedbackDate(r)).toLocaleDateString("pt-BR")}</span>
        {onToggle && (
          <button type="button" onClick={onToggle} className="text-primary hover:underline">
            {unread ? "Marcar como lido" : "Marcar como não lido"}
          </button>
        )}
      </div>
    </div>
  );
}
