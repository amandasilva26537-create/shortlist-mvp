import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { listJobs } from "@/lib/db/jobs.functions";
import { getApplicationsOverview } from "@/lib/db/overview.functions";
import { jobStatusInfo, normalizeJobStatus } from "@/lib/job-status";

export const Route = createFileRoute("/candidaturas")({
  head: () => ({ meta: [{ title: "Candidaturas · Moove List" }] }),
  component: CandidaturasPage,
});

function CandidaturasPage() {
  const jobsFn = useServerFn(listJobs);
  const ovFn = useServerFn(getApplicationsOverview);
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => jobsFn() });
  const { data: ov } = useQuery({ queryKey: ["applications-overview"], queryFn: () => ovFn() });

  const byClient = new Map<string, any[]>();
  for (const j of jobs as any[]) {
    const stats = ov?.perJob?.[j.id];
    if (!stats && normalizeJobStatus(j.status) !== "open") continue; // vagas sem candidaturas só aparecem se estiverem abertas
    const k = j.clients?.name ?? "Sem cliente";
    byClient.set(k, [...(byClient.get(k) ?? []), j]);
  }
  const clients = [...byClient.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <PageHeader eyebrow="Gestão de recrutamento" title="Candidaturas" description="Inscritos nas vagas divulgadas, organizados por cliente e vaga. Abra uma vaga para ver currículos, Match, ranking e status." />
        {ov && !ov.available && <div className="card-soft p-6 text-sm text-muted-foreground">O recebimento de candidaturas ainda não foi ativado no banco de dados.</div>}
        {ov?.available && clients.length === 0 && <div className="card-soft p-6 text-sm text-muted-foreground">Nenhuma candidatura recebida ainda.</div>}
        <div className="space-y-6">
          {clients.map(([client, list]) => (
            <section key={client}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{client}</h2>
              <div className="card-soft divide-y divide-border">
                {list.map((j: any) => {
                  const s = ov?.perJob?.[j.id];
                  const st = jobStatusInfo(j.status);
                  return (
                    <Link key={j.id} to="/jobs/$jobId" params={{ jobId: j.id }} hash="candidaturas" className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-secondary/40">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{j.title}</div>
                        <div className="text-xs text-muted-foreground">{st.label}{s?.last_at ? ` · última candidatura em ${new Date(s.last_at).toLocaleDateString("pt-BR")}` : ""}</div>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="rounded-full bg-secondary px-2.5 py-1">{s?.active ?? 0} ativas</span>
                        <span className="rounded-full border border-emerald-600 px-2.5 py-1 text-emerald-700">{s?.prescreened ?? 0} pré-triadas</span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
