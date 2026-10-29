import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Copy, Globe, Loader2, Sparkles, EyeOff, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  approvePosting, generatePostingText, getPosting, savePostingDraft, setPostingPublished,
} from "@/lib/db/postings.functions";
import { buildJobPostingJsonLd, buildPlainText, employmentLines, formatSalary, type PostingContent } from "@/lib/job-posting";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function ListField({ label, value, onChange, hint }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string }) {
  const [text, setText] = useState(value.join("\n"));
  useEffect(() => { setText(value.join("\n")); /* eslint-disable-next-line */ }, [value.join("\n")]);
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Textarea rows={Math.min(8, Math.max(3, value.length + 1))} value={text}
        onChange={(e) => { setText(e.target.value); onChange(lines(e.target.value)); }} />
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function JobPostingSection({ job }: { job: any }) {
  const qc = useQueryClient();
  const jobId: string = job.id;
  const getFn = useServerFn(getPosting);
  const genFn = useServerFn(generatePostingText);
  const saveFn = useServerFn(savePostingDraft);
  const approveFn = useServerFn(approvePosting);
  const pubFn = useServerFn(setPostingPublished);

  const { data, isLoading, error } = useQuery({ queryKey: ["posting", jobId], queryFn: () => getFn({ data: { job_id: jobId } }) });
  const [c, setC] = useState<PostingContent | null>(null);
  const [authorized, setAuthorized] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data && !dirty) { setC(data.draft); setAuthorized(data.company_authorized); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["posting", jobId] });
  const patch = (p: Partial<PostingContent>) => { setC((prev) => (prev ? { ...prev, ...p } : prev)); setDirty(true); };
  const err = (e: any) => toast.error(e?.message ?? "Erro");

  const gen = useMutation({
    mutationFn: () => genFn({ data: { job_id: jobId, company_authorized: authorized, benefits: c?.benefits ?? [] } }),
    onSuccess: (r) => { patch({ intro: r.intro, company_intro: r.company_intro }); setWarnings(r.warnings); toast.success("Texto gerado. Revise antes de aprovar."); },
    onError: err,
  });
  const save = useMutation({
    mutationFn: () => saveFn({ data: { job_id: jobId, content: c, company_authorized: authorized } }),
    onSuccess: () => { setDirty(false); toast.success("Rascunho salvo."); refresh(); },
    onError: err,
  });
  const approve = useMutation({
    mutationFn: async () => { await saveFn({ data: { job_id: jobId, content: c, company_authorized: authorized } }); return approveFn({ data: { job_id: jobId } }); },
    onSuccess: () => { setDirty(false); toast.success("Texto aprovado."); refresh(); },
    onError: err,
  });
  const pub = useMutation({
    mutationFn: (published: boolean) => pubFn({ data: { job_id: jobId, published } }),
    onSuccess: (_r, published) => { toast.success(published ? "Vaga publicada." : "Vaga retirada da página de carreiras."); refresh(); },
    onError: err,
  });

  if (isLoading || !c) return <div className="mt-8 text-sm text-muted-foreground">Carregando divulgação…</div>;
  if (error || data?.missing)
    return (
      <div className="card-soft mt-8 p-6 text-sm text-muted-foreground">
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest">Divulgação da vaga</div>
        Recurso ainda não ativado no banco de dados (migração pendente).
      </div>
    );

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = data?.slug ? `${origin}/vagas/${data.slug}` : null;
  const approved = data?.approved ?? null;
  const copy = (t: string, msg: string) => navigator.clipboard.writeText(t).then(() => toast.success(msg), () => toast.error("Não foi possível copiar."));
  const salary = formatSalary(job.salary_min ?? null, job.salary_max ?? null);
  const pending = dirty || !approved;

  return (
    <section className="card-elevated mt-8 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Divulgação da vaga</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Usa apenas os dados cadastrados. Nada é publicado sem a sua aprovação — e a publicação não depende do status interno da vaga.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data?.is_published ? <Badge>Publicada</Badge> : <Badge variant="secondary">Não publicada</Badge>}
          {approved && !dirty ? <Badge variant="outline"><Check className="mr-1 h-3 w-3" />Texto aprovado</Badge> : <Badge variant="outline">Rascunho</Badge>}
        </div>
      </div>

      {data?.source_changed && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          O cadastro da vaga/empresa mudou desde a última aprovação. Revise o texto e aprove novamente para atualizar a página pública.
        </div>
      )}

      <div className="mt-6 space-y-5">
        <div>
          <Label className="text-xs">Informações da empresa contratante autorizadas para divulgação</Label>
          <Textarea rows={3} value={authorized} onChange={(e) => { setAuthorized(e.target.value); setDirty(true); }}
            placeholder="Ex.: descreva o que a empresa autoriza divulgar sobre o negócio. A IA não usa nada além disso e do segmento cadastrado." />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3 text-sm">Divulgada como <b>Moove Talent</b><span className="block text-[11px] text-muted-foreground">O nome do cliente nunca é publicado</span></div>
          <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            <span>Divulgar a remuneração <span className="block text-[11px] text-muted-foreground">{salary ? `Cadastrada: ${salary}` : "Sem remuneração cadastrada"}</span></span>
            <Switch checked={c.show_salary && !!salary} disabled={!salary} onCheckedChange={(v) => patch({ show_salary: v })} />
          </label>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">A IA escreve só os dois textos corridos; o restante vem direto do cadastro.</p>
          <Button variant="outline" size="sm" onClick={() => gen.mutate()} disabled={gen.isPending}>
            {gen.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
            Gerar descrição profissional
          </Button>
        </div>
        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <b>Atenção — revise:</b> {warnings.join(" ")}
          </div>
        )}

        <div><Label className="text-xs">Título do cargo</Label><Input value={c.title} onChange={(e) => patch({ title: e.target.value })} /></div>
        <div><Label className="text-xs">Resumo da oportunidade</Label><Textarea rows={4} value={c.intro} onChange={(e) => patch({ intro: e.target.value })} /></div>
        <div><Label className="text-xs">Apresentação da empresa e do modelo de negócio</Label><Textarea rows={3} value={c.company_intro} onChange={(e) => patch({ company_intro: e.target.value })} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <ListField label="Responsabilidades (uma por linha)" value={c.responsibilities} onChange={(v) => patch({ responsibilities: v })} />
          <ListField label="Requisitos obrigatórios" value={c.requirements} onChange={(v) => patch({ requirements: v })} />
          <ListField label="Competências" value={c.skills} onChange={(v) => patch({ skills: v })} />
          <ListField label="Diferenciais" value={c.differentials} onChange={(v) => patch({ differentials: v })} />
        </div>
        <ListField label="Benefícios (só o que você digitar — a IA nunca preenche)" value={c.benefits} onChange={(v) => patch({ benefits: v })} />
        <div>
          <Label className="text-xs">Link do botão "Candidatar-se" (https:// ou mailto:)</Label>
          <Input value={c.apply_url} onChange={(e) => patch({ apply_url: e.target.value })} placeholder="https://… ou mailto:rh@empresa.com" />
        </div>

        <div className="rounded-lg bg-secondary/50 p-3 text-xs">
          <div className="mb-1 font-semibold">Contratação, trabalho e remuneração (do cadastro)</div>
          {employmentLines({ content: c, employment: { area: job.area ?? null, seniority: job.seniority ?? null, location: job.location ?? null, work_model: job.work_model ?? null, contract_type: job.contract_type ?? null, salary_min: c.show_salary ? job.salary_min ?? null : null, salary_max: c.show_salary ? job.salary_max ?? null : null }, company: { name: null, segment: null, city: null, state: null, brand: "portus" }, source_hash: "" }).map((l) => (
            <div key={l.label}>{l.label}: {l.value}</div>
          ))}
          <div className="mt-1 text-muted-foreground">Para alterar, edite o cadastro da vaga.</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending || !dirty}>Salvar rascunho</Button>
        <Button onClick={() => approve.mutate()} disabled={approve.isPending || !pending}>
          {approve.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Aprovar texto
        </Button>
        {data?.is_published ? (
          <Button variant="destructive" onClick={() => pub.mutate(false)} disabled={pub.isPending}><EyeOff className="mr-1.5 h-4 w-4" />Retirar da página de carreiras</Button>
        ) : (
          <Button variant="secondary" onClick={() => pub.mutate(true)} disabled={pub.isPending || !approved || dirty}><Globe className="mr-1.5 h-4 w-4" />Publicar vaga</Button>
        )}
      </div>
      {!approved && <p className="mt-2 text-[11px] text-muted-foreground">Aprove o texto para liberar a publicação.</p>}

      {approved && (
        <div className="mt-8 space-y-4 border-t border-border pt-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Saídas da versão aprovada</div>
          {link && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-xs text-muted-foreground">Link individual de candidatura:</span>
              <code className="truncate rounded bg-secondary px-2 py-1 text-xs">{link}</code>
              <Button size="sm" variant="outline" onClick={() => copy(link, "Link copiado.")}><Copy className="mr-1 h-3.5 w-3.5" />Copiar</Button>
              {data?.is_published && <a href={link} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="ghost"><ExternalLink className="mr-1 h-3.5 w-3.5" />Abrir</Button></a>}
              {!data?.is_published && <span className="text-[11px] text-muted-foreground">(só funciona depois de publicar)</span>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => copy(buildPlainText(approved, link), "Texto copiado para LinkedIn / sites de emprego.")}>
              <Copy className="mr-1 h-3.5 w-3.5" />Copiar texto para LinkedIn e sites de emprego
            </Button>
            <Button size="sm" variant="outline" onClick={() => copy(JSON.stringify(buildJobPostingJsonLd(approved, { url: link ?? "", datePosted: (data?.published_at ?? new Date().toISOString()).slice(0, 10) }), null, 2), "Versão estruturada (ATS) copiada.")}>
              <Copy className="mr-1 h-3.5 w-3.5" />Copiar versão estruturada para ATS (JSON)
            </Button>
          </div>
          <Textarea readOnly rows={10} className="font-mono text-xs" value={buildPlainText(approved, link)} />
        </div>
      )}
    </section>
  );
}
