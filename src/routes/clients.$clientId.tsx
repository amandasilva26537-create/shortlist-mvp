import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/layout/AppShell";
import { getClient } from "@/lib/db/clients.functions";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Globe, Instagram, Mail, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/clients/$clientId")({
  head: () => ({ meta: [{ title: "Cliente · Moove List" }] }),
  component: ClientDetail,
});

const brandLabel = (b?: string | null) => {
  if (b === "portus") return "Portus";
  if (b === "moove") return "Moove";
  return "Marca não definida";
};

function ClientDetail() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const fn = useServerFn(getClient);
  const { data: c, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => fn({ data: { id: clientId } }),
  });

  if (isLoading) return <AppShell><div className="text-sm text-muted-foreground">Carregando…</div></AppShell>;
  if (!c) return <AppShell><div className="text-sm text-muted-foreground">Cliente não encontrado.</div></AppShell>;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <Link to="/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Clientes
        </Link>
        <div className="card-elevated flex flex-wrap items-center gap-5 p-6">
          <Avatar className="h-16 w-16 rounded-2xl">
            {c.logo_url ? (
              <img src={c.logo_url} className="h-full w-full rounded-2xl object-cover" alt="" />
            ) : (
              <AvatarFallback className="rounded-2xl bg-primary-soft text-primary text-lg font-semibold">
                {initials(c.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
              <Badge variant={c.brand ? "secondary" : "outline"} className="text-xs">
                {brandLabel(c.brand)}
              </Badge>
            </div>
            {c.segment && <div className="mt-1 text-sm text-muted-foreground">{c.segment}</div>}
          </div>
          <Button variant="outline" onClick={() => navigate({ to: "/clients/new", search: { edit: c.id } as any })}>
            <Pencil className="mr-1.5 h-4 w-4" /> Editar
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="card-soft p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Marca responsável</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={c.brand ? "secondary" : "outline"} className="text-xs font-medium">
                  {brandLabel(c.brand)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="card-soft p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Responsável</div>
            <div className="space-y-2 text-sm">
              {c.contact_name && (
                <div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" /> {c.contact_name}{c.contact_role ? ` · ${c.contact_role}` : ""}</div>
              )}
              {c.contact && (
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {c.contact}</div>
              )}
              {!c.contact_name && !c.contact && <div className="text-muted-foreground">—</div>}
            </div>
          </div>
          <div className="card-soft p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Presença digital</div>
            <div className="space-y-2 text-sm">
              {c.website && (
                <a href={c.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <Globe className="h-4 w-4" /> {c.website}
                </a>
              )}
              {c.instagram && (
                <div className="flex items-center gap-2"><Instagram className="h-4 w-4 text-muted-foreground" /> {c.instagram}</div>
              )}
              {!c.website && !c.instagram && <div className="text-muted-foreground">—</div>}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
