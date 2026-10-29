import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, Loader2, ScanSearch, Undo2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getResumeDownloadUrl, listJobApplications, updateApplication } from "@/lib/db/applications.functions";
import { analyzeApplication, getJobMatches } from "@/lib/db/matches.functions";
import { compareByMatch, matchesFilters, type MatchFilters } from "@/lib/application-match";
import { ApplicationMatchDetail } from "./ApplicationMatchDetail";
import { MatchSettingsDialog } from "./MatchSettingsDialog";

const STAGES: { key: string; label: string }[] = [
  { key: "applied", label: "Recebidas" }, { key: "screening", label: "Triagem" }, { key: "interview", label: "Entrevista" },
  { key: "tests", label: "Testes" }, { key: "shortlisted", label: "Shortlist" }, { key: "client_interview", label: "Entrevista com cliente" },
  { key: "offer", label: "Proposta" }, { key: "hired", label: "Contratado" },
];
const PURPOSE_LABEL: Record<string, string> = {
  selection_process: "Processo seletivo", talent_pool: "Banco de talentos", client_sharing: "Compartilhar com cliente",
  ai_analysis: "Análise por IA", international_transfer: "Transf. internacional",
};
const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function JobApplicationsSection({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listJobApplications);
  const matchFn = useServerFn(getJobMatches);
  const dlFn = useServerFn(getResumeDownloadUrl);
  const updFn = useServerFn(updateApplication);
  const analyzeFn = useServerFn(analyzeApplication);

  const [view, setView] = useState<"match" | "funil">("match");
  const [open, setOpen] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [showRejected, setShowRejected] = useState(false);
  const [f, setF] = useState({ minScore: "0", skill: "", minYears: "", maxSalary: "", onlyPre: false });
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["applications", jobId], queryFn: () => listFn({ data: { job_id: jobId } }) });
  const { data: md } = useQuery({ queryKey: ["job-matches", jobId], queryFn: () => matchFn({ data: { job_id: jobId } }) });
  const upd = useMutation({
    mutationFn: (v: { application_id: string; stage?: string; status?: "active" | "rejected" | "withdrawn"; rejection_reason?: string | null }) => updFn({ data: v as any }),
    onSuccess: () => { setRejecting(null); setReason(""); qc.invalidateQueries({ queryKey: ["applications", jobId] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const matches: Record<string, any> = md?.matches ?? {};
  const matchReady = !!md && !md.missing;
  const items: any[] = data?.items ?? [];
  const active = items.filter((a) => a.status === "active" || a.status === "hired");
  const rejected = items.filter((a) => a.status === "rejected" || a.status === "withdrawn");

  const rows = useMemo(() => {
    const filters: MatchFilters = {
      minScore: Number(f.minScore) || 0, skill: f.skill, minYears: f.minYears ? Number(f.minYears) : undefined,
      maxSalary: f.maxSalary ? Number(f.maxSalary) : undefined, onlyPrescreened: f.onlyPre,
    };
    return active
      .map((a) => {
        const m = matches[a.id];
        const p = m?.profile ?? {};
        return { a, m, score: (m?.score ?? null) as number | null, score_max: (m?.score_max ?? null) as number | null, applied_at: a.applied_at as string,
          r: { score: m?.score ?? null, score_max: m?.score_max ?? null, prescreened: !!m?.prescreened, skills: [...(p.skills ?? []), ...(p.tools ?? [])], years: p.total_experience_years ?? null, salary: p.salary_expectation ?? a.candidate?.salary_expectation ?? null } };
      })
      .filter((x) => matchesFilters(x.r, filters))
      .sort(compareByMatch);
  }, [active, matches, f]);

  if (isLoading || data?.missing) return null;

  const download = async (id: string) => {
    try { const { url } = await dlFn({ data: { resume_id: id } }); window.open(url, "_blank", "noopener"); }
    catch (e: any) { toast.error(e?.message ?? "Erro ao baixar"); }
  };
  const analyzeOne = async (id: string) => {
    setBusyId(id);
    try { await analyzeFn({ data: { application_id: id } }); await qc.invalidateQueries({ queryKey: ["job-matches", jobId] }); toast.success("Currículo analisado."); }
    catch (e: any) { toast.error(e?.message ?? "Erro na análise"); }
    finally { setBusyId(null); }
  };
  const analyzeAll = async () => {
    const todo = active.filter((a) => a.resumes.length && (!matches[a.id] || matches[a.id].stale));
    if (!todo.length) { toast.message("Todos os currículos já foram analisados."); return; }
    let done = 0, failed = 0;
    setProgress({ done: 0, total: todo.length });
    for (const a of todo) {
      try { await analyzeFn({ data: { application_id: a.id } }); } catch { failed += 1; }
      done += 1; setProgress({ done, total: todo.length });
    }
    setProgress(null);
    await qc.invalidateQueries({ queryKey: ["job-matches", jobId] });
    failed ? toast.warning(`${done - failed} analisados, ${failed} com erro (veja em cada candidatura).`) : toast.success(`${done} currículo(s) analisados.`);
  };

  const stageControls = (a: any) => (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Select value={a.stage} onValueChange={(v) => upd.mutate({ application_id: a.id, stage: v })}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        {a.resumes.map((r: any) => <Button key={r.id} size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => download(r.id)}><Download className="mr-1 h-3 w-3" />Currículo</Button>)}
        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { setRejecting(a.id); setReason(""); }}><XCircle className="mr-1 h-3 w-3" />Reprovar</Button>
      </div>
      {rejecting === a.id && (
        <div className="space-y-1.5">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional, uso interno)" className="h-8 text-xs" />
          <div className="flex gap-1.5">
            <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => upd.mutate({ application_id: a.id, status: "rejected", rejection_reason: reason })}>Confirmar reprovação</Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setRejecting(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );

  const badges = (a: any) => {
    const m = matches[a.id];
    if (!m) return <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground">Sem análise</span>;
    return (
      <>
        <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground" title="Match da candidatura (separado do Match das shortlists). Nota mínima; a máxima considera as lacunas de informação como atendidas.">
          Match candidatura {m.score}{m.score_max > m.score ? ` · até ${m.score_max}` : ""}
        </span>
        {m.prescreened && <span className="rounded-full border border-emerald-600 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Pré-triado pelo sistema</span>}
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{m.method === "ai" ? "IA" : "Palavras-chave"}</span>
        {m.reviewed_at && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">Revisado</span>}
        {m.stale && <span className="rounded-full border border-amber-500 px-2 py-0.5 text-[10px] text-amber-700">Requisitos mudaram — reanalisar</span>}
      </>
    );
  };

  const rejectedCard = (a: any) => (
    <div className="rounded-lg border border-border bg-card p-3 text-xs">
      <div className="text-sm font-medium">{a.candidate?.full_name}</div>
      <div className="text-muted-foreground">{a.status === "rejected" ? "Reprovado" : "Desistiu"}{a.rejection_reason ? ` — ${a.rejection_reason}` : ""}</div>
      <Button size="sm" variant="outline" className="mt-2 h-7 px-2 text-xs" onClick={() => upd.mutate({ application_id: a.id, status: "active" })}><Undo2 className="mr-1 h-3 w-3" />Reativar</Button>
    </div>
  );

  return (
    <section className="card-soft mt-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Candidaturas ({active.length} ativas)</div>
          <p className="mt-1 text-[11px] text-muted-foreground">O Match da candidatura apoia a triagem e é separado do Match das shortlists. Não decide quem avança: a decisão é sua.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {matchReady && <MatchSettingsDialog jobId={jobId} weights={md!.settings.weights} prescreenMin={md!.settings.prescreen_min} criteria={md!.criteria} />}
          {matchReady && (
            <Button size="sm" onClick={analyzeAll} disabled={!!progress || !active.length}>
              {progress ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-1.5 h-4 w-4" />}
              {progress ? `Analisando ${progress.done}/${progress.total}…` : "Analisar currículos"}
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhuma candidatura recebida pela Página de Carreiras ainda.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Button size="sm" variant={view === "match" ? "default" : "outline"} onClick={() => setView("match")}>Ranking por Match</Button>
            <Button size="sm" variant={view === "funil" ? "default" : "outline"} onClick={() => setView("funil")}>Funil</Button>
            {rejected.length > 0 && <Button size="sm" variant="ghost" onClick={() => setShowRejected((v) => !v)}>{showRejected ? "Ocultar" : "Ver"} reprovados/desistentes ({rejected.length})</Button>}
          </div>

          {view === "match" && (
            <>
              {matchReady && (
                <div className="mt-3 grid gap-2 rounded-lg bg-secondary/40 p-3 text-xs sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <div className="mb-1 text-[11px] text-muted-foreground">Match mínimo</div>
                    <Select value={f.minScore} onValueChange={(v) => setF({ ...f, minScore: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{["0", "40", "50", "60", "70", "80", "90"].map((v) => <SelectItem key={v} value={v}>{v === "0" ? "Todos" : `≥ ${v}`}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><div className="mb-1 text-[11px] text-muted-foreground">Competência / ferramenta</div><Input className="h-8 text-xs" placeholder="ex.: CRM, Excel" value={f.skill} onChange={(e) => setF({ ...f, skill: e.target.value })} /></div>
                  <div><div className="mb-1 text-[11px] text-muted-foreground">Experiência mínima (anos)</div><Input className="h-8 text-xs" type="number" min={0} value={f.minYears} onChange={(e) => setF({ ...f, minYears: e.target.value })} /></div>
                  <div><div className="mb-1 text-[11px] text-muted-foreground">Pretensão até (R$)</div><Input className="h-8 text-xs" type="number" min={0} value={f.maxSalary} onChange={(e) => setF({ ...f, maxSalary: e.target.value })} /></div>
                  <label className="flex items-end gap-2 pb-1.5"><Checkbox checked={f.onlyPre} onCheckedChange={(v) => setF({ ...f, onlyPre: v === true })} />Só pré-triados</label>
                </div>
              )}
              <ol className="mt-3 space-y-2">
                {rows.length === 0 && <li className="text-sm text-muted-foreground">Nenhuma candidatura com esses filtros.</li>}
                {rows.map(({ a, m }, i) => (
                  <li key={a.id} className="rounded-lg border border-border bg-card p-3 text-xs">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-muted-foreground">#{i + 1}</span>
                          <Link to="/candidates/$candidateId" params={{ candidateId: a.candidate_id }} className="text-sm font-medium hover:underline">{a.candidate?.full_name}</Link>
                          {badges(a)}
                        </div>
                        <div className="mt-0.5 break-all text-muted-foreground">{[a.candidate?.email, a.candidate?.phone, a.candidate?.city].filter(Boolean).join(" · ")} · {fmt(a.applied_at)}</div>
                        {m && <div className="mt-0.5 text-muted-foreground">
                          {[m.profile?.total_experience_years != null ? `${m.profile.total_experience_years} anos de experiência` : null, (m.profile?.salary_expectation ?? a.candidate?.salary_expectation) ? `pretensão ${brl(Number(m.profile?.salary_expectation ?? a.candidate?.salary_expectation))}` : null, `cobertura ${m.coverage}%`].filter(Boolean).join(" · ")}
                        </div>}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {a.consents.map((c: string) => <span key={c} className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{PURPOSE_LABEL[c] ?? c}</span>)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {stageControls(a)}
                        <div className="flex gap-1.5">
                          {matchReady && a.resumes.length > 0 && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={busyId === a.id || !!progress} onClick={() => analyzeOne(a.id)}>
                              {busyId === a.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}{m ? "Reanalisar" : "Analisar"}
                            </Button>
                          )}
                          {m && <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? "Fechar análise" : "Ver análise"}</Button>}
                        </div>
                      </div>
                    </div>
                    {m && open === a.id && <ApplicationMatchDetail key={`${a.id}-${m.analyzed_at}-${m.reviewed_at}`} jobId={jobId} applicationId={a.id} match={m} criteria={md!.criteria} />}
                  </li>
                ))}
              </ol>
            </>
          )}

          {view === "funil" && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {STAGES.map((s) => {
                const col = active.filter((a) => a.stage === s.key).sort((x, y) => compareByMatch({ score: matches[x.id]?.score ?? null, score_max: matches[x.id]?.score_max ?? null, applied_at: x.applied_at }, { score: matches[y.id]?.score ?? null, score_max: matches[y.id]?.score_max ?? null, applied_at: y.applied_at }));
                return (
                  <div key={s.key} className="w-64 shrink-0">
                    <div className="mb-2 flex items-center justify-between text-xs font-medium"><span>{s.label}</span><span className="text-muted-foreground">{col.length}</span></div>
                    <div className="space-y-2">
                      {col.map((a) => (
                        <div key={a.id} className="rounded-lg border border-border bg-card p-3 text-xs">
                          <Link to="/candidates/$candidateId" params={{ candidateId: a.candidate_id }} className="text-sm font-medium hover:underline">{a.candidate?.full_name}</Link>
                          <div className="mt-1 flex flex-wrap gap-1">{badges(a)}</div>
                          <div className="mt-2">{stageControls(a)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {showRejected && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{rejected.map((a) => <div key={a.id}>{rejectedCard(a)}</div>)}</div>}
        </>
      )}
    </section>
  );
}
