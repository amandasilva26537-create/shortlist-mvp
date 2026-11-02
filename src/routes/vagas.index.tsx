import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublicPostings } from "@/lib/db/postings.functions";
import { MooveInfinity as InfinityMark, MooveTalentLogo } from "@/components/jobs/CareersChrome";
import { CAREERS_CSS } from "@/components/jobs/careers-styles";

export const Route = createFileRoute("/vagas/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Página de Carreiras Moove Talent" }, { name: "robots", content: "index, follow" }] }),
  component: CareersPage,
});

const INSTAGRAM = "https://www.instagram.com/moove.talent/";
const LINKEDIN = "https://www.linkedin.com/company/moovetalent/";
const SITE = "https://site.moovetalent.com";
const VALUES = ["Confiança e respeito", "Pessoas em primeiro lugar", "Qualidade acima de volume", "Liberdade com responsabilidade", "Mentalidade de negócios"];
const FILTERS = ["Todas", "Remoto", "Híbrido", "Presencial"] as const;
type Filter = (typeof FILTERS)[number];
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const modelOf = (w: string | null): Filter | null => {
  const n = norm(w ?? "");
  return n.startsWith("remot") ? "Remoto" : n.startsWith("hibrid") ? "Híbrido" : n.startsWith("presenc") ? "Presencial" : null;
};

const IgIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>);
const InIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 3A1.9 1.9 0 1 0 4.5 6.8 1.9 1.9 0 0 0 4.5 3ZM3 8.5h3V21H3V8.5Zm5.5 0h2.9v1.7h.1c.4-.8 1.4-1.9 3.2-1.9 3.4 0 4 2.2 4 5.2V21h-3v-6.7c0-1.6 0-3.6-2.2-3.600s-2.5 1.700-2.500 3.5V21h-3V8.5Z" /></svg>);

function CareersPage() {
  const fn = useServerFn(listPublicPostings);
  const { data, isLoading } = useQuery({ queryKey: ["public-postings"], queryFn: () => fn() });
  const [filter, setFilter] = useState<Filter>("Todas");
  const list = useMemo(() => (data ?? []).filter((j) => filter === "Todas" || modelOf(j.work_model) === filter), [data, filter]);

  return (
    <div className="mv-page">
      <style>{CAREERS_CSS}</style>

      <header className="mv-header">
        <div className="mv-wrap mv-header-in">
          <Link to="/vagas" aria-label="Página de Carreiras Moove Talent"><MooveTalentLogo /></Link>
          <a href="#vagas" className="mv-btn mv-btn-white">Ver vagas</a>
        </div>
      </header>

      <section className="mv-hero">
        <div className="mv-blob mv-blob-a" /><div className="mv-blob mv-blob-b" />
        <InfinityMark className="mv-hero-inf" />
        <div className="mv-wrap mv-hero-in">
          <span className="mv-pill mv-pill-lime mv-up" style={{ animationDelay: "0s" }}>CARREIRAS</span>
          <h1 className="mv-h1 mv-up" style={{ animationDelay: "0.1s" }}>Movimento gera resultado. Inclusive na sua carreira.</h1>
          <p className="mv-sub mv-up" style={{ animationDelay: "0.2s" }}>A Moove Talent é uma consultoria de recrutamento que conecta empresas digitais em crescimento aos talentos certos. Aqui, você é mais do que um currículo.</p>
          <a href="#vagas" className="mv-btn mv-btn-lime mv-up" style={{ animationDelay: "0.3s" }}>Ver vagas abertas ↓</a>
        </div>
      </section>

      <div className="mv-marquee" aria-hidden="true">
        <div className="mv-marquee-track">
          {[0, 1].map((k) => (
            <div className="mv-marquee-set" key={k}>
              {VALUES.map((v) => (<span key={v + k} className="mv-marquee-item">{v}<span className="mv-lime-inf">∞</span></span>))}
            </div>
          ))}
        </div>
      </div>
      <p className="mv-sr">Nossos valores: {VALUES.join(", ")}.</p>

      <section id="vagas" className="mv-jobs">
        <div className="mv-wrap">
          <div className="mv-jobs-head">
            <div><span className="mv-rule" /><h2 className="mv-h2">Vagas abertas</h2></div>
            <div className="mv-filters" role="group" aria-label="Filtrar por modelo de trabalho">
              {FILTERS.map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={"mv-filter" + (filter === f ? " is-on" : "")}>{f}</button>
              ))}
            </div>
          </div>

          {isLoading && <p className="mv-muted">Carregando…</p>}
          {!isLoading && list.length > 0 && (
            <div className="mv-grid">
              {list.map((j) => (
                <Link key={j.slug} to="/vagas/$slug" params={{ slug: j.slug }} className="mv-card">
                  <div className="mv-tags">
                    {[[j.work_model, j.location].filter(Boolean).join(" · "), j.contract_type].filter(Boolean).map((t) => <span key={t as string} className="mv-tag">{t}</span>)}
                  </div>
                  <h3 className="mv-card-title">{j.title}</h3>
                  {j.skills.length > 0 && <p className="mv-card-skills">{j.skills.join(", ")}</p>}
                  <span className="mv-card-cta">Candidatar-se <span className="mv-arrow">→</span></span>
                </Link>
              ))}
            </div>
          )}
          {!isLoading && list.length === 0 && (
            <div className="mv-empty">
              <p>{(data ?? []).length === 0 ? "No momento não há vagas abertas. Acompanhe a Moove para ver as próximas." : "Nenhuma vaga com esse modelo no momento. Acompanhe a Moove para ver as próximas."}</p>
              <div className="mv-empty-btns">
                <a className="mv-btn mv-btn-purple" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
                <a className="mv-btn mv-btn-purple" href={LINKEDIN} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mv-commit">
        <div className="mv-wrap mv-commit-grid">
          {[["01", "Pessoas em primeiro lugar", "Informações corretas, tratamento respeitoso e seus dados protegidos."], ["02", "Critérios do trabalho real", "Entendemos o negócio antes de avaliar você. Sem depender só de filtros automáticos."], ["03", "Qualidade acima de volume", "Buscamos aderência real, por isso cada candidatura é olhada com atenção."]].map(([n, t, d]) => (
            <div key={n}><div className="mv-num">{n}</div><h3 className="mv-commit-t">{t}</h3><p className="mv-muted">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="mv-wrap mv-final-wrap">
        <div className="mv-final">
          <InfinityMark className="mv-final-inf" />
          <h2 className="mv-final-h">Novas vagas chegam por aqui.</h2>
          <p className="mv-final-p">Siga a Moove Talent e acompanhe as próximas oportunidades.</p>
          <div className="mv-final-btns">
            <a className="mv-btn mv-btn-white mv-btn-icon" href={INSTAGRAM} target="_blank" rel="noopener noreferrer"><span className="mv-ico"><IgIcon /></span>Instagram</a>
            <a className="mv-btn mv-btn-white mv-btn-icon" href={LINKEDIN} target="_blank" rel="noopener noreferrer"><span className="mv-ico"><InIcon /></span>LinkedIn</a>
          </div>
        </div>
      </section>

      <footer className="mv-footer">
        <div className="mv-wrap mv-footer-in">
          <span>Moove Talent · Movimento gera resultado.</span>
          <nav className="mv-footer-links" aria-label="Links da Moove Talent">
            <a href={SITE} target="_blank" rel="noopener noreferrer">Site</a>
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href={LINKEDIN} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
