// Teste do backup contra um servidor FALSO (nenhum dado real). Rode: node scripts/backup/backup.check.mjs
import http from "node:http";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBackup, runVerify, runDecrypt } from "./backup.mjs";

const KEY = "sb_secret_FAKE_KEY_FOR_TEST";
const cands = Array.from({ length: 2300 }, (_, i) => ({ id: `c${String(i).padStart(5, "0")}`, full_name: `Pessoa ${i}`, email: `p${i}@x.com` }));
const jobs = [{ id: "j1", title: "Vaga" }];
const pdf = Buffer.from("%PDF-1.7 conteudo do curriculo Joao");
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (req.headers.apikey !== KEY) { res.writeHead(401).end("{}"); return; }
  const json = (o, c = 200) => { res.writeHead(c, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
  if (u.pathname === "/rest/v1/") return json({ definitions: {
    candidates: { properties: { id: { description: "Note:\nThis is a Primary Key.<pk/>" }, full_name: {}, email: {} } },
    jobs: { properties: { id: { description: "Note:\nThis is a Primary Key.<pk/>" }, title: {} } } } });
  const t = u.pathname.match(/^\/rest\/v1\/(\w+)$/);
  if (t) { const src = t[1] === "candidates" ? cands : jobs; const off = +u.searchParams.get("offset"), lim = +u.searchParams.get("limit"); return json(src.slice(off, off + lim)); }
  if (u.pathname === "/auth/v1/admin/users") return json({ users: [{ id: "u1", email: "rec@x.com", app_metadata: {}, user_metadata: {} }] });
  if (u.pathname === "/storage/v1/bucket") return json([{ name: "candidate-files", public: false }, { name: "client-logos", public: true }]);
  if (u.pathname === "/storage/v1/object/list/candidate-files") {
    const body = JSON.parse(await new Promise((r) => { let b = ""; req.on("data", (d) => b += d); req.on("end", () => r(b)); }));
    if (body.prefix === "") return json([{ name: "moove", id: null }]);
    if (body.prefix === "moove") return json([{ name: "cv Joao ç.pdf", id: "o1" }]);
    return json([]);
  }
  if (u.pathname === "/storage/v1/object/list/client-logos") return json([]);
  if (u.pathname.startsWith("/storage/v1/object/candidate-files/")) { res.writeHead(200); return res.end(pdf); }
  res.writeHead(404).end("{}");
});
await new Promise((r) => server.listen(0, r));
const env = { SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, SUPABASE_SERVICE_ROLE_KEY: KEY };
const out = mkdtempSync(join(tmpdir(), "bk-"));
const PASS = "frase-de-teste-bem-longa-123";
const quiet = () => {};
const { dir, manifest } = await runBackup(out, env, PASS, quiet);
assert.equal(manifest.tables.candidates.rows, 2300, "paginação deve trazer todas as linhas");
assert.equal(manifest.tables.jobs.rows, 1);
assert.equal(manifest.auth_users, 1);
assert.equal(manifest.files.length, 1);
assert.equal(manifest.buckets["client-logos"].public, true);
assert.equal(manifest.errors.length, 0);
// nada em texto claro
const all = readdirSync(join(dir, "data")).concat(["HEADER.json"]);
for (const f of readdirSync(join(dir, "data"))) {
  const b = readFileSync(join(dir, "data", f)).toString("latin1");
  assert.ok(!b.includes("Pessoa 1") && !b.includes("%PDF") && !b.includes("p1@x.com") && !f.includes("Joao"), "arquivo em claro: " + f);
}
assert.ok(!readFileSync(join(dir, "manifest.enc")).toString("latin1").includes("candidates"));
assert.ok(!JSON.stringify(readFileSync(join(dir, "HEADER.json"), "utf8")).includes(PASS));
assert.equal(runVerify(dir, PASS, quiet).ok, true);
// frase errada
assert.throws(() => runVerify(dir, "outra-frase-errada-123456", quiet), /incorreta/);
// round-trip de um arquivo
const o = join(out, "cv.pdf"); runDecrypt(dir, PASS, "files/candidate-files/moove/cv Joao ç.pdf", o);
assert.deepEqual(readFileSync(o), pdf);
// adulteração detectada
const { createHash } = await import("node:crypto");
const victim = join(dir, "data", createHash("sha256").update(Buffer.from("tables/jobs.ndjson")).digest("hex").slice(0, 40) + ".enc");
const b = readFileSync(victim); b[b.length - 20] ^= 1; writeFileSync(victim, b);
const v = runVerify(dir, PASS, quiet); assert.equal(v.ok, false); assert.ok(v.bad.some((x) => x.includes("jobs")));
// chave errada na API => erro claro, sem vazar
await assert.rejects(() => runBackup(out, { ...env, SUPABASE_SERVICE_ROLE_KEY: "errada" }, PASS, quiet), /HTTP 401/);
// caminho malicioso no decrypt
assert.throws(() => runDecrypt(dir, PASS, "../../etc/passwd"), /fora da pasta|ENOENT/);
server.close(); rmSync(out, { recursive: true, force: true });
console.log("BACKUP: TODOS OS TESTES OK");
