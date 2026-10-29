import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublicPostings } from "@/lib/db/postings.functions";
import { CareersHeader, EmployerBrand } from "@/components/jobs/CareersChrome";

export const Route = createFileRoute("/vagas/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Página de Carreiras Moove Talent" }, { name: "robots", content: "index, follow" }] }),
  component: CareersPage,
});

function CareersPage() {
  const fn = useServerFn(listPublicPostings);
  const { data, isLoading } = useQuery({ queryKey: ["public-postings"], queryFn: () => fn() });
  return (
    <div className="moove-theme min-h-screen pb-16">
      <CareersHeader />
      <div className="border-b border-border" style={{ background: "var(--portal-header-gradient)" }}>
        <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
          <h1 className="text-3xl font-semibold tracking-tight">Página de Carreiras Moove Talent</h1>
          <p className="mt-2 text-sm text-muted-foreground">Oportunidades abertas divulgadas pela Moove Talent.</p>
        </div>
      </div>
      <main className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="mt-8 space-y-3">
          {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
          {!isLoading && !data?.length && <div className="text-sm text-muted-foreground">No momento não há vagas abertas.</div>}
          {data?.map((j) => (
            <Link key={j.slug} to="/vagas/$slug" params={{ slug: j.slug }} className="block rounded-xl border border-border bg-card p-4 transition hover:border-primary">
              <div className="font-semibold">{j.title}</div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {[j.location, j.work_model, j.contract_type].filter(Boolean).map((t) => <span key={t as string}>{t}</span>)}
              </div>
              {j.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {j.skills.map((k) => <span key={k} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{k}</span>)}
                </div>
              )}
            </Link>
          ))}
        </div>
        <EmployerBrand />
      </main>
    </div>
  );
}
