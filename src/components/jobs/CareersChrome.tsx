import { Link } from "@tanstack/react-router";
import { MOOVE_EMPLOYER_BRAND } from "@/lib/job-posting";

/** Cabeçalho da Página de Carreiras Moove Talent (logo oficial). */
export function CareersHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link to="/vagas" aria-label="Página de Carreiras Moove Talent">
          <img src="/brand/moove-careers-logo.png" alt="Moove Talent" className="h-10 w-auto" />
        </Link>
        <span className="text-xs font-medium text-muted-foreground">Página de Carreiras Moove Talent</span>
      </div>
    </header>
  );
}

/** Bloco de employer brand da Moove Talent. */
export function EmployerBrand() {
  const e = MOOVE_EMPLOYER_BRAND;
  return (
    <section className="mt-12 rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--portal-strong)" }}>Sobre a Moove Talent</div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">{e.headline}</h2>
      {e.paragraphs.map((p, i) => <p key={i} className="mt-3 text-sm leading-relaxed text-muted-foreground">{p}</p>)}
      <div className="mt-4 flex flex-wrap gap-2">
        {e.values.map((v) => <span key={v} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{v}</span>)}
      </div>
    </section>
  );
}
