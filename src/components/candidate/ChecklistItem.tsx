import { Check, Minus, X } from "lucide-react";
import type { ChecklistStatus } from "@/lib/mock-data";

const styles: Record<ChecklistStatus, { bg: string; text: string; icon: typeof Check; label: string }> = {
  yes: { bg: "bg-[color:var(--success)]/10", text: "text-[color:var(--success)]", icon: Check, label: "Atende" },
  partial: {
    bg: "bg-[color:var(--warning)]/15",
    text: "text-[color:var(--warning)]",
    icon: Minus,
    label: "Parcial",
  },
  no: { bg: "bg-destructive/10", text: "text-destructive", icon: X, label: "Não atende" },
};

export function ChecklistItem({ requirement, status }: { requirement: string; status: ChecklistStatus }) {
  const s = styles[status];
  const Icon = s.icon;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${s.bg} ${s.text}`}>
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{requirement}</div>
      </div>
      <div className={`text-xs font-semibold ${s.text}`}>{s.label}</div>
    </div>
  );
}
