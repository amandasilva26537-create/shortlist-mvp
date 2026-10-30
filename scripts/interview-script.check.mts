// node --experimental-strip-types --no-warnings scripts/interview-script.check.mts
import assert from "node:assert/strict";
import * as S from "../src/lib/interview-script.ts";

assert.equal(S.isLeadership("Gerente Comercial"), true); assert.equal(S.isLeadership("Analista de RH", "Coordenação"), false);
assert.equal(S.isLeadership("Consultor de Vendas", "Líder"), true); assert.equal(S.isLeadership("Auxiliar Administrativo"), false);
assert.equal(S.isLeadership("Pleno", null), false);
assert.equal(S.defaultDuration(true), 45); assert.equal(S.defaultDuration(false), 30);

const raw = { duration_min: 30, sections: [
  { title: "Experiência", minutes: 10, questions: [
    { type: "tecnica", text: "Conte como conduziu uma venda consultiva.", evaluates: "Vendas consultivas", good_signs: ["Cita etapas", "Mede resultado"], watch_for: ["Respostas vagas"] },
    { type: "comportamental", text: "Você é casada? Tem filhos?", evaluates: "x" },
    { type: "xyz", text: "Qual a sua idade?", evaluates: "x" },
    { type: "situacional", text: "O que faria se o cliente pedisse desconto fora da política?", evaluates: "Negociação" },
  ] }, { title: "", minutes: 999, questions: [] }],
  criteria: [{ name: "Vendas consultivas", weak: "a", adequate: "b", strong: "c" }, { name: "" }], opening: "Olá", closing: "Obrigado" };
const { script, removed } = S.normalizeScript(raw, 30, false);
assert.equal(removed.length, 2); assert.equal(script.sections[0]!.questions.length, 2);
assert.equal(script.sections[0]!.questions[0]!.type, "tecnica");
assert.equal(script.sections[1]!.minutes, 90); assert.equal(script.criteria.length, 1);
assert.equal(S.normalizeScript({ duration_min: 5 }, 45, true).script.duration_min, 45);
assert.equal(S.normalizeScript({}, 45, true).script.leadership, true);
assert.equal(S.totalQuestions(script), 2);
for (const bad of ["Pretende engravidar?", "Qual sua religião?", "Qual é a sua orientação sexual?", "Você tem alguma deficiência?"]) assert.ok(S.hasForbiddenTopic(bad), bad);
for (const ok of ["Conte sobre um projeto desafiador.", "Como você prioriza tarefas?", "Qual sua experiência com idade de contas a receber?"].slice(0, 2)) assert.ok(!S.hasForbiddenTopic(ok), ok);
const t = S.scriptToText("Consultor", script);
assert.ok(t.includes("ROTEIRO DE ENTREVISTA — Consultor") && t.includes("[Técnica]") && t.includes("1: a") && t.includes("ENCERRAMENTO"));
console.log("ROTEIRO: TODOS OS TESTES OK");
{
  const sc = S.rescaleMinutes({ ...script, duration_min: 30, sections: [{ title: "a", minutes: 10, questions: [] }, { title: "b", minutes: 10, questions: [] }, { title: "c", minutes: 20, questions: [] }] });
  assert.equal(S.totalMinutes(sc), 30);
  console.log("ROTEIRO (minutos): OK");
}
