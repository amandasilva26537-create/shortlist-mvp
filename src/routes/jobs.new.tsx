import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { listClients } from "@/lib/db/clients.functions";
import { upsertJob } from "@/lib/db/jobs.functions";
import { structureJob, refineText } from "@/lib/ai/ai.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/jobs/new")({
  head: () => ({ meta: [{ title: "Nova vaga · Moove Select" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ client: s.client as string | undefined }),
  component: NewJob,
});

function NewJob() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/jobs/new" }) as { client?: string };
  const qc = useQueryClient();
  const clientsFn = useServerFn(listClients);
  const saveFn = useServerFn(upsertJob);
  const aiFn = useServerFn(structureJob);
  const refineFn = useServerFn(refineText);

  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => clientsFn() });

  const [f, setF] = useState<any>({
    client_id: search.client ?? "",
    title: "", area: "", seniority: "", location: "",
    work_model: "Híbrido", contract_type: "CLT",
    salary_min: "", salary_max: "",
    manager_name: "", description: "", briefing_url: "",
    recruiter_notes: "", meeting_transcript: "",
    ai_structure: null, must_have: [], nice_to_have: [], hard_skills: [], soft_skills: [], radar_competencies: null,
  });
  const [jobId, setJobId] = useState<string | undefined>();
  const [aiBusy, setAiBusy] = useState(false);
  const [refineText1, setRefineText1] = useState("");

  const set = (k: string) => (e: any) => setF((prev: any) => ({ ...prev, [k]: e?.target?.value ?? e }));

  const saveJob = async (next?: "shortlist" | "draft") => {
    if (!f.client_id) { toast.error("Selecione um cliente"); return; }
    if (!f.title.trim()) { toast.error("Título é obrigatório"); return; }
    const payload = {
      id: jobId, client_id: f.client_id, title: f.title, area: f.area, seniority: f.seniority,
      location: f.location, work_model: f.work_model, contract_type: f.contract_type,
      salary_min: f.salary_min ? Number(f.salary_min) : null,
      salary_max: f.salary_max ? Number(f.salary_max) : null,
      manager_name: f.manager_name, description: f.description, briefing_url: f.briefing_url,
      recruiter_notes: f.recruiter_notes, meeting_transcript: f.meeting_transcript,
      ai_structure: f.ai_structure, must_have: f.must_have, nice_to_have: f.nice_to_have,
      hard_skills: f.hard_skills, soft_skills: f.soft_skills, radar_competencies: f.radar_competencies,
      status: next === "draft" ? "draft" : "open",
    };
    const row: any = await saveFn({ data: payload });
    setJobId(row.id);
    qc.invalidateQueries({ queryKey: ["jobs"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Vaga salva");
    if (next === "shortlist") navigate({ to: "/shortlists/new", search: { job: row.id } });
    else if (!next) navigate({ to: "/jobs" });
  };

  const runAi = async () => {
    setAiBusy(true);
    try {
      // ensure job is saved first
      let id = jobId;
      if (!id) {
        if (!f.client_id || !f.title.trim()) { toast.error("Preencha cliente e título antes"); setAiBusy(false); return; }
        const row: any = await saveFn({ data: { client_id: f.client_id, title: f.title, area: f.area, description: f.description, recruiter_notes: f.recruiter_notes, meeting_transcript: f.meeting_transcript, status: "draft" } });
        id = row.id; setJobId(id);
      }
      const out: any = await aiFn({ data: { job_id: id!, instruction: refineText1 || undefined } });
      setF((p: any) => ({ ...p, ai_structure: out, must_have: out.must_have, nice_to_have: out.nice_to_have, hard_skills: out.hard_skills, soft_skills: out.soft_skills, radar_competencies: out.evaluation_competencies }));
      toast.success("Estrutura gerada pela IA");
    } catch (e: any) { toast.error(e.message); }
    finally { setAiBusy(false); }
  };

  const uploadBriefing = async (file: File) => {
    const path = `briefings/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("job-briefings").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("job-briefings").getPublicUrl(path);
    setF((p: any) => ({ ...p, briefing_url: data.publicUrl }));
    toast.success("Briefing enviado");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Cadastro</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Nova vaga</h1>
        </div>

        <div className="card-elevated p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Cliente *</Label>
              <Select value={f.client_id} onValueChange={(v) => set("client_id")(v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>{clients?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <div className="mt-1 text-xs">
                <a onClick={() => navigate({ to: "/clients/new" })} className="text-primary hover:underline cursor-pointer">+ Cadastrar novo cliente</a>
              </div>
            </div>
            <div className="sm:col-span-2"><Label>Título da vaga *</Label><Input value={f.title} onChange={set("title")} /></div>
            <div><Label>Área</Label><Input value={f.area} onChange={set("area")} /></div>
            <div><Label>Senioridade</Label><Input value={f.seniority} onChange={set("seniority")} placeholder="Gerente, Diretor…" /></div>
            <div><Label>Localização</Label><Input value={f.location} onChange={set("location")} /></div>
            <div><Label>Modelo</Label>
              <Select value={f.work_model} onValueChange={(v) => set("work_model")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Presencial">Presencial</SelectItem><SelectItem value="Híbrido">Híbrido</SelectItem><SelectItem value="Remoto">Remoto</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Contratação</Label>
              <Select value={f.contract_type} onValueChange={(v) => set("contract_type")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CLT">CLT</SelectItem><SelectItem value="PJ">PJ</SelectItem><SelectItem value="Estatutário">Estatutário</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Gestor</Label><Input value={f.manager_name} onChange={set("manager_name")} /></div>
            <div><Label>Salário min</Label><Input type="number" value={f.salary_min} onChange={set("salary_min")} /></div>
            <div><Label>Salário máx</Label><Input type="number" value={f.salary_max} onChange={set("salary_max")} /></div>
          </div>

          <div>
            <Label>Descrição da vaga</Label>
            <Textarea rows={5} value={f.description} onChange={set("description")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Briefing (PDF, DOCX)</Label>
              <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => e.target.files?.[0] && uploadBriefing(e.target.files[0])} />
              {f.briefing_url && <div className="mt-1 text-xs"><a href={f.briefing_url} target="_blank" className="text-primary underline">Ver briefing</a></div>}
            </div>
            <div>
              <Label>Observações do recrutador</Label>
              <Textarea rows={3} value={f.recruiter_notes} onChange={set("recruiter_notes")} />
            </div>
          </div>

          <div>
            <Label>Transcrição / resumo da reunião de alinhamento</Label>
            <Textarea rows={4} value={f.meeting_transcript} onChange={set("meeting_transcript")} />
          </div>

          {/* AI section */}
          <div className="rounded-xl border border-primary/30 bg-primary-soft/60 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="font-semibold">Estrutura da vaga com IA</div>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Pedir ajuste à IA (opcional). Ex: dê mais peso à liderança…" value={refineText1} onChange={(e) => setRefineText1(e.target.value)} />
              <Button onClick={runAi} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1.5" />}
                Gerar com IA
              </Button>
            </div>
            {f.ai_structure && (
              <div className="mt-5 space-y-4 text-sm">
                <AiSection title="Objetivo da contratação" text={f.ai_structure.objective} onChange={(v) => setF((p: any) => ({ ...p, ai_structure: { ...p.ai_structure, objective: v } }))} />
                <AiSection title="Missão do cargo" text={f.ai_structure.mission} onChange={(v) => setF((p: any) => ({ ...p, ai_structure: { ...p.ai_structure, mission: v } }))} />
                <AiList title="Principais desafios" items={f.ai_structure.challenges} onChange={(items) => setF((p: any) => ({ ...p, ai_structure: { ...p.ai_structure, challenges: items } }))} />
                <AiList title="Responsabilidades" items={f.ai_structure.responsibilities} onChange={(items) => setF((p: any) => ({ ...p, ai_structure: { ...p.ai_structure, responsibilities: items } }))} />
                <AiList title="Resultados esperados" items={f.ai_structure.expected_results} onChange={(items) => setF((p: any) => ({ ...p, ai_structure: { ...p.ai_structure, expected_results: items } }))} />
                <AiList title="Critérios eliminatórios (must-have)" items={f.must_have} onChange={(items) => setF((p: any) => ({ ...p, must_have: items }))} />
                <AiList title="Critérios desejáveis (nice-to-have)" items={f.nice_to_have} onChange={(items) => setF((p: any) => ({ ...p, nice_to_have: items }))} />
                <AiList title="Hard skills" items={f.hard_skills} onChange={(items) => setF((p: any) => ({ ...p, hard_skills: items }))} />
                <AiList title="Soft skills" items={f.soft_skills} onChange={(items) => setF((p: any) => ({ ...p, soft_skills: items }))} />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            <Button onClick={() => saveJob()}>Salvar vaga</Button>
            <Button variant="outline" onClick={() => saveJob("draft")}>Salvar como rascunho</Button>
            <Button variant="outline" onClick={() => saveJob("shortlist")}>Salvar e criar shortlist</Button>
            <Button variant="ghost" onClick={() => navigate({ to: "/jobs" })}>Cancelar</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function AiSection({ title, text, onChange }: { title: string; text: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">{title}</div>
      <Textarea rows={2} value={text ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function AiList({ title, items, onChange }: { title: string; items: string[]; onChange: (i: string[]) => void }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">{title}</div>
      <Textarea rows={Math.max(2, (items?.length ?? 0))} value={(items ?? []).join("\n")} onChange={(e) => onChange(e.target.value.split("\n").filter(Boolean))} />
    </div>
  );
}
