#!/usr/bin/env node
/**
 * Backup independente do ShortList (banco + arquivos + usuários), CRIPTOGRAFADO.
 *
 *   node scripts/backup/backup.mjs backup  [pasta-de-saida]
 *   node scripts/backup/backup.mjs verify  <pasta-do-backup>
 *   node scripts/backup/backup.mjs decrypt <pasta-do-backup> <arquivo-relativo> [saida]
 *
 * Variáveis de ambiente (NUNCA em argumento de linha de comando, NUNCA no GitHub):
 *   SUPABASE_URL                 ex.: https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    chave de serviço (acesso total) — só no seu computador
 *   BACKUP_PASSPHRASE            frase-senha (mín. 16 caracteres) que protege o backup
 *
 * Só usa recursos nativos do Node 18+ (sem instalar pacotes). Acessa o banco pela API REST,
 * portanto NÃO exige conexão direta ao Postgres.
 *
 * O que NÃO sai por esta API (limites do Supabase): hashes de senha dos usuários e a
 * estrutura completa do banco (funções, políticas). Para isso use também `pg_dump --schema-only`
 * (ver docs/ats/PLANO-INDEPENDENCIA.md).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

const MAGIC = Buffer.from("SLBK1");
const PAGE = 1000;

function die(msg) { console.error("ERRO: " + msg); process.exit(1); }
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/* ---------- criptografia (AES-256-GCM, 1 IV aleatório por arquivo) ---------- */
function deriveKey(pass, salt) { return scryptSync(pass, salt, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }); }
export function encrypt(key, plain) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([MAGIC, iv, body, c.getAuthTag()]);
}
export function decrypt(key, blob) {
  if (blob.length < MAGIC.length + 28 || !blob.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("formato inválido");
  const iv = blob.subarray(MAGIC.length, MAGIC.length + 12);
  const tag = blob.subarray(blob.length - 16);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(blob.subarray(MAGIC.length + 12, blob.length - 16)), d.final()]);
}

/* ---------- caminhos seguros dentro da pasta do backup ---------- */
function safeJoin(base, rel) {
  const full = resolve(base, rel);
  if (full !== resolve(base) && !full.startsWith(resolve(base) + sep)) throw new Error("caminho fora da pasta: " + rel);
  return full;
}
// Nome opaco no disco: nomes de arquivos de currículos podem conter nomes de pessoas.
const encName = (rel) => sha256(Buffer.from(rel)).slice(0, 40) + ".enc";

