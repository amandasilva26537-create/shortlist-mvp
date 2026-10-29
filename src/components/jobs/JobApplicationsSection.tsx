import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, Undo2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getResumeDownloadUrl, listJobApplications, updateApplication } from "@/lib/db/applications.functions";

const STAGES: { key: string; label: string }[] = [
  { key: "applied", label: "Recebidas" }, { key: "screening", label: "Triagem" }, { key: "interview", label: "Entrevista" },
  { key: "tests", label: "Testes" }, { key: "shortlisted", label: "Shortlist" }, { key: "client_interview", label: "Entrevista com cliente" },
  { key: "offer", label: "Proposta" }, { key: "hired", label: "Contratado" },
];
const PURPOSE_LABEL: Record<string, string> = {
  selection_process: "Processo seletivo", talent_pool: "Banco de talentos", client_sharing: "Compartilhar com cliente",
  ai_analysis: "Análise por IA", international_transfer: "Transf. internacional",
};
const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

export function JobApplicationsSection({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listJobApplications);
  const dlFn = useServerFn(getResumeDownloadUrl);
  const updFn = useServerFn(updateApplication);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [showRejected, setShowRejected] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["applications", jobId], queryFn: () => listFn({ data: { job_id: jobId } }) });
  const upd = useMutation({
    mutationFn: (v: { application_id: string; stage?: string; status?: "active" | "rejected" | "withdrawn"; rejection_reason?: string | null }) => updFn({ data: v as any }),
    onSuccess: () => { setRejecting(null); setReason(""); qc.invalidateQueries({ queryKey: ["applications", jobId] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  if (isLoading || data?.missing) return null;

  const download = async (id: string) => {
    try { const { url } = await dlFn({ data: { resume_id: id } }); window.open(url, "_blank", "noopener"); }
    catch (e: any) { toast.error(e?.message ?? "Erro ao baixar"); }
  };
  const items: any[] = data?.items ?? [];
  const active = items.filter((a) => a.status === "active" || a.status === "hired");
  const rejected = items.filter((a) => a.status === "rejected" || a.status === "withdrawn");

  const Card = ({ a }: { a: any }) => (
    <div className="rounded-lg border border-border bg-card p-3 text-xs">
      <Link to="/candidates/$candidateId" params={{ candidateId: a.candidate_id }} className="text-sm font-medium hover:underline">{a.candidate?.full_name}</Link>
      <div className="mt-0.5 break-all text-muted-foreground">{[a.candidate?.email, a.candidate?.phone].filter(Boolean).join(" · ")}</div>
      <div className="text-muted-foreground">{[a.candidate?.city, fmt(a.applied_at)].filter(Boolean).join(" · ")}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {a.consents.map((c: string) => <span key={c} className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{PURPOSE_LABEL[c] ?? c}</span>)}
      </div>
      {a.resumes.some((r: any) => r.flags?.includes("pdf_encrypted")) && <div className="mt-1 text-[11px] text-amber-700">PDF com senha: leitura automática indisponível.</div>}
      {a.status === "active" || a.status === "hired" ? (
        <div className="mt-2 space-y-2">
          <Select value={a.stage} onValueChange={(v) => upd.mutate({ application_id: a.id, stage: v as any })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1.5">
            {a.resumes.map((r: any) => <Button key={r.id} size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => download(r.id)}><Download className="mr-1 h-3 w-3" />Currículo</Button>)}
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setRejecting(a.id); setReason(""); }}><XCircle className="mr-1 h-3 w-3" />Reprovar</Button>
          </div>
          {rejecting === a.id && (
            <div className="space-y-1.5">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional, uso interno)" className="h-8 text-xs" />
              <div className="flex gap-1.5">
                <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => upd.mutate({ application_id: a.id, status: "rejected", rejection_reason: reason })}>Confirmar reprovação</Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setRejecting(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-1.5">
          <div className="text-muted-foreground">{a.status === "rejected" ? "Reprovado" : "Desistiu"}{a.rejection_reason ? ` — ${a.rejection_reason}` : ""}</div>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => upd.mutate({ application_id: a.id, status: "active" })}><Undo2 className="mr-1 h-3 w-3" />Reativar</Button>
        </div>
      )}
    </div>
  );

  return (
    <section className="card-soft mt-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Funil de candidatos ({active.length} ativos)</div>
        {rejected.length > 0 && <Button size="sm" variant="ghost" onClick={() => setShowRejected((v) => !v)}>{showRejected ? "Ocultar" : "Ver"} reprovados/desistentes ({rejected.length})</Button>}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma candidatura recebida pela Página de Carreiras ainda.</p>
      ) : (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((s) => {
            const col = active.filter((a) => a.stage === s.key);
            return (
              <div key={s.key} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between text-xs font-medium"><span>{s.label}</span><span className="text-muted-foreground">{col.length}</span></div>
                <div className="space-y-2">{col.map((a) => <Card key={a.id} a={a} />)}</div>
              </div>
            );
          })}
        </div>
      )}
      {showRejected && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{rejected.map((a) => <Card key={a.id} a={a} />)}</div>}
    </section>
  );
}
