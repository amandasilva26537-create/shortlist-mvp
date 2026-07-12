import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { listShortlists } from "@/lib/db/shortlists.functions";

export const Route = createFileRoute("/shortlists")({
  head: () => ({ meta: [{ title: "Shortlists · Moove Select" }] }),
  component: ShortlistsPage,
});

function ShortlistsPage() {
  const fn = useServerFn(listShortlists);
  const { data } = useQuery({ queryKey: ["shortlists"], queryFn: () => fn() });

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Shortlists</h1>
            <p className="mt-1 text-sm text-muted-foreground">{data?.length ?? 0} processos</p>
          </div>
          <Link to="/shortlists/new"><Button className="h-10"><Sparkles className="mr-1.5 h-4 w-4" /> Nova shortlist</Button></Link>
        </header>

        {data && data.length === 0 && (
          <div className="card-soft p-10 text-center">
            <div className="text-lg font-semibold">Você ainda não possui uma shortlist.</div>
            <div className="mt-5"><Link to="/shortlists/new"><Button>Criar primeira shortlist</Button></Link></div>
          </div>
        )}

        <div className="card-soft divide-y divide-border">
          {data?.map((s: any) => (
            <Link key={s.id} to="/shortlists/$shortlistId" params={{ shortlistId: s.id }}
              className="flex items-center gap-5 p-5 transition hover:bg-secondary/40">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary text-sm font-semibold">#{s.number}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{s.title || s.jobs?.title}</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {s.clients?.name} · criada em {new Date(s.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + (s.status === "sent" ? "bg-[color:var(--success)]/10 text-[color:var(--success)]" : "bg-secondary text-muted-foreground")}>
                {s.status === "sent" ? "Enviada" : "Rascunho"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
