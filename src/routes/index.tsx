import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  Briefcase,
  ListChecks,
  MessageSquare,
  Trophy,
  Clock,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/KpiCard";
import { activities, kpis, shortlists, jobs, getClient, getJob } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Dashboard · Moove Select" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-primary">
              Visão geral
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Bom dia, Mariana</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Aqui está o resumo dos processos ativos.
            </p>
          </div>
          <Link to="/shortlists/new">
            <Button size="lg" className="h-11 shadow-[var(--shadow-premium)]">
              <Sparkles className="mr-1.5 h-4 w-4" />
              Nova shortlist
            </Button>
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Clientes ativos" value={kpis.activeClients} icon={Users} />
          <KpiCard label="Vagas abertas" value={kpis.openJobs} icon={Briefcase} />
          <KpiCard label="Shortlists" value={kpis.shortlistsSent} icon={ListChecks} suffix="enviadas" />
          <KpiCard label="Entrevistas" value={kpis.interviews} icon={MessageSquare} />
          <KpiCard label="Contratações" value={kpis.hires} icon={Trophy} trend="+2 este mês" />
          <KpiCard label="Tempo médio" value={kpis.avgProcessDays} icon={Clock} suffix="dias" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Shortlists ativas */}
          <div className="card-soft lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="text-base font-semibold">Shortlists em andamento</h2>
                <p className="text-xs text-muted-foreground">Processos com atividade recente</p>
              </div>
              <Link to="/shortlists" className="text-xs font-medium text-primary hover:underline">
                Ver todas
              </Link>
            </div>
            <div className="divide-y divide-border">
              {shortlists.map((s) => {
                const client = getClient(s.clientId);
                const job = getJob(s.jobId);
                return (
                  <Link
                    key={s.id}
                    to="/shortlists/$shortlistId"
                    params={{ shortlistId: s.id }}
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-secondary/40"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary text-sm font-semibold">
                      v{s.version}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{job?.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {client?.name} · {s.candidateIds.length} candidatos · {s.finalists} finalistas
                      </div>
                    </div>
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                        (s.status === "published"
                          ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                          : "bg-secondary text-muted-foreground")
                      }
                    >
                      {s.status === "published" ? "Publicada" : "Rascunho"}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Atividades */}
          <div className="card-soft">
            <div className="border-b border-border p-5">
              <h2 className="text-base font-semibold">Últimas atividades</h2>
              <p className="text-xs text-muted-foreground">Eventos dos processos ativos</p>
            </div>
            <ul className="divide-y divide-border">
              {activities.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      <span className="font-semibold">{a.who}</span>{" "}
                      <span className="text-muted-foreground">{a.what}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {a.where} · {a.when}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Vagas abertas */}
        <div className="mt-6 card-soft">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="text-base font-semibold">Vagas abertas</h2>
            <Link to="/jobs" className="text-xs font-medium text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => {
              const client = getClient(job.clientId);
              return (
                <Link
                  key={job.id}
                  to="/jobs/$jobId"
                  params={{ jobId: job.id }}
                  className="bg-card p-5 transition hover:bg-secondary/40"
                >
                  <div className="text-xs font-medium text-primary">{client?.name}</div>
                  <div className="mt-1 line-clamp-2 text-sm font-semibold">{job.title}</div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{job.area}</span>
                    <span>·</span>
                    <span>{job.workModel}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
