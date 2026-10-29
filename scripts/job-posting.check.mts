// Teste da lógica de divulgação de vagas. Rode: node --experimental-strip-types --no-warnings scripts/job-posting.check.mts
import assert from "node:assert/strict";
import * as P from "../src/lib/job-posting.ts";

const job = {
  title: "Consultor de Vendas", area: "Comercial", seniority: "Pleno", location: "São Paulo - SP", work_model: "Híbrido", contract_type: "CLT",
  salary_min: 4000, salary_max: 6000, description: "Vaga para vendas consultivas.",
  recruiter_notes: "SEGREDO-NOTA-INTERNA", meeting_transcript: "SEGREDO-TRANSCRICAO", pasted_text: "SEGREDO-COLADO", manager_name: "SEGREDO-GESTOR",
  must_have: ["Experiência em vendas consultivas"], nice_to_have: ["Inglês intermediário"], hard_skills: ["CRM"], soft_skills: ["Negociação"],
  ai_structure: { summary: "Atuar em vendas consultivas.", mission: "Gerar receita", responsibilities: ["Prospectar clientes", "Conduzir negociações"],
    hiring_context: "SEGREDO-CONTEXTO-CONTRATACAO", ideal_profile: "SEGREDO-PERFIL-IDEAL", less_fit_profile: "SEGREDO-MENOS-ADERENTE",
    tools: ["HubSpot"], differentials: ["Experiência em franquias"], education: [{ level: "Superior", area: "Administração", required: true }, { level: "MBA", area: "", required: false }],
    languages: [{ language: "Inglês", level: "Intermediário", required: false }] },
};
const client = { name: "Acqualive", segment: "Saúde e bem-estar", city: "São Paulo", state: "SP", website: "https://x.com", brand: "moove", internal_notes: "SEGREDO-CLIENTE" };

const src = P.collectSources(job, client);
const dump = JSON.stringify(src);
for (const secret of ["SEGREDO-NOTA", "SEGREDO-TRANSCRICAO", "SEGREDO-COLADO", "SEGREDO-GESTOR", "SEGREDO-CONTEXTO", "SEGREDO-PERFIL", "SEGREDO-MENOS", "SEGREDO-CLIENTE"])
  assert.ok(!dump.includes(secret), "vazou " + secret);
assert.equal(src.company.brand, "moove");

const d = P.defaultContent(src);
assert.deepEqual(d.responsibilities, ["Prospectar clientes", "Conduzir negociações"]);
assert.deepEqual(d.requirements, ["Experiência em vendas consultivas", "Superior em Administração"]);
assert.ok(d.skills.includes("CRM") && d.skills.includes("HubSpot") && d.skills.includes("Negociação"));
assert.deepEqual(d.differentials, ["Inglês intermediário", "Experiência em franquias"]);
assert.deepEqual(d.benefits, []);
assert.equal(d.show_salary, false); assert.equal(d.show_company_name, false);

const h = P.hashSources(src);
let snap = P.buildSnapshot(src, d, h);
assert.equal(snap.employment.salary_min, null); assert.equal(snap.company.name, null);
assert.ok(P.companyDisplay(snap).includes("confidencial"));
assert.ok(!P.employmentLines(snap).some((l) => l.label === "Remuneração"));
assert.ok(!P.buildPlainText(snap, null).includes("Acqualive") && !P.buildPlainText(snap, null).includes("R$"));
snap = P.buildSnapshot(src, { ...d, show_salary: true, show_company_name: true }, h);
assert.ok(P.employmentLines(snap).some((l) => l.label === "Remuneração" && /4\.000/.test(l.value) && /6\.000/.test(l.value)));
assert.ok(P.buildPlainText(snap, "https://x/vagas/a").includes("Acqualive"));
assert.notEqual(P.hashSources(P.collectSources({ ...job, title: "Outro" }, client)), h);
assert.equal(P.hashSources(P.collectSources(job, client)), h);

const allowed = P.allowedTextFor(src, { benefits: [], show_salary: false });
assert.deepEqual(P.findUnsupportedClaims("Atuar em vendas consultivas com foco em prospecção de clientes.", allowed), []);
assert.ok(P.findUnsupportedClaims("Oferecemos plano de saúde e vale-refeição.", allowed).some((m) => /Benefício/.test(m)));
assert.ok(P.findUnsupportedClaims("Salário de R$ 9.500 mais bônus.", allowed).length >= 2);
assert.ok(P.findUnsupportedClaims("Mais de 15 anos de mercado.", allowed).some((m) => /Número/.test(m)));
const allowed2 = P.allowedTextFor(src, { benefits: ["Plano de saúde"], show_salary: false });
assert.deepEqual(P.findUnsupportedClaims("Oferecemos plano de saúde.", allowed2), []);
const allowed3 = P.allowedTextFor(src, { benefits: [], show_salary: true });
assert.deepEqual(P.findUnsupportedClaims("Remuneração de R$ 4.000 a R$ 6.000.", allowed3), []);
assert.deepEqual(P.findUnsupportedClaims("Vaga em São Paulo - SP.", allowed), []);

for (const bad of ["javascript:alert(1)", "http://x.com", "data:text/html,x", "ftp://x", "//x.com", "https://", "mailto:abc"]) assert.equal(P.isSafeApplyUrl(bad), false, bad);
for (const ok of ["https://empresa.com/vaga", "mailto:rh@empresa.com"]) assert.equal(P.isSafeApplyUrl(ok), true, ok);
assert.equal(P.normalizeContent({ apply_url: "javascript:alert(1)", title: "x" }).apply_url, "");

const ld: any = P.buildJobPostingJsonLd(snap, { url: "https://s.com/vagas/consultor-de-vendas-ab12cd34", datePosted: "2026-10-29" });
assert.equal(ld["@type"], "JobPosting"); assert.equal(ld.employmentType, "FULL_TIME");
assert.equal(ld.hiringOrganization.name, "Acqualive"); assert.equal(ld.baseSalary.value.minValue, 4000);
assert.equal(ld.jobLocation.address.addressLocality, "São Paulo - SP");
const hidden: any = P.buildJobPostingJsonLd(P.buildSnapshot(src, d, h), { url: "https://s.com/vagas/x", datePosted: "2026-10-29" });
assert.equal(hidden.hiringOrganization.name, "Moove Talent"); assert.equal(hidden.baseSalary, undefined);
assert.ok(!JSON.stringify(hidden).includes("Acqualive"));
const evil = P.buildSnapshot(src, P.normalizeContent({ ...d, title: "</script><script>alert(1)</script>", intro: "<img src=x onerror=alert(1)>" }), h);
const s = P.jsonLdScript(P.buildJobPostingJsonLd(evil, { url: "https://s.com/v", datePosted: "2026-10-29" }));
assert.ok(!s.includes("</script>") && !s.includes("<img"));
assert.ok(JSON.parse(s).description.includes("&lt;img"));

const sl = P.slugify("Gerente de RH Sênior – Operações!", "k3f9x2ab");
assert.equal(sl, "gerente-de-rh-senior-operacoes-k3f9x2ab"); assert.ok(P.isValidSlug(sl));
assert.equal(P.isValidSlug("../etc/passwd"), false); assert.equal(P.isValidSlug("A_b"), false);
console.log("DIVULGAÇÃO: TODOS OS TESTES OK");
