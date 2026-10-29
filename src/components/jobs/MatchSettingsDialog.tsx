import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveMatchSettings } from "@/lib/db/matches.functions";
import { CATEGORY_LABEL, DEFAULT_WEIGHTS, normalizeWeights, type Category, type Criterion, type Weights } from "@/lib/application-match";

export function MatchSettingsDialog({ jobId, weights, prescreenMin, criteria }: { jobId: string; weights: Weights; prescreenMin: number; criteria: Criterion[] }) {
  const qc = useQueryClient();
  const fn = useServerFn(saveMatchSettings);
  const [open, setOpen] = useState(false);
  const [w, setW] = useState<Weights>(weights);
  const [min, setMin] = useState(prescreenMin);
  useEffect(() => { if (open) { setW(weights); setMin(prescreenMin); } }, [open, weights, prescreenMin]);
  const save = useMutation({
    mutationFn: () => fn({ data: { job_id: jobId, weights: normalizeWeights(w), prescreen_min: min } }),
    onSuccess: () => { toast.success("Pesos salvos. Notas recalculadas."); setOpen(false); qc.invalidateQueries({ queryKey: ["job-matches", jobId] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  const cats = Object.keys(DEFAULT_WEIGHTS) as Category[];
  const total = cats.reduce((s, c) => s + (Number(w[c]) || 0), 0) || 1;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Settings2 className="mr-1.5 h-4 w-4" />Critérios e pesos</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Critérios e pesos do Match</DialogTitle>
          <DialogDescription>O Match compara o currículo com os requisitos reais desta vaga. Ele apoia a triagem — não decide contratação nem reprovação.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {cats.map((c) => (
            <div key={c} className="grid grid-cols-[1fr_90px] items-center gap-3">
              <div>
                <Label className="text-sm">{CATEGORY_LABEL[c]}</Label>
                <div className="text-[11px] text-muted-foreground">{criteria.filter((x) => x.category === c).length} critério(s) · {Math.round(((Number(w[c]) || 0) / total) * 100)}% da nota{criteria.every((x) => x.category !== c) ? " (sem itens: peso redistribuído)" : ""}</div>
              </div>
              <Input type="number" min={0} max={100} value={w[c]} onChange={(e) => setW({ ...w, [c]: Number(e.target.value) })} />
            </div>
          ))}
          <div className="grid grid-cols-[1fr_90px] items-center gap-3 border-t border-border pt-3">
            <div><Label className="text-sm">Nota mínima para "Pré-triado"</Label><div className="text-[11px] text-muted-foreground">Nota mínima ≥ este valor e nenhum obrigatório com evidência contrária.</div></div>
            <Input type="number" min={0} max={100} value={min} onChange={(e) => setMin(Math.max(0, Math.min(100, Number(e.target.value))))} />
          </div>
          <p className="text-[11px] text-muted-foreground">Os pesos são proporcionais (não precisam somar 100). Competências comportamentais não entram na nota. Idade, gênero, raça, religião, deficiência e foto nunca são usados.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setW({ ...DEFAULT_WEIGHTS })}>Restaurar padrão</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
