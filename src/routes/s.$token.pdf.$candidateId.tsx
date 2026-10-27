import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPortalCandidate, getPortalShortlist } from "@/lib/db/portal.functions";
import { CandidatePdfDocument, parsePdfSections } from "@/components/pdf/CandidatePdfDocument";

export const Route = createFileRoute("/s/$token/pdf/$candidateId")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    sections: typeof s.sections === "string" ? s.sections : undefined,
    autoprint: s.autoprint === "1" || s.autoprint === 1 || s.autoprint === true ? 1 : undefined,
  }),
  head: () => ({ meta: [{ title: "PDF do candidato" }] }),
  component: PortalPdfPage,
});

function PortalPdfPage() {
  const { token, candidateId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const candFn = useServerFn(getPortalCandidate);
  const slFn = useServerFn(getPortalShortlist);
  const { data } = useQuery({ queryKey: ["portal-candidate", token, candidateId], queryFn: () => candFn({ data: { token, candidate_id: candidateId } }) });
  const { data: sl } = useQuery({ queryKey: ["portal", token], queryFn: () => slFn({ data: { token } }) });

  if (!data || !sl) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Preparando PDF…</div>;
  }

  return (
    <CandidatePdfDocument
      candidate={data.candidate}
      jobTitle={(sl.shortlist as any)?.jobs?.title}
      jobId={(sl.shortlist as any).job_id}
      shortlistId={data.shortlist_id}
      evaluation={data.evaluation}
      sections={parsePdfSections(search.sections)}
      autoprint={!!search.autoprint}
      onSectionsChange={(next) =>
        navigate({ to: ".", search: { sections: next.join(","), autoprint: undefined } as any, replace: true })
      }
    />
  );
}
