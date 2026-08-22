import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, HelpCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getPortalFeedback, submitPortalFeedback } from "@/lib/db/portal.functions";

export type PortalIdentity = { name: string; role: string };

const IDENTITY_PREFIX = "moovelist-portal-identity:";

export function loadIdentity(token: string): PortalIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_PREFIX + token);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v?.name && v?.role) return { name: String(v.name), role: String(v.role) };
    return null;
  } catch {
    return null;
  }
}

export function saveIdentity(token: string, identity: PortalIdentity) {
  try {
    localStorage.setItem(IDENTITY_PREFIX + token, JSON.stringify(identity));
  } catch {
    /* ignore */
  }
}

const DECISIONS = [
  { key: "approved_stage", label: "Aprovado nesta fase", icon: Check, color: "#16A34A" },
  { key: "rejected", label: "Reprovado", icon: X, color: "#DC2626" },
  { key: "undecided", label: "Ainda não decidi", icon: HelpCircle, color: "#F59E0B" },
] as const;

interface Props {
  token: string;
  candidateId: string;
  candidateName: string;
  identity: PortalIdentity;
  className?: string;
}

export function ClientEvaluationPanel({ token, candidateId, candidateName, identity, className }: Props) {
  const getFn = useServerFn(getPortalFeedback);
  const sendFn = useServerFn(submitPortalFeedback);

  const { data: rows, refetch } = useQuery({
    queryKey: ["portal-feedback", token, identity.name],
    queryFn: () => getFn({ data: { token, client_identifier: identity.name } }),
  });

  const [decision, setDecision] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!rows) return;
    if (hydratedFor.current === candidateId) return;
    hydratedFor.current = candidateId;
    const existing = (rows as any[]).find((r) => r.candidate_id === candidateId);
    setDecision(existing?.decision ?? null);
    setFavorite(!!existing?.favorite);
    setComment(existing?.comment ?? "");
    setSavedAt(existing ? "saved" : null);
  }, [candidateId, rows]);

  const save = async () => {
    const nextDecision = decision;
    const nextFavorite = favorite;
    setSaving(true);
    try {
      await sendFn({
        data: {
          token,
          candidate_id: candidateId,
          client_identifier: identity.name,
          client_role: identity.role || null,
          decision: nextDecision ?? null,
          favorite: nextFavorite,
          comment: comment || null,
        },
      });
      setSavedAt("saved");
      toast.success("Avaliação salva.");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  const pickDecision = (key: string) => {
    setDecision((d) => (d === key ? null : key));
    setSavedAt(null);
  };

  const toggleFavorite = () => {
    setFavorite((f) => !f);
    setSavedAt(null);
  };

  return (
    <section className={cn("rounded-xl border border-border bg-card p-4", className)} aria-label="Avaliação do candidato">
      <h2 className="text-base font-semibold">Qual é a sua opinião sobre este candidato?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Avaliando <b className="text-foreground">{candidateName}</b>
      </p>

      <div className="mt-4 grid gap-2">
        {DECISIONS.map((d) => {
          const active = decision === d.key;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => pickDecision(d.key)}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition"
              style={
                active
                  ? { backgroundColor: d.color, borderColor: d.color, color: "#fff" }
                  : { borderColor: d.color, color: d.color, backgroundColor: `${d.color}14` }
              }
              aria-pressed={active}
            >
              <d.icon className="h-4 w-4" />
              {d.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={toggleFavorite}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition"
          style={
            favorite
              ? { backgroundColor: "#2563EB", borderColor: "#2563EB", color: "#fff" }
              : { borderColor: "#2563EB", color: "#2563EB", backgroundColor: "#2563EB14" }
          }
          aria-pressed={favorite}
        >
          <Star className={cn("h-4 w-4", favorite && "fill-current")} />
          Favorito
        </button>
      </div>

      <div className="mt-4">
        <Textarea
          rows={5}
          value={comment}
          onChange={(e) => { setComment(e.target.value); setSavedAt(null); }}
          placeholder="Conte o que você achou do perfil, quais pontos chamaram sua atenção e o que gostaria de aprofundar."
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Seu comentário nos ajuda a entender melhor sua avaliação e dar continuidade ao processo com mais agilidade.
        </p>
        <Button className="mt-3 w-full" onClick={() => save()} disabled={saving}>
          {saving ? "Salvando…" : "Salvar avaliação"}
        </Button>
        {savedAt && !saving && (
          <p className="mt-2 text-center text-xs text-[color:var(--success,#16A34A)]">Avaliação salva.</p>
        )}
      </div>
    </section>
  );
}
