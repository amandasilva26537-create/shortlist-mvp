import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { jobs, getClient } from "@/lib/mock-data";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/jobs")({
  head: () => ({ meta: [{ title: "Vagas · Moove Select" }] }),
  component: JobsPage,
});

function JobsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Vagas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {jobs.length} vagas abertas
            </p>
          </div>
          <Button className="h-10">
            <Plus className="mr-1.5 h-4 w-4" /> Nova vaga
          </Button>
        </header>

        <div className="card-soft divide-y divide-border">
          {jobs.map((j) => {
            const client = getClient(j.clientId);
            return (
              <Link
                key={j.id}
                to="/jobs/$jobId"
                params={{ jobId: j.id }}
                className="flex items-center gap-6 p-5 transition hover:bg-secondary/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-primary">{client?.name}</div>
                  <div className="mt-0.5 font-semibold">{j.title}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{j.area}</span>
                    <span>·</span>
                    <span>{j.workModel}</span>
                    <span>·</span>
                    <span>
                      {formatBRL(j.salaryMin)} – {formatBRL(j.salaryMax)}
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-[color:var(--success)]/10 px-2 py-0.5 text-[11px] font-medium text-[color:var(--success)]">
                  Aberta
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
