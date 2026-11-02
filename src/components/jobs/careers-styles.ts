/** Estilos compartilhados da Página de Carreiras e da página de cada vaga (identidade Moove Talent). */
export const CAREERS_CSS = `
.mv-page{--roxo:#7612D6;--noite:#1E0A3C;--grafite:#161616;--gelo:#FAF9FC;--lav:#EFE6FB;--lima:#C8F169;--ciano:#22D3EE;
  background:var(--gelo);color:var(--grafite);font-family:"DM Sans",system-ui,sans-serif;font-size:16px;line-height:1.6;min-height:100vh;overflow-x:hidden;scroll-behavior:smooth}
.mv-page h1,.mv-page h2,.mv-page h3{font-family:Poppins,system-ui,sans-serif;font-weight:600;letter-spacing:-.02em;margin:0}
.mv-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.mv-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.mv-muted{color:#5b5666;margin:0}
.mv-btn{white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 24px;border-radius:999px;font-family:Poppins,sans-serif;font-weight:500;font-size:15px;text-decoration:none;border:0;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease}
.mv-btn:hover{transform:translateY(-2px)}
.mv-btn:focus-visible,.mv-filter:focus-visible,.mv-card:focus-visible,.mv-footer a:focus-visible{outline:3px solid var(--lima);outline-offset:3px}
.mv-btn-white{background:#fff;color:var(--noite)}.mv-btn-lime{background:var(--lima);color:var(--noite)}.mv-btn-purple{background:var(--roxo);color:#fff}
.mv-btn-icon .mv-ico{color:var(--roxo);display:inline-flex}
.mv-pill{display:inline-flex;align-items:center;min-height:32px;padding:0 16px;border-radius:999px;font-family:Poppins,sans-serif;font-weight:500;font-size:13px;letter-spacing:.12em}
.mv-pill-lime{background:var(--lima);color:var(--noite)}
.mv-header{background:var(--noite);position:relative;z-index:3}
.mv-header-in{display:flex;align-items:center;justify-content:space-between;min-height:76px}
.mv-hero{background:var(--noite);position:relative;overflow:hidden;padding:96px 0 120px}
.mv-blob{position:absolute;border-radius:50%;filter:blur(110px);pointer-events:none}
.mv-blob-a{width:520px;height:520px;background:var(--roxo);opacity:.55;top:-180px;left:-160px;animation:mvFloatA 16s ease-in-out infinite}
.mv-blob-b{width:480px;height:480px;background:var(--ciano);opacity:.28;bottom:-200px;right:-140px;animation:mvFloatB 18s ease-in-out infinite}
.mv-hero-inf{position:absolute;color:#fff;opacity:.16;width:760px;right:-260px;top:50%;margin-top:-190px;animation:mvBob 9s ease-in-out infinite;pointer-events:none}
.mv-hero-in{position:relative;z-index:2}
.mv-h1{color:#fff;font-size:64px;line-height:1.05;max-width:760px;margin-top:24px!important}
.mv-sub{color:#E4D6F8;font-size:20px;max-width:640px;margin:24px 0 36px}
.mv-up{opacity:0;animation:mvUp .7s ease-out forwards}
.mv-marquee{background:var(--roxo);overflow:hidden;padding:18px 0}
.mv-marquee-track{display:flex;width:max-content;animation:mvMarquee 28s linear infinite}
.mv-marquee-set{display:flex}
.mv-marquee-item{color:#fff;font-family:Poppins,sans-serif;font-size:20px;white-space:nowrap;padding:0 24px;display:inline-flex;gap:48px}
.mv-lime-inf{color:var(--lima)}
.mv-jobs{padding:88px 0 72px}
.mv-jobs-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:36px}
.mv-rule{display:block;width:48px;height:4px;background:var(--roxo);border-radius:4px;margin-bottom:16px}
.mv-h2{font-size:40px;line-height:1.1}
.mv-filters{display:flex;flex-wrap:wrap;gap:8px}
.mv-filter{min-height:44px;padding:0 20px;border-radius:999px;border:1.5px solid var(--lav);background:#fff;color:var(--grafite);font-family:Poppins,sans-serif;font-weight:500;font-size:14px;cursor:pointer;transition:transform .2s ease,background .2s ease}
.mv-filter:hover{transform:translateY(-2px)}
.mv-filter.is-on{background:var(--roxo);border-color:var(--roxo);color:#fff}
.mv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.mv-card{display:flex;flex-direction:column;gap:14px;background:#fff;border:1.5px solid var(--lav);border-radius:24px;padding:28px;text-decoration:none;color:inherit;transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease}
.mv-card:hover{transform:translateY(-6px);box-shadow:0 18px 40px -16px rgba(118,18,214,.35);border-color:var(--roxo)}
.mv-tags{display:flex;flex-wrap:wrap;gap:8px}
.mv-tag{background:var(--lav);color:#4a1a85;border-radius:999px;padding:4px 12px;font-family:Poppins,sans-serif;font-weight:500;font-size:12px}
.mv-card-title{font-size:22px;line-height:1.25}
.mv-card-skills{margin:0;color:#5b5666;font-size:15px;flex:1}
.mv-card-cta{color:var(--roxo);font-family:Poppins,sans-serif;font-weight:500;font-size:15px;display:inline-flex;gap:6px;align-items:center}
.mv-arrow{display:inline-block;transition:transform .25s ease}.mv-card:hover .mv-arrow{transform:translateX(6px)}
.mv-empty{background:var(--lav);border-radius:24px;padding:36px;text-align:center}
.mv-empty p{margin:0 0 20px;font-size:18px}
.mv-empty-btns{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.mv-commit{padding:24px 0 88px}
.mv-commit-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:48px}
.mv-num{font-family:Poppins,sans-serif;font-weight:600;font-size:48px;color:var(--roxo);line-height:1}
.mv-commit-t{font-size:20px;margin:14px 0 8px!important}
.mv-final-wrap{padding-bottom:88px}
.mv-final{position:relative;overflow:hidden;border-radius:32px;padding:72px 48px;color:#fff;background:linear-gradient(135deg,#7612D6,#22D3EE,#7612D6);background-size:220% 220%;animation:mvAurora 12s ease-in-out infinite}
.mv-final-inf{position:absolute;color:#fff;opacity:.18;width:420px;left:-120px;bottom:-110px;pointer-events:none}
.mv-final-h{position:relative;color:#fff;font-size:40px;line-height:1.1}
.mv-final-p{position:relative;margin:16px 0 32px;font-size:19px;max-width:520px}
.mv-final-btns{position:relative;display:flex;flex-wrap:wrap;gap:12px}
.mv-footer{background:var(--grafite);color:#fff;padding:32px 0}
.mv-footer-in{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;font-size:15px}
.mv-footer-links{display:flex;gap:8px}
.mv-footer a{color:#fff;text-decoration:none;min-height:44px;display:inline-flex;align-items:center;padding:0 12px;border-radius:999px}
.mv-footer a:hover{text-decoration:underline}
@keyframes mvUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes mvFloatA{0%,100%{transform:translate(0,0)}50%{transform:translate(70px,50px)}}
@keyframes mvFloatB{0%,100%{transform:translate(0,0)}50%{transform:translate(-60px,-50px)}}
@keyframes mvBob{0%,100%{transform:translateY(-18px)}50%{transform:translateY(18px)}}
@keyframes mvMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes mvAurora{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@media (max-width:900px){.mv-grid{grid-template-columns:repeat(2,1fr)}.mv-commit-grid{grid-template-columns:1fr;gap:32px}}
@media (max-width:640px){.mv-header .mv-btn{padding:0 16px;font-size:14px}.mv-logo-talent{display:none}.mv-wrap{padding:0 20px}.mv-hero{padding:64px 0 80px}.mv-h1{font-size:40px}.mv-sub{font-size:18px}.mv-h2{font-size:32px}.mv-grid{grid-template-columns:1fr}
  .mv-hero-inf{width:480px;right:-220px}.mv-final{padding:48px 24px;border-radius:28px}.mv-final-h{font-size:32px}}
@media (prefers-reduced-motion:reduce){.mv-page *{animation:none!important;transition:none!important}.mv-up{opacity:1}.mv-page{scroll-behavior:auto}}
`;
