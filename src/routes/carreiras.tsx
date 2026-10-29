import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { listJobs } from "@/lib/db/jobs.functions";
import { getPostingsOverview } from "@/lib/db/overview.functions";

export const Route = createFileRoute("/carreiras")({
  head: () => ({ meta: [{ title: "Página de Carreiras · Moove List" }] }),
  component: CarreirasPage,
});

/** Endereço real quando configurado (VITE_CAREERS_URL); senão, o do próprio site. */
const careersUrl = () => (import.meta.env.VITE_CAREERS_URL as string | undefined) || `${window.location.origin}/vagas`;

function CarreirasPage() {
  const jobsFn = useServerFn(listJobs);
  const pFn = useServerFn(getPostingsOverview);
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => jobsFn() });
  const { data: po } = useQuery({ queryKey: ["postings-overview"], queryFn: () => pFn() });
  const published = (jobs as any[]).filter((j) => po?.byJob?.[j.id]?.is_published);
  const url = typeof window !== "undefined" ? careersUrl() : "";

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <PageHeader eyebrow="Atração de talentos" title="Página de Carreiras Moove Talent" description="A página pública onde os candidatos veem as vagas publicadas e se inscrevem." />
        <div className="card-soft mb-6 flex flex-wrap items-center gap-3 p-5">
          <code className="min-w-0 flex-1 truncate rounded bg-secondary px-3 py-2 text-xs">{url}</code>
          <a href={url} target="_blank" rel="noopener noreferrer"><Button size="sm"><ExternalLink className="mr-1.5 h-4 w-4" />Abrir página</Button></a>
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Link copiado."), () => toast.error("Não foi possível copiar."))}><Copy className="mr-1.5 h-4 w-4" />Copiar link</Button>
        </div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vagas publicadas ({published.length})</h2>
        <div className="card-soft divide-y divide-border">
          {published.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">Nenhuma vaga publicada. Publique em <Link to="/divulgacao" className="text-primary hover:underline">Divulgação de Vagas</Link>.</div>
          )}
          {published.map((j: any) => {
            const p = po!.byJob[j.id];
            return (
              <div key={j.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{j.title}</div><div className="text-xs text-muted-foreground">{p.published_at ? `Publicada em ${new Date(p.published_at).toLocaleDateString("pt-BR")}` : ""}</div></div>
                <a href={`/vagas/${p.slug}`} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Ver vaga</Button></a>
                <Link to="/jobs/$jobId" params={{ jobId: j.id }} hash="divulgacao"><Button size="sm" variant="ghost">Retirar / editar</Button></Link>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
