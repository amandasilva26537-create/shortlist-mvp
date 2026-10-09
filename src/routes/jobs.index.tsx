import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Eye, Pencil, Trash2 } from "lucide-react";
import { listJobs, deleteJob } from "@/lib/db/jobs.functions";
import { toast } from "sonner";
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
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: allJobs } = useQuery({ queryKey: ["jobs"], queryFn: () => fn() });
  const [filter, setFilter] = useState<string>("all");
  const jobs = allJobs?.filter((j: any) => filter === "all" || normalizeJobStatus(j.status) === filter);

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
            <div key={j.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><Briefcase className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate font-semibold">{j.title}</div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <span className={"h-1.5 w-1.5 rounded-full " + jobStatusInfo(j.status).dot} />
                    {jobStatusInfo(j.status).label}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">{j.clients?.name} · {j.area || "—"} · {j.work_model || "—"}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate({ to: "/jobs/$jobId", params: { jobId: j.id } })}
                  aria-label={`Ver ${j.title}`}
                >
                  <Eye className="mr-1.5 h-4 w-4" /> Ver
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate({ to: "/jobs/new", search: { edit: j.id } as any })}
                  aria-label={`Editar ${j.title}`}
                >
                  <Pencil className="mr-1.5 h-4 w-4" /> Editar
                </Button>
                <Link to="/shortlists/new" search={{ job: j.id }}>
                  <Button size="sm" variant="outline">Shortlist</Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(j.id, j.title)}
                  aria-label={`Excluir ${j.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
