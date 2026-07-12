import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Printer, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalysisContent } from "@/components/shortlist/AnalysisContent";
import { getShortlist, listEvaluationsForShortlist } from "@/lib/db/shortlists.functions";

export const Route = createFileRoute("/shortlists/$shortlistId/analysis/$candidateId")({
  head: () => ({ meta: [{ title: "Análise do candidato · Shortlist" }] }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { shortlistId, candidateId } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getShortlist);
  const evalsFn = useServerFn(listEvaluationsForShortlist);

  const { data: sl } = useQuery({
    queryKey: ["shortlist", shortlistId],
    queryFn: () => getFn({ data: { id: shortlistId } }),
  });
  const { data: evaluations = [] } = useQuery({
    queryKey: ["shortlist-evaluations", shortlistId],
    queryFn: () => evalsFn({ data: { shortlist_id: shortlistId } }),
    enabled: !!sl,
  });

  if (!sl) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando…</div>;

  const link = (sl as any).candidates?.find((l: any) => l.candidate_id === candidateId);
  const candidate = link?.candidates;
  const evaluation = evaluations.find((e: any) => e.candidate_id === candidateId) ?? null;

  if (!candidate) {
    return (
      <div className="min-h-screen grid place-items-center p-8 text-sm text-muted-foreground">
        Candidato não encontrado nesta shortlist.
      </div>
    );
  }

  const initials = (candidate.full_name ?? "").split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 md:px-8">
          <Link to="/shortlists/$shortlistId" params={{ shortlistId }} search={{ cursor: candidateId } as any}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a shortlist
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate({
              to: "/candidates/$candidateId",
              params: { candidateId },
              search: { returnTo: `/shortlists/${shortlistId}/analysis/${candidateId}` } as any,
            })}>
              <User className="mr-1.5 h-4 w-4" /> Ver perfil completo
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" /> Baixar PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <div className="mb-8 flex items-start gap-4">
          {candidate.photo_url ? (
            <img src={candidate.photo_url} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/20" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-xl font-semibold text-primary">{initials}</div>
          )}
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-primary">Análise · {(sl as any).jobs?.title}</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{candidate.full_name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{candidate.current_position || "—"}{candidate.city ? ` · ${candidate.city}` : ""}</p>
          </div>
        </div>

        <AnalysisContent
          candidate={candidate}
          jobId={sl.job_id}
          shortlistId={shortlistId}
          evaluation={evaluation}
        />
      </main>

      <style>{`
        @media print {
          @page { margin: 16mm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
