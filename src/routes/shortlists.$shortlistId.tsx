import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, ExternalLink, Send, Sparkles, Trash2 } from "lucide-react";
import { getShortlist, publishShortlist, setShortlistCandidates, deleteShortlist } from "@/lib/db/shortlists.functions";
import { analyzeShortlist } from "@/lib/ai/ai.functions";

export const Route = createFileRoute("/shortlists/$shortlistId")({
  head: () => ({ meta: [{ title: "Shortlist · Moove Select" }] }),
  component: ShortlistDetail,
});

function ShortlistDetail() {
  const { shortlistId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getShortlist);
  const publishFn = useServerFn(publishShortlist);
  const setCandsFn = useServerFn(setShortlistCandidates);
  const delFn = useServerFn(deleteShortlist);
  const aiFn = useServerFn(analyzeShortlist);

  const { data, refetch } = useQuery({ queryKey: ["shortlist", shortlistId], queryFn: () => getFn({ data: { id: shortlistId } }) });
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  if (!data) return <AppShell><div className="text-sm text-muted-foreground">Carregando…</div></AppShell>;

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/s/${data.share_token}`;
  const isSent = data.status === "sent";

  const doPublish = async () => {
    try { await publishFn({ data: { id: shortlistId } }); toast.success("Shortlist publicada"); refetch(); qc.invalidateQueries({ queryKey: ["shortlists"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  const removeCand = async (candId: string) => {
    const remaining = data.candidates.filter((c: any) => c.candidate_id !== candId).map((c: any) => c.candidate_id);
    await setCandsFn({ data: { shortlist_id: shortlistId, candidate_ids: remaining } });
    refetch();
  };

  const analyze = async () => {
    setAiBusy(true);
    try {
      const r: any = await aiFn({ data: { shortlist_id: shortlistId, prompt: aiPrompt || undefined } });
      setAiText(r.text);
    } catch (e: any) { toast.error(e.message); }
    finally { setAiBusy(false); }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-primary">Shortlist #{data.number}</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{data.title || data.jobs?.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{data.clients?.name} · {data.jobs?.title}</p>
          </div>
          <div className="flex gap-2">
            {!isSent && <Button onClick={doPublish}><Send className="mr-1.5 h-4 w-4" /> Publicar</Button>}
            {isSent && (
              <>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Link copiado"); }}>
                  <Copy className="mr-1.5 h-4 w-4" /> Copiar link
                </Button>
                <a href={shareUrl} target="_blank"><Button variant="outline"><ExternalLink className="mr-1.5 h-4 w-4" /> Abrir como cliente</Button></a>
              </>
            )}
            <Button variant="ghost" onClick={async () => { if (confirm("Excluir shortlist?")) { await delFn({ data: { id: shortlistId } }); navigate({ to: "/shortlists" }); } }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isSent && (
          <div className="mb-6 rounded-xl border border-[color:var(--success)]/30 bg-[color:var(--success)]/10 p-4 text-sm">
            <div className="font-semibold text-[color:var(--success)]">Publicada em {new Date(data.published_at!).toLocaleString("pt-BR")}</div>
            <div className="mt-1 text-xs text-muted-foreground break-all">{shareUrl}</div>
          </div>
        )}

        <div className="card-soft mb-6">
          <div className="border-b border-border p-5"><h2 className="font-semibold">Candidatos ({data.candidates.length})</h2></div>
          <div className="divide-y divide-border">
            {data.candidates.map((cl: any) => (
              <div key={cl.candidate_id} className="flex items-center gap-4 p-4">
                {cl.candidates.photo_url ? <img src={cl.candidates.photo_url} className="h-10 w-10 rounded-full object-cover" alt="" /> :
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary text-xs font-semibold">{cl.candidates.full_name.slice(0, 2).toUpperCase()}</div>}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{cl.candidates.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{cl.candidates.current_position || "—"}</div>
                </div>
                {!isSent && <Button variant="ghost" size="sm" onClick={() => removeCand(cl.candidate_id)}>Remover</Button>}
              </div>
            ))}
            {data.candidates.length === 0 && <div className="p-5 text-sm text-muted-foreground">Nenhum candidato. Volte ao wizard para adicionar.</div>}
          </div>
        </div>

        <div className="card-soft p-5">
          <div className="flex items-center gap-2 mb-3"><Sparkles className="h-5 w-5 text-primary" /><div className="font-semibold">Pedir análise da shortlist à IA</div></div>
          <div className="flex gap-2">
            <Input placeholder="Ex: quem tem maior aderência a liderança? sugira ordem de apresentação…" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
            <Button onClick={analyze} disabled={aiBusy}>Analisar</Button>
          </div>
          {aiText && <div className="mt-4 whitespace-pre-wrap text-sm rounded-lg bg-secondary/40 p-4">{aiText}</div>}
        </div>
      </div>
    </AppShell>
  );
}
