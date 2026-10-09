import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROCESS_STAGES, stageLabel } from "@/lib/process-stages";
import { listJobStageHistory, setJobStage, saveJobShortlistDueDate } from "@/lib/db/tracking.functions";

/** Etapa do processo + observação + previsão da shortlist + link de acompanhamento (dentro do cadastro da vaga). */
export function ProcessTrackingEditor({ job }: { job: any }) {
  const qc = useQueryClient();
  const stageFn = useServerFn(setJobStage);
  const dueFn = useServerFn(saveJobShortlistDueDate);
  const historyFn = useServerFn(listJobStageHistory);
  const [stage, setStage] = useState<string>(job.process_stage ?? "");
  const [note, setNote] = useState("");
  const [due, setDue] = useState<string>(job.shortlist_due_date ?? "");
  const [busy, setBusy] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["job-stage-history", job.id],
    queryFn: () => historyFn({ data: { job_id: job.id } }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["job-stage-history", job.id] });
    qc.invalidateQueries({ queryKey: ["jobs"] });
    qc.invalidateQueries({ queryKey: ["job", job.id] });
  };

  const register = async () => {
    if (!stage) return toast.error("Escolha a etapa do processo");
    setBusy(true);
    try {
      await stageFn({ data: { job_id: job.id, stage: stage as any, note: note.trim() || null } });
      setNote("");
      refresh();
      toast.success("Etapa registrada");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao registrar a etapa");
    } finally {
      setBusy(false);
    }
  };

  const saveDue = async (value: string) => {
    setDue(value);
    try {
      await dueFn({ data: { job_id: job.id, due_date: value || null } });
      refresh();
      toast.success("Previsão da shortlist salva");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar a previsão");
    }
  };

  const link = job.tracking_token && typeof window !== "undefined" ? `${window.location.origin}/acompanhamento/${job.tracking_token}` : null;
  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link de acompanhamento copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <div className="rounded-xl border border-border p-5 space-y-4">
      <div className="text-sm font-semibold">Acompanhamento do processo</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Etapa do processo</Label>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger><SelectValue placeholder="Sem etapa definida" /></SelectTrigger>
            <SelectContent>
              {PROCESS_STAGES.map((s, i) => <SelectItem key={s.value} value={s.value}>{i + 1}. {s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Previsão de entrega da shortlist</Label>
          <Input type="date" value={due} onChange={(e) => saveDue(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Observação sobre o andamento (opcional, visível ao cliente)</Label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={register} disabled={busy || !stage}>Registrar etapa</Button>
        <Button type="button" size="sm" variant="outline" onClick={copy} disabled={!link}>
          <Copy className="mr-1.5 h-4 w-4" /> Copiar link de acompanhamento
        </Button>
        {!link && <span className="text-xs text-muted-foreground">Link indisponível até a ativação do recurso no banco.</span>}
      </div>
      {history.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Histórico</div>
          <ul className="space-y-1 text-xs">
            {(history as any[]).map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-2">
                <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                <span className="font-medium">{stageLabel(h.stage)}</span>
                {h.note && <span className="text-muted-foreground">— {h.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
