import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { listTags, upsertTag, deleteTag } from "@/lib/db/tags.functions";
import { TAG_COLORS, TagChip, tagDotClasses } from "@/components/candidate/CandidateTags";
import { toast } from "sonner";

export const Route = createFileRoute("/tags")({
  head: () => ({
    meta: [
      { title: "Etiquetas de candidatos · Moove List" },
      {
        name: "description",
        content:
          "Gerencie as etiquetas internas usadas para organizar o banco de candidatos: crie, renomeie, troque a cor e exclua etiquetas.",
      },
      { property: "og:title", content: "Etiquetas de candidatos · Moove List" },
      { property: "og:description", content: "Organização interna do banco de talentos por etiquetas coloridas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TagsPage,
});

function TagsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTags);
  const upsertFn = useServerFn(upsertTag);
  const delFn = useServerFn(deleteTag);
  const { data: tags = [], isLoading } = useQuery({ queryKey: ["tags"], queryFn: () => listFn() });

  const [name, setName] = useState("");
  const [color, setColor] = useState("slate");
  const [editing, setEditing] = useState<any>(null);
  const [toDelete, setToDelete] = useState<any>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tags"] });
    qc.invalidateQueries({ queryKey: ["candidates"] });
  };

  const save = useMutation({
    mutationFn: (v: { id?: string; name: string; color: string }) => upsertFn({ data: v }),
    onSuccess: () => {
      invalidate();
      setName("");
      setColor("slate");
      setEditing(null);
      toast.success("Etiqueta salva");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar etiqueta"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      toast.success("Etiqueta excluída. Os candidatos foram mantidos.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao excluir etiqueta"),
  });

  const submit = () => {
    const value = (editing ? editing.name : name).trim();
    if (!value) {
      toast.error("Informe o nome da etiqueta");
      return;
    }
    save.mutate(
      editing ? { id: editing.id, name: value, color: editing.color } : { name: value, color },
    );
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Organização interna</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Etiquetas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            As etiquetas organizam o banco de candidatos. Elas nunca aparecem no perfil compartilhado com o cliente e
            não influenciam a compatibilidade com as vagas.
          </p>
        </div>

        <div className="card-elevated mb-4 p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {editing ? "Editar etiqueta" : "Nova etiqueta"}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
            <div>
              <Label>Nome</Label>
              <Input
                value={editing ? editing.name : name}
                onChange={(e) =>
                  editing ? setEditing({ ...editing, name: e.target.value }) : setName(e.target.value)
                }
                placeholder="Ex.: Talento"
              />
            </div>
            <div>
              <Label>Cor</Label>
              <Select
                value={editing ? editing.color : color}
                onValueChange={(v) => (editing ? setEditing({ ...editing, color: v }) : setColor(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={save.isPending}>
                {editing ? <Pencil className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
                {editing ? "Salvar" : "Criar"}
              </Button>
              {editing && (
                <Button variant="ghost" onClick={() => setEditing(null)} aria-label="Cancelar edição">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : tags.length === 0 ? (
          <div className="card-elevated p-10 text-center text-sm text-muted-foreground">
            Nenhuma etiqueta cadastrada ainda.
          </div>
        ) : (
          <div className="card-elevated divide-y divide-border">
            {tags.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 p-4">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tagDotClasses(t.color)}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{t.name}</span>
                    <TagChip tag={t} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.candidate_count} candidato(s) com esta etiqueta
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing({ id: t.id, name: t.name, color: t.color })}
                  aria-label={`Editar etiqueta ${t.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setToDelete(t)}
                  aria-label={`Excluir etiqueta ${t.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etiqueta?</AlertDialogTitle>
            <AlertDialogDescription>
              A etiqueta <b>{toDelete?.name}</b> será removida de {toDelete?.candidate_count ?? 0} candidato(s).
              Nenhum candidato será excluído — apenas a etiqueta deixa de aparecer nos perfis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() => toDelete && remove.mutate(toDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending ? "Excluindo…" : "Excluir etiqueta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
