import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { getShortlist, getClient, getJob, getCandidate } from "@/lib/mock-data";
import { CandidateCard } from "@/components/candidate/CandidateCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, ExternalLink, GitCompare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shortlists/$shortlistId")({
  loader: ({ params }) => {
    const s = getShortlist(params.shortlistId);
    if (!s) throw notFound();
    return s;
  },
  head: () => ({ meta: [{ title: "Shortlist · Moove Select" }] }),
  notFoundComponent: () => (
    <AppShell>
      <div className="text-sm text-muted-foreground">Shortlist não encontrada.</div>
    </AppShell>
  ),
  errorComponent: () => (
    <AppShell>
      <div className="text-sm text-muted-foreground">Erro ao carregar shortlist.</div>
    </AppShell>
  ),
  component: ShortlistDetail,
});

function ShortlistDetail() {
  const s = Route.useLoaderData();
  const job = getJob(s.jobId);
  const client = getClient(s.clientId);
  const candidates = s.candidateIds.map((id: string) => getCandidate(id)!).filter(Boolean);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/s/${s.shareToken}` : `/s/${s.shareToken}`;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <Link to="/shortlists" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Shortlists
        </Link>

        <div className="card-elevated p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-primary">
                {client?.name} · Versão {s.version}
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{job?.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>{candidates.length} candidatos</span>
                <span>·</span>
                <span>{s.finalists} finalistas</span>
                <span>·</span>
                <span>Criada em {s.createdAt}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/compare"
                search={{ ids: s.candidateIds.slice(0, 3).join(",") }}
              >
                <Button variant="outline" size="sm">
                  <GitCompare className="mr-1.5 h-4 w-4" />
                  Comparar
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(shareUrl);
                  toast.success("Link copiado");
                }}
              >
                <Copy className="mr-1.5 h-4 w-4" />
                Copiar link
              </Button>
              <Link to="/s/$token" params={{ token: s.shareToken }} target="_blank">
                <Button size="sm">
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Abrir portal
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
