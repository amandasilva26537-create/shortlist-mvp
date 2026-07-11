import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Briefcase, Plus, CheckCircle2, ArrowLeft } from "lucide-react";
import { listJobs } from "@/lib/db/jobs.functions";
import {
  listShortlistsByJob,
  addCandidateToShortlist,
  upsertShortlist,
  nextShortlistNumber,
} from "@/lib/db/shortlists.functions";

type Step = "job" | "shortlist" | "create" | "confirm" | "done";

export function AddToShortlistDialog({
  candidateId,
  candidateName,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  candidateId: string;
  candidateName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (controlledOpen === undefined) setUncontrolled(v);
  };

  const [step, setStep] = useState<Step>("job");
  const [q, setQ] = useState("");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedShortlist, setSelectedShortlist] = useState<any>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newNumber, setNewNumber] = useState<number>(1);

  useEffect(() => {
    if (open) {
      setStep("job"); setQ(""); setSelectedJob(null); setSelectedShortlist(null);
      setNewTitle(""); setNewMessage("");
    }
  }, [open]);

  const qc = useQueryClient();
  const listJobsFn = useServerFn(listJobs);
  const listSlFn = useServerFn(listShortlistsByJob);
  const addFn = useServerFn(addCandidateToShortlist);
  const upsertSlFn = useServerFn(upsertShortlist);
  const nextNumFn = useServerFn(nextShortlistNumber);

  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => listJobsFn(), enabled: open });
  const { data: shortlists = [], refetch: refetchSl } = useQuery({
    queryKey: ["shortlists-by-job", selectedJob?.id],
    queryFn: () => (selectedJob ? listSlFn({ data: { job_id: selectedJob.id } }) : Promise.resolve([])),
    enabled: !!selectedJob,
  });

  const filteredJobs = useMemo(() => {
    const term = q.trim().toLowerCase();
    return jobs.filter((j: any) => {
      if (["arquivada", "encerrada", "closed", "archived"].includes(j.status)) return false;
      if (!term) return true;
      return [j.title, j.clients?.name, j.location].filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [jobs, q]);

  const openCreateShortlist = async () => {
    if (!selectedJob) return;
    try {
      const { number } = await nextNumFn({ data: { client_id: selectedJob.client_id } });
      setNewNumber(number);
      setNewTitle(`Shortlist ${String(number).padStart(2, "0")}`);
    } catch {
      setNewNumber(1);
      setNewTitle("Shortlist 01");
    }
    setStep("create");
  };

  const createSl = useMutation({
    mutationFn: async () => {
      const row = await upsertSlFn({
        data: {
          client_id: selectedJob.client_id,
          job_id: selectedJob.id,
          number: newNumber,
          title: newTitle,
          message: newMessage || null,
          status: "draft",
        },
      });
      return row;
    },
    onSuccess: (row: any) => {
      setSelectedShortlist({ ...row, candidate_count: 0 });
      toast.success("Shortlist criada");
      refetchSl();
      setStep("confirm");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao criar shortlist"),
  });

  const addLink = useMutation({
    mutationFn: () => addFn({ data: { shortlist_id: selectedShortlist.id, candidate_id: candidateId } }),
    onSuccess: (r: any) => {
      if (r.duplicate) {
        toast.info("Este candidato já faz parte desta shortlist.");
        setStep("shortlist");
        return;
      }
      toast.success("Candidato adicionado à shortlist com sucesso.");
      qc.invalidateQueries({ queryKey: ["candidate-shortlists", candidateId] });
      qc.invalidateQueries({ queryKey: ["shortlist", selectedShortlist.id] });
      qc.invalidateQueries({ queryKey: ["shortlists-by-job", selectedJob.id] });
      setStep("done");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao adicionar"),
  });

  const statusLabel: Record<string, string> = {
    draft: "Rascunho", sent: "Enviada", closed: "Encerrada",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar à shortlist</DialogTitle>
        </DialogHeader>

        {step === "job" && (
          <div className="space-y-3">
            <div>
              <Label>Selecione a vaga</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por vaga ou cliente…" className="pl-9" />
              </div>
            </div>
            <div className="max-h-80 overflow-auto rounded-lg border border-border">
              {filteredJobs.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma vaga ativa encontrada.</div>
              ) : filteredJobs.map((j: any) => (
                <button
                  key={j.id}
                  onClick={() => { setSelectedJob(j); setStep("shortlist"); }}
                  className="w-full text-left border-b border-border last:border-0 p-3 hover:bg-secondary/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{j.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[j.clients?.name, j.location, j.work_model].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <Badge variant="secondary">{j.status ?? "ativa"}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "shortlist" && selectedJob && (
          <div className="space-y-3">
            <button onClick={() => setStep("job")} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-3 w-3" />Trocar vaga
            </button>
            <div className="rounded-lg bg-secondary/40 p-3 text-sm">
              <Briefcase className="inline h-4 w-4 mr-1.5 text-primary" />
              <b>{selectedJob.title}</b> · {selectedJob.clients?.name}
            </div>
            <Label>Selecione a shortlist</Label>
            {shortlists.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <div className="text-sm text-muted-foreground mb-3">Essa vaga ainda não possui uma shortlist.</div>
                <Button onClick={openCreateShortlist}><Plus className="mr-1.5 h-4 w-4" />Criar shortlist para esta vaga</Button>
              </div>
            ) : (
              <>
                <div className="max-h-72 overflow-auto rounded-lg border border-border">
                  {shortlists.map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedShortlist(s); setStep("confirm"); }}
                      className="w-full text-left border-b border-border last:border-0 p-3 hover:bg-secondary/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.title || `Shortlist ${String(s.number).padStart(2, "0")}`}</div>
                          <div className="text-xs text-muted-foreground">
                            Nº {s.number} · {s.candidate_count} candidato(s) · criada em {new Date(s.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                        <Badge variant="secondary">{statusLabel[s.status] ?? s.status}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
                <Button variant="outline" onClick={openCreateShortlist}><Plus className="mr-1.5 h-4 w-4" />Nova shortlist para esta vaga</Button>
              </>
            )}
          </div>
        )}

        {step === "create" && selectedJob && (
          <div className="space-y-3">
            <button onClick={() => setStep("shortlist")} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-3 w-3" />Voltar
            </button>
            <div>
              <Label>Nome da shortlist</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div>
              <Label>Número</Label>
              <Input type="number" value={newNumber} onChange={(e) => setNewNumber(Number(e.target.value) || 1)} />
            </div>
            <div>
              <Label>Mensagem interna (opcional)</Label>
              <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} rows={3} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("shortlist")}>Cancelar</Button>
              <Button onClick={() => createSl.mutate()} disabled={createSl.isPending || !newTitle}>
                {createSl.isPending ? "Criando…" : "Criar shortlist"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "confirm" && selectedJob && selectedShortlist && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-4 space-y-1.5 text-sm">
              <div><span className="text-muted-foreground">Candidato: </span><b>{candidateName}</b></div>
              <div><span className="text-muted-foreground">Vaga: </span><b>{selectedJob.title}</b></div>
              <div><span className="text-muted-foreground">Cliente: </span><b>{selectedJob.clients?.name}</b></div>
              <div><span className="text-muted-foreground">Shortlist: </span><b>{selectedShortlist.title || `Shortlist ${String(selectedShortlist.number).padStart(2, "0")}`}</b></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("shortlist")}>Cancelar</Button>
              <Button onClick={() => addLink.mutate()} disabled={addLink.isPending}>
                {addLink.isPending ? "Adicionando…" : "Adicionar à shortlist"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && selectedShortlist && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <div className="text-lg font-medium">Candidato adicionado à shortlist com sucesso.</div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Continuar no candidato</Button>
              <Link to="/shortlists/$shortlistId" params={{ shortlistId: selectedShortlist.id }}>
                <Button onClick={() => setOpen(false)}>Ver shortlist</Button>
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
