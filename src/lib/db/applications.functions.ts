import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { z } from "zod";
import {
  ApplicationFormSchema, RATE_LIMIT_PER_HOUR, POLICY_VERSION, buildConsentRows, decodeBase64,
  normalizeLinkedin, normalizePhone, sha256Text, APPLY_MAX_FILE_BYTES,
} from "@/lib/application-intake";
import { buildResumeStoragePath, safeDisplayFilename, sha256Hex, validateResumeUpload } from "@/lib/security/upload-validation";
import { logAccess } from "@/lib/security/audit.server";

const MIGRATION_HINT = "Recebimento de candidaturas ainda não ativado no banco de dados (migração pendente).";
const isMissing = (m?: string) => /schema cache|does not exist|Could not find/i.test(m ?? "");
const BUCKET = "ats-resumes";

const REJECT_MSG: Record<string, string> = {
  empty_file: "O arquivo está vazio.",
  file_too_large: "O arquivo é grande demais (máximo 5 MB).",
  extension_not_allowed: "Envie o currículo em PDF ou DOCX.",
  content_does_not_match_extension: "O arquivo não parece ser um PDF ou DOCX válido.",
};

function clientIp(): string {
  try {
    const h = getRequest().headers;
    return (h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
  } catch { return "unknown"; }
}

let bucketReady = false;
/** Garante o bucket privado (criado pelo backend; sem políticas públicas). */
async function ensureBucket(sb: any) {
  if (bucketReady) return;
  const { data } = await sb.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await sb.storage.createBucket(BUCKET, {
      public: false, fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });
    if (error && !/already exists|duplicate/i.test(error.message)) throw new Error("Falha ao preparar o armazenamento.");
  }
  bucketReady = true;
}

/** Finalidades de tratamento exigidas pelos consentimentos (idempotente). */
async function ensurePurposes(sb: any) {
  await sb.from("data_processing_purposes").upsert([
    { code: "selection_process", name: "Processo seletivo", description: "Avaliar o candidato para a vaga à qual se candidatou.", requires_consent: false },
    { code: "talent_pool", name: "Banco de talentos", description: "Manter dados após o fim do processo para futuras oportunidades.", requires_consent: true },
    { code: "client_sharing", name: "Compartilhamento com a empresa contratante", description: "Enviar perfil/análise do candidato à empresa cliente via shortlist.", requires_consent: true },
    { code: "ai_analysis", name: "Análise assistida por IA", description: "Enviar dados do candidato a provedores de IA para estruturar perfil e análise.", requires_consent: true },
    { code: "international_transfer", name: "Transferência internacional", description: "Tratamento por prestadores localizados fora do Brasil.", requires_consent: true },
  ], { onConflict: "code", ignoreDuplicates: true });
}

/**
 * Candidatura pública. Sem login: valida tudo no servidor, grava o currículo em bucket privado
 * e registra os consentimentos. Nunca devolve dados internos.
 */
