import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { uploadFileViaServer } from "@/lib/upload";
import { Sparkles, Loader2, Wand2, Upload, Lock, FileText, Trash2, ArrowLeft, RefreshCw } from "lucide-react";
import { getCandidate, upsertCandidate, addCandidateDocument, deleteCandidateDocument } from "@/lib/db/candidates.functions";
import { generateCandidateProfile, refineText } from "@/lib/ai/ai.functions";
import { listSkillSuggestions } from "@/lib/db/tags.functions";


export const Route = createFileRoute("/candidates/new")({
  head: () => ({ meta: [{ title: "Novo candidato · Moove List" }] }),
  validateSearch: (s: Record<string, unknown>): { id?: string; job?: string; shortlist?: string } => ({
    id: (s.id as string | undefined) ?? undefined,
    job: (s.job as string | undefined) ?? undefined,
    shortlist: (s.shortlist as string | undefined) ?? undefined,
  }),
  component: NewCandidate,
});

const AI_STEPS = [
  "Lendo o currículo",
  "Organizando a trajetória profissional",
  "Identificando resultados",
  "Analisando a entrevista",
  "Extraindo competências",
  "Estruturando a formação",
  "Criando a headline",
  "Gerando a bio profissional",
  "Finalizando o perfil",
];

function NewCandidate() {
  const navigate = useNavigate();
  const { id: editId } = useSearch({ from: "/candidates/new" });
  const qc = useQueryClient();
  const saveFn = useServerFn(upsertCandidate);
  const getFn = useServerFn(getCandidate);
  const docFn = useServerFn(addCandidateDocument);
  const delDocFn = useServerFn(deleteCandidateDocument);
  const aiFn = useServerFn(generateCandidateProfile);
  const refineFn = useServerFn(refineText);

  const { data: existing } = useQuery({
    queryKey: ["candidate", editId],
    queryFn: () => (editId ? getFn({ data: { id: editId } }) : Promise.resolve(null)),
    enabled: !!editId,
  });

  const [candId, setCandId] = useState<string | undefined>(editId);
  const [docs, setDocs] = useState<any[]>([]);
  const [f, setF] = useState<any>({
    full_name: "", photo_url: "", current_position: "", current_company: "", area: "", seniority: "",
    city: "", state: "", country: "Brasil", work_model: "Não informado", age: "", salary_expectation: "",
    salary_min: "", salary_max: "",

    gender: "Prefere não identificar",
    linkedin_url: "", email: "", phone: "",
    resume_url: "", transcript: "", recruiter_note: "", internal_notes: "",
    disc_raw: "", disc_profile: "", disc_scores: null,
    headline: "", mini_bio: "", full_bio: "", work_style: "",
    executive_summary: [], specialties: [], main_results: [], achievements: [], main_case: null,
    strengths: [], professional_moment: null, motivators: [], trajectory: [],
    education: [], courses: [], languages: [], competencies: null, additional_info: null,
    inconsistencies: [], status: "rascunho",
  });
  const suggestionsFn = useServerFn(listSkillSuggestions);
  const { data: skillSuggestions } = useQuery({ queryKey: ["skill-suggestions"], queryFn: () => suggestionsFn() });
  const [aiBusy, setAiBusy] = useState(false);

  const [aiStep, setAiStep] = useState(0);
  const [refineInstr, setRefineInstr] = useState("");
  const [pastedContext, setPastedContext] = useState("");
  const [refiningKey, setRefiningKey] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setF((p: any) => ({
        ...p,
        ...existing,
        age: (existing as any).age ?? "",
        salary_expectation: existing.salary_expectation ?? "",
        salary_min: (existing as any).salary_min ?? "",
        salary_max: (existing as any).salary_max ?? "",
      }));

      setCandId(existing.id);
      setDocs(existing.documents ?? []);
    }
  }, [existing]);

  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e?.target?.value ?? e }));

  const buildPayload = (extra: any = {}) => ({
    id: candId,
    full_name: f.full_name, photo_url: f.photo_url || null,
    current_position: f.current_position || null, current_company: f.current_company || null,
    area: f.area || null, seniority: f.seniority || null,
    city: f.city || null, state: f.state || null, country: f.country || null,
    work_model: f.work_model || null,
    gender: f.gender || null,
    age: f.age ? Number(f.age) : null,
    salary_expectation: f.salary_expectation ? Number(f.salary_expectation) : null,
    salary_min: f.salary_min ? Number(f.salary_min) : null,
    salary_max: f.salary_max ? Number(f.salary_max) : null,

    linkedin_url: f.linkedin_url || null, email: f.email || null, phone: f.phone || null,
    transcript: [f.transcript, pastedContext].filter(Boolean).join("\n\n---\n\n") || null,
    recruiter_note: f.recruiter_note || null, internal_notes: f.internal_notes || null,
    disc_raw: f.disc_raw || null, disc_profile: f.disc_profile || null,
    headline: f.headline || null, mini_bio: f.mini_bio || null, full_bio: f.full_bio || null,
    work_style: f.work_style || null,
    executive_summary: f.executive_summary, specialties: f.specialties, main_results: f.main_results,
    achievements: f.achievements, main_case: f.main_case, strengths: f.strengths,
    professional_moment: f.professional_moment, motivators: f.motivators, trajectory: f.trajectory,
    education: f.education, courses: f.courses, languages: f.languages, competencies: f.competencies,
    additional_info: f.additional_info, inconsistencies: f.inconsistencies,
    status: f.status,
    ...extra,
  });

  const ensureSaved = async (extra: any = {}) => {
    if (!f.full_name.trim()) { toast.error("Nome é obrigatório"); return null; }
    const row: any = await saveFn({ data: buildPayload(extra) });
    setCandId(row.id);
    setF((p: any) => ({
      ...p,
      ...row,
      age: row.age ?? "",
      salary_expectation: row.salary_expectation ?? "",
      salary_min: row.salary_min ?? "",
      salary_max: row.salary_max ?? "",
    }));

    qc.invalidateQueries({ queryKey: ["candidates"] });
    return row.id as string;
  };

  const uploadTo = async (kind: string, file: File, visible: boolean) => {
    const id = candId ?? await ensureSaved();
    if (!id) return null;

    // Photos: convert to base64 data URL so they display everywhere without a public bucket.
    if (kind === "photo") {
      if (file.size > 3 * 1024 * 1024) {
        toast.error("Foto muito grande. Envie uma imagem de até 3MB.");
        return null;
      }
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      setF((p: any) => ({ ...p, photo_url: dataUrl }));
      try {
        const row: any = await saveFn({ data: { ...buildPayload(), photo_url: dataUrl } });
        setCandId(row.id);
        qc.invalidateQueries({ queryKey: ["candidates"] });
        qc.invalidateQueries({ queryKey: ["candidate", row.id] });
      } catch (e: any) { toast.error(e.message); return null; }
      toast.success("Foto salva");
      return dataUrl;
    }

    const path = `${id}/${Date.now()}-${file.name}`;
    let url: string;
    try {
      url = await uploadFileViaServer("candidate-files", path, file);
    } catch (e: any) { toast.error(e.message); return null; }
    const doc: any = await docFn({ data: { candidate_id: id, kind, label: file.name, url, visible_to_client: visible } });
    setDocs((p) => [doc, ...p]);
    if (kind === "resume") setF((p: any) => ({ ...p, resume_url: url }));
    toast.success("Arquivo enviado");
    return url;
  };

  const removeDoc = async (id: string) => {
    await delDocFn({ data: { id } });
    setDocs((p) => p.filter((d) => d.id !== id));
  };

  const runAi = async () => {
    setAiBusy(true); setAiStep(0);
    const interval = setInterval(() => setAiStep((s) => Math.min(s + 1, AI_STEPS.length - 1)), 900);
    try {
      const id = await ensureSaved({ status: "em_processamento" });
      if (!id) return;
      const out: any = await aiFn({ data: { candidate_id: id, instruction: refineInstr || undefined } });
      // Recarrega o candidato para pegar tanto o perfil estruturado quanto os campos básicos preenchidos pela IA.
      const fresh: any = await getFn({ data: { id } });
      if (fresh) {
        setF((p: any) => ({
          ...p,
          ...fresh,
          age: fresh.age ?? p.age ?? "",
          salary_expectation: fresh.salary_expectation ?? p.salary_expectation ?? "",
          salary_min: fresh.salary_min ?? p.salary_min ?? "",
          salary_max: fresh.salary_max ?? p.salary_max ?? "",

          executive_summary: fresh.executive_summary ?? [],
          specialties: fresh.specialties ?? [],
          main_results: fresh.main_results ?? [],
          achievements: fresh.achievements ?? [],
          strengths: fresh.strengths ?? [],
          motivators: fresh.motivators ?? [],
          trajectory: fresh.trajectory ?? [],
          education: fresh.education ?? [],
          courses: fresh.courses ?? [],
          languages: fresh.languages ?? [],
          inconsistencies: fresh.inconsistencies ?? [],
        }));
        setDocs(fresh.documents ?? []);
      } else {
        setF((p: any) => ({ ...p, ...out, status: "aguardando_revisao" }));
      }
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["candidate", id] });

      toast.success("Perfil gerado com IA");
    } catch (e: any) { toast.error(e.message); }
    finally { clearInterval(interval); setAiBusy(false); }
  };

  const refineSection = async (key: string, instruction: string) => {
    setRefiningKey(key);
    try {
      const currentText = typeof f[key] === "string" ? f[key] : JSON.stringify(f[key], null, 2);
      const out: any = await refineFn({ data: { current_text: currentText, instruction, context: `Candidato: ${f.full_name}` } });
      setF((p: any) => ({ ...p, [key]: out.text }));
      toast.success("Texto ajustado pela IA");
    } catch (e: any) { toast.error(e.message); }
    finally { setRefiningKey(null); }
  };

  const save = async (status?: string) => {
    const id = await ensureSaved(status ? { status } : {});
    if (!id) return;
    toast.success("Candidato salvo");
    navigate({ to: "/candidates/$candidateId", params: { candidateId: id } });
  };

  const saveDraft = async () => {
    const id = await ensureSaved({ status: "rascunho" });
    if (id) toast.success("Rascunho salvo");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-4">
          <Link to="/candidates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para candidatos
          </Link>
        </div>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Cadastro</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{editId ? "Editar candidato" : "Novo candidato"}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate({ to: "/candidates" })}>Cancelar</Button>
            <Button variant="outline" onClick={saveDraft}>Salvar rascunho</Button>
            <Button variant="outline" onClick={() => ensureSaved().then((id) => id && toast.success("Salvo"))}>Salvar e continuar</Button>
            <Button onClick={() => save("ativo")}>Salvar candidato</Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* SIDEBAR - manual fields */}
          <aside className="space-y-4">
            <div className="card-elevated p-5 space-y-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Dados básicos</div>
              <div className="text-[11px] text-muted-foreground">Preencha o que já souber. A IA tentará completar o restante a partir dos arquivos anexados.</div>
              <div><Label>Nome completo *</Label><Input value={f.full_name} onChange={set("full_name")} /></div>
              <div><Label>Cargo atual</Label><Input value={f.current_position} onChange={set("current_position")} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gênero</Label>
                  <Select value={f.gender || "Prefere não identificar"} onValueChange={set("gender")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Masculino","Feminino","Prefere não identificar"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Idade</Label>
                  <Input type="number" min="14" max="100" value={f.age} onChange={set("age")} placeholder="Ex: 32" />
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">Gênero é usado para a concordância dos textos do perfil.</div>
              <div><Label>Área profissional</Label><Input value={f.area} onChange={set("area")} /></div>
              <div><Label>Cidade</Label><Input value={f.city} onChange={set("city")} /></div>
              <div><Label>Modelo de trabalho</Label>
                <Select value={f.work_model} onValueChange={set("work_model")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Remoto","Híbrido","Presencial","Flexível","Não informado"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Pretensão salarial (R$)</Label><Input type="number" value={f.salary_expectation} onChange={set("salary_expectation")} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Pretensão mínima (R$)</Label><Input type="number" value={f.salary_min} onChange={set("salary_min")} /></div>
                <div><Label>Pretensão máxima (R$)</Label><Input type="number" value={f.salary_max} onChange={set("salary_max")} /></div>
              </div>

              <div><Label>LinkedIn</Label><Input value={f.linkedin_url} onChange={set("linkedin_url")} placeholder="https://linkedin.com/in/…" /></div>
            </div>


            <div className="card-elevated p-5 space-y-3 border-l-4 border-amber-500">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-amber-700"><Lock className="h-3.5 w-3.5" />Informação interna</div>
              <div className="text-xs text-muted-foreground">Visível apenas para recrutador e admin. Nunca aparece para o cliente.</div>
              <div><Label>Telefone</Label><Input value={f.phone} onChange={set("phone")} /></div>
              <div><Label>E-mail</Label><Input type="email" value={f.email} onChange={set("email")} /></div>
              <div><Label>Parecer do recrutador</Label><Textarea rows={4} value={f.recruiter_note} onChange={set("recruiter_note")} /></div>
              <div><Label>Observações internas</Label><Textarea rows={3} value={f.internal_notes} onChange={set("internal_notes")} /></div>
            </div>

            <div className="card-elevated p-5 space-y-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">DISC (opcional)</div>
              <div><Label>Perfil predominante</Label><Input value={f.disc_profile} onChange={set("disc_profile")} placeholder="Ex: DI" /></div>
              <div><Label>Resultado completo</Label><Textarea rows={3} value={f.disc_raw} onChange={set("disc_raw")} /></div>
            </div>
          </aside>

          {/* MAIN - ChatGPT-like area */}
          <main className="space-y-4">
            <div className="card-elevated p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">Área de contexto e IA</div>
                  <div className="text-xs text-muted-foreground">Envie arquivos, cole textos e peça para a IA estruturar o perfil executivo.</div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                <UploadCard label="Foto" accept="image/*" onUpload={(fl) => uploadTo("photo", fl, true)} />
                <UploadCard label="Currículo (PDF/DOCX)" accept=".pdf,.doc,.docx" onUpload={(fl) => uploadTo("resume", fl, false)} />
                <UploadCard label="LinkedIn (PDF)" accept=".pdf" onUpload={(fl) => uploadTo("linkedin_pdf", fl, false)} />
                <UploadCard label="Teste DISC" onUpload={(fl) => uploadTo("disc", fl, false)} />
                <UploadCard label="Portfólio" onUpload={(fl) => uploadTo("portfolio", fl, true)} />
                <UploadCard label="Certificados" onUpload={(fl) => uploadTo("certificate", fl, true)} />
                <UploadCard label="Outros documentos" onUpload={(fl) => uploadTo("other", fl, false)} />
              </div>

              {docs.length > 0 && (
                <div className="mb-4 space-y-1.5">
                  {docs.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      <a href={d.url} target="_blank" rel="noreferrer" className="truncate flex-1 hover:underline">{d.label}</a>
                      <Badge variant="outline" className="text-[10px]">{d.kind}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => removeDoc(d.id)} aria-label="Remover documento"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-3">
                <Label>Cole aqui informações, anotações, parecer, transcrição, etc.</Label>
                <Textarea rows={5} value={pastedContext} onChange={(e) => setPastedContext(e.target.value)} placeholder="Anotações da entrevista, motivo da movimentação, disponibilidade, contexto profissional…" className="mt-1" />
              </div>
              <div>
                <Label>Resumo/transcrição da entrevista</Label>
                <Textarea rows={4} value={f.transcript} onChange={set("transcript")} className="mt-1" />
              </div>

              <div className="mt-5 rounded-xl border border-primary/30 bg-primary-soft/40 p-4">
                <div className="flex gap-2">
                  <Input placeholder="Instrução opcional para a IA (ex: destaque resultados financeiros)…" value={refineInstr} onChange={(e) => setRefineInstr(e.target.value)} />
                  <Button onClick={runAi} disabled={aiBusy}>
                    {aiBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Wand2 className="h-4 w-4 mr-1.5" />}
                    Gerar perfil com IA
                  </Button>
                </div>
                {aiBusy && (
                  <div className="mt-3 space-y-1">
                    {AI_STEPS.map((s, i) => (
                      <div key={s} className={"flex items-center gap-2 text-sm " + (i <= aiStep ? "text-foreground" : "text-muted-foreground/50")}>
                        {i < aiStep ? <span className="text-emerald-500">✓</span> : i === aiStep ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <span>·</span>}
                        {s}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-muted-foreground">A IA não inventa informações. Quando um dado não estiver disponível, o campo ficará vazio ou marcado como "Não informado".</div>
              </div>
            </div>

            {/* Editable structured sections — só aparecem após a IA gerar o perfil ou ao editar um candidato existente */}
            {(!!editId || !!f.headline || !!f.mini_bio || !!f.full_bio || (f.trajectory?.length ?? 0) > 0) ? (
              <>
            <Section title="Headline" onRefine={(instr) => refineSection("headline", instr)} refining={refiningKey === "headline"}>
              <Input value={f.headline || ""} onChange={set("headline")} placeholder="Headline profissional" />
            </Section>


            <Section title="Mini bio (até 240 caracteres)" onRefine={(instr) => refineSection("mini_bio", instr)} refining={refiningKey === "mini_bio"}>
              <Textarea rows={2} maxLength={240} value={f.mini_bio || ""} onChange={set("mini_bio")} />
              <div className="text-[11px] text-muted-foreground text-right">{(f.mini_bio || "").length}/240</div>
            </Section>

            <Section title="Bio completa" onRefine={(instr) => refineSection("full_bio", instr)} refining={refiningKey === "full_bio"}>
              <Textarea rows={5} value={f.full_bio || ""} onChange={set("full_bio")} />
            </Section>

            <ArraySection title="Resumo executivo (bullets)" items={f.executive_summary} onChange={(v) => setF((p: any) => ({ ...p, executive_summary: v }))} />
            <TagSection title="Especialidades" items={f.specialties} onChange={(v) => setF((p: any) => ({ ...p, specialties: v }))} />
            <ArraySection title="Principais resultados" items={f.main_results} onChange={(v) => setF((p: any) => ({ ...p, main_results: v }))} />
            <ArraySection title="Principais conquistas" items={f.achievements} onChange={(v) => setF((p: any) => ({ ...p, achievements: v }))} />

            <Section title="Principal case profissional">
              {["context","challenge","action","result"].map((k) => (
                <div key={k} className="mb-2">
                  <Label className="capitalize">{({context:"Contexto",challenge:"Desafio",action:"Ação",result:"Resultado"} as any)[k]}</Label>
                  <Textarea rows={2} value={f.main_case?.[k] ?? ""} onChange={(e) => setF((p: any) => ({ ...p, main_case: { ...(p.main_case ?? {}), [k]: e.target.value } }))} />
                </div>
              ))}
            </Section>

            <Section title="Pontos fortes">
              {(f.strengths ?? []).map((s: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 mb-2">
                  <Input value={s.title ?? ""} onChange={(e) => { const arr = [...f.strengths]; arr[i] = { ...arr[i], title: e.target.value }; setF((p: any) => ({ ...p, strengths: arr })); }} placeholder="Título" />
                  <Input value={s.evidence ?? ""} onChange={(e) => { const arr = [...f.strengths]; arr[i] = { ...arr[i], evidence: e.target.value }; setF((p: any) => ({ ...p, strengths: arr })); }} placeholder="Evidência" />
                  <Button variant="ghost" size="sm" onClick={() => setF((p: any) => ({ ...p, strengths: p.strengths.filter((_: any, j: number) => j !== i) }))} aria-label="Remover item"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setF((p: any) => ({ ...p, strengths: [...(p.strengths ?? []), { title: "", evidence: "" }] }))}>+ Adicionar</Button>
            </Section>

            <Section title="Estilo de atuação" onRefine={(instr) => refineSection("work_style", instr)} refining={refiningKey === "work_style"}>
              <Textarea rows={3} value={f.work_style || ""} onChange={set("work_style")} />
            </Section>

            <Section title="Momento profissional">
              {[["reason_for_move","Motivo da movimentação"],["looking_for","O que busca"],["availability","Disponibilidade"],["expectations","Expectativas"]].map(([k,label]) => (
                <div key={k} className="mb-2">
                  <Label>{label}</Label>
                  <Input value={f.professional_moment?.[k] ?? ""} onChange={(e) => setF((p: any) => ({ ...p, professional_moment: { ...(p.professional_moment ?? {}), [k]: e.target.value } }))} />
                </div>
              ))}
            </Section>

            <TagSection title="Motivadores de carreira" items={f.motivators} onChange={(v) => setF((p: any) => ({ ...p, motivators: v }))} />

            <Section title="Trajetória profissional">
              {(f.trajectory ?? []).map((t: any, i: number) => (
                <div key={i} className="mb-3 rounded-lg border border-border p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={t.company ?? ""} onChange={(e) => updateArr(f, setF, "trajectory", i, "company", e.target.value)} placeholder="Empresa" />
                    <Input value={t.segment ?? ""} onChange={(e) => updateArr(f, setF, "trajectory", i, "segment", e.target.value)} placeholder="Segmento" />
                    <Input value={t.role ?? ""} onChange={(e) => updateArr(f, setF, "trajectory", i, "role", e.target.value)} placeholder="Cargo" />
                    <Input value={t.team_size ?? ""} onChange={(e) => updateArr(f, setF, "trajectory", i, "team_size", e.target.value)} placeholder="Tamanho da equipe" />
                    <Input value={t.start ?? ""} onChange={(e) => updateArr(f, setF, "trajectory", i, "start", e.target.value)} placeholder="Início" />
                    <Input value={t.end ?? ""} onChange={(e) => updateArr(f, setF, "trajectory", i, "end", e.target.value)} placeholder="Término" />
                    <Input value={t.location ?? ""} onChange={(e) => updateArr(f, setF, "trajectory", i, "location", e.target.value)} placeholder="Localização" />
                    <Input value={t.work_model ?? ""} onChange={(e) => updateArr(f, setF, "trajectory", i, "work_model", e.target.value)} placeholder="Modelo" />
                  </div>
                  <Textarea rows={2} value={t.scope ?? ""} onChange={(e) => updateArr(f, setF, "trajectory", i, "scope", e.target.value)} placeholder="Escopo da função" />
                  <Textarea rows={2} value={(t.responsibilities ?? []).join("\n")} onChange={(e) => updateArr(f, setF, "trajectory", i, "responsibilities", e.target.value.split("\n").filter(Boolean))} placeholder="Responsabilidades (uma por linha)" />
                  <Textarea rows={2} value={(t.results ?? []).join("\n")} onChange={(e) => updateArr(f, setF, "trajectory", i, "results", e.target.value.split("\n").filter(Boolean))} placeholder="Resultados (uma por linha)" />
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setF((p: any) => ({ ...p, trajectory: p.trajectory.filter((_: any, j: number) => j !== i) }))}><Trash2 className="h-3.5 w-3.5 mr-1" />Remover</Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setF((p: any) => ({ ...p, trajectory: [...(p.trajectory ?? []), {}] }))}>+ Adicionar experiência</Button>
            </Section>

            <Section title="Formação acadêmica">
              <SimpleList items={f.education ?? []} fields={[["course","Curso"],["institution","Instituição"],["type","Tipo"],["area","Área"],["start","Início"],["end","Conclusão"],["status","Status"]]} onChange={(v) => setF((p: any) => ({ ...p, education: v }))} />
            </Section>
            <Section title="Cursos e certificações">
              <SimpleList items={f.courses ?? []} fields={[["name","Nome"],["institution","Instituição"],["year","Ano"],["status","Status"],["workload","Carga horária"]]} onChange={(v) => setF((p: any) => ({ ...p, courses: v }))} />
            </Section>
            <Section title="Idiomas">
              <SimpleList items={f.languages ?? []} fields={[["language","Idioma"],["level","Nível"],["professional_use","Uso profissional"]]} onChange={(v) => setF((p: any) => ({ ...p, languages: v }))} />
            </Section>

            <Section title="Competências">
              {(["hard_skills","tools","soft_skills","leadership","technical"] as const).map((k) => (
                <div key={k} className="mb-3">
                  <Label>{({hard_skills:"Habilidades técnicas",tools:"Ferramentas",soft_skills:"Habilidades comportamentais",leadership:"Liderança",technical:"Conhecimentos complementares"} as any)[k]}</Label>
                  <TagInput
                    items={f.competencies?.[k] ?? []}
                    suggestions={(skillSuggestions as any)?.[k] ?? []}
                    onChange={(v) => setF((p: any) => ({ ...p, competencies: { ...(p.competencies ?? {}), [k]: v } }))}
                  />
                </div>
              ))}
            </Section>


            <Section title="Informações adicionais (uso interno)">
              <Textarea rows={4} value={typeof f.additional_info === "string" ? f.additional_info : JSON.stringify(f.additional_info ?? "", null, 2)} onChange={(e) => setF((p: any) => ({ ...p, additional_info: e.target.value }))} placeholder="Áreas/cargos/segmentos/cidades de interesse, disponibilidade, restrições, observações internas…" />
            </Section>

            {f.inconsistencies?.length > 0 && (
              <div className="card-elevated p-4 border-l-4 border-amber-500">
                <div className="text-sm font-semibold text-amber-700 mb-2">Inconsistências detectadas pela IA</div>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  {f.inconsistencies.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
              </>
            ) : (
              <div className="card-elevated p-6 text-center text-sm text-muted-foreground">
                Envie os materiais e clique em <b>Gerar perfil com IA</b>. As seções detalhadas do perfil aparecerão aqui para revisão.
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => navigate({ to: "/candidates" })}>Cancelar</Button>
              <Button variant="outline" onClick={saveDraft}>Salvar rascunho</Button>
              <Button variant="outline" onClick={() => ensureSaved().then((id) => id && toast.success("Salvo"))}>Salvar e continuar</Button>
              <Button onClick={() => save("ativo")}>Salvar candidato</Button>
            </div>

          </main>
        </div>
      </div>
    </AppShell>
  );
}

function updateArr(f: any, setF: any, key: string, idx: number, field: string, value: any) {
  const arr = [...(f[key] ?? [])];
  arr[idx] = { ...arr[idx], [field]: value };
  setF((p: any) => ({ ...p, [key]: arr }));
}

function Section({ title, children, onRefine, refining }: { title: string; children: any; onRefine?: (i: string) => void; refining?: boolean }) {
  const [instr, setInstr] = useState("");
  return (
    <div className="card-elevated p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold">{title}</div>
      </div>
      {children}
      {onRefine && (
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <Input placeholder="Pedir ajuste à IA (ex: deixe mais objetivo)…" value={instr} onChange={(e) => setInstr(e.target.value)} className="text-xs" />
          <Button size="sm" variant="outline" onClick={() => { if (instr.trim()) onRefine(instr); }} disabled={refining}>
            {refining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
    </div>
  );
}

function ArraySection({ title, items, onChange }: { title: string; items: string[]; onChange: (v: string[]) => void }) {
  const arr = items ?? [];
  return (
    <Section title={title}>
      {arr.map((s: string, i: number) => (
        <div key={i} className="flex gap-2 mb-2">
          <Input value={s} onChange={(e) => { const a = [...arr]; a[i] = e.target.value; onChange(a); }} />
          <Button variant="ghost" size="sm" onClick={() => onChange(arr.filter((_, j) => j !== i))} aria-label="Remover item"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...arr, ""])}>+ Adicionar</Button>
    </Section>
  );
}

function TagSection({ title, items, onChange }: { title: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <Section title={title}>
      <TagInput items={items ?? []} onChange={onChange} />
    </Section>
  );
}

function TagInput({ items, onChange, suggestions = [] }: { items: string[]; onChange: (v: string[]) => void; suggestions?: string[] }) {
  const [val, setVal] = useState("");
  const current = items ?? [];
  const norm = (s: string) => s.trim().toLowerCase();
  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (current.some((t) => norm(t) === norm(v))) { setVal(""); return; }
    onChange([...current, v]);
    setVal("");
  };
  const matches = val.trim()
    ? suggestions.filter((s) => norm(s).includes(norm(val)) && !current.some((t) => norm(t) === norm(s))).slice(0, 6)
    : [];
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {current.map((t, i) => (
          <Badge key={i} variant="secondary" className="gap-1">
            {t}
            <button onClick={() => onChange(current.filter((_, j) => j !== i))} className="hover:text-destructive" aria-label={`Remover ${t}`}>×</button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(val); } }} placeholder="Digite o nome e pressione Enter" />
        <Button size="sm" variant="outline" onClick={() => add(val)}>Adicionar</Button>
      </div>
      {matches.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Já cadastrados:</span>
          {matches.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function SimpleList({ items, fields, onChange }: { items: any[]; fields: [string,string][]; onChange: (v: any[]) => void }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="mb-2 grid gap-2 rounded-lg border border-border p-3" style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(0,1fr)) auto` }}>
          {fields.map(([k, label]) => (
            <Input key={k} placeholder={label} value={item[k] ?? ""} onChange={(e) => { const a = [...items]; a[i] = { ...a[i], [k]: e.target.value }; onChange(a); }} />
          ))}
          <Button variant="ghost" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remover item"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...items, {}])}>+ Adicionar</Button>
    </div>
  );
}

function UploadCard({ label, accept, onUpload }: { label: string; accept?: string; onUpload: (f: File) => Promise<any> }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 p-3 cursor-pointer hover:bg-secondary transition-colors">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-card text-primary">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium truncate">{label}</div>
        <div className="text-[10px] text-muted-foreground">{busy ? "Enviando…" : "Clique para enviar"}</div>
      </div>
      <input type="file" className="hidden" accept={accept} onChange={async (e) => {
        const fl = e.target.files?.[0]; if (!fl) return;
        setBusy(true); await onUpload(fl); setBusy(false);
        e.target.value = "";
      }} />
    </label>
  );
}


