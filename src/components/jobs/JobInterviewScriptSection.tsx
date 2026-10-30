import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, FileDown, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateInterviewScript, getInterviewScript, saveInterviewScript } from "@/lib/db/interviews.functions";
import { TYPE_LABEL, scriptToText, totalMinutes, totalQuestions, type InterviewScript, type QuestionType } from "@/lib/interview-script";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function JobInterviewScriptSection({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getInterviewScript);
  const genFn = useServerFn(generateInterviewScript);
  const saveFn = useServerFn(saveInterviewScript);
  const { data, isLoading } = useQuery({ queryKey: ["interview-script", jobId], queryFn: () => getFn({ data: { job_id: jobId } }) });
  const [s, setS] = useState<InterviewScript | null>(null);
  const [dirty, setDirty] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => { if (data && !dirty) setS(data.script); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const dur = duration ?? data?.script?.duration_min ?? data?.default_duration ?? 30;
  const edit = (fn: (x: InterviewScript) => InterviewScript) => { setS((p) => (p ? fn(structuredClone(p)) : p)); setDirty(true); };

  const gen = useMutation({
    mutationFn: () => genFn({ data: { job_id: jobId, duration_min: dur } }),
    onSuccess: (r) => { setS(r.script); setDirty(false); toast.success(r.removed_questions ? `Roteiro gerado (${r.removed_questions} pergunta(s) fora das regras foram removidas).` : "Roteiro gerado. Revise e ajuste."); qc.invalidateQueries({ queryKey: ["interview-script", jobId] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  const save = useMutation({
    mutationFn: () => saveFn({ data: { job_id: jobId, script: s } }),
    onSuccess: (r) => { setS(r.script); setDirty(false); toast.success("Roteiro salvo."); qc.invalidateQueries({ queryKey: ["interview-script", jobId] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  if (isLoading || !data) return null;
  if (data.missing)
    return <section id="roteiro" className="card-soft mt-8 p-6 text-sm text-muted-foreground"><div className="mb-1 text-xs font-semibold uppercase tracking-widest">Roteiro de entrevista</div>Recurso ainda não ativado no banco de dados (migração pendente).</section>;

  const copy = () => s && navigator.clipboard.writeText(scriptToText(data.title, s)).then(() => toast.success("Roteiro copiado."), () => toast.error("Não foi possível copiar."));
  const pdf = () => window.open(`/roteiros/${jobId}/pdf?autoprint=1`, "_blank", "noopener");
  const diff = s ? totalMinutes(s) - s.duration_min : 0;

  return (
    <section id="roteiro" className="card-soft mt-8 scroll-mt-20 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Roteiro de entrevista · recrutador</div>
          <p className="mt-1 text-xs text-muted-foreground">Gerado só com os dados cadastrados da vaga. Uso interno: não é exibido ao cliente nem ao candidato. {data.leadership ? "Vaga de liderança: 45 min sugeridos." : "Vaga operacional: 30 min sugeridos."}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-24"><Label className="text-[11px]">Duração (min)</Label><Input type="number" min={10} max={180} value={dur} onChange={(e) => { setDuration(Number(e.target.value)); if (s) edit((x) => ({ ...x, duration_min: Number(e.target.value) || x.duration_min })); }} /></div>
          <Button onClick={() => { if (s && dirty && !confirm("Gerar de novo substitui as edições não salvas. Continuar?")) return; gen.mutate(); }} disabled={gen.isPending}>
            {gen.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}{s ? "Gerar novamente" : "Gerar roteiro"}
          </Button>
        </div>
      </div>

      {!s && <p className="mt-5 text-sm text-muted-foreground">Nenhum roteiro ainda. Clique em “Gerar roteiro” para criar um a partir dos requisitos desta vaga.</p>}

      {s && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{totalQuestions(s)} perguntas · seções somam {totalMinutes(s)} min{diff !== 0 ? ` (duração do roteiro: ${s.duration_min} min)` : ""}</span>
            {data.generated_by_ai && <span className="rounded-full border border-border px-2 py-0.5">Gerado por IA — revise antes de usar</span>}
          </div>
          <div><Label className="text-xs">Abertura</Label><Textarea rows={2} value={s.opening} onChange={(e) => edit((x) => ({ ...x, opening: e.target.value }))} /></div>

          {s.sections.map((sec, i) => (
            <div key={i} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Input className="min-w-0 flex-1 font-medium" value={sec.title} onChange={(e) => edit((x) => { x.sections[i]!.title = e.target.value; return x; })} />
                <div className="flex items-center gap-1 text-xs"><Input className="h-9 w-16" type="number" min={1} value={sec.minutes} onChange={(e) => edit((x) => { x.sections[i]!.minutes = Number(e.target.value) || 1; return x; })} />min</div>
                <Button size="icon" variant="ghost" aria-label="Remover seção" onClick={() => edit((x) => { x.sections.splice(i, 1); return x; })}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="mt-3 space-y-3">
                {sec.questions.map((q, j) => (
                  <div key={j} className="rounded-lg bg-secondary/40 p-3">
                    <div className="flex items-start gap-2">
                      <Select value={q.type} onValueChange={(v) => edit((x) => { x.sections[i]!.questions[j]!.type = v as QuestionType; return x; })}>
                        <SelectTrigger className="h-8 w-36 shrink-0 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                      </Select>
                      <Textarea rows={2} className="flex-1" value={q.text} onChange={(e) => edit((x) => { x.sections[i]!.questions[j]!.text = e.target.value; return x; })} />
                      <Button size="icon" variant="ghost" aria-label="Remover pergunta" onClick={() => edit((x) => { x.sections[i]!.questions.splice(j, 1); return x; })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                      <div><Label className="text-[11px]">Avalia (requisito da vaga)</Label><Input className="h-8 text-xs" value={q.evaluates} onChange={(e) => edit((x) => { x.sections[i]!.questions[j]!.evaluates = e.target.value; return x; })} /></div>
                      <div><Label className="text-[11px]">Sinais de boa resposta (um por linha)</Label><Textarea rows={2} className="text-xs" value={q.good_signs.join("\n")} onChange={(e) => edit((x) => { x.sections[i]!.questions[j]!.good_signs = lines(e.target.value); return x; })} /></div>
                      <div><Label className="text-[11px]">Pontos de atenção (um por linha)</Label><Textarea rows={2} className="text-xs" value={q.watch_for.join("\n")} onChange={(e) => edit((x) => { x.sections[i]!.questions[j]!.watch_for = lines(e.target.value); return x; })} /></div>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => edit((x) => { x.sections[i]!.questions.push({ type: "comportamental", text: "", evaluates: "", good_signs: [], watch_for: [] }); return x; })}><Plus className="mr-1 h-3.5 w-3.5" />Pergunta</Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => edit((x) => { x.sections.push({ title: "Nova seção", minutes: 5, questions: [] }); return x; })}><Plus className="mr-1 h-3.5 w-3.5" />Seção</Button>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Critérios de avaliação (1 fraco · 3 adequado · 5 forte)</div>
            <div className="space-y-2">
              {s.criteria.map((c, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-4">
                  <div className="flex gap-1"><Input className="h-8 text-xs font-medium" value={c.name} onChange={(e) => edit((x) => { x.criteria[i]!.name = e.target.value; return x; })} /><Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Remover critério" onClick={() => edit((x) => { x.criteria.splice(i, 1); return x; })}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                  <Textarea rows={2} className="text-xs" placeholder="1 — fraco" value={c.weak} onChange={(e) => edit((x) => { x.criteria[i]!.weak = e.target.value; return x; })} />
                  <Textarea rows={2} className="text-xs" placeholder="3 — adequado" value={c.adequate} onChange={(e) => edit((x) => { x.criteria[i]!.adequate = e.target.value; return x; })} />
                  <Textarea rows={2} className="text-xs" placeholder="5 — forte" value={c.strong} onChange={(e) => edit((x) => { x.criteria[i]!.strong = e.target.value; return x; })} />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => edit((x) => { x.criteria.push({ name: "", weak: "", adequate: "", strong: "" }); return x; })}><Plus className="mr-1 h-3.5 w-3.5" />Critério</Button>
            </div>
          </div>
          <div><Label className="text-xs">Encerramento</Label><Textarea rows={2} value={s.closing} onChange={(e) => edit((x) => ({ ...x, closing: e.target.value }))} /></div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending || !dirty}>{save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Salvar roteiro</Button>
            <Button variant="outline" onClick={copy}><Copy className="mr-1.5 h-4 w-4" />Copiar</Button>
            <Button variant="outline" onClick={pdf} disabled={dirty} title={dirty ? "Salve antes de baixar" : undefined}><FileDown className="mr-1.5 h-4 w-4" />Baixar PDF</Button>
          </div>
        </div>
      )}
    </section>
  );
}