export const submitPublicApplication = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => ApplicationFormSchema.parse(v))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const }; // honeypot: finge sucesso
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    // 1) limite de envios por IP (guarda só o hash)
    const ipHash = await sha256Text("ip:" + clientIp());
    const since = new Date(Date.now() - 3600_000).toISOString();
    const rl = await sb.from("public_submission_log").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
    if (rl.error) throw new Error(isMissing(rl.error.message) ? MIGRATION_HINT : "Não foi possível enviar agora. Tente novamente.");
    if ((rl.count ?? 0) >= RATE_LIMIT_PER_HOUR) throw new Error("Muitas tentativas. Tente novamente mais tarde.");

    // 2) a vaga precisa estar publicada
    const { data: posting } = await sb.from("job_postings").select("job_id, slug").eq("slug", data.slug).eq("is_published", true).maybeSingle();
    if (!posting) throw new Error("Esta vaga não está mais disponível.");
    const jobId = posting.job_id as string;
    await sb.from("public_submission_log").insert({ ip_hash: ipHash, job_id: jobId });

    // 3) valida o arquivo antes de gravar
    let bytes: Uint8Array;
    try { bytes = decodeBase64(data.file.base64); } catch { throw new Error("Arquivo inválido."); }
    if (bytes.length > APPLY_MAX_FILE_BYTES) throw new Error(REJECT_MSG.file_too_large);
    const check = validateResumeUpload({ filename: data.file.name, declaredMime: data.file.mime, bytes });
    if (!check.ok || !check.kind || !check.mime) {
      const known = check.flags.find((f) => REJECT_MSG[f]);
      throw new Error(known ? REJECT_MSG[known] : "Não foi possível aceitar este arquivo. Envie um PDF ou DOCX simples, sem macros ou scripts.");
    }

    // 4) candidato: reutiliza o cadastro existente pelo e-mail SEM alterar seus dados
    let candidateId: string | null = null;
    let createdCandidate = false;
    const { data: existing } = await sb.from("candidates").select("id").ilike("email", data.email.replace(/[\\%_]/g, "\\$&")).limit(1).maybeSingle();
    try {
      if (existing?.id) candidateId = existing.id;
      else {
        const { data: cand, error } = await sb.from("candidates").insert({
          full_name: data.full_name, email: data.email,
          phone: normalizePhone(data.phone) || null, linkedin_url: normalizeLinkedin(data.linkedin_url) || null,
          city: data.city || null, internal_notes: "Origem: Página de Carreiras Moove Talent.",
        }).select("id").single();
        if (error) throw new Error(error.message);
        candidateId = cand.id; createdCandidate = true;
      }

      // 5) candidatura (duplicada = sucesso silencioso, sem revelar nada)
      const { data: app, error: appErr } = await sb.from("applications").insert({
        job_id: jobId, candidate_id: candidateId, source: "career_page", stage: "applied", status: "active",
      }).select("id, brand").single();
      if (appErr) {
        if (/duplicate|unique/i.test(appErr.message)) return { ok: true as const };
        throw new Error(isMissing(appErr.message) ? MIGRATION_HINT : appErr.message);
      }

      // 6) currículo em bucket privado (caminho gerado pelo sistema)
      await ensureBucket(sb);
      const path = buildResumeStoragePath(app.brand, candidateId!, check.kind);
      const up = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: check.mime, upsert: false });
      if (up.error) throw new Error("Falha ao guardar o currículo.");
      const { error: rErr } = await sb.from("candidate_resumes").insert({
        candidate_id: candidateId, application_id: app.id, brand: app.brand, storage_path: path,
        original_filename: safeDisplayFilename(data.file.name), mime_type: check.mime, size_bytes: bytes.length,
        sha256: await sha256Hex(bytes), scan_status: "pending", scan_flags: check.flags,
      });
      if (rErr) { await sb.storage.from(BUCKET).remove([path]); throw new Error(rErr.message); }

      // 7) consentimentos (prova imutável)
      await ensurePurposes(sb);
      const emailHash = await sha256Text(data.email);
      const consents = buildConsentRows(data).map((c) => ({
        candidate_id: candidateId, subject_email_hash: emailHash, purpose_code: c.purpose_code, granted: true,
        policy_version: POLICY_VERSION, channel: "form", evidence: { text: c.text, job_id: jobId, page: `/vagas/${data.slug}` },
      }));
      const { error: cErr } = await sb.from("consent_records").insert(consents);
      if (cErr) throw new Error(cErr.message);

      await logAccess(sb, { actorKind: "system", action: "create", entityType: "application", entityId: app.id, candidateId, brand: app.brand, metadata: { source: "career_page", flags: check.flags } });
      return { ok: true as const };
    } catch (e: any) {
      if (createdCandidate && candidateId) await sb.from("candidates").delete().eq("id", candidateId); // desfaz (cascade)
      throw new Error(isMissing(e?.message) ? MIGRATION_HINT : e?.message || "Não foi possível enviar a candidatura.");
    }
  });

