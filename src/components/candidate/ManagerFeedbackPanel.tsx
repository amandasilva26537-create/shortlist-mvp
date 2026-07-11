import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Heart, Check, X, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ManagerFeedbackPanel() {
  const [rating, setRating] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [decision, setDecision] = useState<"approved" | "rejected" | "second" | null>(null);
  const [note, setNote] = useState("");

  return (
    <aside className="card-soft p-5 sticky top-20">
      <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Seu parecer</div>
      <h3 className="mt-1 text-base font-semibold">Observações do gestor</h3>

      <div className="mt-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Nota</div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className="rounded-md p-1 transition hover:bg-secondary"
              aria-label={`${n} estrelas`}
            >
              <Star
                className={cn(
                  "h-5 w-5 transition",
                  n <= rating ? "fill-[color:var(--gold)] text-[color:var(--gold)]" : "text-muted-foreground",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-start", favorite && "border-primary bg-primary-soft text-primary")}
          onClick={() => setFavorite((f) => !f)}
        >
          <Heart className={cn("mr-1.5 h-4 w-4", favorite && "fill-primary")} />
          Favorito
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Decisão</div>
        <div className="grid grid-cols-1 gap-2">
          {[
            { key: "approved", label: "Aprovar", icon: Check, tone: "success" as const },
            { key: "second", label: "2ª entrevista", icon: CalendarPlus, tone: "primary" as const },
            { key: "rejected", label: "Reprovar", icon: X, tone: "danger" as const },
          ].map((d) => {
            const active = decision === d.key;
            const tone =
              d.tone === "success"
                ? "border-[color:var(--success)] bg-[color:var(--success)]/10 text-[color:var(--success)]"
                : d.tone === "danger"
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-primary bg-primary-soft text-primary";
            return (
              <button
                key={d.key}
                onClick={() => setDecision(d.key as typeof decision)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  active ? tone : "border-border bg-card hover:bg-secondary",
                )}
              >
                <d.icon className="h-4 w-4" />
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Comentário privado</div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Suas observações ficam apenas para você."
          rows={4}
          className="resize-none"
        />
      </div>

      <Button
        className="mt-4 w-full"
        onClick={() => toast.success("Parecer registrado")}
      >
        Salvar parecer
      </Button>
    </aside>
  );
}
