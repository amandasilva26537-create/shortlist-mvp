import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getPublicPosting } from "@/lib/db/postings.functions";
import { buildJobPostingJsonLd, formatSalary, jsonLdScript, isSafeApplyUrl } from "@/lib/job-posting";
import { ApplyForm } from "@/components/jobs/ApplyForm";
import { MooveInfinity, MooveTalentLogo } from "@/components/jobs/CareersChrome";
import { CAREERS_CSS } from "@/components/jobs/careers-styles";

const INSTAGRAM = "https://www.instagram.com/moove.talent/";
const LINKEDIN = "https://www.linkedin.com/company/moovetalent/";
const SITE = "https://site.moovetalent.com";
const SITE_ORIGIN = (import.meta.env.VITE_CAREERS_URL as string | undefined)?.replace(/\/vagas\/?$/, "") || "https://elite-candidate-insight.lovable.app";
const STEPS = ["Triagem", "Entrevista Moove", "Entrevista com a empresa", "Decisão"];
const VALUES = ["Pessoas em primeiro lugar", "Qualidade acima de volume", "Liberdade com responsabilidade", "Confiança e respeito"];

const same = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
const dedupe = (list: (string | null | undefined)[]) => {
  const out: string[] = [];
  for (const t of list) { const v = (t ?? "").trim(); if (v && !out.some((o) => same(o, v))) out.push(v); }
  return out;
};
/** Título + nível, sem repetir o nível quando já está no título. */
const fullTitle = (title: string, seniority: string | null) =>
  seniority && !title.toLowerCase().includes(seniority.trim().toLowerCase()) ? `${title} ${seniority.trim()}` : title;

export const Route = createFileRoute("/vagas/$slug")({
  // dados carregados no servidor (para as tags de compartilhamento); a tela em si é montada no navegador
  ssr: "data-only",
  loader: async ({ params }) => {
    try { return await getPublicPosting({ data: { slug: params.slug } }); } catch { return null; }
  },
  head: ({ loaderData, params }) => {
    const s = loaderData?.snapshot;
    const title = s ? `${s.content.title} · Moove Talent` : "Vaga · Moove Talent";
    const desc = s
      ? [dedupe([s.employment.work_model, s.employment.location])[0], s.employment.contract_type].filter(Boolean).concat("Vaga divulgada pela Moove Talent").join(" · ")
      : "Vaga divulgada pela Moove Talent";
    const img = `${SITE_ORIGIN}/brand/moove-og.png`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Moove Talent" },
        { property: "og:url", content: `${SITE_ORIGIN}/vagas/${params.slug}` },
        { property: "og:image", content: img },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: img },
      ],
    };
  },
  component: PublicJobPage,
});

const IgIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>);
const InIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 3A1.9 1.9 0 1 0 4.5 6.8 1.9 1.9 0 0 0 4.5 3ZM3 8.5h3V21H3V8.5Zm5.5 0h2.9v1.7h.1c.4-.8 1.4-1.9 3.2-1.9 3.4 0 4 2.2 4 5.2V21h-3v-6.7c0-1.6 0-3.6-2.2-3.6s-2.5 1.7-2.5 3.5V21h-3V8.5Z" /></svg>);

function Block({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <section className="mv-block mv-up" style={{ animationDelay: `${delay}s` }}>
      <span className="mv-rule" /><h2 className="mv-h3">{title}</h2>{children}
    </section>
  );
}
const Bullets = ({ items }: { items: string[] }) => (
  <ul className="mv-list">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
);

