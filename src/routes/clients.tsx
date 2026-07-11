import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { clients } from "@/lib/mock-data";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [{ title: "Clientes · Moove Select" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {clients.length} clientes ativos
            </p>
          </div>
          <Button className="h-10">
            <Plus className="mr-1.5 h-4 w-4" /> Novo cliente
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients.map((c) => (
            <Link
              key={c.id}
              to="/clients/$clientId"
              params={{ clientId: c.id }}
              className="card-soft flex flex-col p-5 transition hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 rounded-xl">
                  <AvatarFallback className="rounded-xl bg-primary-soft text-primary font-semibold">
                    {initials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.contactName}</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary/60 p-3">
                  <div className="text-2xl font-semibold">{c.activeJobs}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Vagas</div>
                </div>
                <div className="rounded-lg bg-secondary/60 p-3">
                  <div className="text-2xl font-semibold">{c.shortlists}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Shortlists</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