/* ---------- acesso à API do Supabase ---------- */
function api(env) {
  const base = env.SUPABASE_URL.replace(/\/$/, "");
  const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const sk = env.SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_");
  if (sk) delete h.Authorization; // chaves novas (sb_secret_) não são JWT
  async function get(path, extra = {}, raw = false) {
    const r = await fetch(base + path, { headers: { ...h, ...extra } });
    if (!r.ok) throw new Error(`GET ${path.split("?")[0]} -> HTTP ${r.status}`);
    return raw ? Buffer.from(await r.arrayBuffer()) : r.json();
  }
  async function post(path, body) {
    const r = await fetch(base + path, { method: "POST", headers: { ...h, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`POST ${path} -> HTTP ${r.status}`);
    return r.json();
  }
  return { get, post };
}

async function listTables(a) {
  const spec = await a.get("/rest/v1/", { Accept: "application/openapi+json" });
  const tables = [];
  for (const [name, def] of Object.entries(spec.definitions ?? {})) {
    const props = def.properties ?? {};
    const pk = Object.entries(props).filter(([, p]) => /Primary Key/i.test(p.description ?? "")).map(([c]) => c);
    tables.push({ name, pk: pk.length ? pk : [Object.keys(props)[0]] });
  }
  return { spec, tables };
}

async function exportTable(a, t) {
  const rows = [];
  const order = t.pk.map((c) => `${c}.asc`).join(",");
  for (let off = 0; ; off += PAGE) {
    const part = await a.get(`/rest/v1/${encodeURIComponent(t.name)}?select=*&order=${order}&limit=${PAGE}&offset=${off}`);
    rows.push(...part);
    if (part.length < PAGE) break;
  }
  return rows;
}

async function listAuthUsers(a) {
  const out = [];
  for (let page = 1; ; page += 1) {
    const r = await a.get(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const users = r.users ?? [];
    out.push(...users.map((u) => ({
      id: u.id, email: u.email, phone: u.phone, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at, app_metadata: u.app_metadata, user_metadata: u.user_metadata,
    })));
    if (users.length < 200) break;
  }
  return out;
}

async function listObjects(a, bucket, prefix = "") {
  const files = [];
  for (let off = 0; ; off += 100) {
    const items = await a.post(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, { prefix, limit: 100, offset: off, sortBy: { column: "name", order: "asc" } });
    for (const it of items) {
      const p = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null || it.id === undefined) files.push(...(await listObjects(a, bucket, p))); // pasta
      else files.push(p);
    }
    if (items.length < 100) break;
  }
  return files;
}

/* ---------- comandos ---------- */
function readEnv(needKeyApi = true) {
  const e = process.env;
  const pass = e.BACKUP_PASSPHRASE ?? "";
  if (pass.length < 16) die("BACKUP_PASSPHRASE precisa ter pelo menos 16 caracteres.");
  if (needKeyApi) {
    if (!e.SUPABASE_URL || !/^https:\/\//.test(e.SUPABASE_URL)) die("SUPABASE_URL ausente ou inválida (use https://...).");
    if (!e.SUPABASE_SERVICE_ROLE_KEY) die("SUPABASE_SERVICE_ROLE_KEY ausente.");
    if (pass.includes(e.SUPABASE_SERVICE_ROLE_KEY)) die("A frase-senha não pode conter a chave de serviço.");
  }
  return { env: e, pass };
}

export async function runBackup(outParent, env, pass, log = console.log) {
  const a = api(env);
  const salt = randomBytes(16);
  const key = deriveKey(pass, salt);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  const dir = join(outParent, `shortlist-backup-${stamp}`);
  mkdirSync(join(dir, "data"), { recursive: true });
  const manifest = { version: 1, created_at: new Date().toISOString(), source: new URL(env.SUPABASE_URL).host, tables: {}, auth_users: 0, buckets: {}, files: [], errors: [] };
  const put = (rel, buf) => { const f = safeJoin(dir, join("data", encName(rel))); writeFileSync(f, encrypt(key, buf)); return sha256(buf); };

  const { spec, tables } = await listTables(a);
  put("schema/openapi.json", Buffer.from(JSON.stringify(spec)));
  for (const t of tables) {
    try {
      const rows = await exportTable(a, t);
      const nd = Buffer.from(rows.map((r) => JSON.stringify(r)).join("\n"));
      manifest.tables[t.name] = { rows: rows.length, pk: t.pk, file: `tables/${t.name}.ndjson`, sha256: put(`tables/${t.name}.ndjson`, nd) };
      log(`tabela ${t.name}: ${rows.length} linhas`);
    } catch (e) { manifest.errors.push(`tabela ${t.name}: ${e.message}`); log(`FALHA tabela ${t.name}: ${e.message}`); }
  }
  try {
    const users = await listAuthUsers(a);
    manifest.auth_users = users.length;
    manifest.auth_file = { file: "auth/users.json", sha256: put("auth/users.json", Buffer.from(JSON.stringify(users))) };
    log(`usuários: ${users.length}`);
  } catch (e) { manifest.errors.push(`usuários: ${e.message}`); log(`FALHA usuários: ${e.message}`); }
  try {
    const buckets = await a.get("/storage/v1/bucket");
    for (const b of buckets) {
      let n = 0;
      try {
        for (const p of await listObjects(a, b.name)) {
          const buf = await a.get(`/storage/v1/object/${encodeURIComponent(b.name)}/${p.split("/").map(encodeURIComponent).join("/")}`, {}, true);
          const rel = `files/${b.name}/${p}`;
          manifest.files.push({ file: rel, bytes: buf.length, sha256: put(rel, buf) });
          n += 1;
        }
        manifest.buckets[b.name] = { public: !!b.public, files: n };
        log(`bucket ${b.name}: ${n} arquivos${b.public ? "  ⚠ BUCKET PÚBLICO" : ""}`);
      } catch (e) { manifest.errors.push(`bucket ${b.name}: ${e.message}`); log(`FALHA bucket ${b.name}: ${e.message}`); }
    }
  } catch (e) { manifest.errors.push(`storage: ${e.message}`); log(`FALHA storage: ${e.message}`); }

  writeFileSync(join(dir, "manifest.enc"), encrypt(key, Buffer.from(JSON.stringify(manifest, null, 1))));
  writeFileSync(join(dir, "HEADER.json"), JSON.stringify({ format: "shortlist-backup", version: 1, kdf: "scrypt", N: 1 << 15, r: 8, p: 1, salt: salt.toString("base64"), cipher: "aes-256-gcm" }, null, 1));
  log(`\nBackup salvo em: ${dir}\nErros: ${manifest.errors.length}${manifest.errors.length ? "\n - " + manifest.errors.join("\n - ") : ""}`);
  return { dir, manifest };
}

function openBackup(dir, pass) {
  const hdr = JSON.parse(readFileSync(join(dir, "HEADER.json"), "utf8"));
  const key = scryptSync(pass, Buffer.from(hdr.salt, "base64"), 32, { N: hdr.N, r: hdr.r, p: hdr.p, maxmem: 128 * 1024 * 1024 });
  let manifest;
  try { manifest = JSON.parse(decrypt(key, readFileSync(join(dir, "manifest.enc"))).toString("utf8")); }
  catch { throw new Error("frase-senha incorreta ou backup adulterado"); }
  return { key, manifest };
}

export function runVerify(dir, pass, log = console.log) {
  const { key, manifest } = openBackup(dir, pass);
  const bad = [];
  const check = (rel, hash) => {
    try { if (sha256(decrypt(key, readFileSync(safeJoin(dir, join("data", encName(rel)))))) !== hash) bad.push(rel + " (hash diferente)"); }
    catch { bad.push(rel + " (ausente/corrompido)"); }
  };
  for (const t of Object.values(manifest.tables)) check(t.file, t.sha256);
  if (manifest.auth_file) check(manifest.auth_file.file, manifest.auth_file.sha256);
  for (const f of manifest.files) check(f.file, f.sha256);
  const tableRows = Object.values(manifest.tables).reduce((s, t) => s + t.rows, 0);
  log(`Tabelas: ${Object.keys(manifest.tables).length} (${tableRows} linhas) · usuários: ${manifest.auth_users} · arquivos: ${manifest.files.length}`);
  if (manifest.errors.length) log("Erros registrados no backup:\n - " + manifest.errors.join("\n - "));
  if (bad.length) { log("PROBLEMAS:\n - " + bad.join("\n - ")); return { ok: false, bad, manifest }; }
  log("VERIFICAÇÃO OK: todos os arquivos conferem."); return { ok: manifest.errors.length === 0, bad, manifest };
}

export function runDecrypt(dir, pass, rel, out) {
  const { key } = openBackup(dir, pass);
  const buf = decrypt(key, readFileSync(safeJoin(dir, join("data", encName(rel)))));
  if (out) { mkdirSync(dirname(resolve(out)), { recursive: true }); writeFileSync(out, buf); } else process.stdout.write(buf);
}

/* ---------- CLI ---------- */
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("backup.mjs")) {
  const [cmd, a1, a2, a3] = process.argv.slice(2);
  if (cmd === "backup") { const { env, pass } = readEnv(true); const r = await runBackup(a1 ?? "./backups", env, pass); process.exit(r.manifest.errors.length ? 2 : 0); }
  else if (cmd === "verify" && a1) { const { pass } = readEnv(false); process.exit(runVerify(a1, pass).ok ? 0 : 2); }
  else if (cmd === "decrypt" && a1 && a2) { const { pass } = readEnv(false); runDecrypt(a1, pass, a2, a3); }
  else console.log("Uso:\n  backup  [pasta]\n  verify  <pasta-do-backup>\n  decrypt <pasta-do-backup> <arquivo-relativo> [saida]");
}