/** Candidaturas de uma vaga (recrutadoras). */
export const listJobApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ job_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: apps, error } = await sb.from("applications")
      .select("id, candidate_id, stage, status, rejection_reason, source, applied_at, candidates(full_name, email, phone, linkedin_url, city), candidate_resumes(id, original_filename, size_bytes, scan_flags, deleted_at)")
      .eq("job_id", data.job_id).order("applied_at", { ascending: false });
    if (error) return { missing: isMissing(error.message), items: [] as any[] };
    const ids = [...new Set((apps ?? []).map((a: any) => a.candidate_id))] as string[];
    const consents: Record<string, string[]> = {};
    if (ids.length) {
      const { data: cr } = await sb.from("consent_records").select("candidate_id, purpose_code, granted, revoked_at").in("candidate_id", ids);
      for (const c of cr ?? []) if (c.granted && !c.revoked_at) (consents[c.candidate_id] ??= []).push(c.purpose_code);
    }
    const items = (apps ?? []).map((a: any) => ({
      id: a.id, candidate_id: a.candidate_id, stage: a.stage, status: a.status, rejection_reason: a.rejection_reason ?? null, source: a.source, applied_at: a.applied_at,
      candidate: a.candidates, consents: consents[a.candidate_id] ?? [],
      resumes: (a.candidate_resumes ?? []).filter((r: any) => !r.deleted_at).map((r: any) => ({ id: r.id, name: r.original_filename, size: r.size_bytes, flags: r.scan_flags ?? [] })),
    }));
    return { missing: false, items };
  });

/** Link temporário (60 s) para baixar o currículo. Cada download é auditado. */
export const getResumeDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ resume_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: r } = await sb.from("candidate_resumes").select("id, storage_path, candidate_id, brand, original_filename, deleted_at").eq("id", data.resume_id).maybeSingle();
    if (!r || r.deleted_at) throw new Error("Currículo não encontrado.");
    const { data: signed, error } = await sb.storage.from(BUCKET).createSignedUrl(r.storage_path, 60, { download: r.original_filename || true });
    if (error || !signed?.signedUrl) throw new Error("Não foi possível gerar o link.");
    await logAccess(sb, { actorUserId: context.userId, action: "download_resume", entityType: "candidate_resume", entityId: r.id, candidateId: r.candidate_id, brand: r.brand });
    return { url: signed.signedUrl as string };
  });

const STAGES = ["applied", "screening", "interview", "tests", "shortlisted", "client_interview", "offer", "hired"] as const;

/** Move a candidatura no funil / reprova / retoma. O histórico é gravado por gatilho no banco. */
export const updateApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      application_id: z.string().uuid(),
      stage: z.enum(STAGES).optional(),
      status: z.enum(["active", "rejected", "withdrawn"]).optional(),
      rejection_reason: z.string().trim().max(500).nullable().optional(),
    }).refine((d) => d.stage || d.status, "Nada para atualizar.").parse(v),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const patch: Record<string, unknown> = { last_changed_by: context.userId };
    if (data.stage) { patch.stage = data.stage; patch.status = data.stage === "hired" ? "hired" : "active"; patch.rejection_reason = null; }
    if (data.status) {
      patch.status = data.status;
      patch.rejection_reason = data.status === "rejected" ? data.rejection_reason?.trim() || null : null;
    }
    const { data: row, error } = await sb.from("applications").update(patch).eq("id", data.application_id).select("id, candidate_id, brand").maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Candidatura não encontrada.");
    await logAccess(sb, { actorUserId: context.userId, action: "update", entityType: "application", entityId: row.id, candidateId: row.candidate_id, brand: row.brand, metadata: { stage: data.stage ?? null, status: data.status ?? null } });
    return { ok: true };
  });
