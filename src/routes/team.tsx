import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Shield, ShieldOff, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import {
  listTeamMembers,
  inviteRecruiter,
  updateMember,
  setMemberAdmin,
  getMyAccess,
} from "@/lib/db/team.functions";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Equipe · Moove List" }] }),
  component: TeamPage,
});

function TeamPage() {
  const qc = useQueryClient();
  const accessFn = useServerFn(getMyAccess);
  const listFn = useServerFn(listTeamMembers);
  const inviteFn = useServerFn(inviteRecruiter);
  const updateFn = useServerFn(updateMember);
  const adminFn = useServerFn(setMemberAdmin);

  const access = useQuery({ queryKey: ["my-access"], queryFn: () => accessFn() });
  const { data: members, isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listFn(),
    enabled: !!access.data?.isAdmin,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", role_title: "", status: "active" as "active" | "inactive" });

  const invite = useMutation({
    mutationFn: (input: any) => inviteFn({ data: input }),
    onSuccess: () => {
      toast.success("Convite enviado. O recrutador receberá um e-mail para definir a senha.");
      setOpen(false);
      setForm({ full_name: "", email: "", role_title: "", status: "active" });
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao convidar"),
  });

  const update = useMutation({
    mutationFn: (input: any) => updateFn({ data: input }),
    onSuccess: () => {
      toast.success("Membro atualizado.");
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });

  const promote = useMutation({
    mutationFn: (input: any) => adminFn({ data: input }),
    onSuccess: () => {
      toast.success("Permissões atualizadas.");
      qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao alterar permissão"),
  });

  if (access.isLoading) {
    return (
      <AppShell>
        <div className="text-sm text-muted-foreground">Carregando…</div>
      </AppShell>
    );
  }

  if (!access.data?.isAdmin) {
    return (
      <AppShell>
        <div className="card-soft p-8 text-center">
          <h1 className="text-xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Apenas administradores podem gerenciar a equipe.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Equipe</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {members?.length ?? 0} membro(s) · todos compartilham o mesmo painel interno.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-10"><UserPlus className="mr-1.5 h-4 w-4" /> Adicionar recrutador</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar recrutador</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Cargo (opcional)</Label>
                  <Input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    invite.mutate({
                      full_name: form.full_name,
                      email: form.email,
                      role_title: form.role_title || null,
                      status: form.status,
                    })
                  }
                  disabled={invite.isPending || !form.full_name || !form.email}
                >
                  {invite.isPending ? "Enviando…" : "Enviar convite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="card-soft divide-y divide-border">
          {isLoading && <div className="p-5 text-sm text-muted-foreground">Carregando membros…</div>}
          {members?.map((m: any) => {
            const isMe = m.id === access.data?.profile?.id;
            const isAdminRole = m.roles?.includes("admin");
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-semibold">{m.full_name || m.email}</div>
                    {isAdminRole && (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">Admin</span>
                    )}
                    {m.status === "inactive" && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Inativo</span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {m.email}{m.role_title ? ` · ${m.role_title}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => update.mutate({ id: m.id, status: m.status === "active" ? "inactive" : "active" })}
                    disabled={update.isPending || isMe}
                    title={isMe ? "Você não pode desativar a si mesmo" : ""}
                  >
                    {m.status === "active" ? <><PowerOff className="mr-1.5 h-4 w-4" />Desativar</> : <><Power className="mr-1.5 h-4 w-4" />Ativar</>}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => promote.mutate({ id: m.id, makeAdmin: !isAdminRole })}
                    disabled={promote.isPending || (isAdminRole && isMe)}
                    title={isAdminRole && isMe ? "Você não pode remover seu próprio admin" : ""}
                  >
                    {isAdminRole ? <><ShieldOff className="mr-1.5 h-4 w-4" />Remover admin</> : <><Shield className="mr-1.5 h-4 w-4" />Tornar admin</>}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
