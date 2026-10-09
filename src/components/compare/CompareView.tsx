import { Sparkles, X, Check, HelpCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompetencyRadar } from "@/components/candidate/CompetencyRadar";
import { MatchRing } from "@/components/candidate/MatchRing";
import { initials } from "@/lib/format";
import type { CompareAnalysis } from "@/lib/ai/compare.functions";
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
  items, analysis, analysisLoading, onRemove, v2 = false,
}: {
  items: CompareItem[];
  analysis: CompareAnalysis | undefined;
  analysisLoading: boolean;
  onRemove?: (candidateId: string) => void;
  /** Novas regras (somente shortlists criadas após a atualização). */
  v2?: boolean;
}) {
  const first = (c: any) => String(c?.full_name ?? "").trim().split(/\s+/)[0] || "Candidato";
  const radar = buildRadar(items);
  const table = buildTable(items, v2);
  const checklist = buildChecklist(items);
  const cols = COLS[items.length] ?? COLS[3];

  return (
    <div className="space-y-6">
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
              {(() => {
                const d = analysis?.cards.find((x) => x.candidate_id === c.id)?.differential || fallbackStrength(ev);
                return d ? (
                  <p className="mt-3 border-l-2 pl-3 text-xs leading-relaxed text-foreground/80" style={{ borderColor: colors[items.indexOf(it)] }}>{d}</p>
                ) : analysisLoading ? (
                  <p className="mt-3 text-xs text-muted-foreground">Analisando…</p>
                ) : null;
              })()}
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

      {/* Diferenças relevantes para a decisão */}
      <section className="card-elevated bg-gradient-to-br from-primary-soft to-transparent p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-card text-primary"><Sparkles className="h-4 w-4" /></div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Análise comparativa por IA</div>
            <h3 className="text-base font-semibold">Diferenças relevantes para a decisão</h3>
          </div>
        </div>
        {analysisLoading && !analysis ? (
          <div className="text-sm text-muted-foreground">Analisando os candidatos para esta vaga…</div>
        ) : !analysis || analysis.cards.length === 0 ? (
          <div className="text-sm text-muted-foreground">Análise comparativa indisponível no momento.</div>
        ) : (
          <div className={`grid gap-4 ${cols}`}>
            {items.map((it, i) => {
              const k = analysis.cards.find((x) => x.candidate_id === it.candidate.id);
              return (
                <div key={it.candidate.id} className="rounded-xl border border-border bg-card p-4" style={{ borderTop: `3px solid ${colors[i]}` }}>
                  <div className="mb-3 text-sm font-semibold">{first(it.candidate)}</div>
                  {k ? (
                    <dl className="space-y-3 text-sm leading-relaxed">
                      {k.differential && <Block label="Principal diferencial">{k.differential}</Block>}
                      {k.contribution && <Block label="O que mais contribui para a vaga">{k.contribution}</Block>}
                      {k.attention && <Block label="Ponto de atenção" tone="warn">{k.attention}</Block>}
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">Dados insuficientes na shortlist para esta análise.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Matriz de evidências */}
      {!(v2 && !analysisLoading && (!analysis || analysis.matrix.length === 0)) && (
      <section className="card-soft overflow-hidden">
        <div className="border-b border-border p-5">
          <h3 className="text-base font-semibold">Matriz de evidências da vaga</h3>
          <p className="text-xs text-muted-foreground">Principais requisitos × evidências nas informações da shortlist</p>
        </div>
        {analysisLoading && !analysis ? (
          <div className="p-5 text-sm text-muted-foreground">Montando a matriz…</div>
        ) : !analysis || analysis.matrix.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">Matriz indisponível no momento.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="p-4 font-medium">Requisito</th>
                  {items.map((it, i) => (
                    <th key={it.candidate.id} className="p-4 font-medium" style={{ borderBottom: `2px solid ${colors[i]}` }}>{first(it.candidate)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analysis.matrix.map((row) => (
                  <tr key={row.requirement}>
                    <td className="p-4 font-medium">{row.requirement}</td>
                    {items.map((it) => {
                      const ev = row.cells.find((c) => c.candidate_id === it.candidate.id)?.evidence;
                      return (
                        <td key={it.candidate.id} className="p-4 align-top">
                          {ev ?? (v2 ? <span className="text-muted-foreground">—</span> : <span className="text-xs text-muted-foreground">Não identificado nas informações disponíveis</span>)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

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


function Block({ label, tone, children }: { label: string; tone?: "warn"; children: React.ReactNode }) {
  return (
    <div>
      <dt className={"text-[10px] font-semibold uppercase tracking-widest " + (tone === "warn" ? "text-[color:var(--warning)]" : "text-muted-foreground")}>{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
