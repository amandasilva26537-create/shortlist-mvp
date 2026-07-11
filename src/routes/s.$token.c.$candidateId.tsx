import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getShortlistByToken, getCandidate } from "@/lib/mock-data";
import { CandidateProfile } from "@/components/candidate/CandidateProfile";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, MessageSquarePlus, FileDown, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/s/$token/c/$candidateId")({
  loader: ({ params }) => {
    const s = getShortlistByToken(params.token);
    const c = getCandidate(params.candidateId);
    if (!s || !c) throw notFound();
    return { shortlist: s, candidate: c };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.candidate.fullName} · Perfil` : "Perfil" },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center p-8 text-sm text-muted-foreground">
      Perfil não encontrado.
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center p-8 text-sm text-muted-foreground">
      Erro ao carregar perfil.
    </div>
  ),
  component: PortalCandidatePage,
});

function PortalCandidatePage() {
  const { shortlist, candidate } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-8">
          <Link
            to="/s/$token"
            params={{ token: shortlist.shareToken }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Shortlist
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/pdf/$candidateId" params={{ candidateId: candidate.id }} target="_blank">
              <Button variant="outline" size="sm">
                <FileDown className="mr-1.5 h-4 w-4" />
                PDF
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <CandidateProfile candidate={candidate} />
      </main>

      {/* Sticky decision bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 md:px-8">
          <div className="hidden items-center gap-2 md:flex">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{candidate.fullName}</span>
          </div>
          <div className="ml-auto flex flex-1 items-center gap-2 md:flex-none">
            <Button
              variant="outline"
              className="flex-1 md:flex-none"
              onClick={() => toast("Comentário enviado ao recrutador")}
            >
              <MessageSquarePlus className="mr-1.5 h-4 w-4" />
              Comentar
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/5 md:flex-none"
              onClick={() => toast("Candidato reprovado")}
            >
              <X className="mr-1.5 h-4 w-4" />
              Reprovar
            </Button>
            <Button
              className="flex-1 bg-[color:var(--success)] text-white hover:opacity-90 md:flex-none"
              onClick={() => toast.success("Candidato aprovado")}
            >
              <Check className="mr-1.5 h-4 w-4" />
              Aprovar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
