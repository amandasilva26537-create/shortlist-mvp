// node --experimental-strip-types --no-warnings scripts/indicators.check.mts
import assert from "node:assert/strict";
import * as I from "../src/lib/indicators.ts";

const clients = [{ id: "cm", name: "Acme", brand: "Moove" }, { id: "cp", name: "Beta", brand: "portus" }, { id: "cn", name: "Gama", brand: null }];
const jobs = [
  { id: "j1", recruiter_id: "u1", title: "Vendas", status: "closed", created_at: "2026-01-01T10:00:00Z", client_id: "cm", created_by: "u1" },
  { id: "j2", recruiter_id: "u2", title: "RH", status: "open", created_at: "2026-02-01T10:00:00Z", client_id: "cm", created_by: "u2" },
  { id: "j3", recruiter_id: "u3", title: "TI", status: "closed", created_at: "2026-03-01T10:00:00Z", client_id: "cp", created_by: "u1" },
  { id: "j4", recruiter_id: "u3", title: "Fin", status: "closed", created_at: "2026-03-01T10:00:00Z", client_id: "cp", created_by: null },
  { id: "j5", recruiter_id: "u2", title: "Op", status: "paused", created_at: "2026-03-01T10:00:00Z", client_id: "cn", created_by: "u2" },
  { id: "jX", title: "Sem cliente", status: "open", created_at: "2026-03-01T10:00:00Z", client_id: "zzz", created_by: null },
];
const sl = (id: string, job: string, status: string, pub: string | null, resp: string | null = null, owner: string | null = null) => ({ id, job_id: job, status, published_at: pub, created_at: "2026-01-02T00:00:00Z", responsible: resp, owner_id: owner });
const shortlists = [
  sl("s2", "j1", "sent", "2026-01-20T10:00:00Z", "Ana"), sl("s1", "j1", "sent", "2026-01-10T10:00:00Z", "Ana"), sl("s1", "j1", "sent", "2026-01-10T10:00:00Z", "Ana"), // duplicada
  sl("sd", "j1", "draft", null, "Ana"),
  sl("s3", "j2", "sent", "2026-02-15T10:00:00Z", null, "u2"),
  sl("s4", "j3", "sent", "2026-03-10T10:00:00Z", "Bruno"), sl("s5", "j3", "closed", "2026-03-25T10:00:00Z", "Bruno"),
  sl("s6", "j4", "sent", "2026-03-12T10:00:00Z", "Bruno"),
];
const d: I.Dataset = {
  jobs, clients, shortlists,
  hiredLinks: [{ shortlist_id: "s2", candidate_id: "c1", status: "contratado" }, { shortlist_id: "s2", candidate_id: "c1", status: "contratado" }, { shortlist_id: "s5", candidate_id: "c9", status: "contratado" }],
  hiredApps: [{ job_id: "j1", candidate_id: "c1" }, { job_id: "j3", candidate_id: "c8" }],
  closedStageDates: { j1: ["2026-01-31T10:00:00Z"], j3: ["2026-04-01T10:00:00Z"], j2: ["2026-05-01T10:00:00Z"] }, // j2 aberta: ignora; j4 sem data
  team: { u1: "Ana", u2: "Diego", u3: "Bruno" },
};
const all = I.computeJobs(d);
assert.equal(all.length, 5); // jX sem cliente fora
const J = (id: string) => all.find((x) => x.id === id)!;
// duplicadas e rascunho não contam; ordem pela data real de envio
assert.deepEqual(J("j1").sent.map((s) => s.id), ["s1", "s2"]);
assert.equal(J("j1").closedOn.kind === "n" && (J("j1").closedOn as any).n, 2); // contratado na s2 (2ª enviada)
assert.equal(J("j1").hires, 1); // mesmo candidato por shortlist e candidatura: 1
assert.equal(J("j1").daysToClose, 30);
assert.equal(J("j2").closedAt, null); assert.deepEqual(J("j2").closedOn, { kind: "in_progress" });
assert.equal(J("j2").recruiter, "Diego"); // só a pessoa cadastrada em Equipe e escolhida na vaga
assert.equal(J("j3").hires, 2); assert.equal((J("j3").closedOn as any).n, 2); // s5 é a 2ª enviada (status closed conta como enviada)
assert.deepEqual(J("j4").closedOn, { kind: "unknown" }); assert.equal(J("j4").daysToClose, null); assert.equal(J("j4").recruiter, "Bruno");
assert.deepEqual(J("j5").closedOn, { kind: "na" }); assert.equal(J("j5").recruiter, "Diego");
assert.equal(I.normBrand(null), "portus"); assert.equal(J("j5").brand, "portus");

