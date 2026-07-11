import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { clients, jobs, candidates } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Upload, Loader2 } from "lucide-react";
import { CandidateCard } from "@/components/candidate/CandidateCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shortlists/new")({
  head: () => ({ meta: [{ title: "Nova shortlist · Moove Select" }] }),
  component: NewShortlist,
});

const steps = ["Cliente", "Vaga", "Candidatos", "Publicar"] as const;

function NewShortlist() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState<string>();
  const [jobId, setJobId] = useState<string>();
  const [selected, setSelected] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const filteredJobs = clientId ? jobs.filter((j) => j.clientId === clientId) : [];

  const canNext =
    (step === 0 && !!clientId) ||
    (step === 1 && !!jobId) ||
    (step === 2 && selected.length > 0) ||
    step === 3;

  const runAi = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1400));
    setProcessing(false);
    toast.success("IA gerou a apresentação executiva dos candidatos");
    setStep(3);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary">
            Nova shortlist
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Monte uma apresentação premium em poucos cliques
          </h1>
        </div>

        {/* Stepper */}
        <ol className="mb-8 flex items-center gap-2">
          {steps.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition",
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "bg-primary-soft text-primary ring-2 ring-primary"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className="min-w-0">
                <div className={cn("text-xs font-medium", i <= step ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </div>
              </div>
              {i < steps.length - 1 && <div className="ml-auto h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="card-elevated p-6 min-h-[380px]">
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setClientId(c.id)}
                  className={cn(
                    "flex flex-col items-start rounded-xl border p-5 text-left transition",
                    clientId === c.id
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <div className="font-semibold">{c.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{c.contactName}</div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-3">
              {filteredJobs.length === 0 && (
                <div className="text-sm text-muted-foreground">Nenhuma vaga aberta para este cliente.</div>
              )}
              {filteredJobs.map((j) => (
                <button
                  key={j.id}
                  onClick={() => setJobId(j.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-4 text-left transition",
                    jobId === j.id
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <div>
                    <div className="font-semibold">{j.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {j.area} · {j.workModel}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-4 flex items-center justify-between rounded-lg border border-dashed border-border bg-secondary/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-card">
                    <Upload className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Adicionar candidatos</div>
                    <div className="text-xs text-muted-foreground">
                      Envie currículos, fotos, transcrições e resultados DISC
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">Enviar arquivos</Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {candidates.map((c) => {
                  const isSel = selected.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() =>
                        setSelected((s) => (isSel ? s.filter((i) => i !== c.id) : [...s, c.id]))
                      }
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                        isSel ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <div
                        className={cn(
                          "grid h-5 w-5 place-items-center rounded-md border transition",
                          isSel ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                      >
                        {isSel && <Check className="h-3 w-3" />}
                      </div>
                      <img
                        src={c.photo}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{c.fullName}</div>
                        <div className="truncate text-xs text-muted-foreground">{c.currentRole}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-primary-soft p-4 text-primary">
                <Sparkles className="h-5 w-5" />
                <div className="text-sm">
                  A IA gerou headline, resumo executivo, radar de competências e checklist para cada candidato.
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {selected.map((id) => {
                  const c = candidates.find((cn2) => cn2.id === id)!;
                  return <CandidateCard key={id} candidate={c} />;
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Voltar
          </Button>
          {step < 2 && (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Continuar
            </Button>
          )}
          {step === 2 && (
            <Button disabled={!canNext || processing} onClick={runAi}>
              {processing ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Processando com IA
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" /> Gerar com IA
                </>
              )}
            </Button>
          )}
          {step === 3 && (
            <Button
              onClick={() => {
                toast.success("Shortlist publicada");
                navigate({ to: "/shortlists" });
              }}
            >
              Publicar shortlist
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
