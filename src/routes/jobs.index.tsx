import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Eye, Pencil, Trash2, ListChecks, Copy } from "lucide-react";
import { listJobs, deleteJob } from "@/lib/db/jobs.functions";
import { ensureJobTrackingToken } from "@/lib/db/tracking.functions";
import { toast } from "sonner";
import { stageLabel } from "@/lib/process-stages";
import { JOB_STATUSES, jobStatusInfo, normalizeJobStatus } from "@/lib/job-status";

export const Route = createFileRoute("/jobs/")({
  head: () => ({
    meta: [
      { title: "Vagas · Moove List" },
      { name: "description", content: "Gerencie vagas ativas, requisitos e status de cada processo seletivo em um único painel executivo." },
      { property: "og:title", content: "Vagas · Moove List" },
      { property: "og:description", content: "Painel de vagas abertas e em andamento na Moove List." },
      { property: "og:url", content: "https://intel-select-hub.lovable.app/jobs" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://intel-select-hub.lovable.app/jobs" }],
  }),
  component: JobsPage,
});

function JobsPage() {
  const fn = useServerFn(listJobs);
  const delFn = useServerFn(deleteJob);
  const tokenFn = useServerFn(ensureJobTrackingToken);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: allJobs } = useQuery({ queryKey: ["jobs"], queryFn: () => fn() });
  const [filter, setFilter] = useState<string>("all");
  const jobs = allJobs?.filter((j: any) => filter === "all" || normalizeJobStatus(j.status) === filter);

  /** Copia o link público de acompanhamento (gera o código se a vaga ainda não tiver). */
  const copyTrackingLink = async (j: any) => {
    try {
      const token: string = j.tracking_token ?? (await tokenFn({ data: { job_id: j.id } })).token;
      await navigator.clipboard.writeText(`${window.location.origin}/acompanhamento/${token}`);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Link de acompanhamento copiado");
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível copiar o link");
    }
  };

  const openTracking = async (j: any) => {
    try {
      const token: string = j.tracking_token ?? (await tokenFn({ data: { job_id: j.id } })).token;
      window.open(`/acompanhamento/${token}`, "_blank", "noopener");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível abrir o acompanhamento");
    }
  };

  const onDelete = async (id: string, title: string) => {
    if (!confirm(`Excluir a vaga "${title}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await delFn({ data: { id } });
      toast.success("Vaga excluída");
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Vagas</h1>
            <p className="mt-1 text-sm text-muted-foreground">{jobs?.length ?? 0} vagas</p>
          </div>
          <Link to="/jobs/new"><Button><Plus className="mr-1.5 h-4 w-4" /> Nova vaga</Button></Link>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {[{ value: "all", label: "Todas" }, ...JOB_STATUSES].map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => setFilter(st.value)}
              className={"rounded-full border px-3 py-1 text-xs font-medium transition " + (filter === st.value ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:text-foreground")}
            >
              {st.label}
            </button>
          ))}
        </div>

        {allJobs && allJobs.length > 0 && jobs && jobs.length === 0 && (
          <div className="card-soft p-8 text-center text-sm text-muted-foreground">Nenhuma vaga com este status.</div>
        )}

        {jobs && allJobs && allJobs.length === 0 && (
          <div className="card-soft p-10 text-center">
            <div className="text-lg font-semibold">Você ainda não possui vagas cadastradas.</div>
            <div className="mt-5"><Link to="/jobs/new"><Button>Criar primeira vaga</Button></Link></div>
          </div>
        )}

        <div className="card-soft divide-y divide-border">
          {jobs?.map((j: any) => (
            <div key={j.id} className="p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Briefcase className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1 basis-64">
                  <div className="font-semibold leading-snug">{j.title}</div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">{j.clients?.name} · {j.area || "—"} · {j.work_model || "—"}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <span className={"h-1.5 w-1.5 rounded-full " + jobStatusInfo(j.status).dot} />
                      {jobStatusInfo(j.status).label}
                    </span>
                    {stageLabel(j.process_stage) && (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Etapa: {stageLabel(j.process_stage)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/jobs/$jobId", params: { jobId: j.id } })} aria-label={`Ver ${j.title}`}>
                    <Eye className="mr-1.5 h-4 w-4" /> Ver
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/jobs/new", search: { edit: j.id } as any })} aria-label={`Editar ${j.title}`}>
                    <Pencil className="mr-1.5 h-4 w-4" /> Editar
                  </Button>
                  <Link to="/shortlists/new" search={{ job: j.id }}>
                    <Button size="sm" variant="outline">Shortlist</Button>
                  </Link>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(j.id, j.title)} aria-label={`Excluir ${j.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 sm:ml-[60px]">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Acompanhamento</span>
                <Button size="sm" variant="outline" className="h-8" onClick={() => openTracking(j)} aria-label={`Visualizar acompanhamento de ${j.title}`}>
                  <ListChecks className="mr-1.5 h-4 w-4" /> Visualizar
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => copyTrackingLink(j)} aria-label={`Copiar link de acompanhamento de ${j.title}`}>
                  <Copy className="mr-1.5 h-4 w-4" /> Copiar link
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
