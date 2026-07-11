import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase } from "lucide-react";
import { listJobs } from "@/lib/db/jobs.functions";

export const Route = createFileRoute("/jobs")({
  head: () => ({ meta: [{ title: "Vagas · Moove Select" }] }),
  component: JobsPage,
});

function JobsPage() {
  const fn = useServerFn(listJobs);
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: () => fn() });

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

        {jobs && jobs.length === 0 && (
          <div className="card-soft p-10 text-center">
            <div className="text-lg font-semibold">Você ainda não possui vagas cadastradas.</div>
            <div className="mt-5"><Link to="/jobs/new"><Button>Criar primeira vaga</Button></Link></div>
          </div>
        )}

        <div className="card-soft divide-y divide-border">
          {jobs?.map((j: any) => (
            <div key={j.id} className="flex items-center gap-4 p-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><Briefcase className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{j.title}</div>
                <div className="truncate text-xs text-muted-foreground">{j.clients?.name} · {j.area || "—"} · {j.work_model || "—"}</div>
              </div>
              <Link to="/shortlists/new" search={{ job: j.id }}><Button size="sm" variant="outline">Criar shortlist</Button></Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
