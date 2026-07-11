import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { shortlists, getClient, getJob } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/shortlists")({
  head: () => ({ meta: [{ title: "Shortlists · Moove Select" }] }),
  component: ShortlistsPage,
});

function ShortlistsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Shortlists</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {shortlists.length} processos ativos
            </p>
          </div>
          <Link to="/shortlists/new">
            <Button className="h-10">
              <Sparkles className="mr-1.5 h-4 w-4" /> Nova shortlist
            </Button>
          </Link>
        </header>

        <div className="card-soft divide-y divide-border">
          {shortlists.map((s) => {
            const client = getClient(s.clientId);
            const job = getJob(s.jobId);
            return (
              <Link
                key={s.id}
                to="/shortlists/$shortlistId"
                params={{ shortlistId: s.id }}
                className="flex items-center gap-5 p-5 transition hover:bg-secondary/40"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary text-sm font-semibold">
                  v{s.version}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{job?.title}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {client?.name} · {s.candidateIds.length} candidatos · criada em {s.createdAt}
                  </div>
                </div>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                    (s.status === "published"
                      ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                      : "bg-secondary text-muted-foreground")
                  }
                >
                  {s.status === "published" ? "Publicada" : "Rascunho"}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
