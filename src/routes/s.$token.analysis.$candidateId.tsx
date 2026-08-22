import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalysisContent } from "@/components/shortlist/AnalysisContent";
import { getPortalShortlist } from "@/lib/db/portal.functions";
import { ClientEvaluationPanel, loadIdentity, type PortalIdentity } from "@/components/shortlist/ClientEvaluationPanel";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/s/$token/analysis/$candidateId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Análise do candidato" }] }),
  component: PortalAnalysisPage,
});

function PortalAnalysisPage() {
  const { token, candidateId } = Route.useParams();
  const getFn = useServerFn(getPortalShortlist);
  const { data } = useQuery({ queryKey: ["portal", token], queryFn: () => getFn({ data: { token } }) });
  const [identity, setIdentity] = useState<PortalIdentity | null>(null);
  useEffect(() => { setIdentity(loadIdentity(token)); }, [token]);

  if (!data) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando…</div>;

  const link = (data.candidates as any[]).find((l: any) => l.candidate_id === candidateId);
  const candidate = link?.candidates;
  const evaluation = (data.evaluations as any[]).find((e: any) => e.candidate_id === candidateId) ?? null;

  if (!candidate) {
    return <div className="min-h-screen grid place-items-center p-8 text-sm text-muted-foreground">Candidato não encontrado.</div>;
  }

  const initials = (candidate.full_name ?? "").split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 md:px-8">
          <Link to="/s/$token" params={{ token }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a shortlist
          </Link>
          <div className="ml-auto">
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" /> Baixar PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
        <div className="mb-8 flex items-start gap-4">
          {candidate.photo_url ? (
            <img src={candidate.photo_url} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/20" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-xl font-semibold text-primary">{initials}</div>
          )}
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-primary">Análise · {(data.shortlist as any).jobs?.title}</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{candidate.full_name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{candidate.current_position || "—"}{candidate.city ? ` · ${candidate.city}` : ""}</p>
          </div>
        </div>

        <AnalysisContent
          candidate={candidate}
          jobId={(data.shortlist as any).job_id}
          shortlistId={(data.shortlist as any).id}
          evaluation={evaluation}
          readOnly
        />
        </div>
        {identity && (
          <div className="lg:sticky lg:top-20 lg:self-start print:hidden">
            <ClientEvaluationPanel token={token} candidateId={candidate.id} candidateName={candidate.full_name} identity={identity} />
          </div>
        )}
        </div>
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
