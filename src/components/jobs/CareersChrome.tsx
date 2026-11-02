import { Link } from "@tanstack/react-router";
import { MOOVE_EMPLOYER_BRAND } from "@/lib/job-posting";

/** Símbolo ∞ oficial da Moove (PNG transparente) usado como máscara, para poder ter qualquer cor. */
export function MooveInfinity({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  const url = "url(/brand/moove-infinity.png)";
  return (
    <span aria-hidden="true" className={className}
      style={{ display: "inline-block", aspectRatio: "1010 / 472", backgroundColor: "currentColor", WebkitMaskImage: url, maskImage: url, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskPosition: "center", maskPosition: "center", ...style }} />
  );
}

/** Logo horizontal "moove | TALENT" com o ∞ oficial no lugar do "oo". tone: "light" (sobre fundo escuro) ou "dark". */
export function MooveTalentLogo({ tone = "light" }: { tone?: "light" | "dark" }) {
  const c = tone === "light" ? "#fff" : "#161616";
  return (
    <span role="img" aria-label="Moove Talent" style={{ display: "inline-flex", alignItems: "center", gap: 14, color: c, minHeight: 44 }}>
      <span style={{ fontFamily: "Poppins, system-ui, sans-serif", fontWeight: 600, fontSize: 28, letterSpacing: "-0.02em", display: "inline-flex", alignItems: "center", lineHeight: 1 }}>
        m<MooveInfinity style={{ color: "#7612D6", width: 40, margin: "0 2px", transform: "translateY(2px)" }} />ve
      </span>
      <span style={{ width: 1, height: 26, background: tone === "light" ? "rgba(255,255,255,.35)" : "rgba(22,22,22,.25)" }} />
      <span style={{ fontFamily: "Poppins, system-ui, sans-serif", fontWeight: 500, fontSize: 12, letterSpacing: "0.32em" }}>TALENT</span>
    </span>
  );
}

/** Cabeçalho da Página de Carreiras Moove Talent (logo oficial). */
export function CareersHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link to="/vagas" aria-label="Página de Carreiras Moove Talent">
          <MooveTalentLogo tone="dark" />
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
