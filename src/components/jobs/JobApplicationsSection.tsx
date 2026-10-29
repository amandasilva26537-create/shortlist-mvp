import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getResumeDownloadUrl, listJobApplications } from "@/lib/db/applications.functions";

const PURPOSE_LABEL: Record<string, string> = {
  selection_process: "Processo seletivo", talent_pool: "Banco de talentos", client_sharing: "Compartilhar com cliente",
  ai_analysis: "Análise por IA", international_transfer: "Transf. internacional",
};
const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

export function JobApplicationsSection({ jobId }: { jobId: string }) {
  const listFn = useServerFn(listJobApplications);
  const dlFn = useServerFn(getResumeDownloadUrl);
  const { data, isLoading } = useQuery({ queryKey: ["applications", jobId], queryFn: () => listFn({ data: { job_id: jobId } }) });
  if (isLoading) return null;
  if (data?.missing) return null; // recurso ainda não ativado: não mostra nada

  const download = async (id: string) => {
    try { const { url } = await dlFn({ data: { resume_id: id } }); window.open(url, "_blank", "noopener"); }
    catch (e: any) { toast.error(e?.message ?? "Erro ao baixar"); }
  };
  const items = data?.items ?? [];

  return (
    <section className="card-soft mt-8 p-6">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Candidaturas recebidas ({items.length})</div>
      {items.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhuma candidatura recebida pela Página de Carreiras ainda.</p>}
      <ul className="mt-3 divide-y divide-border">
        {items.map((a: any) => (
          <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <Link to="/candidates/$candidateId" params={{ candidateId: a.candidate_id }} className="font-medium hover:underline">{a.candidate?.full_name}</Link>
              <div className="text-xs text-muted-foreground">
                {[a.candidate?.email, a.candidate?.phone, a.candidate?.city].filter(Boolean).join(" · ")} · {fmt(a.applied_at)}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {a.consents.map((c: string) => <span key={c} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{PURPOSE_LABEL[c] ?? c}</span>)}
              </div>
              {a.resumes.some((r: any) => r.flags?.includes("pdf_encrypted")) && <div className="mt-1 text-[11px] text-amber-700">PDF protegido por senha: a leitura automática não funciona.</div>}
            </div>
            <div className="flex flex-wrap gap-2">
              {a.resumes.map((r: any) => (
                <Button key={r.id} size="sm" variant="outline" onClick={() => download(r.id)}><Download className="mr-1 h-3.5 w-3.5" />Currículo</Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
