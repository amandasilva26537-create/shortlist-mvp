import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getShortlistByToken, getJob, getClient, getCandidate } from "@/lib/mock-data";
import { CandidateCard } from "@/components/candidate/CandidateCard";
import { Sparkles, Check, Circle } from "lucide-react";

export const Route = createFileRoute("/s/$token")({
  loader: ({ params }) => {
    const s = getShortlistByToken(params.token);
    if (!s) throw notFound();
    return s;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? "Shortlist · Moove Select" : "Shortlist" }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center p-8 text-sm text-muted-foreground">
      Link inválido ou expirado.
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center p-8 text-sm text-muted-foreground">
      Erro ao carregar shortlist.
    </div>
  ),
  component: PortalPage,
});

const timeline = [
  { label: "Briefing", done: true },
  { label: "Mapeamento", done: true },
  { label: "Entrevistas", done: true },
  { label: "Shortlist", done: true, current: true },
  { label: "Decisão", done: false },
];

function PortalPage() {
  const s = Route.useLoaderData();
  const job = getJob(s.jobId);
  const client = getClient(s.clientId);
  const candidates = s.candidateIds.map((id: string) => getCandidate(id)!).filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      {/* Portal header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 md:px-8">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Moove Select</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Portal do cliente
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="card-elevated overflow-hidden">
          <div className="bg-gradient-to-br from-primary-soft to-transparent p-6 md:p-8">
            <div className="text-[11px] font-medium uppercase tracking-widest text-primary">
              {client?.name}
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              {job?.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Versão {s.version}</span> da shortlist
              </div>
              <div>
                <span className="font-medium text-foreground">{candidates.length}</span> candidatos apresentados
              </div>
              <div>
                <span className="font-medium text-foreground">{s.finalists}</span> finalistas
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="border-t border-border bg-card px-6 py-5 md:px-8">
            <ol className="flex flex-wrap items-center gap-y-3">
              {timeline.map((step, i) => (
                <li key={step.label} className="flex items-center gap-2">
                  <div
                    className={
                      "grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold " +
                      (step.done
                        ? step.current
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                          : "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                        : "bg-secondary text-muted-foreground")
                    }
                  >
                    {step.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                  </div>
                  <span
                    className={
                      "text-xs " +
                      (step.current
                        ? "font-semibold text-foreground"
                        : step.done
                          ? "text-foreground"
                          : "text-muted-foreground")
                    }
                  >
                    {step.label}
                  </span>
                  {i < timeline.length - 1 && (
                    <div className="mx-2 h-px w-8 bg-border md:w-14" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">Candidatos</h2>
          <p className="text-sm text-muted-foreground">
            Toque em um card para explorar o perfil executivo.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c: typeof candidates[number]) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                to="/s/$token/c/$candidateId"
                params={{ token: s.shareToken, candidateId: c.id }}
              />
            ))}
          </div>
        </section>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Apresentado por <span className="font-semibold text-foreground">Moove Select</span> ·
          Consultorias entregam currículos. Nós entregamos inteligência.
        </footer>
        <div className="mt-2 text-center">
          <Link to="/" className="text-[11px] text-muted-foreground hover:underline">
            Área interna
          </Link>
        </div>
      </main>
    </div>
  );
}
