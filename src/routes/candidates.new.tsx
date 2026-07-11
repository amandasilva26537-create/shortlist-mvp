import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2, Upload } from "lucide-react";
import { listJobs } from "@/lib/db/jobs.functions";
import { upsertCandidate, addCandidateDocument } from "@/lib/db/candidates.functions";
import { generateCandidateProfile } from "@/lib/ai/ai.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/candidates/new")({
  head: () => ({ meta: [{ title: "Novo candidato · Moove Select" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ job: s.job as string | undefined, shortlist: s.shortlist as string | undefined }),
  component: NewCandidate,
});

function NewCandidate() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/candidates/new" }) as { job?: string; shortlist?: string };
  const qc = useQueryClient();
  const jobsFn = useServerFn(listJobs);
  const saveFn = useServerFn(upsertCandidate);
  const docFn = useServerFn(addCandidateDocument);
  const aiFn = useServerFn(generateCandidateProfile);

  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: () => jobsFn() });

  const [f, setF] = useState<any>({
    full_name: "", photo_url: "", current_position: "", city: "",
    work_model: "Híbrido", salary_expectation: "", linkedin_url: "",
    resume_url: "", transcript: "", recruiter_note: "",
    disc_raw: "", disc_profile: "", disc_scores: null,
  });
  const [jobId, setJobId] = useState<string | undefined>(search.job);
  const [candId, setCandId] = useState<string | undefined>();
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [refineInstr, setRefineInstr] = useState("");

  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e?.target?.value ?? e }));

  const uploadTo = async (bucket: string, file: File, kind: string, visible: boolean) => {
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) { toast.error(error.message); return null; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (candId) await docFn({ data: { candidate_id: candId, kind, label: file.name, url: data.publicUrl, visible_to_client: visible } });
    return data.publicUrl;
  };

  const saveBase = async () => {
    if (!f.full_name.trim()) { toast.error("Nome é obrigatório"); return null; }
    const row: any = await saveFn({ data: {
      id: candId,
      full_name: f.full_name, photo_url: f.photo_url || null, current_position: f.current_position,
      city: f.city, work_model: f.work_model,
      salary_expectation: f.salary_expectation ? Number(f.salary_expectation) : null,
      linkedin_url: f.linkedin_url, resume_url: f.resume_url,
      transcript: f.transcript, recruiter_note: f.recruiter_note,
      disc_raw: f.disc_raw, disc_profile: f.disc_profile, disc_scores: f.disc_scores,
    } });
    setCandId(row.id);
    qc.invalidateQueries({ queryKey: ["candidates"] });
    return row.id as string;
  };

  const runAi = async () => {
    setAiBusy(true);
    try {
      const id = candId ?? await saveBase();
      if (!id) return;
      const out: any = await aiFn({ data: { candidate_id: id, job_id: jobId, instruction: refineInstr || undefined } });
      setAiResult(out);
      toast.success("Perfil gerado pela IA");
    } catch (e: any) { toast.error(e.message); }
    finally { setAiBusy(false); }
  };

  const saveAndFinish = async () => {
    const id = await saveBase();
    if (!id) return;
    toast.success("Candidato salvo");
    if (search.shortlist) navigate({ to: "/shortlists/$shortlistId", params: { shortlistId: search.shortlist } });
    else navigate({ to: "/" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Cadastro</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Novo candidato</h1>
        </div>

        <div className="card-elevated p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Nome completo *</Label><Input value={f.full_name} onChange={set("full_name")} /></div>
            <div><Label>Cargo atual</Label><Input value={f.current_position} onChange={set("current_position")} /></div>
            <div><Label>Cidade</Label><Input value={f.city} onChange={set("city")} /></div>
            <div><Label>Modelo</Label>
              <Select value={f.work_model} onValueChange={(v) => set("work_model")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Presencial">Presencial</SelectItem><SelectItem value="Híbrido">Híbrido</SelectItem><SelectItem value="Remoto">Remoto</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Pretensão salarial</Label><Input type="number" value={f.salary_expectation} onChange={set("salary_expectation")} /></div>
            <div className="sm:col-span-2"><Label>LinkedIn</Label><Input value={f.linkedin_url} onChange={set("linkedin_url")} placeholder="https://linkedin.com/in/…" /></div>
          </div>

          <div>
            <Label>Vaga-alvo (para gerar aderência)</Label>
            <Select value={jobId ?? ""} onValueChange={(v) => setJobId(v)}>
              <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
              <SelectContent>{jobs?.map((j: any) => <SelectItem key={j.id} value={j.id}>{j.clients?.name} — {j.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <UploadCard label="Foto" accept="image/*" onUpload={async (file) => { const url = await uploadTo("candidate-files", file, "photo", true); if (url) setF((p: any) => ({ ...p, photo_url: url })); }} />
            <UploadCard label="Currículo (PDF/DOCX)" accept=".pdf,.doc,.docx" onUpload={async (file) => { const url = await uploadTo("candidate-files", file, "resume", false); if (url) setF((p: any) => ({ ...p, resume_url: url })); }} />
            <UploadCard label="Portfólio" onUpload={(f) => uploadTo("candidate-files", f, "portfolio", true)} />
            <UploadCard label="Certificados" onUpload={(f) => uploadTo("candidate-files", f, "certificate", true)} />
            <UploadCard label="DISC (arquivo)" onUpload={(f) => uploadTo("candidate-files", f, "disc", false)} />
            <UploadCard label="Outros documentos" onUpload={(f) => uploadTo("candidate-files", f, "other", false)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Parecer do recrutador (interno)</Label><Textarea rows={5} value={f.recruiter_note} onChange={set("recruiter_note")} /></div>
            <div><Label>Resumo/transcrição da entrevista</Label><Textarea rows={5} value={f.transcript} onChange={set("transcript")} /></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Perfil DISC (ex: DI)</Label><Input value={f.disc_profile} onChange={set("disc_profile")} /></div>
            <div><Label>Resultado DISC completo</Label><Textarea rows={3} value={f.disc_raw} onChange={set("disc_raw")} /></div>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary-soft/60 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="font-semibold">Perfil executivo com IA</div>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Pedir ajuste à IA (opcional)…" value={refineInstr} onChange={(e) => setRefineInstr(e.target.value)} />
              <Button onClick={runAi} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1.5" />}
                Gerar perfil
              </Button>
            </div>
            {aiResult && (
              <div className="mt-4 space-y-3 text-sm">
                <div><div className="text-xs font-medium uppercase text-muted-foreground">Headline</div><div className="font-semibold">{aiResult.headline}</div></div>
                <div><div className="text-xs font-medium uppercase text-muted-foreground">Mini bio</div><div>{aiResult.mini_bio}</div></div>
                <div><div className="text-xs font-medium uppercase text-muted-foreground">Bio</div><div>{aiResult.full_bio}</div></div>
                {jobId && <div className="text-primary font-semibold">Aderência: {aiResult.overall_match}%</div>}
                <div className="text-xs text-muted-foreground">O perfil completo pode ser editado a partir do detalhe do candidato após salvar.</div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            <Button onClick={saveAndFinish}>Salvar candidato</Button>
            <Button variant="ghost" onClick={() => navigate({ to: "/" })}>Cancelar</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function UploadCard({ label, accept, onUpload }: { label: string; accept?: string; onUpload: (f: File) => Promise<any> }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <label className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-secondary/40 p-3 cursor-pointer">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-card text-primary"><Upload className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{busy ? "Enviando…" : done ? "Enviado" : "Clique para enviar"}</div>
      </div>
      <input type="file" className="hidden" accept={accept} onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        setBusy(true); await onUpload(f); setBusy(false); setDone(true);
      }} />
    </label>
  );
}
