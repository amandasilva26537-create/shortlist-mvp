import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { getJob, getClient } from "@/lib/mock-data";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Check, Star } from "lucide-react";

export const Route = createFileRoute("/jobs/$jobId")({
  loader: ({ params }) => {
    const job = getJob(params.jobId);
    if (!job) throw notFound();
    return job;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} · Vagas` : "Vaga" }],
  }),
  notFoundComponent: () => (
    <AppShell>
      <div className="text-sm text-muted-foreground">Vaga não encontrada.</div>
    </AppShell>
  ),
  errorComponent: () => (
    <AppShell>
      <div className="text-sm text-muted-foreground">Erro ao carregar vaga.</div>
    </AppShell>
  ),
  component: JobDetail,
});

function JobDetail() {
  const job = Route.useLoaderData();
  const client = getClient(job.clientId);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <Link to="/jobs" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Vagas
        </Link>

        <div className="card-elevated p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-widest text-primary">
                {client?.name}
              </div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{job.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {[job.area, job.workModel, `${formatBRL(job.salaryMin)} – ${formatBRL(job.salaryMax)}`].map((t) => (
                  <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <Link to="/shortlists/new">
              <Button className="h-10">
                <Sparkles className="mr-1.5 h-4 w-4" /> Criar shortlist
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{job.description}</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="card-soft p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Check className="h-4 w-4 text-[color:var(--success)]" />
              Critérios eliminatórios
            </div>
            <ul className="space-y-2">
              {job.mustHave.map((c: string) => (
                <li key={c} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="card-soft p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Star className="h-4 w-4 text-[color:var(--gold)]" />
              Critérios desejáveis
            </div>
            <ul className="space-y-2">
              {job.niceToHave.map((c: string) => (
                <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
