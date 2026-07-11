import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { getClient, jobs, shortlists, getJob } from "@/lib/mock-data";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/clients/$clientId")({
  loader: ({ params }) => {
    const client = getClient(params.clientId);
    if (!client) throw notFound();
    return client;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.name} · Clientes` : "Cliente" }],
  }),
  notFoundComponent: () => (
    <AppShell>
      <div className="text-sm text-muted-foreground">Cliente não encontrado.</div>
    </AppShell>
  ),
  errorComponent: () => (
    <AppShell>
      <div className="text-sm text-muted-foreground">Erro ao carregar cliente.</div>
    </AppShell>
  ),
  component: ClientDetail,
});

function ClientDetail() {
  const c = Route.useLoaderData();
  const clientJobs = jobs.filter((j) => j.clientId === c.id);
  const clientShortlists = shortlists.filter((s) => s.clientId === c.id);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <Link to="/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Clientes
        </Link>
        <div className="card-elevated flex flex-wrap items-center gap-5 p-6">
          <Avatar className="h-16 w-16 rounded-2xl">
            <AvatarFallback className="rounded-2xl bg-primary-soft text-primary text-lg font-semibold">
              {initials(c.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
            <div className="mt-1 text-sm text-muted-foreground">{c.contactName}</div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {c.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {c.phone}
              </span>
            </div>
          </div>
          <Button variant="outline">Editar</Button>
        </div>

        <Tabs defaultValue="jobs" className="mt-6">
          <TabsList>
            <TabsTrigger value="jobs">Vagas</TabsTrigger>
            <TabsTrigger value="shortlists">Shortlists</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="jobs" className="mt-4 space-y-2">
            {clientJobs.map((j) => (
              <Link
                key={j.id}
                to="/jobs/$jobId"
                params={{ jobId: j.id }}
                className="card-soft flex items-center justify-between p-4 transition hover:shadow-[var(--shadow-elevated)]"
              >
                <div>
                  <div className="font-semibold">{j.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {j.area} · {j.workModel}
                  </div>
                </div>
                <span className="rounded-full bg-[color:var(--success)]/10 px-2 py-0.5 text-[11px] font-medium text-[color:var(--success)]">
                  Aberta
                </span>
              </Link>
            ))}
          </TabsContent>
          <TabsContent value="shortlists" className="mt-4 space-y-2">
            {clientShortlists.map((s) => (
              <Link
                key={s.id}
                to="/shortlists/$shortlistId"
                params={{ shortlistId: s.id }}
                className="card-soft flex items-center justify-between p-4 transition hover:shadow-[var(--shadow-elevated)]"
              >
                <div>
                  <div className="font-semibold">{getJob(s.jobId)?.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Versão {s.version} · {s.candidateIds.length} candidatos
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{s.createdAt}</span>
              </Link>
            ))}
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <div className="card-soft p-8 text-center text-sm text-muted-foreground">
              Nenhum evento histórico ainda.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
