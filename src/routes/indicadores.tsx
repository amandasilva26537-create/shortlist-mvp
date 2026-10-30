import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, CheckCircle2, Clock, Handshake, Send, Timer, FileSpreadsheet } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getIndicators } from "@/lib/db/indicators.functions";
import { jobStatusInfo } from "@/lib/job-status";
import type { JobComputed } from "@/lib/indicators";

export const Route = createFileRoute("/indicadores")({
  head: () => ({ meta: [{ title: "Indicadores · Moove List" }] }),
  component: IndicadoresPage,
});

const BRAND_LABEL: Record<string, string> = { all: "Todas as empresas", moove: "Moove Talent", portus: "Portus" };
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const NO_DATA = "Sem dados";

function presetRange(p: string): { from: string | null; to: string | null } {
  const now = new Date(); const to = iso(now);
  const back = (days: number) => iso(new Date(now.getTime() - days * 864e5));
  if (p === "30") return { from: back(30), to };
  if (p === "90") return { from: back(90), to };
  if (p === "180") return { from: back(180), to };
  if (p === "365") return { from: back(365), to };
  if (p === "year") return { from: `${now.getFullYear()}-01-01`, to };
  return { from: null, to: null };
}

const closedOnLabel = (j: JobComputed) =>
  j.closedOn.kind === "n" ? `${j.closedOn.n}ª shortlist` : j.closedOn.kind === "in_progress" ? "Em andamento" : j.closedOn.kind === "unknown" ? "Não identificado" : "—";
const fmtAvg = (n: number | null) => (n == null ? NO_DATA : `${n.toLocaleString("pt-BR")} dias`);

