import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { uploadFileViaServer } from "@/lib/upload";
import { Sparkles, Loader2, Wand2, Paperclip, X, Plus, Trash2 } from "lucide-react";
import { listClients } from "@/lib/db/clients.functions";
import { upsertJob, getJob } from "@/lib/db/jobs.functions";
import { structureJob, refineJobSection } from "@/lib/ai/ai.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/jobs/new")({
  head: () => ({ meta: [{ title: "Nova vaga · Moove List" }] }),
  validateSearch: (s: Record<string, unknown>): { client?: string; edit?: string } => ({
    client: s.client as string | undefined,
    edit: s.edit as string | undefined,
  }),
  component: NewJob,
});

type DocRef = { label: string; url: string; mime: string };

function NewJob() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/jobs/new" }) as { client?: string; edit?: string };
  const qc = useQueryClient();
  const clientsFn = useServerFn(listClients);
  const saveFn = useServerFn(upsertJob);
  const aiFn = useServerFn(structureJob);
  const refineFn = useServerFn(refineJobSection);
  const getJobFn = useServerFn(getJob);
  const editId = search.edit;
  const isEdit = !!editId;

  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => clientsFn() });
  const { data: existingJob } = useQuery({
    queryKey: ["job", editId],
    queryFn: () => getJobFn({ data: { id: editId! } }),
    enabled: isEdit,
  });

  const [basic, setBasic] = useState<any>({
    client_id: search.client ?? "",
    title: "",
    area: "",
    location: "",
    work_model: "Híbrido",
    contract_type: "CLT",
    salary_min: "",
    salary_max: "",
    manager_name: "",
  });
  const [documents, setDocuments] = useState<DocRef[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [structure, setStructure] = useState<any>(null);
  const [jobId, setJobId] = useState<string | undefined>(editId);
  const [aiBusy, setAiBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!existingJob) return;
    const j: any = existingJob;
    setBasic({
      client_id: j.client_id ?? "",
      title: j.title ?? "",
      area: j.area ?? "",
      location: j.location ?? "",
      work_model: j.work_model ?? "Híbrido",
      contract_type: j.contract_type ?? "CLT",
      salary_min: j.salary_min ?? "",
      salary_max: j.salary_max ?? "",
      manager_name: j.manager_name ?? "",
    });
    setDocuments(Array.isArray(j.documents) ? j.documents : []);
    setPastedText(j.pasted_text ?? "");
    setStructure(j.ai_structure ?? null);
    setJobId(j.id);
  }, [existingJob]);

  const setB = (k: string) => (e: any) => setBasic((p: any) => ({ ...p, [k]: e?.target?.value ?? e }));

  const jobContext = () => `${basic.title} · ${basic.area ?? ""} · ${basic.location ?? ""}`;

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    try {
      const newDocs: DocRef[] = [];
      for (const file of Array.from(files)) {
        const path = `briefings/${Date.now()}-${file.name}`;
        let url: string;
        try {
          url = await uploadFileViaServer("job-briefings", path, file);
        } catch (e: any) { toast.error(`Falha ao enviar ${file.name}: ${e.message}`); continue; }
        newDocs.push({ label: file.name, url, mime: file.type || "" });
      }
      if (newDocs.length) {
        setDocuments((prev) => [...prev, ...newDocs]);
        toast.success(`${newDocs.length} arquivo(s) anexado(s)`);
      }
    } finally { setUploading(false); }
  };

  const removeDoc = (idx: number) => setDocuments((p) => p.filter((_, i) => i !== idx));

  const ensureSaved = async (status = "draft") => {
    if (!basic.client_id) throw new Error("Selecione um cliente");
    if (!basic.title.trim()) throw new Error("Informe o nome da vaga");
    const payload: any = {
      id: jobId,
      client_id: basic.client_id,
      title: basic.title,
      area: basic.area || null,
      location: basic.location || null,
      work_model: basic.work_model || null,
      contract_type: basic.contract_type || null,
      salary_min: basic.salary_min ? Number(basic.salary_min) : null,
      salary_max: basic.salary_max ? Number(basic.salary_max) : null,
      manager_name: basic.manager_name || null,
      pasted_text: pastedText || null,
      documents,
      ai_structure: structure,
      status,
    };
    const row: any = await saveFn({ data: payload });
    setJobId(row.id);
    return row.id as string;
  };

  const runAi = async () => {
    setAiBusy(true);
    try {
      const id = await ensureSaved("draft");
      const out: any = await aiFn({ data: { job_id: id, instruction: aiInstruction || undefined } });
      setStructure(out);
      toast.success("Vaga estruturada pela IA");
    } catch (e: any) { toast.error(e.message); }
    finally { setAiBusy(false); }
  };

  const save = async () => {
    try {
      await ensureSaved("open");
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Vaga salva");
      navigate({ to: "/jobs" });
    } catch (e: any) { toast.error(e.message); }
  };

  const refineSection = async (section: string, current: any, setter: (v: any) => void, instruction: string) => {
    try {
      const res: any = await refineFn({ data: { section, current_value: current, instruction, job_context: jobContext() } });
      setter(res.value);
      setStructure((s: any) => ({ ...(s ?? {}), [section]: res.value }));
      toast.success("Ajustado pela IA");
    } catch (e: any) { toast.error(e.message); }
  };

  const updateField = (key: string, value: any) => setStructure((s: any) => ({ ...(s ?? {}), [key]: value }));

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary">{isEdit ? "Edição" : "Cadastro"}</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{isEdit ? "Editar vaga" : "Nova vaga"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Preencha os campos básicos, anexe o material e deixe a IA estruturar a vaga.</p>
        </div>

        <div className="card-elevated p-6 space-y-6">
          {/* ============ Basic fields ============ */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Cliente *</Label>
              <Select value={basic.client_id} onValueChange={(v) => setB("client_id")(v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>{clients?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <div className="mt-1 text-xs">
                <a onClick={() => navigate({ to: "/clients/new" })} className="text-primary hover:underline cursor-pointer">+ Cadastrar novo cliente</a>
              </div>
            </div>
            <div className="sm:col-span-2"><Label>Nome da vaga *</Label><Input value={basic.title} onChange={setB("title")} /></div>
            <div><Label>Área</Label><Input value={basic.area} onChange={setB("area")} /></div>
            <div><Label>Cidade</Label><Input value={basic.location} onChange={setB("location")} /></div>
            <div><Label>Modelo de trabalho</Label>
              <Select value={basic.work_model} onValueChange={(v) => setB("work_model")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Presencial">Presencial</SelectItem><SelectItem value="Híbrido">Híbrido</SelectItem><SelectItem value="Remoto">Remoto</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Tipo de contratação</Label>
              <Select value={basic.contract_type} onValueChange={(v) => setB("contract_type")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CLT">CLT</SelectItem><SelectItem value="PJ">PJ</SelectItem><SelectItem value="Estatutário">Estatutário</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Salário mínimo (opcional)</Label><Input type="number" value={basic.salary_min} onChange={setB("salary_min")} /></div>
            <div><Label>Salário máximo (opcional)</Label><Input type="number" value={basic.salary_max} onChange={setB("salary_max")} /></div>
            <div className="sm:col-span-2"><Label>Gestor responsável (opcional)</Label><Input value={basic.manager_name} onChange={setB("manager_name")} /></div>
          </div>

          {/* ============ Attachments ============ */}
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Paperclip className="h-4 w-4" /> Materiais da vaga
            </div>
            <p className="text-xs text-muted-foreground mb-3">Anexe descrição, briefing, transcrição da reunião, áudio transcrito, PDFs, ou cole textos abaixo. A IA usará tudo que você fornecer.</p>
            <div className="flex items-center gap-3">
              <Input type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg" onChange={(e) => e.target.files && uploadFiles(e.target.files)} disabled={uploading} />
              {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {documents.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {documents.map((d, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
                    <a href={d.url} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">{d.label}</a>
                    <button type="button" onClick={() => removeDoc(i)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Label className="text-xs">Ou cole texto (descrição, notas, transcrição…)</Label>
              <Textarea rows={5} value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder="Cole aqui qualquer texto sobre a vaga…" />
            </div>
          </div>

          {/* ============ AI action ============ */}
          <div className="rounded-xl border border-primary/30 bg-primary-soft/60 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="font-semibold">Gerar vaga com IA</div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input placeholder="Instrução opcional para a IA (ex: foco em liderança técnica)" value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} />
              <Button onClick={runAi} disabled={aiBusy} className="sm:w-auto">
                {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1.5" />}
                {structure ? "Gerar novamente" : "Gerar vaga com IA"}
              </Button>
            </div>
          </div>

          {/* ============ Generated structure ============ */}
          {structure && (
            <div className="space-y-5">
              <TextSection title="Resumo da vaga" value={structure.summary} onChange={(v) => updateField("summary", v)} onRefine={(instr) => refineSection("summary", structure.summary, (v) => updateField("summary", v), instr)} />
              <TextSection title="Missão do cargo" value={structure.mission} onChange={(v) => updateField("mission", v)} onRefine={(instr) => refineSection("mission", structure.mission, (v) => updateField("mission", v), instr)} />
              <TextSection title="Contexto da contratação" value={structure.hiring_context} onChange={(v) => updateField("hiring_context", v)} onRefine={(instr) => refineSection("hiring_context", structure.hiring_context, (v) => updateField("hiring_context", v), instr)} />

              <BulletSection title="Principais responsabilidades" items={structure.responsibilities ?? []} onChange={(v) => updateField("responsibilities", v)} onRefine={(instr) => refineSection("responsibilities", structure.responsibilities ?? [], (v) => updateField("responsibilities", v), instr)} />
              <BulletSection title="Principais resultados esperados" items={structure.expected_results ?? []} onChange={(v) => updateField("expected_results", v)} onRefine={(instr) => refineSection("expected_results", structure.expected_results ?? [], (v) => updateField("expected_results", v), instr)} />

              <CriteriaSection title="Critérios eliminatórios" withEvidence items={structure.must_have ?? []} onChange={(v) => updateField("must_have", v)} onRefine={(instr) => refineSection("must_have", structure.must_have ?? [], (v) => updateField("must_have", v), instr)} />
              <CriteriaSection title="Critérios desejáveis" items={structure.nice_to_have ?? []} onChange={(v) => updateField("nice_to_have", v)} onRefine={(instr) => refineSection("nice_to_have", structure.nice_to_have ?? [], (v) => updateField("nice_to_have", v), instr)} />

              <BulletSection title="Hard skills" items={structure.hard_skills ?? []} onChange={(v) => updateField("hard_skills", v)} onRefine={(instr) => refineSection("hard_skills", structure.hard_skills ?? [], (v) => updateField("hard_skills", v), instr)} />
              <BulletSection title="Soft skills" items={structure.soft_skills ?? []} onChange={(v) => updateField("soft_skills", v)} onRefine={(instr) => refineSection("soft_skills", structure.soft_skills ?? [], (v) => updateField("soft_skills", v), instr)} />

              <WeightedList title="Competências para avaliação (radar)" items={structure.evaluation_competencies ?? []} onChange={(v) => updateField("evaluation_competencies", v)} onRefine={(instr) => refineSection("evaluation_competencies", structure.evaluation_competencies ?? [], (v) => updateField("evaluation_competencies", v), instr)} />

              <BulletSection title="Ferramentas e sistemas" items={structure.tools ?? []} onChange={(v) => updateField("tools", v)} onRefine={(instr) => refineSection("tools", structure.tools ?? [], (v) => updateField("tools", v), instr)} />

              <EducationSection items={structure.education ?? []} onChange={(v) => updateField("education", v)} onRefine={(instr) => refineSection("education", structure.education ?? [], (v) => updateField("education", v), instr)} />
              <LanguageSection items={structure.languages ?? []} onChange={(v) => updateField("languages", v)} onRefine={(instr) => refineSection("languages", structure.languages ?? [], (v) => updateField("languages", v), instr)} />

              <BulletSection title="Diferenciais" items={structure.differentials ?? []} onChange={(v) => updateField("differentials", v)} onRefine={(instr) => refineSection("differentials", structure.differentials ?? [], (v) => updateField("differentials", v), instr)} />

              <TextSection title="Perfil ideal" value={structure.ideal_profile} onChange={(v) => updateField("ideal_profile", v)} onRefine={(instr) => refineSection("ideal_profile", structure.ideal_profile, (v) => updateField("ideal_profile", v), instr)} />
              <TextSection title="Perfil com menor aderência" value={structure.less_fit_profile} onChange={(v) => updateField("less_fit_profile", v)} onRefine={(instr) => refineSection("less_fit_profile", structure.less_fit_profile, (v) => updateField("less_fit_profile", v), instr)} />
            </div>
          )}

          {/* ============ Actions ============ */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            <Button onClick={save}>Salvar vaga</Button>
            <Button variant="ghost" onClick={() => navigate({ to: "/jobs" })}>Cancelar</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ============ Section building blocks ============

function SectionHeader({ title, onRefine }: { title: string; onRefine: (instr: string) => void }) {
  const [open, setOpen] = useState(false);
  const [instr, setInstr] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!instr.trim()) return;
    setBusy(true);
    try { await onRefine(instr); setInstr(""); setOpen(false); }
    finally { setBusy(false); }
  };
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} className="h-7 text-xs">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Pedir ajuste à IA
        </Button>
      </div>
      {open && (
        <div className="mt-2 flex gap-2">
          <Input placeholder="Ex: deixe mais objetivo, aumente peso da liderança…" value={instr} onChange={(e) => setInstr(e.target.value)} />
          <Button type="button" size="sm" onClick={run} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
          </Button>
        </div>
      )}
    </div>
  );
}

function TextSection({ title, value, onChange, onRefine }: { title: string; value: string; onChange: (v: string) => void; onRefine: (instr: string) => void }) {
  return (
    <div>
      <SectionHeader title={title} onRefine={onRefine} />
      <Textarea rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function BulletSection({ title, items, onChange, onRefine }: { title: string; items: string[]; onChange: (v: string[]) => void; onRefine: (instr: string) => void }) {
  const update = (i: number, v: string) => onChange(items.map((it, idx) => (idx === i ? v : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);
  return (
    <div>
      <SectionHeader title={title} onRefine={onRefine} />
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input value={it} onChange={(e) => update(i, e.target.value)} />
            <Button type="button" size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
      </div>
    </div>
  );
}

type Criterion = { name: string; description?: string; weight?: number; evidence?: string };

function CriteriaSection({ title, items, onChange, onRefine, withEvidence }: { title: string; items: Criterion[]; onChange: (v: Criterion[]) => void; onRefine: (instr: string) => void; withEvidence?: boolean }) {
  const update = (i: number, patch: Partial<Criterion>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= items.length) return;
    const next = items.slice(); [next[i], next[j]] = [next[j], next[i]]; onChange(next);
  };
  const add = () => onChange([...items, { name: "", description: "", weight: 5, ...(withEvidence ? { evidence: "" } : {}) }]);
  return (
    <div>
      <SectionHeader title={title} onRefine={onRefine} />
      <div className="space-y-3">
        {items.map((c, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-3 space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Nome" value={c.name ?? ""} onChange={(e) => update(i, { name: e.target.value })} />
              <Input type="number" min={1} max={10} className="w-20" placeholder="Peso" value={c.weight ?? ""} onChange={(e) => update(i, { weight: Number(e.target.value) })} />
              <Button type="button" size="icon" variant="ghost" onClick={() => move(i, -1)}>↑</Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => move(i, 1)}>↓</Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Textarea rows={2} placeholder="Descrição" value={c.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} />
            {withEvidence && <Input placeholder="Evidência esperada" value={c.evidence ?? ""} onChange={(e) => update(i, { evidence: e.target.value })} />}
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar critério</Button>
      </div>
    </div>
  );
}

function WeightedList({ title, items, onChange, onRefine }: { title: string; items: { name: string; weight: number }[]; onChange: (v: any[]) => void; onRefine: (instr: string) => void }) {
  const update = (i: number, patch: any) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { name: "", weight: 5 }]);
  return (
    <div>
      <SectionHeader title={title} onRefine={onRefine} />
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Competência" value={it.name ?? ""} onChange={(e) => update(i, { name: e.target.value })} />
            <Input type="number" min={1} max={10} className="w-20" placeholder="Peso" value={it.weight ?? ""} onChange={(e) => update(i, { weight: Number(e.target.value) })} />
            <Button type="button" size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
      </div>
    </div>
  );
}

function EducationSection({ items, onChange, onRefine }: { items: any[]; onChange: (v: any[]) => void; onRefine: (instr: string) => void }) {
  const update = (i: number, patch: any) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { level: "", area: "", required: false }]);
  return (
    <div>
      <SectionHeader title="Formação" onRefine={onRefine} />
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Nível (graduação, MBA…)" value={it.level ?? ""} onChange={(e) => update(i, { level: e.target.value })} />
            <Input placeholder="Área" value={it.area ?? ""} onChange={(e) => update(i, { area: e.target.value })} />
            <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap px-2">
              <input type="checkbox" checked={!!it.required} onChange={(e) => update(i, { required: e.target.checked })} /> Obrigatória
            </label>
            <Button type="button" size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
      </div>
    </div>
  );
}

function LanguageSection({ items, onChange, onRefine }: { items: any[]; onChange: (v: any[]) => void; onRefine: (instr: string) => void }) {
  const update = (i: number, patch: any) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { language: "", level: "", required: false }]);
  return (
    <div>
      <SectionHeader title="Idiomas" onRefine={onRefine} />
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Idioma" value={it.language ?? ""} onChange={(e) => update(i, { language: e.target.value })} />
            <Input placeholder="Nível" value={it.level ?? ""} onChange={(e) => update(i, { level: e.target.value })} />
            <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap px-2">
              <input type="checkbox" checked={!!it.required} onChange={(e) => update(i, { required: e.target.checked })} /> Obrigatório
            </label>
            <Button type="button" size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
      </div>
    </div>
  );
}
