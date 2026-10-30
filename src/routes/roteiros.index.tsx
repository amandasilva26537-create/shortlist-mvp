import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { listJobs } from "@/lib/db/jobs.functions";
import { listInterviewScripts } from "@/lib/db/interviews.functions";
import { jobStatusInfo } from "@/lib/job-status";

export const Route = createFileRoute("/roteiros/")({
  head: () => ({ meta: [{ title: "Roteiros de Entrevista · Moove List" }] }),
  component: RoteirosPage,
});

function RoteirosPage() {
  const jobsFn = useServerFn(listJobs);
  const sFn = useServerFn(listInterviewScripts);
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => jobsFn() });
  const { data: sc } = useQuery({ queryKey: ["interview-scripts"], queryFn: () => sFn() });
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <PageHeader eyebrow="Ferramentas" title="Roteiros de Entrevista" description="Roteiro do recrutador por vaga, gerado com os requisitos reais cadastrados: 30 min (operacional) ou 45 min (liderança), com critérios objetivos de avaliação." />
        {sc && !sc.available && <div className="card-soft mb-4 p-4 text-sm text-muted-foreground">Os roteiros ainda não foram ativados no banco de dados.</div>}
        <div className="card-soft divide-y divide-border">
          {(jobs as any[]).length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhuma vaga cadastrada.</div>}
          {(jobs as any[]).map((j) => {
            const r = sc?.byJob?.[j.id];
            return (
              <div key={j.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{j.title}</div><div className="text-xs text-muted-foreground">{j.clients?.name} · {jobStatusInfo(j.status).label}</div></div>
                <span className={"rounded-full px-2.5 py-1 text-[11px] font-medium " + (r ? "border border-border" : "bg-secondary text-muted-foreground")}>{r ? `Roteiro de ${r.duration_min} min` : "Sem roteiro"}</span>
                <Link to="/jobs/$jobId" params={{ jobId: j.id }} hash="roteiro"><Button size="sm"><Pencil className="mr-1.5 h-3.5 w-3.5" />{r ? "Abrir roteiro" : "Criar roteiro"}</Button></Link>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