// filtros por empresa
const both: I.Brand[] = ["moove", "portus"];
const mv = I.applyFilters(all, { brands: both, brand: "moove" });
assert.deepEqual(mv.map((j) => j.id).sort(), ["j1", "j2"]);
assert.deepEqual(I.applyFilters(all, { brands: ["moove"], brand: "all" }).map((j) => j.id).sort(), ["j1", "j2"]); // sem acesso à outra marca
assert.deepEqual(I.applyFilters(all, { brands: ["portus"], brand: "moove" }), []); // pediu marca sem permissão
assert.deepEqual(I.applyFilters(all, { brands: both, recruiter: "u3" }).map((j) => j.id).sort(), ["j3", "j4"]);

// estatísticas
const st = I.computeStats(all, {});
assert.equal(st.open, 1); assert.equal(st.closed, 3); assert.equal(st.closedUndated, 1);
assert.equal(st.avgDays, Math.round(((30 + 31) / 2) * 10) / 10); assert.equal(st.avgDaysBase, 2);
assert.equal(st.sentShortlists, 6);
assert.equal(st.hires, 3); // j1:1 + j3:2

// média de shortlists por vaga fechada: (j1:2 + j3:2 + j4:1) / 3
assert.equal(st.shortlistsInClosed, 5); assert.equal(st.avgShortlistsPerClosed, 1.7);
// período: só fechamentos com data dentro; vaga sem data fica fora
const p1 = I.computeStats(all, { from: "2026-01-01", to: "2026-02-28" });
assert.equal(p1.closed, 1); assert.equal(p1.sentShortlists, 3); assert.equal(p1.avgDays, 30); assert.equal(p1.hires, 1);
assert.equal(I.computeStats(all, { from: "2027-01-01", to: "2027-12-31" }).avgDays, null);
// gráfico mensal (só datas registradas, preenche meses vazios)
assert.deepEqual(I.closedByMonth(all, {}), [{ month: "2026-01", count: 1 }, { month: "2026-02", count: 0 }, { month: "2026-03", count: 0 }, { month: "2026-04", count: 1 }]);
assert.deepEqual(I.closedByMonth([], {}), []);
// por recrutador
const rr = I.byRecruiter(all, {});
const bruno = rr.find((r) => r.key === "u3")!; assert.equal(bruno.jobs, 2); assert.equal(bruno.closed, 2); assert.equal(bruno.sent, 3); assert.equal(bruno.avgDays, 31); assert.equal(bruno.avgDaysBase, 1); assert.equal(bruno.hires, 2);
const ana = rr.find((r) => r.key === "u1")!; assert.equal(ana.avgShortlistsPerClosed, 2);
// tabela de shortlists: ordem pelo último envio e filtro de período
assert.deepEqual(I.shortlistRows(all, {}).map((j) => j.id), ["j3", "j4", "j2", "j1"]);
assert.deepEqual(I.shortlistRows(all, { from: "2026-02-01", to: "2026-02-28" }).map((j) => j.id), ["j2"]);
// texto livre / membro excluído nunca vira recrutador; datas informadas na vaga
const d2: I.Dataset = { ...d, jobs: [
  { ...jobs[0]!, recruiter_id: "removido", opened_on: "2026-01-05", closed_on: "2026-01-25", sl1_date: "2026-01-12", sl2_date: "2026-01-22", sl3_date: "2026-01-24" },
  { ...jobs[1]!, recruiter_id: null, sl1_date: "2026-02-10" },
] };
const a2 = I.computeJobs(d2); const K = (id: string) => a2.find((x) => x.id === id)!;
assert.equal(K("j1").recruiter, "Sem recrutador"); assert.equal(K("j2").recruiter, "Sem recrutador");
assert.equal(K("j1").daysToClose, 20); // 05/01 → 25/01 informados
assert.deepEqual(K("j1").sent.map((s) => s.at.slice(0, 10)), ["2026-01-12", "2026-01-22", "2026-01-24"]); // 2 do sistema com data trocada + SL3 informada
assert.equal(K("j1").sent.length, 3);
assert.equal(K("j2").sent.length, 1); // 1 do sistema, só com a data trocada (não duplica)
assert.equal(K("j2").sent[0]!.at.slice(0, 10), "2026-02-10");
console.log("INDICADORES: TODOS OS TESTES OK");
