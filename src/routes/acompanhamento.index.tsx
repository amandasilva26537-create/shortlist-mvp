import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Eye, Pencil } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { listJobs } from "@/lib/db/jobs.functions";
import { ensureJobTrackingToken } from "@/lib/db/tracking.functions";
import { stageLabel } from "@/lib/process-stages";
import { jobStatusInfo } from "@/lib/job-status";

export const Route = createFileRoute("/acompanhamento/")({
  head: () => ({ meta: [{ title: "Acompanhamento de Vagas · Moove List" }] }),
  component: AcompanhamentoPage,
});

/** Atalho para o módulo de acompanhamento existente: mesmas etapas, links e histórico — nenhuma regra nova. */
function AcompanhamentoPage() {
  const qc = useQueryClient();
  const jobsFn = useServerFn(listJobs);
  const tokenFn = useServerFn(ensureJobTrackingToken);
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => jobsFn() });
  const token = async (j: any) => { const t: string = j.tracking_token ?? (await tokenFn({ data: { job_id: j.id } })).token; qc.invalidateQueries({ queryKey: ["jobs"] }); return t; };
  const open = async (j: any) => { try { window.open(`/acompanhamento/${await token(j)}`, "_blank", "noopener"); } catch (e: any) { toast.error(e.message ?? "Erro"); } };
  const copy = async (j: any) => { try { await navigator.clipboard.writeText(`${window.location.origin}/acompanhamento/${await token(j)}`); toast.success("Link de acompanhamento copiado"); } catch (e: any) { toast.error(e.message ?? "Erro"); } };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <PageHeader eyebrow="Gestão de recrutamento" title="Acompanhamento de Vagas" description="Etapa atual de cada processo. Abra a linha do tempo, copie o link do cliente ou edite a etapa no cadastro da vaga." />
        <div className="card-soft divide-y divide-border">
          {(jobs as any[]).length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhuma vaga cadastrada.</div>}
          {(jobs as any[]).map((j) => (
            <div key={j.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{j.title}</div>
                <div className="text-xs text-muted-foreground">{j.clients?.name} · {jobStatusInfo(j.status).label}</div>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium">{stageLabel(j.process_stage) ?? "Sem etapa registrada"}</span>
              <Button size="sm" variant="outline" onClick={() => open(j)}><Eye className="mr-1.5 h-3.5 w-3.5" />Linha do tempo</Button>
              <Button size="sm" variant="outline" onClick={() => copy(j)}><Copy className="mr-1.5 h-3.5 w-3.5" />Copiar link</Button>
              <Link to="/jobs/new" search={{ edit: j.id } as any}><Button size="sm" variant="ghost"><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar etapa</Button></Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