function IndicadoresPage() {
  const fn = useServerFn(getIndicators);
  const [brand, setBrand] = useState<"all" | "moove" | "portus">("all");
  const [preset, setPreset] = useState("all");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [clientId, setClientId] = useState<string>("all");
  const [recruiter, setRecruiter] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const range = preset === "custom" ? { from: custom.from || null, to: custom.to || null } : presetRange(preset);
  const { data, isLoading, error } = useQuery({
    queryKey: ["indicators", brand, range.from, range.to, clientId, recruiter],
    queryFn: () => fn({ data: { brand, from: range.from, to: range.to, clientId: clientId === "all" ? null : clientId, recruiter: recruiter === "all" ? null : recruiter } }),
    retry: false,
  });
  const ok = data && !data.noAccess ? data : null;

  // opções de cliente/recrutador pertencem à empresa escolhida: limpa seleção que deixou de existir
  useEffect(() => {
    if (!ok) return;
    if (clientId !== "all" && !ok.options.clients.some((c) => c.id === clientId)) setClientId("all");
    if (recruiter !== "all" && !ok.options.recruiters.some((r) => r.key === recruiter)) setRecruiter("all");
  }, [ok, clientId, recruiter]);

  const brandsAllowed = ok?.brands ?? [];
  const maxBar = useMemo(() => Math.max(1, ...(ok?.chart ?? []).map((c) => c.count)), [ok]);
  const selJobs = useMemo(() => (ok && selected ? ok.jobsByRecruiter.filter((j) => j.recruiterKey === selected) : []), [ok, selected]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Gestão de recrutamento" title="Indicadores de recrutamento" description="Resultados da operação e desempenho dos recrutadores, calculados só com dados registrados na plataforma."
          actions={<Button variant="outline" size="sm" disabled title="Em breve: exportar para Google Sheets (requer integração segura com o Google Drive)"><FileSpreadsheet className="mr-1.5 h-4 w-4" />Exportar para Google Sheets <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase">Em breve</span></Button>} />

        {data?.noAccess && (
          <div className="card-soft p-6 text-sm text-muted-foreground">Você ainda não tem acesso aos indicadores de nenhuma empresa. Peça ao administrador para liberar o acesso à Moove Talent e/ou à Portus.</div>
        )}
        {error && <div className="card-soft p-6 text-sm text-destructive">{(error as any)?.message ?? "Não foi possível carregar os indicadores."}</div>}

        {!data?.noAccess && (
          <>
            <div className="card-soft mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">Empresa</div>
                <Select value={brand} onValueChange={(v) => setBrand(v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(!ok || brandsAllowed.length > 1) && <SelectItem value="all">{BRAND_LABEL.all}</SelectItem>}
                    {(!ok || brandsAllowed.includes("moove")) && <SelectItem value="moove">Moove Talent</SelectItem>}
                    {(!ok || brandsAllowed.includes("portus")) && <SelectItem value="portus">Portus</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">Período</div>
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo o período</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="180">Últimos 6 meses</SelectItem><SelectItem value="365">Últimos 12 meses</SelectItem><SelectItem value="year">Este ano</SelectItem><SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">Cliente</div>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{(ok?.options.clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">Recrutador</div>
                <Select value={recruiter} onValueChange={setRecruiter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos os recrutadores</SelectItem>{(ok?.options.recruiters ?? []).map((r) => <SelectItem key={r.key} value={r.key}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {preset === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <div><div className="mb-1 text-[11px] text-muted-foreground">De</div><Input type="date" className="h-9" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></div>
                  <div><div className="mb-1 text-[11px] text-muted-foreground">Até</div><Input type="date" className="h-9" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></div>
                </div>
              )}
            </div>

            {isLoading && <div className="text-sm text-muted-foreground">Carregando indicadores…</div>}

            {ok && (
              <Tabs defaultValue="geral">
                <TabsList>
                  <TabsTrigger value="geral">Visão Geral</TabsTrigger>
                  <TabsTrigger value="recrutador">Por Recrutador</TabsTrigger>
                </TabsList>

                <TabsContent value="geral" className="mt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    <KpiCard label="Vagas abertas" value={ok.stats.open} icon={Briefcase} />
                    <KpiCard label="Vagas fechadas" value={ok.stats.closed} icon={CheckCircle2} />
                    <KpiCard label="Tempo médio de fechamento" value={ok.stats.avgDays == null ? NO_DATA : ok.stats.avgDays.toLocaleString("pt-BR")} suffix={ok.stats.avgDays == null ? undefined : "dias"} icon={Timer} />
                    <KpiCard label="Fechadas no prazo" value="Em breve" icon={Clock} />
                    <KpiCard label="Shortlists enviadas" value={ok.stats.sentShortlists} icon={Send} />
                    <KpiCard label="Contratações concluídas" value={ok.stats.hires} icon={Handshake} />
                  </div>
                  <ul className="space-y-1 text-[11px] text-muted-foreground">
                    <li>Tempo médio: da abertura da vaga até o fechamento registrado (etapa “Vaga encerrada”), em dias corridos{ok.stats.closed > 0 ? ` — calculado em ${ok.stats.avgDaysBase} de ${ok.stats.closed} vagas fechadas` : ""}. Vagas fechadas sem essa data não entram na média.</li>
                    {ok.stats.closedUndated > 0 && <li>{ok.stats.closedUndated} vaga(s) fechada(s) não têm data de fechamento registrada.</li>}
                    <li>“Fechadas no prazo” fica em breve: ainda não existe um prazo de fechamento cadastrado na vaga (a previsão de entrega da shortlist não é usada para isso).</li>
                    <li>Contratações: candidatos marcados como “Contratado” nas shortlists ou nas candidaturas, contados uma vez por vaga.</li>
                  </ul>

                  <div className="card-soft p-5">
                    <h2 className="text-base font-semibold">Vagas fechadas por mês</h2>
                    {ok.chart.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{NO_DATA} para o período.</p> : (
                      <div className="mt-4 flex h-40 items-end gap-2 overflow-x-auto pb-1" role="img" aria-label="Gráfico de vagas fechadas por mês">
                        {ok.chart.map((c) => (
                          <div key={c.month} className="flex min-w-10 flex-1 flex-col items-center justify-end gap-1">
                            <span className="text-xs font-medium">{c.count}</span>
                            <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(c.count ? 6 : 2, (c.count / maxBar) * 100)}px` }} />
                            <span className="text-[10px] text-muted-foreground">{c.month.slice(5)}/{c.month.slice(2, 4)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card-soft">
                    <div className="border-b border-border p-5">
                      <h2 className="text-base font-semibold">Desempenho das Shortlists</h2>
                      <p className="text-xs text-muted-foreground">Só shortlists efetivamente enviadas (sem rascunhos), ordenadas pela data real de envio. Quantidade de shortlists ≠ quantidade de candidatos apresentados.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px] text-sm">
                        <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                          <th className="p-3">Cliente</th><th className="p-3">Vaga</th><th className="p-3">Recrutador</th><th className="p-3 text-right">Shortlists enviadas</th>
                          <th className="p-3">1ª enviada</th><th className="p-3">Última enviada</th><th className="p-3">Status da vaga</th><th className="p-3">Fechada na</th>
                        </tr></thead>
                        <tbody className="divide-y divide-border">
                          {ok.shortlistRows.length === 0 && <tr><td colSpan={8} className="p-5 text-muted-foreground">{NO_DATA}.</td></tr>}
                          {ok.shortlistRows.map((j) => (
                            <tr key={j.id}>
                              <td className="p-3">{j.client}</td><td className="p-3 font-medium">{j.title}</td><td className="p-3">{j.recruiter}</td>
                              <td className="p-3 text-right">{j.sent.length}</td><td className="p-3">{fmtDate(j.sent[0]!.at)}</td><td className="p-3">{fmtDate(j.sent[j.sent.length - 1]!.at)}</td>
                              <td className="p-3">{jobStatusInfo(j.status).label}</td><td className="p-3">{closedOnLabel(j)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="recrutador" className="mt-6 space-y-6">
                  <div className="card-soft">
                    <div className="border-b border-border p-5">
                      <h2 className="text-base font-semibold">Desempenho dos recrutadores</h2>
                      <p className="text-xs text-muted-foreground">Responsável pela vaga = responsável informado na shortlist enviada mais recente; se não houver, o dono dessa shortlist; se também não houver, quem criou a vaga. Clique em uma linha para ver as vagas.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px] text-sm">
                        <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                          <th className="p-3">Recrutador</th><th className="p-3 text-right">Vagas</th><th className="p-3 text-right">Fechadas</th><th className="p-3 text-right">Tempo médio</th>
                          <th className="p-3 text-right">No prazo</th><th className="p-3 text-right">Shortlists enviadas</th><th className="p-3 text-right">Média shortlists / vaga fechada</th><th className="p-3 text-right">Contratações</th>
                        </tr></thead>
                        <tbody className="divide-y divide-border">
                          {ok.recruiterRows.length === 0 && <tr><td colSpan={8} className="p-5 text-muted-foreground">{NO_DATA}.</td></tr>}
                          {ok.recruiterRows.map((r) => (
                            <tr key={r.key} onClick={() => setSelected(selected === r.key ? null : r.key)} className={"cursor-pointer hover:bg-secondary/40 " + (selected === r.key ? "bg-primary-soft" : "")}>
                              <td className="p-3 font-medium">{r.recruiter}</td><td className="p-3 text-right">{r.jobs}</td><td className="p-3 text-right">{r.closed}</td>
                              <td className="p-3 text-right">{fmtAvg(r.avgDays)}{r.avgDays != null && r.avgDaysBase < r.closed ? <span className="text-[10px] text-muted-foreground"> ({r.avgDaysBase}/{r.closed})</span> : null}</td>
                              <td className="p-3 text-right text-muted-foreground">Em breve</td><td className="p-3 text-right">{r.sent}</td>
                              <td className="p-3 text-right">{r.avgShortlistsPerClosed == null ? NO_DATA : r.avgShortlistsPerClosed.toLocaleString("pt-BR")}</td><td className="p-3 text-right">{r.hires}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selected && (
                    <div className="card-soft">
                      <div className="border-b border-border p-5"><h2 className="text-base font-semibold">Vagas de {ok.recruiterRows.find((r) => r.key === selected)?.recruiter}</h2></div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                          <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                            <th className="p-3">Cliente</th><th className="p-3">Vaga</th><th className="p-3">Status</th><th className="p-3 text-right">Shortlists</th><th className="p-3">Datas de envio</th><th className="p-3">Fechada na</th><th className="p-3 text-right">Contratações</th>
                          </tr></thead>
                          <tbody className="divide-y divide-border">
                            {selJobs.map((j) => (
                              <tr key={j.id}>
                                <td className="p-3">{j.client}</td><td className="p-3 font-medium">{j.title}</td><td className="p-3">{jobStatusInfo(j.status).label}</td><td className="p-3 text-right">{j.sent.length}</td>
                                <td className="p-3 text-xs">{j.sent.length ? j.sent.map((s) => fmtDate(s.at)).join(" · ") : NO_DATA}</td><td className="p-3">{closedOnLabel(j)}</td><td className="p-3 text-right">{j.hires}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
