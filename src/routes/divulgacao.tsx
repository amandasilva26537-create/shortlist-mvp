import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Pencil } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { listJobs } from "@/lib/db/jobs.functions";
import { getPostingsOverview } from "@/lib/db/overview.functions";
import { jobStatusInfo } from "@/lib/job-status";

export const Route = createFileRoute("/divulgacao")({
  head: () => ({ meta: [{ title: "Divulgação de Vagas · Moove List" }] }),
  component: DivulgacaoPage,
});

function postingState(p?: { is_published: boolean; approved: boolean }) {
  if (!p) return { label: "Não iniciada", cls: "bg-secondary text-muted-foreground" };
  if (p.is_published) return { label: "Publicada", cls: "bg-[color:var(--success)]/10 text-[color:var(--success)]" };
  if (p.approved) return { label: "Aprovada · não publicada", cls: "border border-border text-foreground" };
  return { label: "Rascunho", cls: "bg-secondary text-muted-foreground" };
}

function DivulgacaoPage() {
  const jobsFn = useServerFn(listJobs);
  const pFn = useServerFn(getPostingsOverview);
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => jobsFn() });
  const { data: po } = useQuery({ queryKey: ["postings-overview"], queryFn: () => pFn() });
  const rank = (j: any) => { const p = po?.byJob?.[j.id]; return p?.is_published ? 0 : p?.approved ? 1 : p ? 2 : 3; };
  const list = [...(jobs as any[])].sort((a, b) => rank(a) - rank(b));
  const copy = (slug: string) => navigator.clipboard.writeText(`${window.location.origin}/vagas/${slug}`).then(() => toast.success("Link copiado."), () => toast.error("Não foi possível copiar."));

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <PageHeader eyebrow="Atração de talentos" title="Divulgação de Vagas" description="Vagas cadastradas disponíveis para divulgação. Em cada vaga: texto por IA, versão para LinkedIn, versão estruturada para ATS, link de candidatura, aprovação e publicação." />
        {po && !po.available && <div className="card-soft mb-4 p-4 text-sm text-muted-foreground">A divulgação ainda não foi ativada no banco de dados.</div>}
        <div className="card-soft divide-y divide-border">
          {list.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhuma vaga cadastrada.</div>}
          {list.map((j: any) => {
            const p = po?.byJob?.[j.id];
            const s = postingState(p);
            return (
              <div key={j.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{j.title}</div>
                  <div className="text-xs text-muted-foreground">{j.clients?.name} · vaga {jobStatusInfo(j.status).label.toLowerCase()}</div>
                </div>
                <span className={"rounded-full px-2.5 py-1 text-[11px] font-medium " + s.cls}>{s.label}</span>
                {p && <Button size="sm" variant="outline" onClick={() => copy(p.slug)}><Copy className="mr-1.5 h-3.5 w-3.5" />Link de candidatura</Button>}
                <Link to="/jobs/$jobId" params={{ jobId: j.id }} hash="divulgacao"><Button size="sm"><Pencil className="mr-1.5 h-3.5 w-3.5" />{p ? "Editar e aprovar" : "Criar divulgação"}</Button></Link>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
