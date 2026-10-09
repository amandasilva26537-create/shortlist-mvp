import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";
import { FeedbackItem } from "@/components/feedback/FeedbackItem";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAllClientFeedback } from "@/lib/db/shortlists.functions";
import {
  FEEDBACK_STATUS, feedbackStatus, feedbackDate, useFeedbackReads, type FeedbackRow,
} from "@/lib/feedback-center";

export const Route = createFileRoute("/feedbacks")({
  head: () => ({ meta: [{ title: "Feedbacks · Moove List" }] }),
  component: FeedbacksPage,
});

const ALL = "all";

function FeedbacksPage() {
  const fn = useServerFn(listAllClientFeedback);
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["feedbacks"], queryFn: () => fn() });
  const rows = (data ?? []) as unknown as FeedbackRow[];
  const reads = useFeedbackReads();
  const [client, setClient] = useState(ALL);
  const [job, setJob] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const clients = useMemo(() => uniq(rows.map((r) => r.shortlists?.clients).filter(Boolean) as any[]), [rows]);
  const jobs = useMemo(() => uniq(rows.map((r) => r.shortlists?.jobs).filter(Boolean) as any[]), [rows]);

  const filtered = rows
    .filter((r) => client === ALL || r.shortlists?.clients?.id === client)
    .filter((r) => job === ALL || r.shortlists?.jobs?.id === job)
    .filter((r) => status === ALL || feedbackStatus(r.decision) === status)
    .filter((r) => !onlyUnread || !reads.isRead(r))
    .sort((a, b) => +new Date(feedbackDate(b)) - +new Date(feedbackDate(a)));

  const unread = rows.filter((r) => !reads.isRead(r)).length;

  const open = (r: FeedbackRow) => {
    reads.markRead(r);
    navigate({
      to: "/shortlists/$shortlistId",
      params: { shortlistId: r.shortlist_id },
      search: { cursor: r.candidate_id } as any,
    });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Feedbacks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length} feedbacks · {unread} não lidos
            </p>
          </div>
          <Button variant="outline" size="sm" disabled={unread === 0} onClick={() => reads.markAllRead(rows)}>
            <CheckCheck className="mr-1.5 h-4 w-4" /> Marcar todos como lidos
          </Button>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FilterSelect value={client} onChange={setClient} placeholder="Cliente" all="Todos os clientes"
            options={clients.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={job} onChange={setJob} placeholder="Vaga" all="Todas as vagas"
            options={jobs.map((j) => ({ value: j.id, label: j.title }))} />
          <FilterSelect value={status} onChange={setStatus} placeholder="Status" all="Todos os status"
            options={Object.entries(FEEDBACK_STATUS).map(([value, v]) => ({ value, label: v.label }))} />
          <button
            type="button"
            onClick={() => setOnlyUnread((v) => !v)}
            className={"rounded-full border px-3 py-1.5 text-xs font-medium transition " + (onlyUnread ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:text-foreground")}
          >
            Somente não lidos
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="card-soft p-10 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? "Nenhum feedback recebido ainda." : "Nenhum feedback com estes filtros."}
          </div>
        ) : (
          <div className="card-soft divide-y divide-border">
            {filtered.map((r) => (
              <FeedbackItem key={r.id} r={r} unread={!reads.isRead(r)} onOpen={() => open(r)}
                onToggle={() => (reads.isRead(r) ? reads.markUnread(r) : reads.markRead(r))} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FilterSelect({ value, onChange, placeholder, all, options }: {
  value: string; onChange: (v: string) => void; placeholder: string; all: string; options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-40 max-w-64 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{all}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function uniq<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((i) => [i.id, i])).values()];
}

