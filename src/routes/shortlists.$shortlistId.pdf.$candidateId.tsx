import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getShortlist, listEvaluationsForShortlist } from "@/lib/db/shortlists.functions";
import { getCandidate } from "@/lib/db/candidates.functions";
import { CandidatePdfDocument, parsePdfSections } from "@/components/pdf/CandidatePdfDocument";

export const Route = createFileRoute("/shortlists/$shortlistId/pdf/$candidateId")({
  validateSearch: (s: Record<string, unknown>) => ({
    sections: typeof s.sections === "string" ? s.sections : undefined,
    autoprint: s.autoprint === "1" || s.autoprint === 1 || s.autoprint === true ? 1 : undefined,
  }),
  head: () => ({ meta: [{ title: "PDF do candidato" }] }),
  component: RecruiterPdfPage,
});

function RecruiterPdfPage() {
  const { shortlistId, candidateId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const getSl = useServerFn(getShortlist);
  const evalsFn = useServerFn(listEvaluationsForShortlist);
  const getCand = useServerFn(getCandidate);

  const { data: sl } = useQuery({ queryKey: ["shortlist", shortlistId], queryFn: () => getSl({ data: { id: shortlistId } }) });
  const { data: evaluations } = useQuery({
    queryKey: ["shortlist-evaluations", shortlistId],
    queryFn: () => evalsFn({ data: { shortlist_id: shortlistId } }),
    enabled: !!sl,
  });
  const { data: candidate } = useQuery({ queryKey: ["candidate", candidateId], queryFn: () => getCand({ data: { id: candidateId } }) });

  if (!sl || !candidate || !evaluations) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Preparando PDF…</div>;
  }
  const evaluation = (evaluations as any[]).find((e) => e.candidate_id === candidateId) ?? null;

  return (
    <CandidatePdfDocument
      candidate={candidate}
      jobTitle={(sl as any).jobs?.title}
      jobId={(sl as any).job_id}
      shortlistId={shortlistId}
      evaluation={evaluation}
      sections={parsePdfSections(search.sections)}
      autoprint={!!search.autoprint}
      onSectionsChange={(next) =>
        navigate({ to: ".", search: { sections: next.join(","), autoprint: undefined } as any, replace: true })
      }
    />
  );
}
