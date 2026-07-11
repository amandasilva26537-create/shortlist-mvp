import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { getCandidate } from "@/lib/mock-data";
import { CandidateProfile } from "@/components/candidate/CandidateProfile";
import { ManagerFeedbackPanel } from "@/components/candidate/ManagerFeedbackPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown } from "lucide-react";

export const Route = createFileRoute("/candidates/$candidateId")({
  loader: ({ params }) => {
    const c = getCandidate(params.candidateId);
    if (!c) throw notFound();
    return c;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.fullName} · Perfil` : "Candidato" }],
  }),
  notFoundComponent: () => (
    <AppShell>
      <div className="text-sm text-muted-foreground">Candidato não encontrado.</div>
    </AppShell>
  ),
  errorComponent: () => (
    <AppShell>
      <div className="text-sm text-muted-foreground">Erro ao carregar candidato.</div>
    </AppShell>
  ),
  component: CandidatePage,
});

function CandidatePage() {
  const c = Route.useLoaderData();

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/shortlists"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <Link to="/pdf/$candidateId" params={{ candidateId: c.id }} target="_blank">
            <Button variant="outline" size="sm">
              <FileDown className="mr-1.5 h-4 w-4" />
              Gerar PDF
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <CandidateProfile candidate={c} />
          </div>
          <div>
            <ManagerFeedbackPanel />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
