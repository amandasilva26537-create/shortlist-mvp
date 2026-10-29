import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicPosting } from "@/lib/db/postings.functions";
import { buildJobPostingJsonLd, employmentLines, jsonLdScript, isSafeApplyUrl } from "@/lib/job-posting";
import { Link } from "@tanstack/react-router";
import { CareersHeader, EmployerBrand } from "@/components/jobs/CareersChrome";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/vagas/$slug")({
  ssr: false,
  head: () => ({ meta: [{ title: "Vaga · Página de Carreiras Moove Talent" }, { name: "robots", content: "index, follow" }] }),
  component: PublicJobPage,
});

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--portal-strong)" }} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PublicJobPage() {
  const { slug } = Route.useParams();
  const fn = useServerFn(getPublicPosting);
  const { data, isLoading } = useQuery({ queryKey: ["public-posting", slug], queryFn: () => fn({ data: { slug } }) });

  if (isLoading) return <div className="moove-theme grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando…</div>;
  if (!data)
    return (
      <div className="moove-theme grid min-h-screen place-items-center px-6 text-center text-sm text-muted-foreground">
        Esta vaga não está mais disponível.
      </div>
    );

  const s = data.snapshot;
  const c = s.content;
  const url = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";
  const ld = buildJobPostingJsonLd(s, { url, datePosted: data.published_at.slice(0, 10) });
  const emp = employmentLines(s);
  const apply = isSafeApplyUrl(c.apply_url) ? c.apply_url : null;

  return (
    <div className="moove-theme min-h-screen pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <CareersHeader />
      <div className="border-b border-border" style={{ background: "var(--portal-header-gradient)" }}>
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
          <Link to="/vagas" className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--portal-strong)" }}>← Moove Talent · Todas as vagas</Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{c.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {[s.employment.location, s.employment.work_model, s.employment.contract_type].filter(Boolean).map((t) => (
              <span key={t as string} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{t}</span>
            ))}
          </div>
          {apply && (
            <a href={apply} target="_blank" rel="noopener noreferrer nofollow" className="mt-5 inline-block">
              <Button>Candidatar-se</Button>
            </a>
          )}
        </div>
      </div>
      <main className="mx-auto max-w-3xl px-4 md:px-6">
        {c.skills.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5" aria-label="Competências">
            {c.skills.map((k) => <span key={k} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground">{k}</span>)}
          </div>
        )}
        {c.intro && <p className="mt-8 whitespace-pre-wrap text-sm leading-relaxed">{c.intro}</p>}
        {c.company_intro && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Sobre a empresa</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{c.company_intro}</p>
          </section>
        )}
        <List title="Responsabilidades" items={c.responsibilities} />
        <List title="Requisitos obrigatórios" items={c.requirements} />
        <List title="Diferenciais" items={c.differentials} />
        {emp.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Contratação e trabalho</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {emp.map((l) => (
                <div key={l.label} className="rounded-lg border border-border bg-card p-3">
                  <dt className="text-xs text-muted-foreground">{l.label}</dt>
                  <dd className="font-medium">{l.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <List title="Benefícios" items={c.benefits} />
        <EmployerBrand />
      </main>
    </div>
  );
}
