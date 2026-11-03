// node --experimental-strip-types --no-warnings scripts/evaluation-scope.check.mts
import assert from "node:assert/strict";
import { latestPerCandidate, evaluationForJob } from "../src/lib/evaluation-scope.ts";
const rows = [
  { candidate_id: "c1", job_id: "A", updated_at: "2026-01-01", s: "A-velha" },
  { candidate_id: "c1", job_id: "A", updated_at: "2026-02-01", s: "A-nova" },
  { candidate_id: "c1", job_id: "B", updated_at: "2026-03-01", s: "B" },
  { candidate_id: "c2", job_id: "B", updated_at: "2026-03-01", s: "c2-B" },
];
// cada vaga enxerga só a própria avaliação; duplicadas → a mais recente; avaliação de outra vaga nunca vaza
assert.deepEqual(latestPerCandidate(rows, "A").map((r) => r.s), ["A-nova"]);
assert.deepEqual(latestPerCandidate(rows, "B").map((r) => r.s).sort(), ["B", "c2-B"]);
assert.deepEqual(latestPerCandidate(rows, "Z"), []);
assert.equal(evaluationForJob({ job_id: "A" }, "B"), null);
assert.equal(evaluationForJob({ job_id: "A" }, "A")?.job_id, "A");
assert.equal(evaluationForJob(null, "A"), null);
console.log("AVALIAÇÃO POR VAGA: TODOS OS TESTES OK");
