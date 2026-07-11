import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { candidates as allCandidates, getCandidate } from "@/lib/mock-data";
import { CompetencyRadar } from "@/components/candidate/CompetencyRadar";
import { MatchRing } from "@/components/candidate/MatchRing";
import { DiscBadge } from "@/components/candidate/DiscBadge";
import { ChecklistItem } from "@/components/candidate/ChecklistItem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, formatBRL } from "@/lib/format";
import { Sparkles, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

const searchSchema = z.object({ ids: z.string().optional() });

export const Route = createFileRoute("/compare")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Comparar candidatos · Moove Select" }] }),
  component: ComparePage,
});

const colors = ["var(--primary)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function ComparePage() {
  const { ids } = Route.useSearch();
  const navigate = useNavigate({ from: "/compare" });
  const selectedIds = (ids ?? "").split(",").filter(Boolean).slice(0, 4);
  const selected = selectedIds.map((id: string) => getCandidate(id)).filter(Boolean) as ReturnType<
    typeof getCandidate
  >[];

  const setIds = (next: string[]) => {
    navigate({ search: { ids: next.join(",") || undefined } });
  };

  const remove = (id: string) => setIds(selectedIds.filter((x: string) => x !== id));
  const add = (id: string) => {
    if (selectedIds.includes(id) || selectedIds.length >= 4) return;
    setIds([...selectedIds, id]);
  };

  if (selected.length < 2) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight">Comparar candidatos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione ao menos dois candidatos para uma análise lado a lado.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {allCandidates.map((c) => (
              <button
                key={c.id}
                onClick={() => add(c.id!)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/40"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={c!.photo} />
                  <AvatarFallback>{initials(c!.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c!.fullName}</div>
                  <div className="truncate text-xs text-muted-foreground">{c!.currentRole}</div>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary">
            Comparação
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {selected.map((s) => s!.fullName.split(" ")[0]).join(" · ")}
          </h1>
        </header>

        {/* IA summary */}
        <div className="card-elevated bg-gradient-to-br from-primary-soft to-transparent p-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-card text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-primary">
              Análise imparcial por IA
            </div>
          </div>
          <div className="space-y-2 text-sm leading-relaxed">
            {selected.map((c) => (
              <p key={c!.id}>
                <span className="font-semibold">{c!.fullName.split(" ")[0]}</span> tende a
                performar melhor em cenários que exijam{" "}
                {c!.leadership > 85
                  ? "liderança inspiracional e formação de times"
                  : c!.overallMatch > 88
                    ? "execução estratégica e reestruturação de operações"
                    : "consolidação de cultura e engajamento regional"}
                .
              </p>
            ))}
          </div>
        </div>

        {/* Header cards */}
        <div className={`grid gap-4 md:grid-cols-${selected.length}`}>
          {selected.map((c) => (
            <div key={c!.id} className="card-soft p-5">
              <div className="flex items-start justify-between">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={c!.photo} />
                  <AvatarFallback>{initials(c!.fullName)}</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => remove(c!.id)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 font-semibold">{c!.fullName}</div>
              <div className="text-xs text-muted-foreground">{c!.currentRole}</div>
              <div className="mt-4 flex items-center justify-between">
                <MatchRing value={c!.overallMatch} size={52} strokeWidth={5} />
                <DiscBadge disc={c!.disc} scores={c!.discScores} size="sm" />
              </div>
            </div>
          ))}
        </div>

        {/* Radar comparison */}
        <section className="card-soft p-6">
          <h3 className="mb-4 text-base font-semibold">Radar comparativo</h3>
          <CompetencyRadar
            height={380}
            series={selected.map((c, i) => ({
              name: c!.fullName.split(" ")[0]!,
              color: colors[i]!,
              data: c!.radar,
            }))}
          />
        </section>

        {/* Table */}
        <section className="card-soft overflow-hidden">
          <div className="border-b border-border p-5 text-base font-semibold">Comparativo</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="p-4 font-medium"></th>
                  {selected.map((c) => (
                    <th key={c!.id} className="p-4 font-medium">
                      {c!.fullName.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { label: "Overall Match", get: (c: any) => `${c.overallMatch}` },
                  { label: "DISC", get: (c: any) => c.disc },
                  { label: "Cidade", get: (c: any) => c.city },
                  { label: "Modelo", get: (c: any) => c.workModel },
                  { label: "Pretensão", get: (c: any) => formatBRL(c.salaryExpectation) },
                  { label: "Disponibilidade", get: (c: any) => c.availability },
                  { label: "Experiência (anos)", get: (c: any) => c.experienceYears },
                  { label: "Fit cultural", get: (c: any) => c.culturalFit },
                  { label: "Liderança", get: (c: any) => c.leadership },
                  { label: "Comunicação", get: (c: any) => c.communication },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="p-4 text-muted-foreground">{row.label}</td>
                    {selected.map((c) => (
                      <td key={c!.id} className="p-4 font-medium">
                        {row.get(c!)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Checklist comparison */}
        <section className="card-soft p-6">
          <h3 className="mb-4 text-base font-semibold">Checklist eliminatório</h3>
          <div className={`grid gap-3 md:grid-cols-${selected.length}`}>
            {selected.map((c) => (
              <div key={c!.id} className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {c!.fullName.split(" ")[0]}
                </div>
                {c!.checklist.map((it) => (
                  <ChecklistItem key={it.requirement} {...it} />
                ))}
              </div>
            ))}
          </div>
        </section>

        {selected.length < 4 && (
          <div className="card-soft p-5">
            <div className="mb-3 text-sm font-medium">Adicionar candidato</div>
            <div className="flex flex-wrap gap-2">
              {allCandidates
                .filter((c) => !selectedIds.includes(c.id))
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => add(c.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40"
                  >
                    <Plus className="h-3 w-3" /> {c.fullName}
                  </button>
                ))}
            </div>
          </div>
        )}

        <div>
          <Link to="/shortlists" className="text-xs text-muted-foreground hover:underline">
            ← Voltar
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
