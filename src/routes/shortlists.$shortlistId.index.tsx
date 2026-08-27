import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import { Copy, ExternalLink, Send, Trash2, Loader2, Wand2, UserMinus } from "lucide-react";
import {
  getShortlist,
  publishShortlist,
  deleteShortlist,
  updateShortlistOrder,
  listEvaluationsForShortlist,
  removeCandidateFromShortlist,
} from "@/lib/db/shortlists.functions";
import { evaluateCandidateForJob } from "@/lib/ai/ai.functions";
import { FlashcardDeck } from "@/components/shortlist/FlashcardDeck";
import { AddCandidateDialog } from "@/components/shortlist/AddCandidateDialog";

export const Route = createFileRoute("/shortlists/$shortlistId/")({
  head: () => ({ meta: [{ title: "Shortlist · Moove List" }] }),
  component: ShortlistDetail,
});

function ShortlistDetail() {
  const { shortlistId } = Route.useParams();
  const search = Route.useSearch() as { cursor?: string };
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getFn = useServerFn(getShortlist);
  const evalsFn = useServerFn(listEvaluationsForShortlist);
  const publishFn = useServerFn(publishShortlist);
  const delFn = useServerFn(deleteShortlist);
  const reorderFn = useServerFn(updateShortlistOrder);
  const evaluateFn = useServerFn(evaluateCandidateForJob);
  const removeFn = useServerFn(removeCandidateFromShortlist);


  const { data, refetch } = useQuery({
    queryKey: ["shortlist", shortlistId],
    queryFn: () => getFn({ data: { id: shortlistId } }),
  });
  const { data: evaluations = [] } = useQuery({
    queryKey: ["shortlist-evaluations", shortlistId],
    queryFn: () => evalsFn({ data: { shortlist_id: shortlistId } }),
    enabled: !!data,
  });

  const [batchBusy, setBatchBusy] = useState(false);

  if (!data) return <AppShell><div className="text-sm text-muted-foreground">Carregando…</div></AppShell>;

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/s/${data.share_token}`;
  const isSent = data.status === "sent";

  const doPublish = async () => {
    try {
      await publishFn({ data: { id: shortlistId } });
      toast.success("Shortlist publicada");
      refetch();
      qc.invalidateQueries({ queryKey: ["shortlists"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const reorder = async (orderedIds: string[]) => {
    try {
      await reorderFn({ data: { shortlist_id: shortlistId, ordered_candidate_ids: orderedIds } });
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const analyzeAll = async () => {
    setBatchBusy(true);
    try {
      const missing = (data.candidates as any[]).filter(
        (c) => !evaluations.find((e: any) => e.candidate_id === c.candidate_id && typeof e.overall_match === "number"),
      );
      if (missing.length === 0) {
        toast.info("Todos os candidatos já possuem análise. Use 'Recalcular' no painel para atualizar.");
        setBatchBusy(false);
        return;
      }
      for (const c of missing) {
        await evaluateFn({ data: { candidate_id: c.candidate_id, job_id: data.job_id, shortlist_id: shortlistId } });
      }
      qc.invalidateQueries({ queryKey: ["shortlist-evaluations", shortlistId] });
      toast.success(`Análise concluída para ${missing.length} candidato(s)`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBatchBusy(false); }
  };

  /** Retira o candidato apenas desta shortlist — o cadastro permanece no sistema. */
  const removeFromShortlist = async (candidateId: string, name?: string) => {
    if (!confirm(`Remover ${name || "o candidato"} desta shortlist? O cadastro continua no sistema.`)) return;
    try {
      await removeFn({ data: { shortlist_id: shortlistId, candidate_id: candidateId } });
      toast.success("Candidato removido da shortlist");
      refetch();
      qc.invalidateQueries({ queryKey: ["shortlists"] });
      qc.invalidateQueries({ queryKey: ["shortlist-evaluations", shortlistId] });
    } catch (e: any) { toast.error(e.message); }
  };

  const candidateIds = ((data as any).candidates ?? []).map((c: any) => c.candidate_id);

  const refreshCandidates = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ["shortlists"] });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-primary">Shortlist #{data.number}</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{data.title || (data as any).jobs?.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{(data as any).clients?.name} · {(data as any).jobs?.title}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={analyzeAll} disabled={batchBusy}>
              {batchBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
              Analisar todos
            </Button>
            {!isSent && <Button onClick={doPublish}><Send className="mr-1.5 h-4 w-4" /> Publicar</Button>}
            {isSent && (
              <>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Link copiado"); }}>
                  <Copy className="mr-1.5 h-4 w-4" /> Copiar link
                </Button>
                <a href={shareUrl} target="_blank" rel="noreferrer"><Button variant="outline"><ExternalLink className="mr-1.5 h-4 w-4" /> Abrir como cliente</Button></a>
              </>
            )}
            <Button variant="ghost" onClick={async () => {
              if (confirm("Excluir shortlist?")) { await delFn({ data: { id: shortlistId } }); navigate({ to: "/shortlists" }); }
            }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isSent && (
          <div className="mb-6 rounded-xl border border-[color:var(--success)]/30 bg-[color:var(--success)]/10 p-4 text-sm">
            <div className="font-semibold text-[color:var(--success)]">Publicada em {new Date((data as any).published_at!).toLocaleString("pt-BR")}</div>
            <div className="mt-1 text-xs text-muted-foreground break-all">{shareUrl}</div>
          </div>
        )}

        <FlashcardDeck
          shortlistId={shortlistId}
          jobId={data.job_id}
          links={(data as any).candidates ?? []}
          evaluations={evaluations as any[]}
          initialCandidateId={search.cursor}
          onReorder={reorder}
        />

      </div>
    </AppShell>
  );
}