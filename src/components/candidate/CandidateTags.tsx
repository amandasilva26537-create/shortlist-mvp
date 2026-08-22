import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, Tag as TagIcon } from "lucide-react";
import { listTags, setCandidateTag } from "@/lib/db/tags.functions";
import { toast } from "sonner";

export type TagRow = { id: string; name: string; color: string };

/** Paleta das etiquetas — usada na listagem, no perfil e no gerenciamento. */
export const TAG_COLORS: { value: string; label: string; cls: string; dot: string }[] = [
  { value: "red", label: "Vermelho", cls: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  { value: "graphite", label: "Grafite", cls: "bg-neutral-800 text-white border-neutral-800", dot: "bg-neutral-800" },
  { value: "gold", label: "Dourado", cls: "bg-amber-100 text-amber-800 border-amber-300", dot: "bg-amber-400" },
  { value: "green", label: "Verde", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  { value: "blue", label: "Azul", cls: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  { value: "purple", label: "Roxo", cls: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  { value: "slate", label: "Cinza", cls: "bg-secondary text-muted-foreground border-border", dot: "bg-slate-400" },
];

export function tagClasses(color?: string) {
  return (TAG_COLORS.find((c) => c.value === color) ?? TAG_COLORS[TAG_COLORS.length - 1]!).cls;
}

export function tagDotClasses(color?: string) {
  return (TAG_COLORS.find((c) => c.value === color) ?? TAG_COLORS[TAG_COLORS.length - 1]!).dot;
}

export function TagChip({ tag, className }: { tag: TagRow; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={`h-5 px-1.5 text-[10px] font-medium leading-none ${tagClasses(tag.color)} ${className ?? ""}`}
    >
      {tag.name}
    </Badge>
  );
}

export function TagChips({ tags, max }: { tags?: TagRow[] | null; max?: number }) {
  if (!tags?.length) return null;
  const shown = max ? tags.slice(0, max) : tags;
  const rest = max ? tags.length - shown.length : 0;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((t) => (
        <TagChip key={t.id} tag={t} />
      ))}
      {rest > 0 && <span className="text-[10px] text-muted-foreground">+{rest}</span>}
    </div>
  );
}

/** Aviso interno para candidatos marcados como Block List. */
export function BlockListWarning({ tags }: { tags?: TagRow[] | null }) {
  const blocked = tags?.some((t) => t.name.trim().toLowerCase() === "block list");
  if (!blocked) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border-l-4 border-neutral-800 bg-neutral-100 p-3 text-xs text-neutral-800">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Este candidato está na <b>Block List</b>. O cadastro continua disponível — este é apenas um aviso interno para
        a equipe.
      </span>
    </div>
  );
}

/** Seletor rápido de etiquetas, usado direto no perfil sem abrir a edição completa. */
export function TagPicker({
  candidateId,
  candidateTags,
  onChanged,
}: {
  candidateId: string;
  candidateTags?: TagRow[] | null;
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const listFn = useServerFn(listTags);
  const setFn = useServerFn(setCandidateTag);
  const { data: allTags = [] } = useQuery({ queryKey: ["tags"], queryFn: () => listFn(), enabled: open });
  const active = useMemo(() => new Set((candidateTags ?? []).map((t) => t.id)), [candidateTags]);

  const toggle = useMutation({
    mutationFn: (v: { tag_id: string; active: boolean }) =>
      setFn({ data: { candidate_id: candidateId, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
      onChanged?.();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao atualizar etiqueta"),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Gerenciar etiquetas do candidato">
          <TagIcon className="mr-1.5 h-3.5 w-3.5" /> Etiquetas
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Etiquetas internas
        </div>
        {allTags.length === 0 ? (
          <div className="px-1 py-2 text-xs text-muted-foreground">Nenhuma etiqueta cadastrada.</div>
        ) : (
          <div className="space-y-0.5">
            {allTags.map((t: any) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-secondary"
              >
                <Checkbox
                  checked={active.has(t.id)}
                  onCheckedChange={(v) => toggle.mutate({ tag_id: t.id, active: !!v })}
                />
                <span className={`h-2 w-2 shrink-0 rounded-full ${tagDotClasses(t.color)}`} />
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>
        )}
        <div className="mt-1 border-t border-border px-1 pt-1.5 text-[11px] text-muted-foreground">
          Visível apenas para a equipe interna.
        </div>
      </PopoverContent>
    </Popover>
  );
}