function PublicJobPage() {
  const { slug } = Route.useParams();
  const data = Route.useLoaderData();
  const [copied, setCopied] = useState(false);

  if (!data)
    return (
      <div className="mv-page"><style>{CAREERS_CSS}</style>
        <header className="mv-header"><div className="mv-wrap mv-header-in"><Link to="/vagas" aria-label="Página de Carreiras Moove Talent"><MooveTalentLogo /></Link><Link to="/vagas" className="mv-btn mv-btn-white">← Todas as vagas</Link></div></header>
        <div className="mv-wrap" style={{ padding: "96px 24px", textAlign: "center" }}>
          <h1 className="mv-h2">Esta vaga não está mais disponível.</h1>
          <p className="mv-muted" style={{ margin: "16px 0 28px" }}>Veja as outras oportunidades abertas na Moove Talent.</p>
          <Link to="/vagas" className="mv-btn mv-btn-purple">Ver todas as vagas</Link>
        </div>
      </div>
    );

  const s = data.snapshot;
  const c = s.content;
  const e = s.employment;
  const salary = formatSalary(e.salary_min, e.salary_max);
  const heading = fullTitle(c.title, e.seniority);
  const chips = dedupe([e.work_model, e.location, e.contract_type, e.seniority, salary]);
  const pageUrl = typeof window !== "undefined" ? window.location.href.split("?")[0]! : `${SITE_ORIGIN}/vagas/${slug}`;
  const ld = buildJobPostingJsonLd(s, { url: pageUrl, datePosted: data.published_at.slice(0, 10) });
  const apply = isSafeApplyUrl(c.apply_url) ? c.apply_url : null;
  const facts: [string, string | null][] = [["Contrato", e.contract_type], ["Modelo", dedupe([e.work_model, e.location]).join(" · ") || null], ["Área", e.area], ["Remuneração", salary]];
  const shareText = `${heading} · Moove Talent`;
  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
  const whatsShare = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${pageUrl}`)}`;
  const copy = async () => { try { await navigator.clipboard.writeText(pageUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* sem permissão: ignora */ } };

  return (
    <div className="mv-page mv-job">
      <style>{CAREERS_CSS}{JOB_CSS}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />

      <header className="mv-header">
        <div className="mv-wrap mv-header-in">
          <Link to="/vagas" aria-label="Página de Carreiras Moove Talent"><MooveTalentLogo /></Link>
          <Link to="/vagas" className="mv-btn mv-btn-white">← Todas as vagas</Link>
        </div>
      </header>

      <section className="mv-hero mv-hero-job">
        <div className="mv-blob mv-blob-a" /><div className="mv-blob mv-blob-b" />
        <MooveInfinity className="mv-hero-inf" />
        <div className="mv-wrap mv-hero-in">
          <h1 className="mv-h1 mv-job-h1 mv-up" style={{ animationDelay: "0s" }}>{heading}</h1>
          {chips.length > 0 && (
            <div className="mv-chips mv-up" style={{ animationDelay: "0.1s" }}>
              {chips.map((t) => <span key={t} className="mv-chip">{t}</span>)}
            </div>
          )}
          <div className="mv-up" style={{ animationDelay: "0.2s", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <a href="#candidatar" className="mv-btn mv-btn-lime">Candidatar-se</a>
            {apply && <a href={apply} target="_blank" rel="noopener noreferrer nofollow" className="mv-link-light">ou candidate-se pelo link da empresa</a>}
          </div>
        </div>
      </section>

      <div className="mv-wrap mv-detail">
        <main className="mv-main">
          {c.intro && <Block title="O desafio"><p className="mv-p">{c.intro}</p></Block>}
          {c.company_intro && <Block title="Sobre a empresa" delay={0.05}><p className="mv-p">{c.company_intro}</p></Block>}
          {c.responsibilities.length > 0 && <Block title="Responsabilidades" delay={0.1}><Bullets items={c.responsibilities} /></Block>}
          {c.requirements.length > 0 && <Block title="Requisitos" delay={0.15}><Bullets items={c.requirements} /></Block>}
          {c.differentials.length > 0 && <Block title="Diferenciais" delay={0.2}><Bullets items={c.differentials} /></Block>}
          {c.benefits.length > 0 && <Block title="Benefícios" delay={0.2}><Bullets items={c.benefits} /></Block>}
          <Block title="Como funciona o processo" delay={0.25}>
            <ol className="mv-steps">
              {STEPS.map((t, i) => (<li key={t}><span className="mv-step-n">{i + 1}</span><span>{t}</span></li>))}
            </ol>
          </Block>
          <ApplyForm slug={slug} />
        </main>

        <aside className="mv-aside" aria-label="Resumo da vaga">
          <div className="mv-side-card">
            <dl className="mv-facts">
              {facts.filter(([, v]) => v).map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
            </dl>
            <a href="#candidatar" className="mv-btn mv-btn-purple mv-btn-block">Candidatar-se</a>
            <div className="mv-share">
              <div className="mv-share-t">Compartilhar vaga</div>
              <div className="mv-share-btns">
                <a className="mv-btn mv-btn-outline" href={linkedinShare} target="_blank" rel="noopener noreferrer"><InIcon />LinkedIn</a>
                <a className="mv-btn mv-btn-outline" href={whatsShare} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                <button type="button" className="mv-btn mv-btn-outline" onClick={copy}>{copied ? "Link copiado" : "Copiar link"}</button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <section className="mv-wrap mv-about-wrap">
        <div className="mv-about mv-up">
          <MooveInfinity className="mv-final-inf" />
          <h2 className="mv-final-h">Movimento gera resultado.</h2>
          <p className="mv-final-p">A Moove Talent é uma consultoria de recrutamento que conecta empresas digitais em crescimento aos talentos certos. Aqui, você é mais do que um currículo.</p>
          <div className="mv-values">{VALUES.map((v) => <span key={v} className="mv-chip mv-chip-dark">{v}</span>)}</div>
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

      <div className="mv-sticky-cta"><a href="#candidatar" className="mv-btn mv-btn-purple mv-btn-block">Candidatar-se</a></div>
    </div>
  );
}

const JOB_CSS = `
.mv-hero-job{padding:72px 0 88px}
.mv-job-h1{font-size:52px;margin-top:0!important;max-width:820px}
.mv-chips{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0 32px}
.mv-chip{display:inline-flex;align-items:center;min-height:32px;padding:0 14px;border-radius:999px;background:var(--lav);color:#3b1470;font-family:Poppins,sans-serif;font-weight:500;font-size:13px}
.mv-chip-dark{background:rgba(255,255,255,.12);color:#fff}
.mv-link-light{color:#E4D6F8;font-size:14px;text-decoration:underline;min-height:44px;display:inline-flex;align-items:center}
.mv-detail{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:56px;padding-top:64px;padding-bottom:40px;align-items:start}
.mv-block{margin-bottom:44px}
.mv-h3{font-size:26px;line-height:1.2;margin-bottom:14px!important}
.mv-p{margin:0;white-space:pre-wrap;font-size:17px;line-height:1.7}
.mv-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.mv-list li{position:relative;padding-left:24px;font-size:17px;line-height:1.6}
.mv-list li::before{content:"";position:absolute;left:0;top:.7em;width:8px;height:8px;border-radius:50%;background:var(--roxo)}
.mv-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;counter-reset:s}
.mv-steps li{display:flex;flex-direction:column;gap:10px;background:#fff;border:1.5px solid var(--lav);border-radius:24px;padding:18px;font-family:Poppins,sans-serif;font-weight:500;font-size:15px;transition:transform .2s ease,border-color .2s ease}
.mv-steps li:hover{transform:translateY(-2px);border-color:var(--roxo)}
.mv-step-n{width:32px;height:32px;border-radius:50%;background:var(--roxo);color:#fff;display:inline-grid;place-items:center;font-size:14px}
.mv-aside{position:sticky;top:24px}
.mv-side-card{background:#fff;border:1.5px solid var(--lav);border-radius:24px;padding:28px;display:grid;gap:20px;transition:transform .2s ease,box-shadow .2s ease}
.mv-side-card:hover{transform:translateY(-2px);box-shadow:0 14px 34px -18px rgba(118,18,214,.35)}
.mv-facts{margin:0;display:grid;gap:14px}
.mv-facts dt{font-family:Poppins,sans-serif;font-weight:500;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b5a85}
.mv-facts dd{margin:2px 0 0;font-size:16px}
.mv-btn-block{width:100%}
.mv-btn-outline{background:#fff;color:var(--roxo);border:1.5px solid var(--lav);min-height:44px;padding:0 16px;font-size:14px}
.mv-btn-outline:hover{border-color:var(--roxo)}
.mv-share-t{font-family:Poppins,sans-serif;font-weight:500;font-size:13px;margin-bottom:10px}
.mv-share-btns{display:flex;flex-wrap:wrap;gap:8px}
.mv-about-wrap{padding-top:40px;padding-bottom:88px}
.mv-about{position:relative;overflow:hidden;border-radius:32px;padding:64px 48px;background:var(--noite);color:#fff}
.mv-about .mv-final-inf{opacity:.14;left:auto;right:-120px;bottom:-110px}
.mv-values{position:relative;display:flex;flex-wrap:wrap;gap:8px;margin:0 0 32px}
.mv-sticky-cta{display:none}
@media (max-width:900px){
  .mv-detail{grid-template-columns:1fr;gap:0}.mv-aside{display:none}.mv-steps{grid-template-columns:1fr 1fr}
  .mv-job-h1{font-size:38px}
  .mv-sticky-cta{display:block;position:fixed;left:0;right:0;bottom:0;z-index:20;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgba(250,249,252,.96);border-top:1.5px solid var(--lav);backdrop-filter:blur(6px)}
  .mv-footer{padding-bottom:96px}
  .mv-about{padding:44px 24px;border-radius:28px}
}
@media (max-width:480px){.mv-steps{grid-template-columns:1fr}}
`;
