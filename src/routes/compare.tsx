import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CompareView } from "@/components/compare/CompareView";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { getShortlist, listShortlists, listEvaluationsForShortlist } from "@/lib/db/shortlists.functions";
import { generateCompareInsights } from "@/lib/ai/compare.functions";

const searchSchema = z.object({ shortlist: z.string().optional(), ids: z.string().optional() });

export const Route = createFileRoute("/compare")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Comparar candidatos · Moove List" }] }),
  component: ComparePage,
});

const MAX = 3;

function ComparePage() {
  const { shortlist: shortlistId, ids } = Route.useSearch();
  const navigate = useNavigate({ from: "/compare" });
  const listFn = useServerFn(listShortlists);
  const getFn = useServerFn(getShortlist);
  const evalsFn = useServerFn(listEvaluationsForShortlist);
  const insightsFn = useServerFn(generateCompareInsights);

  const { data: shortlists } = useQuery({ queryKey: ["shortlists"], queryFn: () => listFn(), enabled: !shortlistId });
  const { data: sl } = useQuery({
    queryKey: ["shortlist", shortlistId],
    queryFn: () => getFn({ data: { id: shortlistId! } }),
    enabled: !!shortlistId,
  });
  const { data: evaluations = [] } = useQuery({
    queryKey: ["shortlist-evaluations", shortlistId],
    queryFn: () => evalsFn({ data: { shortlist_id: shortlistId! } }),
    enabled: !!shortlistId,
  });

  // Somente candidatos da shortlist escolhida
  const pool: any[] = ((sl as any)?.candidates ?? []).map((l: any) => l.candidates).filter(Boolean);
  const selectedIds = (ids ?? "").split(",").filter((id) => pool.some((c) => c.id === id)).slice(0, MAX);
  const selected = selectedIds.map((id) => pool.find((c) => c.id === id)!);
  const items = selected.map((candidate) => ({
    candidate,
    evaluation: (evaluations as any[]).find((e) => e.candidate_id === candidate.id) ?? null,
  }));

  const insightsKey = [...selectedIds].sort().join(",");
  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: ["compare-insights", shortlistId, insightsKey],
    queryFn: async () => (await insightsFn({ data: { shortlist_id: shortlistId!, candidate_ids: selectedIds } })).analysis,
    enabled: !!shortlistId && selectedIds.length >= 2 && evaluations !== undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const setIds = (next: string[]) => navigate({ search: { shortlist: shortlistId, ids: next.join(",") || undefined } });
  const remove = (id: string) => setIds(selectedIds.filter((x) => x !== id));
  const add = (id: string) => {
    if (selectedIds.includes(id) || selectedIds.length >= MAX) return;
    setIds([...selectedIds, id]);
  };

  // 1) Escolher a shortlist
  if (!shortlistId) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight">Comparar candidatos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escolha a shortlist: a comparação considera a vaga e os candidatos dela.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(shortlists ?? []).map((s: any) => (
              <button
                key={s.id}
                onClick={() => navigate({ search: { shortlist: s.id } })}
                className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/40"
              >
                <div className="truncate text-sm font-semibold">{s.title || s.jobs?.title || "Shortlist"}</div>
                <div className="truncate text-xs text-muted-foreground">{s.clients?.name} · {s.jobs?.title}</div>
              </button>
            ))}
            {shortlists && shortlists.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma shortlist criada ainda.</div>}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!sl) return <AppShell><div className="text-sm text-muted-foreground">Carregando…</div></AppShell>;

  const title = (sl as any).title || (sl as any).jobs?.title || "Shortlist";
  const available = pool.filter((c) => !selectedIds.includes(c.id));

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Comparação · {(sl as any).jobs?.title}</div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {selected.length >= 2 ? selected.map((s) => String(s.full_name).split(" ")[0]).join(" · ") : "Comparar candidatos"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {title} ·{" "}
            <button className="underline hover:text-foreground" onClick={() => navigate({ search: {} })}>trocar shortlist</button>
          </p>
        </header>

        {selected.length < 2 ? (
          <p className="text-sm text-muted-foreground">Selecione de 2 a 3 candidatos desta shortlist para uma análise lado a lado.</p>
        ) : (
          <CompareView items={items} analysis={analysis} analysisLoading={analysisLoading} onRemove={remove} />
        )}

        {selected.length < MAX && available.length > 0 && (
          <div className="card-soft p-5">
            <div className="mb-3 text-sm font-medium">Adicionar candidato</div>
            <div className="flex flex-wrap gap-2">
              {available.map((c) => (
                <button
                  key={c.id}
                  onClick={() => add(c.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={c.photo_url ?? undefined} />
                    <AvatarFallback className="text-[9px]">{initials(c.full_name)}</AvatarFallback>
                  </Avatar>
                  <Plus className="h-3 w-3" /> {c.full_name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <Link to="/shortlists/$shortlistId" params={{ shortlistId }} className="text-xs text-muted-foreground hover:underline">
            ← Voltar para a shortlist
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
