import { Sparkles, X, Check, HelpCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompetencyRadar } from "@/components/candidate/CompetencyRadar";
import { MatchRing } from "@/components/candidate/MatchRing";
import { initials } from "@/lib/format";
import {
  buildChecklist, buildRadar, buildTable, fallbackStrength, type CompareItem,
} from "@/lib/compare";

const colors = ["var(--primary)", "var(--chart-2)", "var(--chart-3)"];
const COLS: Record<number, string> = { 2: "md:grid-cols-2", 3: "md:grid-cols-3" };

const STATUS: Record<string, { cls: string; icon: any; glyph?: string; label: string }> = {
  yes: { cls: "bg-[color:var(--success)]/10 text-[color:var(--success)]", icon: Check, label: "Atende" },
  partial: { cls: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]", icon: null, glyph: "◐", label: "Parcial" },
  no: { cls: "bg-destructive/10 text-destructive", icon: X, label: "Não atende" },
  unknown: { cls: "bg-muted text-muted-foreground", icon: HelpCircle, label: "Não avaliado" },
};

export function CompareView({
  items, insights, insightsLoading, onRemove,
}: {
  items: CompareItem[];
  insights: { candidate_id: string; text: string }[] | undefined;
  insightsLoading: boolean;
  onRemove?: (candidateId: string) => void;
}) {
  const first = (c: any) => String(c?.full_name ?? "").trim().split(/\s+/)[0] || "Candidato";
  const radar = buildRadar(items);
  const table = buildTable(items);
  const checklist = buildChecklist(items);
  const cols = COLS[items.length] ?? COLS[3];

  return (
    <div className="space-y-6">
      {/* Análise comparativa */}
      <div className="card-elevated bg-gradient-to-br from-primary-soft to-transparent p-6">
        <div className="mb-2 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-card text-primary"><Sparkles className="h-4 w-4" /></div>
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Análise imparcial por IA</div>
        </div>
        {insightsLoading && !insights ? (
          <div className="text-sm text-muted-foreground">Analisando os candidatos para esta vaga…</div>
        ) : (
          <div className="space-y-2 text-sm leading-relaxed">
            {items.map((it) => {
              const text = insights?.find((i) => i.candidate_id === it.candidate.id)?.text ?? fallbackStrength(it.evaluation);
              return text ? (
                <p key={it.candidate.id}>{text.startsWith(first(it.candidate)) ? text : <><span className="font-semibold">{first(it.candidate)}</span>: {text}</>}</p>
              ) : (
                <p key={it.candidate.id} className="text-muted-foreground">
                  {first(it.candidate)}: ainda não há análise suficiente na shortlist para destacar um ponto forte.
                </p>
              );
            })}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className={`grid gap-4 ${cols}`}>
        {items.map((it) => {
          const c = it.candidate;
          const ev = it.evaluation;
          const match = typeof ev?.overall_match === "number" ? ev.overall_match : null;
          return (
            <div key={c.id} className="card-soft p-5">
              <div className="flex items-start justify-between">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={c.photo_url ?? undefined} />
                  <AvatarFallback>{initials(c.full_name ?? "?")}</AvatarFallback>
                </Avatar>
                {onRemove && (
                  <button onClick={() => onRemove(c.id)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label={`Remover ${c.full_name} da comparação`}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 font-semibold">{c.full_name}</div>
              <div className="text-xs text-muted-foreground">{ev?.job_headline || c.headline || c.current_position || ""}</div>
              <div className="mt-4 flex items-center justify-between">
                {match != null ? <MatchRing value={match} size={52} strokeWidth={5} /> : <span className="text-xs text-muted-foreground">Match não calculado</span>}
                {c.disc_profile && (
                  <span className="inline-flex h-6 items-center rounded-full border border-border bg-primary-soft px-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {c.disc_profile}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Radar */}
      <section className="card-soft p-6">
        <h3 className="mb-4 text-base font-semibold">Radar comparativo</h3>
        {radar ? (
          <CompetencyRadar
            height={380}
            series={items.map((it, i) => ({ name: first(it.candidate), color: colors[i]!, data: radar.data[i]! }))}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Comparação gráfica indisponível: não há notas de competências avaliadas em comum para todos os candidatos selecionados.
          </p>
        )}
      </section>

      {/* Tabela */}
      <section className="card-soft overflow-hidden">
        <div className="border-b border-border p-5 text-base font-semibold">Comparativo</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                <th className="p-4 font-medium"></th>
                {items.map((it) => <th key={it.candidate.id} className="p-4 font-medium">{first(it.candidate)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {table.map((row) => (
                <tr key={row.label}>
                  <td className="p-4 text-muted-foreground">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className="whitespace-pre-line p-4 font-medium">{v ?? <span className="font-normal text-muted-foreground">—</span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Critérios eliminatórios */}
      <section className="card-soft p-6">
        <h3 className="mb-4 text-base font-semibold">Critérios eliminatórios</h3>
        {checklist.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum critério eliminatório avaliado na shortlist para estes candidatos.</p>
        ) : (
          <div className={`grid gap-3 ${cols}`}>
            {items.map((it, idx) => (
              <div key={it.candidate.id} className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{first(it.candidate)}</div>
                {checklist.map((row) => {
                  const s = STATUS[row.statuses[idx] ?? "unknown"] ?? STATUS.unknown!;
                  const Icon = s.icon;
                  return (
                    <div key={row.criterion} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${s.cls}`}>
                        {Icon ? <Icon className="h-4 w-4" strokeWidth={2.5} /> : <span className="text-sm leading-none">{s.glyph}</span>}
                      </div>
                      <div className="min-w-0 flex-1 text-sm font-medium">{row.criterion}</div>
                      <div className={`text-xs font-semibold ${s.cls.split(" ").slice(1).join(" ")}`}>{s.label}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

