import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus } from "lucide-react";
import { z } from "zod";
import { getPortalShortlist } from "@/lib/db/portal.functions";
import { generatePortalCompareInsights } from "@/lib/ai/compare.functions";
import { CompareView } from "@/components/compare/CompareView";
import { PortalWordmark } from "@/components/shortlist/PortusBrand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/s/$token/compare")({
  validateSearch: z.object({ ids: z.string().optional() }),
  head: () => ({ meta: [{ title: "Comparar candidatos" }] }),
  component: PortalCompare,
});

const MAX = 3;

function PortalCompare() {
  const { token } = Route.useParams();
  const { ids } = Route.useSearch();
  const navigate = Route.useNavigate();
  const getFn = useServerFn(getPortalShortlist);
  const insightsFn = useServerFn(generatePortalCompareInsights);
  const { data } = useQuery({ queryKey: ["portal", token], queryFn: () => getFn({ data: { token } }) });
  const [picked, setPicked] = useState<string[] | null>(null);

  const pool: any[] = ((data?.candidates as any[]) ?? []).map((l: any) => l.candidates).filter(Boolean);
  const selectedIds = (picked ?? (ids ?? "").split(",")).filter((id) => pool.some((c) => c.id === id)).slice(0, MAX);
  const items = selectedIds.map((id) => ({
    candidate: pool.find((c) => c.id === id)!,
    evaluation: ((data?.evaluations as any[]) ?? []).find((e) => e.candidate_id === id) ?? null,
  }));

  const key = [...selectedIds].sort().join(",");
  const { data: insights, isLoading } = useQuery({
    queryKey: ["portal-compare-insights", token, key],
    queryFn: async () => (await insightsFn({ data: { token, candidate_ids: selectedIds } })).insights,
    enabled: selectedIds.length >= 2,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (!data) return <div className="portus-theme grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando…</div>;

  const brand = (data.shortlist as any)?.brand ?? (data.shortlist.clients as any)?.brand ?? "portus";
  const themeClass = brand === "moove" ? "moove-theme" : "portus-theme";
  const setSel = (next: string[]) => {
    setPicked(next);
    navigate({ search: { ids: next.join(",") || undefined }, replace: true });
  };
  const available = pool.filter((c) => !selectedIds.includes(c.id));

  return (
    <div className={`${themeClass} min-h-screen pb-12`}>
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <PortalWordmark brand={brand} />
          <div className="min-w-0 text-right">
            <div className="truncate text-xs font-medium text-muted-foreground">{data.shortlist.clients?.name}</div>
            <div className="truncate text-sm font-semibold">{data.shortlist.title || data.shortlist.jobs?.title}</div>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--portal-strong)" }}>Comparação · {data.shortlist.jobs?.title}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Comparar candidatos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Selecione de 2 a 3 candidatos desta shortlist.</p>
        </div>

        {items.length >= 2 && (
          <CompareView items={items} insights={insights} insightsLoading={isLoading} onRemove={(id) => setSel(selectedIds.filter((x) => x !== id))} />
        )}

        {selectedIds.length < MAX && available.length > 0 && (
          <div className="card-soft p-5">
            <div className="mb-3 text-sm font-medium">{items.length >= 2 ? "Adicionar candidato" : "Escolha os candidatos"}</div>
            <div className="flex flex-wrap gap-2">
              {available.map((c) => (
                <button key={c.id} onClick={() => setSel([...selectedIds, c.id])}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40">
                  <Avatar className="h-5 w-5"><AvatarImage src={c.photo_url ?? undefined} /><AvatarFallback className="text-[9px]">{initials(c.full_name)}</AvatarFallback></Avatar>
                  <Plus className="h-3 w-3" /> {c.full_name}
                </button>
              ))}
            </div>
          </div>
        )}

        <Link to="/s/$token" params={{ token }} className="text-xs text-muted-foreground hover:underline">← Voltar para a shortlist</Link>
      </div>
    </div>
  );
}
