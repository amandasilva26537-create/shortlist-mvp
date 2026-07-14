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
import { Check, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { listClients } from "@/lib/db/clients.functions";
import { listJobs } from "@/lib/db/jobs.functions";
import { listCandidates } from "@/lib/db/candidates.functions";
import { upsertShortlist, setShortlistCandidates, nextShortlistNumber } from "@/lib/db/shortlists.functions";

export const Route = createFileRoute("/shortlists/new")({
  head: () => ({ meta: [{ title: "Nova shortlist · Moove List" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ client: s.client as string | undefined, job: s.job as string | undefined }),
  component: NewShortlist,
});

const steps = ["Cliente", "Vaga", "Detalhes", "Candidatos"] as const;

function NewShortlist() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/shortlists/new" }) as { client?: string; job?: string };
  const qc = useQueryClient();
  const clientsFn = useServerFn(listClients);
  const jobsFn = useServerFn(listJobs);
  const candsFn = useServerFn(listCandidates);
  const numFn = useServerFn(nextShortlistNumber);
  const saveFn = useServerFn(upsertShortlist);
  const setCandsFn = useServerFn(setShortlistCandidates);

  const [step, setStep] = useState(search.job ? 2 : search.client ? 1 : 0);
  const [clientId, setClientId] = useState<string | undefined>(search.client);
  const [jobId, setJobId] = useState<string | undefined>(search.job);
  const [meta, setMeta] = useState({ number: 1, title: "", message: "", send_date: "", responsible: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [shortlistId, setShortlistId] = useState<string | undefined>();

  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => clientsFn() });
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: () => jobsFn() });
  const { data: candidates } = useQuery({ queryKey: ["candidates"], queryFn: () => candsFn() });

  useEffect(() => {
    if (clientId) numFn({ data: { client_id: clientId } }).then((r: any) => setMeta((m) => ({ ...m, number: r.number, title: m.title || `Shortlist ${String(r.number).padStart(2, "0")}` })));
  }, [clientId]);

  useEffect(() => {
    if (jobId && jobs) {
      const j = jobs.find((x: any) => x.id === jobId);
      if (j && !clientId) setClientId(j.client_id);
    }
  }, [jobId, jobs]);

  const filteredJobs = clientId ? (jobs ?? []).filter((j: any) => j.client_id === clientId) : (jobs ?? []);

  const persistDraft = async () => {
    if (!clientId || !jobId) { toast.error("Cliente e vaga são obrigatórios"); return null; }
    const row: any = await saveFn({ data: {
      id: shortlistId, client_id: clientId, job_id: jobId,
      number: meta.number, title: meta.title, message: meta.message,
      send_date: meta.send_date || null, responsible: meta.responsible,
      status: "draft",
    } });
    setShortlistId(row.id);
    if (selected.length > 0) await setCandsFn({ data: { shortlist_id: row.id, candidate_ids: selected } });
    qc.invalidateQueries({ queryKey: ["shortlists"] });
    return row.id as string;
  };

  const goPublish = async () => {
    const id = await persistDraft();
    if (id) navigate({ to: "/shortlists/$shortlistId", params: { shortlistId: id } });
  };

  const saveDraftAndBack = async () => {
    const id = await persistDraft();
    if (id) { toast.success("Rascunho salvo"); navigate({ to: "/shortlists" }); }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Nova shortlist</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Monte a apresentação</h1>
        </div>

        <ol className="mb-8 flex items-center gap-2">
          {steps.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary-soft text-primary ring-2 ring-primary" : "bg-secondary text-muted-foreground")}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className={cn("text-xs font-medium", i <= step ? "text-foreground" : "text-muted-foreground")}>{label}</div>
              {i < steps.length - 1 && <div className="ml-auto h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="card-elevated p-6 min-h-[380px]">
          {step === 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Selecione o cliente</div>
                <a onClick={() => navigate({ to: "/clients/new" })} className="text-xs text-primary hover:underline cursor-pointer">+ Novo cliente</a>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {clients?.map((c: any) => (
                  <button key={c.id} onClick={() => setClientId(c.id)}
                    className={cn("flex flex-col items-start rounded-xl border p-5 text-left transition",
                      clientId === c.id ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40")}>
                    <div className="font-semibold">{c.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{c.contact_name || c.segment || "—"}</div>
                  </button>
                ))}
                {clients?.length === 0 && <div className="text-sm text-muted-foreground">Nenhum cliente. Cadastre um primeiro.</div>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Selecione a vaga</div>
                <a onClick={() => navigate({ to: "/jobs/new", search: { client: clientId } })} className="text-xs text-primary hover:underline cursor-pointer">+ Nova vaga</a>
              </div>
              <div className="grid gap-3">
                {filteredJobs.map((j: any) => (
                  <button key={j.id} onClick={() => setJobId(j.id)}
                    className={cn("flex items-center justify-between rounded-xl border p-4 text-left transition",
                      jobId === j.id ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40")}>
                    <div>
                      <div className="font-semibold">{j.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{j.area || "—"} · {j.work_model || "—"}</div>
                    </div>
                  </button>
                ))}
                {filteredJobs.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma vaga para este cliente.</div>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Título da shortlist</Label><Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></div>
                <div><Label>Número</Label><Input type="number" value={meta.number} onChange={(e) => setMeta({ ...meta, number: Number(e.target.value) })} /></div>
                <div><Label>Data de envio</Label><Input type="date" value={meta.send_date} onChange={(e) => setMeta({ ...meta, send_date: e.target.value })} /></div>
                <div><Label>Responsável interno</Label><Input value={meta.responsible} onChange={(e) => setMeta({ ...meta, responsible: e.target.value })} /></div>
              </div>
              <div><Label>Mensagem para o cliente</Label><Textarea rows={4} value={meta.message} onChange={(e) => setMeta({ ...meta, message: e.target.value })} /></div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-4 flex items-center justify-between rounded-lg border border-dashed border-border bg-secondary/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-card"><UserPlus className="h-4 w-4 text-primary" /></div>
                  <div>
                    <div className="text-sm font-medium">Adicionar novo candidato</div>
                    <div className="text-xs text-muted-foreground">Envie currículo, foto, DISC e parecer — a IA gera o perfil.</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={async () => { const id = await persistDraft(); if (id) navigate({ to: "/candidates/new", search: { job: jobId, shortlist: id } }); }}>
                  Novo candidato
                </Button>
              </div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Selecionar candidatos existentes</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {candidates?.map((c: any) => {
                  const isSel = selected.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => setSelected((s) => isSel ? s.filter((i) => i !== c.id) : [...s, c.id])}
                      className={cn("flex items-center gap-3 rounded-xl border p-3 text-left transition",
                        isSel ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40")}>
                      <div className={cn("grid h-5 w-5 place-items-center rounded-md border transition",
                        isSel ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                        {isSel && <Check className="h-3 w-3" />}
                      </div>
                      {c.photo_url ? <img src={c.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" /> :
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary text-xs font-semibold">{c.full_name.slice(0, 2).toUpperCase()}</div>}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{c.full_name}</div>
                        <div className="truncate text-xs text-muted-foreground">{c.current_position || "—"}</div>
                      </div>
                    </button>
                  );
                })}
                {candidates?.length === 0 && <div className="text-sm text-muted-foreground sm:col-span-2">Nenhum candidato cadastrado ainda.</div>}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Voltar</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveDraftAndBack}>Salvar rascunho</Button>
            {step < 3 ? (
              <Button disabled={(step === 0 && !clientId) || (step === 1 && !jobId)} onClick={() => setStep((s) => s + 1)}>Continuar</Button>
            ) : (
              <Button disabled={selected.length === 0} onClick={goPublish}>Revisar e publicar</Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
