import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/layout/AppShell";
import { getJob } from "@/lib/db/jobs.functions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Pencil } from "lucide-react";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Vaga · Moove List" }] }),
  component: JobDetail,
});

function JobDetail() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const fn = useServerFn(getJob);
  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fn({ data: { id: jobId } }),
  });

  if (isLoading) return <AppShell><div className="text-sm text-muted-foreground">Carregando…</div></AppShell>;
  if (!job) return <AppShell><div className="text-sm text-muted-foreground">Vaga não encontrada.</div></AppShell>;

  const j: any = job;
  const ais: any = j.ai_structure ?? {};
  const chips = [j.area, j.work_model, j.contract_type, j.location].filter(Boolean);

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
                {j.clients?.name}
              </div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{j.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map((t: string) => (
                  <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate({ to: "/jobs/new", search: { edit: j.id } as any })}>
                <Pencil className="mr-1.5 h-4 w-4" /> Editar
              </Button>
              <Link to="/shortlists/new" search={{ job: j.id }}>
                <Button><Sparkles className="mr-1.5 h-4 w-4" /> Criar shortlist</Button>
              </Link>
            </div>
          </div>

          {(ais.summary || j.description) && (
            <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {ais.summary || j.description}
            </p>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SectionList title="Critérios eliminatórios" items={(ais.must_have ?? j.must_have ?? []).map((x: any) => x?.name ?? x)} />
          <SectionList title="Critérios desejáveis" items={(ais.nice_to_have ?? j.nice_to_have ?? []).map((x: any) => x?.name ?? x)} />
          <SectionList title="Hard skills" items={j.hard_skills ?? []} />
          <SectionList title="Soft skills" items={j.soft_skills ?? []} />
          <SectionList title="Responsabilidades" items={ais.responsibilities ?? []} />
          <SectionList title="Resultados esperados" items={ais.expected_results ?? []} />
        </div>
      </div>
    </AppShell>
  );
}

function SectionList({ title, items }: { title: string; items: any[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="card-soft p-6">
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      <ul className="space-y-2">
        {items.map((c: any, i: number) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{typeof c === "string" ? c : c?.name ?? JSON.stringify(c)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
