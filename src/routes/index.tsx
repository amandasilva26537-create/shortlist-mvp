import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, Briefcase, ListChecks, MessageSquare, Sparkles, ArrowUpRight,
  FilePlus, UserPlus, FileText, Send,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { listClients } from "@/lib/db/clients.functions";
import { listJobs } from "@/lib/db/jobs.functions";
import { listShortlists } from "@/lib/db/shortlists.functions";
import { listCandidates } from "@/lib/db/candidates.functions";
import { listDrafts } from "@/lib/db/drafts.functions";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard · Moove List" }] }),
  component: Dashboard,
});

function useAll() {
  const clients = useServerFn(listClients);
  const jobs = useServerFn(listJobs);
  const shortlists = useServerFn(listShortlists);
  const cands = useServerFn(listCandidates);
  const drafts = useServerFn(listDrafts);
  return { clients, jobs, shortlists, cands, drafts };
}

function Dashboard() {
  const fns = useAll();
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [clients, jobs, shortlists, candidates, drafts] = await Promise.all([
        fns.clients(), fns.jobs(), fns.shortlists(), fns.cands(), fns.drafts(),
      ]);
      return { clients, jobs, shortlists, candidates, drafts };
    },
  });

  const data = q.data;
  const sent = data?.shortlists.filter((s: any) => s.status === "sent").length ?? 0;
  const drafts = data?.shortlists.filter((s: any) => s.status === "draft").length ?? 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Visão geral</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Painel do recrutador</h1>
            <p className="mt-1 text-sm text-muted-foreground">Comandos rápidos e status dos processos ativos.</p>
          </div>
        </header>

        {/* Ações rápidas */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <QuickAction to="/clients/new" icon={UserPlus} label="Novo cliente" />
          <QuickAction to="/jobs/new" icon={Briefcase} label="Nova vaga" />
          <QuickAction to="/shortlists/new" icon={Sparkles} label="Nova shortlist" primary />
          <QuickAction to="/candidates/new" icon={FilePlus} label="Novo candidato" />
          <QuickAction to="/shortlists" icon={ListChecks} label="Shortlists enviadas" />
          <QuickAction to="/shortlists" icon={FileText} label="Continuar rascunho" />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
          <KpiCard label="Clientes" value={data?.clients.length ?? 0} icon={Users} />
          <KpiCard label="Vagas abertas" value={data?.jobs.length ?? 0} icon={Briefcase} />
          <KpiCard label="Candidatos" value={data?.candidates.length ?? 0} icon={FilePlus} />
          <KpiCard label="Shortlists enviadas" value={sent} icon={Send} />
          <KpiCard label="Rascunhos" value={drafts} icon={FileText} />
          <KpiCard label="Feedbacks" value={0} icon={MessageSquare} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card-soft lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="text-base font-semibold">Shortlists recentes</h2>
                <p className="text-xs text-muted-foreground">Últimos processos criados ou publicados</p>
              </div>
              <Link to="/shortlists" className="text-xs font-medium text-primary hover:underline">Ver todas</Link>
            </div>
            {(!data || data.shortlists.length === 0) ? (
              <EmptyRow label="Nenhuma shortlist ainda." cta={{ to: "/shortlists/new", label: "Criar primeira shortlist" }} />
            ) : (
              <div className="divide-y divide-border">
                {data.shortlists.slice(0, 6).map((s: any) => (
                  <Link key={s.id} to="/shortlists/$shortlistId" params={{ shortlistId: s.id }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/40">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary text-sm font-semibold">#{s.number}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{s.title || s.jobs?.title || "Shortlist"}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.clients?.name} · {s.jobs?.title}</div>
                    </div>
                    <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + (s.status === "sent" ? "bg-[color:var(--success)]/10 text-[color:var(--success)]" : "bg-secondary text-muted-foreground")}>
                      {s.status === "sent" ? "Enviada" : "Rascunho"}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card-soft">
            <div className="border-b border-border p-5">
              <h2 className="text-base font-semibold">Continuar de onde parei</h2>
              <p className="text-xs text-muted-foreground">Rascunhos salvos automaticamente</p>
            </div>
            {(!data || data.drafts.length === 0) ? (
              <div className="p-5 text-sm text-muted-foreground">Nenhum rascunho aberto.</div>
            ) : (
              <ul className="divide-y divide-border">
                {data.drafts.slice(0, 6).map((d: any) => (
                  <li key={d.id} className="px-5 py-3">
                    <div className="text-sm font-medium">{d.title || `Rascunho de ${d.kind}`}</div>
                    <div className="text-xs text-muted-foreground">{new Date(d.updated_at).toLocaleString("pt-BR")}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function QuickAction({ to, icon: Icon, label, primary }: { to: string; icon: any; label: string; primary?: boolean }) {
  return (
    <Link to={to} className={"card-soft flex items-center gap-3 p-4 transition hover:shadow-[var(--shadow-elevated)] " + (primary ? "!bg-primary !text-primary-foreground" : "")}>
      <div className={"grid h-10 w-10 place-items-center rounded-lg " + (primary ? "bg-white/15" : "bg-primary-soft text-primary")}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-semibold leading-tight">{label}</div>
    </Link>
  );
}

function EmptyRow({ label, cta }: { label: string; cta: { to: string; label: string } }) {
  return (
    <div className="p-8 text-center">
      <div className="text-sm text-muted-foreground mb-4">{label}</div>
      <Link to={cta.to}><Button>{cta.label}</Button></Link>
    </div>
  );
}
