import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { getCandidate } from "@/lib/mock-data";
import { initials, formatBRL } from "@/lib/format";
import { CompetencyRadar } from "@/components/candidate/CompetencyRadar";
import { MatchRing } from "@/components/candidate/MatchRing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Minus, X, Sparkles } from "lucide-react";
import type { ChecklistStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/pdf/$candidateId")({
  loader: ({ params }) => {
    const c = getCandidate(params.candidateId);
    if (!c) throw notFound();
    return c;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `Parecer Executivo — ${loaderData.fullName}` : "Parecer" }],
  }),
  notFoundComponent: () => <div className="p-8 text-sm">Candidato não encontrado.</div>,
  errorComponent: () => <div className="p-8 text-sm">Erro ao carregar candidato.</div>,
  component: PdfPage,
});

const statusIcon = { yes: Check, partial: Minus, no: X } as const;
const statusColor: Record<ChecklistStatus, string> = {
  yes: "text-[color:var(--success)]",
  partial: "text-[color:var(--warning)]",
  no: "text-destructive",
};

function PdfPage() {
  const c = Route.useLoaderData();

  useEffect(() => {
    const t = setTimeout(() => window.print?.(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="pdf-page">
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
        }
        .pdf-page {
          background: #fff;
          color: var(--foreground);
          padding: 24px;
          max-width: 820px;
          margin: 0 auto;
          font-size: 11px;
          line-height: 1.5;
        }
        .pdf-page h1 { font-size: 20px; }
        .pdf-page h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted-foreground); margin-bottom: 6px; font-weight: 600; }
        .pdf-block { border: 1px solid var(--border); border-radius: 12px; padding: 12px; }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between rounded-lg border border-border bg-primary-soft p-3 text-xs">
        <span>Preview do PDF Executivo — use Ctrl/Cmd + P para salvar como PDF.</span>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground"
        >
          Imprimir
        </button>
      </div>

      {/* Header */}
      <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-16 w-16">
            <AvatarImage src={c.photo} />
            <AvatarFallback>{initials(c.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              Parecer Executivo
            </div>
            <h1 className="font-semibold tracking-tight">{c.fullName}</h1>
            <div className="text-muted-foreground">
              {c.currentRole} · {c.currentCompany}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {c.city} · {c.workModel} · {formatBRL(c.salaryExpectation)} · DISC {c.disc}
            </div>
          </div>
        </div>
        <MatchRing value={c.overallMatch} size={72} strokeWidth={6} label="Match" />
      </header>

      {/* Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="pdf-block">
          <h2>Resumo Executivo</h2>
          <ul className="space-y-1">
            {c.summary.slice(0, 4).map((s: string, i: number) => (
              <li key={i} className="flex gap-1.5">
                <span className="font-semibold text-primary">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="pdf-block">
          <h2>Radar de Competências</h2>
          <div className="h-40">
            <CompetencyRadar
              height={160}
              series={[{ name: c.fullName, color: "var(--primary)", data: c.radar }]}
            />
          </div>
        </div>
        <div className="pdf-block">
          <h2>Checklist Eliminatório</h2>
          <ul className="space-y-1.5">
            {c.checklist.map((it: { requirement: string; status: ChecklistStatus }) => {
              const Icon = statusIcon[it.status];
              return (
                <li key={it.requirement} className="flex items-start gap-2">
                  <Icon className={`mt-0.5 h-3.5 w-3.5 ${statusColor[it.status]}`} strokeWidth={3} />
                  <span>{it.requirement}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="pdf-block">
          <h2>Conquistas</h2>
          <ul className="grid grid-cols-2 gap-2">
            {c.achievements.map((a: { label: string; value: string }) => (
              <li key={a.label}>
                <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {a.label}
                </div>
                <div className="font-medium">{a.value}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="pdf-block">
          <h2>Pontos Fortes</h2>
          <ul className="space-y-1">
            {c.strengths.slice(0, 4).map((s: string) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
        <div className="pdf-block">
          <h2>Pontos de Atenção</h2>
          <ul className="space-y-1">
            {c.attentionPoints.slice(0, 4).map((s: string) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-primary-soft p-3 text-[10px] text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        Parecer gerado por IA — Moove List · Confidencial.
      </div>
    </div>
  );
}
