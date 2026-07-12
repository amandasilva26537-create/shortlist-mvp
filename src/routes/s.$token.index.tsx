import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { getPortalShortlist, submitPortalFeedback } from "@/lib/db/portal.functions";
import { FlashcardDeck } from "@/components/shortlist/FlashcardDeck";

export const Route = createFileRoute("/s/$token/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Shortlist" }] }),
  component: Portal,
});

function Portal() {
  const { token } = Route.useParams();
  const getFn = useServerFn(getPortalShortlist);
  const sendFn = useServerFn(submitPortalFeedback);
  const { data, refetch } = useQuery({ queryKey: ["portal", token], queryFn: () => getFn({ data: { token } }) });

  const [name, setName] = useState("");
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  if (!data) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando…</div>;

  const send = async (candidate_id: string, decision: "approved" | "rejected" | "second_interview" | null, favorite?: boolean, commentText?: string) => {
    if (!name) { toast.error("Informe seu nome para registrar"); return; }
    await sendFn({ data: { token, candidate_id, client_identifier: name, decision, favorite, comment: commentText ?? null } });
    toast.success("Registrado. Obrigado!");
    setComment(""); setOpenFor(null);
    refetch();
  };

  const links = (data.candidates as any[]).map((cl: any) => ({
    ...cl,
    candidates: cl.candidates,
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-5 py-6">
          <div className="text-[11px] uppercase tracking-widest text-primary">{data.shortlist.clients?.name}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{data.shortlist.title || data.shortlist.jobs?.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.shortlist.jobs?.title} · {data.candidates.length} candidatos apresentados</p>
          {data.shortlist.message && <p className="mt-3 rounded-lg bg-primary-soft p-3 text-sm">{data.shortlist.message}</p>}
        </div>
      </header>

      <div className="mx-auto max-w-4xl p-5">
        <div className="card-soft p-4 mb-6">
          <div className="text-sm font-medium mb-2">Seu nome (para registrar comentários e decisões)</div>
          <Input placeholder="Ex: João Silva — Diretor de Operações" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <FlashcardDeck
          shortlistId={data.shortlist.id}
          jobId={data.shortlist.job_id}
          links={links}
          evaluations={data.evaluations as any[]}
          readOnly
          analysisBasePath={`/s/${token}/analysis`}
          profileBasePath={`/s/${token}/c`}
          actionsSlot={(c) => {
            const cid = c.id;
            return (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => send(cid, "approved")}>
                    <ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => send(cid, "second_interview")}>
                    2ª entrevista
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => send(cid, "rejected")}>
                    <ThumbsDown className="mr-1.5 h-3.5 w-3.5" /> Reprovar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => send(cid, null, true)}>
                    <Heart className="mr-1.5 h-3.5 w-3.5" /> Favoritar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpenFor(openFor === cid ? null : cid)}>
                    <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Comentar
                  </Button>
                </div>
                {openFor === cid && (
                  <div className="mt-3 space-y-2">
                    <Textarea rows={3} placeholder="Sua observação sobre este candidato…" value={comment} onChange={(e) => setComment(e.target.value)} />
                    <Button size="sm" onClick={() => send(cid, null, false, comment)}>Enviar comentário</Button>
                  </div>
                )}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}