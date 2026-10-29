import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveMatchReview } from "@/lib/db/matches.functions";
import { CATEGORY_LABEL, STATUS_LABEL, type Assessment, type Category, type Criterion, type ExtractedProfile, type Status } from "@/lib/application-match";

const csv = (l: string[]) => l.join(", ");
const unCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const STATUS_COLOR: Record<Status, string> = { met: "text-emerald-700", partial: "text-amber-700", no_evidence: "text-muted-foreground", not_met: "text-red-700" };

export function ApplicationMatchDetail({ jobId, applicationId, match, criteria }: { jobId: string; applicationId: string; match: any; criteria: Criterion[] }) {
  const qc = useQueryClient();
  const fn = useServerFn(saveMatchReview);
  const assessments: Assessment[] = match.assessments ?? [];
  const byId = new Map(assessments.map((a) => [a.criterion_id, a]));
  const p: ExtractedProfile = match.profile ?? {};
  const [status, setStatus] = useState<Record<string, Status>>(() => Object.fromEntries(assessments.map((a) => [a.criterion_id, a.status])));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(assessments.map((a) => [a.criterion_id, a.note ?? ""])));
  const [prof, setProf] = useState({
    years: p.total_experience_years != null ? String(p.total_experience_years) : "", salary: p.salary_expectation != null ? String(p.salary_expectation) : "",
    skills: csv(p.skills ?? []), tools: csv(p.tools ?? []), education: csv(p.education ?? []), languages: csv(p.languages ?? []),
  });
  const save = useMutation({
    mutationFn: () => fn({ data: {
      application_id: applicationId,
      profile: { ...p, total_experience_years: prof.years === "" ? null : Number(prof.years), salary_expectation: prof.salary === "" ? null : Number(prof.salary),
        skills: unCsv(prof.skills), tools: unCsv(prof.tools), education: unCsv(prof.education), languages: unCsv(prof.languages) },
      overrides: assessments.filter((a) => status[a.criterion_id] !== a.status || (notes[a.criterion_id] ?? "") !== (a.note ?? "")).map((a) => ({ criterion_id: a.criterion_id, status: status[a.criterion_id]!, note: notes[a.criterion_id] || null })),
    } }),
    onSuccess: () => { toast.success("Revisão salva. Nota recalculada."); qc.invalidateQueries({ queryKey: ["job-matches", jobId] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  const cats = Object.keys(CATEGORY_LABEL) as Category[];

  return (
    <div className="mt-3 space-y-4 rounded-lg border border-border bg-secondary/30 p-4 text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-sm font-semibold">Match da candidatura: {match.score}{match.score_max > match.score ? ` (até ${match.score_max} se as lacunas forem confirmadas)` : ""}</span>
        <span className="text-muted-foreground">Cobertura de informação: {match.coverage}% dos critérios com evidência</span>
        <span className="text-muted-foreground">Método: {match.method === "ai" ? "IA (texto sem contatos, nome ou foto)" : "palavras-chave (sem IA)"}</span>
      </div>
      <p className="text-muted-foreground">Apoio à triagem — não é decisão de contratação ou reprovação. A nota mínima trata "sem evidência" como 0; a máxima, como atendido. Confira as evidências e corrija o que estiver errado.</p>
      {(match.warnings ?? []).length > 0 && <ul className="list-disc space-y-0.5 pl-4 text-amber-800">{match.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>}

      <div className="flex flex-wrap gap-2">
        {(match.breakdown ?? []).filter((b: any) => b.items > 0).map((b: any) => (
          <span key={b.category} className="rounded-md border border-border bg-card px-2 py-1">{CATEGORY_LABEL[b.category as Category]}: <b>{b.score}</b>{b.score_max > b.score ? `–${b.score_max}` : ""} <span className="text-muted-foreground">(peso {b.weight})</span></span>
        ))}
      </div>

      {cats.map((cat) => {
        const items = criteria.filter((c) => c.category === cat);
        if (!items.length) return null;
        return (
          <div key={cat}>
            <div className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">{CATEGORY_LABEL[cat]}</div>
            <div className="space-y-2">
              {items.map((c) => {
                const a = byId.get(c.id);
                const st = status[c.id] ?? "no_evidence";
                return (
                  <div key={c.id} className="rounded-md border border-border bg-card p-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 text-sm">{c.text}</div>
                      <Select value={st} onValueChange={(v) => setStatus({ ...status, [c.id]: v as Status })}>
                        <SelectTrigger className={`h-7 w-56 text-xs ${STATUS_COLOR[st]}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{(Object.keys(STATUS_LABEL) as Status[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {a?.evidence && <blockquote className="mt-1 border-l-2 border-border pl-2 italic text-muted-foreground">“{a.evidence}”</blockquote>}
                    {st === "no_evidence" && <div className="mt-1 text-muted-foreground">Lacuna de informação: o currículo não menciona. Não significa que a pessoa não tenha a competência — confirme na entrevista.</div>}
                    <Input className="mt-1.5 h-7 text-xs" placeholder="Justificativa / observação" value={notes[c.id] ?? ""} onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} />
                    {a?.overridden && <div className="mt-1 text-[10px] text-muted-foreground">Corrigido pelo recrutador (análise original: {STATUS_LABEL[a.ai_status ?? "no_evidence"]}).</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div>
        <div className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">Informações extraídas do currículo (editáveis — usadas nos filtros)</div>
        {p.summary && <p className="mb-2 text-muted-foreground">{p.summary}</p>}
        {(p.experiences ?? []).length > 0 && <ul className="mb-2 list-disc pl-4 text-muted-foreground">{p.experiences.map((e, i) => <li key={i}>{[e.role, e.company, e.period].filter(Boolean).join(" · ")}</li>)}</ul>}
        <div className="grid gap-2 sm:grid-cols-2">
          <div><Label className="text-[11px]">Anos de experiência</Label><Input className="h-8 text-xs" type="number" min={0} value={prof.years} onChange={(e) => setProf({ ...prof, years: e.target.value })} /></div>
          <div><Label className="text-[11px]">Pretensão salarial (R$/mês)</Label><Input className="h-8 text-xs" type="number" min={0} value={prof.salary} onChange={(e) => setProf({ ...prof, salary: e.target.value })} /></div>
          <div><Label className="text-[11px]">Competências (vírgula)</Label><Input className="h-8 text-xs" value={prof.skills} onChange={(e) => setProf({ ...prof, skills: e.target.value })} /></div>
          <div><Label className="text-[11px]">Ferramentas</Label><Input className="h-8 text-xs" value={prof.tools} onChange={(e) => setProf({ ...prof, tools: e.target.value })} /></div>
          <div><Label className="text-[11px]">Formação</Label><Input className="h-8 text-xs" value={prof.education} onChange={(e) => setProf({ ...prof, education: e.target.value })} /></div>
          <div><Label className="text-[11px]">Idiomas</Label><Input className="h-8 text-xs" value={prof.languages} onChange={(e) => setProf({ ...prof, languages: e.target.value })} /></div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || match.stale}>Salvar revisão</Button>
        {match.reviewed_at && <span className="text-muted-foreground">Revisado em {new Date(match.reviewed_at).toLocaleDateString("pt-BR")}</span>}
        {match.stale && <span className="text-amber-700">Requisitos da vaga mudaram: reanalise antes de revisar.</span>}
      </div>
    </div>
  );
}
