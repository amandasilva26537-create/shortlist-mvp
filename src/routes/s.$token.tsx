import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Heart, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { getPortalShortlist, submitPortalFeedback } from "@/lib/db/portal.functions";

export const Route = createFileRoute("/s/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Shortlist · Moove Select" }] }),
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
          <div className="text-sm font-medium mb-2">Seu nome (para registrar comentários)</div>
          <Input placeholder="Ex: João Silva — Diretor de Operações" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-4">
          {data.candidates.map((cl: any) => {
            const c = cl.candidates;
            const ev = data.evaluations.find((e: any) => e.candidate_id === c.id);
            const docs = data.documents.filter((d: any) => d.candidate_id === c.id);
            return (
              <div key={c.id} className="card-elevated p-5">
                <div className="flex items-start gap-4">
                  {c.photo_url ? <img src={c.photo_url} className="h-16 w-16 rounded-full object-cover" alt="" /> :
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary font-semibold">{c.full_name.slice(0, 2).toUpperCase()}</div>}
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold">{c.full_name}</div>
                    <div className="text-sm text-muted-foreground">{c.current_position || "—"} · {c.city || "—"}</div>
                    {ev?.overall_match != null && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                        <Sparkles className="h-3 w-3" /> Aderência {ev.overall_match}%
                      </div>
                    )}
                  </div>
                </div>

                {ev?.ai_generated && (
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="font-medium">{ev.ai_generated.headline}</div>
                    <div className="text-muted-foreground">{ev.ai_generated.mini_bio}</div>
                    {ev.ai_generated.strengths?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium uppercase text-muted-foreground">Pontos fortes</div>
                        <ul className="mt-1 list-disc list-inside">{ev.ai_generated.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}

                {docs.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {docs.map((d: any) => <a key={d.id} href={d.url} target="_blank" className="text-xs rounded-full bg-secondary px-3 py-1 hover:bg-secondary/70">{d.label || d.kind}</a>)}
                    {c.linkedin_url && <a href={c.linkedin_url} target="_blank" className="text-xs rounded-full bg-secondary px-3 py-1 hover:bg-secondary/70">LinkedIn</a>}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button size="sm" variant="outline" onClick={() => send(c.id, "approved")}><ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Aprovar</Button>
                  <Button size="sm" variant="outline" onClick={() => send(c.id, "second_interview")}>2ª entrevista</Button>
                  <Button size="sm" variant="outline" onClick={() => send(c.id, "rejected")}><ThumbsDown className="mr-1.5 h-3.5 w-3.5" /> Reprovar</Button>
                  <Button size="sm" variant="outline" onClick={() => send(c.id, null, true)}><Heart className="mr-1.5 h-3.5 w-3.5" /> Favoritar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpenFor(openFor === c.id ? null : c.id)}><MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Comentar</Button>
                </div>
                {openFor === c.id && (
                  <div className="mt-3 space-y-2">
                    <Textarea rows={3} placeholder="Sua observação sobre este candidato…" value={comment} onChange={(e) => setComment(e.target.value)} />
                    <Button size="sm" onClick={() => send(c.id, null, false, comment)}>Enviar comentário</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
