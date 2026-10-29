// node --experimental-strip-types --no-warnings scripts/application-match.check.mts
import assert from "node:assert/strict";
import * as M from "../src/lib/application-match.ts";
import { collectSources } from "../src/lib/job-posting.ts";

const job = { title: "Consultor de Vendas", area: "Comercial", seniority: "Pleno", must_have: ["Vendas consultivas", "Negociação com clientes"], nice_to_have: ["Inglês intermediário"], hard_skills: ["CRM"],
  ai_structure: { tools: ["HubSpot"], responsibilities: ["Prospectar clientes"], education: [{ level: "Superior", area: "Administração", required: true }], languages: [{ language: "Inglês", level: "Intermediário", required: false }], differentials: [] } };
const src = collectSources(job, { name: "X", brand: "moove" });
const crit = M.buildCriteria(src);
const cats = (c: M.Category) => crit.filter((x) => x.category === c).map((x) => x.text);
assert.deepEqual(cats("obrigatorios"), ["Vendas consultivas", "Negociação com clientes", "Formação: Superior em Administração"]);
assert.deepEqual(cats("tecnicas"), ["CRM", "HubSpot"]);
assert.equal(cats("experiencia").length, 2); assert.ok(cats("diferenciais").includes("Inglês intermediário"));
assert.equal(new Set(crit.map((c) => c.id)).size, crit.length);
assert.equal(M.criteriaHash(crit), M.criteriaHash(M.buildCriteria(src)));
// nada de campos internos/protegidos nos critérios
assert.ok(!JSON.stringify(crit).match(/idade|gênero|foto/i));

// cálculo: piso x teto; ausência não é "não atende"
const none = M.computeMatch(crit, [], M.DEFAULT_WEIGHTS);
assert.equal(none.score, 0); assert.equal(none.score_max, 100); assert.equal(none.coverage, 0); assert.equal(none.gaps.length, crit.length);
const all = crit.map((c) => ({ criterion_id: c.id, status: "met" as const, evidence: "x", note: null }));
assert.equal(M.computeMatch(crit, all, M.DEFAULT_WEIGHTS).score, 100);
const half = crit.map((c) => ({ criterion_id: c.id, status: "partial" as const, evidence: "x", note: null }));
assert.equal(M.computeMatch(crit, half, M.DEFAULT_WEIGHTS).score, 50);
// not_met pesa no teto; bloqueia pré-triagem
const nm = crit.map((c, i) => ({ criterion_id: c.id, status: (c.category === "obrigatorios" && i === 0 ? "not_met" : "met") as M.Status, evidence: "x", note: null }));
const rnm = M.computeMatch(crit, nm, M.DEFAULT_WEIGHTS);
assert.ok(rnm.score_max < 100 && rnm.blocking_unmet && rnm.unmet.length === 1);
assert.equal(M.isPrescreened(rnm, 70), false); assert.equal(M.isPrescreened(M.computeMatch(crit, all, M.DEFAULT_WEIGHTS), 70), true);
// pesos configuráveis mudam a nota; categoria vazia é redistribuída
const onlyMust = M.computeMatch(crit, crit.map((c) => ({ criterion_id: c.id, status: (c.category === "obrigatorios" ? "met" : "no_evidence") as M.Status, evidence: "x", note: null })), { obrigatorios: 100, tecnicas: 0, experiencia: 0, diferenciais: 0 });
assert.equal(onlyMust.score, 100);
assert.equal(M.normalizeWeights({ obrigatorios: "abc", tecnicas: 500 }).obrigatorios, 40);
assert.deepEqual(M.normalizeWeights({ obrigatorios: 0, tecnicas: 0, experiencia: 0, diferenciais: 0 }), M.DEFAULT_WEIGHTS);
assert.equal(M.computeMatch([], [], M.DEFAULT_WEIGHTS).score, 0);

// evidência precisa existir no texto
const text = "5 anos com Vendas Consultivas em empresas B2B. Usei HubSpot e CRM diariamente.";
assert.ok(M.evidenceInText("vendas consultivas em empresas B2B", text)); assert.ok(!M.evidenceInText("liderou equipe de 20 pessoas", text));
const raw = [{ criterion_id: crit[0]!.id, status: "met", evidence: "Vendas Consultivas" }, { criterion_id: crit[1]!.id, status: "met", evidence: "negociou contratos milionários" }];
const s = M.sanitizeAssessments(crit, raw, text);
assert.equal(s.items[0]!.status, "met"); assert.equal(s.items[1]!.status, "no_evidence"); assert.equal(s.warnings.length, 1);
assert.equal(s.items.find((x) => x.criterion_id === crit[2]!.id)!.status, "no_evidence");

// palavras-chave (sem IA)
const kw = M.keywordAssess(crit, text);
assert.equal(kw.find((a) => a.criterion_id === crit.find((c) => c.text === "HubSpot")!.id)!.status, "partial");
assert.equal(kw.find((a) => a.criterion_id === crit.find((c) => c.text === "Negociação com clientes")!.id)!.status, "no_evidence");
assert.ok(kw.every((a) => a.status === "partial" || a.status === "no_evidence"));

// privacidade e viés
const red = M.redactResumeText("Maria Souza\nmaria@x.com +55 11 91234-5678 linkedin.com/in/maria https://x.com/a\nMaria trabalhou com vendas", "Maria Souza");
assert.ok(!/maria|@|91234|linkedin|https/i.test(red.replace("[candidato]", "").replace("[email]", "").replace("[telefone]", "").replace("[link]", "")), red);
assert.ok(red.includes("vendas"));
const prof = M.normalizeProfile({ skills: ["CRM", "Solteira", "Idade 30 anos", "Excel"], tools: [{ name: "HubSpot" }], salary_expectation: "8000", total_experience_years: 99, summary: "Casada, 2 filhos" });
assert.deepEqual(prof.skills, ["CRM", "Excel"]); assert.deepEqual(prof.tools, ["HubSpot"]); assert.equal(prof.salary_expectation, 8000); assert.equal(prof.total_experience_years, null); assert.equal(prof.summary, "");

// filtros e ordenação
const rows = [
  { id: "a", score: 80, score_max: 90, applied_at: "2026-10-01", r: { score: 80, score_max: 90, prescreened: true, skills: ["CRM", "Excel"], years: 6, salary: 7000 } },
  { id: "b", score: 55, score_max: 95, applied_at: "2026-10-02", r: { score: 55, score_max: 95, prescreened: false, skills: ["Excel"], years: 2, salary: null } },
  { id: "c", score: null, score_max: null, applied_at: "2026-10-03", r: { score: null, score_max: null, prescreened: false, skills: [], years: null, salary: 20000 } },
];
assert.deepEqual([...rows].sort(M.compareByMatch).map((x) => x.id), ["a", "b", "c"]);
const ids = (f: M.MatchFilters) => rows.filter((x) => M.matchesFilters(x.r, f)).map((x) => x.id);
assert.deepEqual(ids({ minScore: 60 }), ["a"]); assert.deepEqual(ids({ skill: "crm, excel" }), ["a"]);
assert.deepEqual(ids({ minYears: 3 }), ["a"]); assert.deepEqual(ids({ maxSalary: 10000 }), ["a", "b"]); assert.deepEqual(ids({ onlyPrescreened: true }), ["a"]);
console.log("MATCH DE CANDIDATURA: TODOS OS TESTES OK");
