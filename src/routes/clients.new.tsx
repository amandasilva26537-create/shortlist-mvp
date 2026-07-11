import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertClient } from "@/lib/db/clients.functions";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/clients/new")({
  head: () => ({ meta: [{ title: "Novo cliente · Moove Select" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ next: (s.next as string | undefined) }),
  component: NewClient,
});

function NewClient() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/clients/new" }) as { next?: string };
  const qc = useQueryClient();
  const upsert = useServerFn(upsertClient);
  const [form, setForm] = useState({
    name: "", logo_url: "", segment: "", website: "",
    city: "", state: "", country: "Brasil",
    contact_name: "", contact_role: "", internal_notes: "",
  });

  const mut = useMutation({
    mutationFn: async (data: any) => upsert({ data }),
    onSuccess: (row: any, _v, ctx: any) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Cliente cadastrado");
      if (ctx?.next === "job") navigate({ to: "/jobs/new", search: { client: row.id } });
      else if (ctx?.next === "shortlist") navigate({ to: "/shortlists/new", search: { client: row.id } });
      else navigate({ to: "/clients" });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const submit = (next?: "job" | "shortlist") => (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    mut.mutate(form, { onSuccess: (r) => mut.options.onSuccess?.(r as any, form as any, { next } as any) } as any);
  };

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Cadastro</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Novo cliente</h1>
        </div>
        <form onSubmit={submit()} className="card-elevated p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Nome da empresa *</Label><Input value={form.name} onChange={set("name")} required /></div>
            <div><Label>Segmento</Label><Input value={form.segment} onChange={set("segment")} /></div>
            <div><Label>Site</Label><Input value={form.website} onChange={set("website")} placeholder="https://" /></div>
            <div><Label>Cidade</Label><Input value={form.city} onChange={set("city")} /></div>
            <div><Label>Estado</Label><Input value={form.state} onChange={set("state")} /></div>
            <div><Label>País</Label><Input value={form.country} onChange={set("country")} /></div>
            <div><Label>Logo (URL)</Label><Input value={form.logo_url} onChange={set("logo_url")} /></div>
            <div><Label>Nome do responsável</Label><Input value={form.contact_name} onChange={set("contact_name")} /></div>
            <div><Label>Cargo do responsável</Label><Input value={form.contact_role} onChange={set("contact_role")} /></div>
          </div>
          <div>
            <Label>Observações internas</Label>
            <Textarea rows={4} value={form.internal_notes} onChange={set("internal_notes")} />
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
