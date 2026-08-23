import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/layout/AppShell";
import { listClients, deleteClient } from "@/lib/db/clients.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { initials } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/clients/")({
  head: () => ({
    meta: [
      { title: "Clientes · Moove List" },
      { name: "description", content: "Base de clientes atendidos pela Moove List com contatos, processos ativos e histórico consultivo." },
      { property: "og:title", content: "Clientes · Moove List" },
      { property: "og:description", content: "Gestão de clientes e contas atendidas pela consultoria." },
      { property: "og:url", content: "https://intel-select-hub.lovable.app/clients" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://intel-select-hub.lovable.app/clients" }],
  }),
  component: ClientsPage,
});

const brandLabel = (b?: string | null) => {
  if (b === "portus") return "Portus";
  if (b === "moove") return "Moove";
  return "Marca não definida";
};

function ClientsPage() {
  const fn = useServerFn(listClients);
  const delFn = useServerFn(deleteClient);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => fn() });

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o cliente "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await delFn({ data: { id } });
      toast.success("Cliente excluído");
      qc.invalidateQueries({ queryKey: ["clients"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
            <p className="mt-1 text-sm text-muted-foreground">{clients?.length ?? 0} clientes cadastrados</p>
          </div>
          <Link to="/clients/new"><Button className="h-10"><Plus className="mr-1.5 h-4 w-4" /> Novo cliente</Button></Link>
        </header>

        {clients && clients.length === 0 && (
          <div className="card-soft p-10 text-center">
            <div className="text-lg font-semibold">Você ainda não possui clientes cadastrados.</div>
            <p className="mt-2 text-sm text-muted-foreground">Cadastre seu primeiro cliente para começar.</p>
            <div className="mt-5"><Link to="/clients/new"><Button>Cadastrar primeiro cliente</Button></Link></div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients?.map((c: any) => (
            <div key={c.id} className="card-soft p-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 rounded-xl">
                  {c.logo_url ? <img src={c.logo_url} className="h-full w-full object-cover rounded-xl" alt="" /> :
                    <AvatarFallback className="rounded-xl bg-primary-soft text-primary font-semibold">{initials(c.name)}</AvatarFallback>}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.contact_name || c.segment || "—"}</div>
                  <div className="mt-1">
                    <Badge variant={c.brand ? "secondary" : "outline"} className="text-[10px] py-0 px-1.5 font-normal">
                      {brandLabel(c.brand)}
                    </Badge>
                  </div>
                </div>
              </div>
              {(c.city || c.state) && <div className="mt-3 text-xs text-muted-foreground">{[c.city, c.state, c.country].filter(Boolean).join(", ")}</div>}

              <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => navigate({ to: "/clients/$clientId", params: { clientId: c.id } })}
                  aria-label={`Ver ${c.name}`}
                >
                  <Eye className="mr-1.5 h-4 w-4" /> Ver
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => navigate({ to: "/clients/new", search: { edit: c.id } as any })}
                  aria-label={`Editar ${c.name}`}
                >
                  <Pencil className="mr-1.5 h-4 w-4" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(c.id, c.name)}
                  aria-label={`Excluir ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-2 flex gap-2">
                <Link to="/jobs/new" search={{ client: c.id }} className="flex-1"><Button variant="outline" size="sm" className="w-full">Nova vaga</Button></Link>
                <Link to="/shortlists/new" search={{ client: c.id }} className="flex-1"><Button size="sm" className="w-full">Shortlist</Button></Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
