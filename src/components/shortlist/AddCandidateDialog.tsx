import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listCandidates } from "@/lib/db/candidates.functions";
import { addCandidateToShortlist } from "@/lib/db/shortlists.functions";

interface Props {
  shortlistId: string;
  /** Ids já presentes na shortlist — bloqueados para não duplicar. */
  existingIds: string[];
  onAdded: () => void;
}

/** Seleciona um candidato já cadastrado e inclui na shortlist (sem duplicar). */
export function AddCandidateDialog({ shortlistId, existingIds, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const listFn = useServerFn(listCandidates);
  const addFn = useServerFn(addCandidateToShortlist);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => listFn(),
    enabled: open,
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (candidates as any[]).filter((c) => {
      if (!term) return true;
      return [c.full_name, c.current_position, c.current_company, c.area, c.city]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(term));
    });
  }, [candidates, q]);

  const add = async (candidateId: string) => {
    if (existingIds.includes(candidateId)) {
      toast.info("Este candidato já está nesta shortlist.");
      return;
    }
    setBusyId(candidateId);
    try {
      const res: any = await addFn({ data: { shortlist_id: shortlistId, candidate_id: candidateId } });
      if (res?.duplicate) toast.info("Este candidato já está nesta shortlist.");
      else toast.success("Candidato adicionado à shortlist");
      onAdded();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-1.5 h-4 w-4" /> Adicionar candidato
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar candidato</DialogTitle>
          <DialogDescription>Selecione um candidato já cadastrado no sistema.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, cargo, empresa…"
            className="pl-9"
          />
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {isLoading && (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando candidatos…
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">Nenhum candidato encontrado.</div>
          )}
          {filtered.map((c: any) => {
            const already = existingIds.includes(c.id);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[c.current_position, c.current_company, c.city].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={already ? "ghost" : "outline"}
                  disabled={already || busyId === c.id}
                  onClick={() => add(c.id)}
                >
                  {busyId === c.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : already ? (
                    "Já incluído"
                  ) : (
                    <>
                      <Plus className="mr-1 h-4 w-4" /> Adicionar
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
