import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Flag } from "lucide-react";
import { getPublicTracking } from "@/lib/db/tracking.functions";
import { PROCESS_STAGES, stageIndex } from "@/lib/process-stages";
import { jobStatusInfo } from "@/lib/job-status";
import { PortalWordmark } from "@/components/shortlist/PortusBrand";

export const Route = createFileRoute("/acompanhamento/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acompanhamento do processo seletivo" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TrackingPage,
});

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
// "yyyy-mm-dd" sem deslocar o fuso
const fmtDay = (d: string) => d.split("-").reverse().join("/");

function TrackingPage() {
  const { token } = Route.useParams();
  const fn = useServerFn(getPublicTracking);
  const { data, isLoading } = useQuery({ queryKey: ["tracking", token], queryFn: () => fn({ data: { token } }), refetchInterval: 60_000 });

  if (isLoading) return <div className="portus-theme grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando…</div>;
  if (!data)
    return (
      <div className="portus-theme grid min-h-screen place-items-center px-6 text-center text-sm text-muted-foreground">
        Link de acompanhamento não encontrado.
      </div>
    );

  const themeClass = data.brand === "moove" ? "moove-theme" : "portus-theme";
  const current = stageIndex(data.current_stage);
  const status = jobStatusInfo(data.job_status);
  const closed = current === PROCESS_STAGES.length - 1;

  return (
    <div className={`${themeClass} min-h-screen pb-12`}>
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <PortalWordmark brand={data.brand} />
          <div className="min-w-0 text-right">
            <div className="truncate text-xs font-medium text-muted-foreground">{data.company}</div>
            <div className="truncate text-sm font-semibold">{data.job_title}</div>
          </div>
        </div>
      </header>

      <div className="border-b border-border" style={{ background: "var(--portal-header-gradient)" }}>
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--portal-strong)" }}>
            Acompanhamento do processo seletivo
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{data.job_title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{data.company}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5 text-xs font-medium text-foreground ring-1 ring-border">
              <span className={"h-1.5 w-1.5 rounded-full " + status.dot} /> {status.label}
            </span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-6">
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4 text-base font-semibold">Acompanhamento do processo</div>
          <ol className="px-5 py-4">
            {PROCESS_STAGES.map((st, i) => {
              const done = current >= 0 && i < current || (closed && i === current);
              const isCurrent = i === current && !closed;
              const date = data.stage_dates[st.value];
              const last = i === PROCESS_STAGES.length - 1;
              return (
                <li key={st.value} className="relative flex items-center gap-3 py-2.5">
                  {!last && <span className="absolute left-[13px] top-[38px] h-[calc(100%-26px)] border-l border-dashed border-border" aria-hidden />}
                  <span
                    className={
                      "relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full " +
                      (done ? "bg-primary-soft text-primary" : isCurrent ? "bg-primary-soft" : "")
                    }
                  >
                    {done ? (
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    ) : isCurrent ? (
                      <span className="grid h-4 w-4 place-items-center rounded-full border-2 border-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /></span>
                    ) : (
                      <span className="h-3 w-3 rounded-full bg-muted-foreground/50" />
                    )}
                  </span>
                  <span className={"flex-1 text-[15px] " + (isCurrent ? "font-semibold" : done ? "" : "text-muted-foreground")}>{st.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {done || isCurrent ? (date ? fmtDate(date) : "") : "Aguardando"}
                  </span>
                </li>
              );
            })}
          </ol>

          {current < 0 && (
            <div className="border-t border-border px-5 py-3 text-sm text-muted-foreground">O acompanhamento deste processo ainda não foi iniciado.</div>
          )}

          {data.latest_note && (
            <div className="border-t border-border px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Observação da recrutadora</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{data.latest_note.text}</p>
              <div className="mt-1 text-xs text-muted-foreground">Atualizado em {fmtDate(data.latest_note.date)}</div>
            </div>
          )}

          {(data.shortlist_due_date || (closed && data.closed_at)) && (
            <div className="space-y-3 border-t border-border px-5 py-4">
              {data.shortlist_due_date && (
                <div className="flex items-start gap-3 rounded-xl bg-primary-soft/60 px-4 py-3">
                  <Flag className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="text-[15px] font-semibold">Meta: entrega da shortlist</div>
                    <div className="text-sm text-muted-foreground">Previsão: {fmtDay(data.shortlist_due_date)}</div>
                  </div>
                </div>
              )}
              {closed && data.closed_at && (
                <div className="text-sm text-muted-foreground">Vaga encerrada em <b className="text-foreground">{fmtDate(data.closed_at)}</b></div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
