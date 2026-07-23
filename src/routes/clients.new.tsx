import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertClient, getClient } from "@/lib/db/clients.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/clients/new")({
  head: () => ({ meta: [{ title: "Novo cliente · Moove List" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: s.next as string | undefined,
    edit: s.edit as string | undefined,
  }),
  component: NewClient,
});

function NewClient() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/clients/new" }) as { next?: string; edit?: string };
  const qc = useQueryClient();
  const upsert = useServerFn(upsertClient);
  const getFn = useServerFn(getClient);
  const editId = search?.edit;
  const isEdit = !!editId;

  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    segment: "",
    contact_role: "",
    contact: "",
    website: "",
    instagram: "",
  });

  const [next, setNext] = useState<"" | "job" | "shortlist">(
    (search?.next as "job" | "shortlist" | undefined) ?? "",
  );

  const { data: existing } = useQuery({
    queryKey: ["client", editId],
    queryFn: () => getFn({ data: { id: editId! } }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name ?? "",
        contact_name: existing.contact_name ?? "",
        segment: existing.segment ?? "",
        contact_role: existing.contact_role ?? "",
        contact: existing.contact ?? "",
        website: existing.website ?? "",
        instagram: existing.instagram ?? "",
      });
    }
  }, [existing]);

  const mut = useMutation({
    mutationFn: async (data: any) => upsert({ data: isEdit ? { ...data, id: editId } : data }),
    onSuccess: (row: any) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (isEdit) qc.invalidateQueries({ queryKey: ["client", editId] });
      toast.success(isEdit ? "Cliente atualizado" : "Cliente cadastrado");
      if (next === "job") navigate({ to: "/jobs/new", search: { client: row.id } });
      else if (next === "shortlist") navigate({ to: "/shortlists/new", search: { client: row.id } });
      else navigate({ to: "/clients" });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const submit = (target?: "job" | "shortlist") => (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nome da empresa é obrigatório"); return; }
    if (!form.contact_name.trim()) { toast.error("Nome do responsável é obrigatório"); return; }
    if (!form.segment.trim()) { toast.error("Setor é obrigatório"); return; }
    setNext(target ?? "");
    mut.mutate(form);
  };

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Cadastro</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Novo cliente</h1>
          <p className="mt-2 text-sm text-muted-foreground">Preencha as informações essenciais do cliente.</p>
        </div>
        <form onSubmit={submit()} className="card-elevated p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome da empresa *</Label>
              <Input value={form.name} onChange={set("name")} required />
            </div>
            <div>
              <Label>Nome do responsável *</Label>
              <Input value={form.contact_name} onChange={set("contact_name")} required />
            </div>
            <div>
              <Label>Setor *</Label>
              <Input value={form.segment} onChange={set("segment")} required />
            </div>
            <div>
              <Label>Cargo do responsável</Label>
              <Input value={form.contact_role} onChange={set("contact_role")} />
            </div>
            <div>
              <Label>Contato</Label>
              <Input value={form.contact} onChange={set("contact")} placeholder="E-mail ou telefone" />
            </div>
            <div>
              <Label>Site da empresa</Label>
              <Input value={form.website} onChange={set("website")} placeholder="https://" />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input value={form.instagram} onChange={set("instagram")} placeholder="@empresa" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button type="submit" disabled={mut.isPending}>Salvar cliente</Button>
            <Button type="button" variant="outline" disabled={mut.isPending} onClick={submit("job") as any}>Salvar e criar vaga</Button>
            <Button type="button" variant="outline" disabled={mut.isPending} onClick={submit("shortlist") as any}>Salvar e criar shortlist</Button>
            <Button type="button" variant="ghost" onClick={() => navigate({ to: "/clients" })}>Cancelar</Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
