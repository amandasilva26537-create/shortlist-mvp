import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { z } from "zod";
import {
  EMPTY_CONTENT, allowedTextFor, buildSnapshot, collectSources, contentToCheckText, defaultContent,
  findUnsupportedClaims, hashSources, isValidSlug, normalizeContent, slugify,
  type ApprovedSnapshot, type PostingContent,
} from "@/lib/job-posting";

const MIGRATION_HINT = "Recurso de divulgação de vagas ainda não ativado no banco de dados (migração pendente).";
const isMissing = (m?: string) => /schema cache|does not exist|Could not find/i.test(m ?? "");
const fail = (e: { message: string }) => { throw new Error(isMissing(e.message) ? MIGRATION_HINT : e.message); };

async function loadSources(supabase: any, jobId: string) {
  const { data: job, error } = await supabase.from("jobs").select("*, clients(*)").eq("id", jobId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!job) throw new Error("Vaga não encontrada.");
  return collectSources(job, job.clients);
}

async function loadPosting(supabase: any, jobId: string) {
  const { data, error } = await supabase.from("job_postings").select("*").eq("job_id", jobId).maybeSingle();
  if (error) { if (isMissing(error.message)) return { row: null, missing: true }; throw new Error(error.message); }
  return { row: data, missing: false };
}

async function audit(supabase: any, userId: string, action: string, jobId: string, metadata: Record<string, unknown> = {}) {
  try {
    await supabase.from("activities").insert({ action, actor_id: userId, entity_type: "job_posting", entity_id: jobId, metadata } as any);
  } catch { /* auditoria é best-effort */ }
}

const ContentSchema = z.any().transform((v) => normalizeContent(v));

/** Estado atual da divulgação (rascunho, aprovação, publicação) + alerta se o cadastro mudou. */
export const getPosting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ job_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const src = await loadSources(sb, data.job_id);
    const { row, missing } = await loadPosting(sb, data.job_id);
    const hash = hashSources(src);
    const draft: PostingContent = row && Object.keys(row.draft ?? {}).length ? normalizeContent(row.draft) : defaultContent(src);
    const snap = (row?.approved_snapshot ?? null) as ApprovedSnapshot | null;
    return {
      missing,
      exists: !!row,
      slug: (row?.slug as string | undefined) ?? null,
      draft,
      company_authorized: (row?.company_authorized as string | undefined) ?? "",
      approved: snap,
      approved_at: (row?.approved_at as string | null) ?? null,
      is_published: !!row?.is_published,
      published_at: (row?.published_at as string | null) ?? null,
      /** O cadastro da vaga mudou desde a aprovação — vale revisar o texto. */
      source_changed: !!snap && snap.source_hash !== hash,
      sources: { has_salary: src.salary_min != null || src.salary_max != null, company_name: src.company.name, brand: src.company.brand },
    };
  });

/**
 * Gera SOMENTE os dois textos corridos (resumo da oportunidade e apresentação da empresa).
 * A IA recebe apenas os dados permitidos; listas, remuneração e modelo de trabalho vêm do cadastro.
 */
export const generatePostingText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      job_id: z.string().uuid(),
      company_authorized: z.string().max(4000).default(""),
      benefits: z.array(z.string().max(300)).max(30).default([]),
      show_company_name: z.boolean().default(false),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const src = await loadSources(sb, data.job_id);
    const { generateText } = await import("ai");
    const { AI_MODEL, createLovableAiGateway, requireApiKey } = await import("@/lib/ai/gateway.server");
    const { wrapUntrusted, UNTRUSTED_CONTENT_POLICY } = await import("@/lib/security/untrusted-content");
    const model = createLovableAiGateway(requireApiKey())(AI_MODEL);

    const facts = {
      cargo: src.title, area: src.area, senioridade: src.seniority, local: src.location,
      modelo_de_trabalho: src.work_model, tipo_de_contratacao: src.contract_type,
      resumo: src.summary, missao: src.mission, responsabilidades: src.responsibilities,
      requisitos_obrigatorios: src.must_have, diferenciais: [...src.nice_to_have, ...src.differentials],
      competencias: [...src.hard_skills, ...src.tools, ...src.soft_skills],
      segmento_da_empresa: src.company.segment,
      nome_da_empresa: data.show_company_name ? src.company.name : "(NÃO divulgar o nome)",
    };
    const wrapped = wrapUntrusted("DADOS_DA_VAGA", JSON.stringify(facts, null, 2), { maxChars: 12000 });
    const authorized = wrapUntrusted("INFORMACOES_AUTORIZADAS_DA_EMPRESA", data.company_authorized || "(nenhuma informação autorizada)", { maxChars: 4000 });

    const prompt = `${UNTRUSTED_CONTENT_POLICY}

Você escreve textos de divulgação de vaga em português do Brasil, claros, objetivos e profissionais.
REGRAS OBRIGATÓRIAS:
- Use SOMENTE os fatos presentes em DADOS_DA_VAGA e INFORMACOES_AUTORIZADAS_DA_EMPRESA.
- NÃO invente benefícios, salários, números, anos de experiência, tamanho da empresa, prêmios, clientes ou requisitos.
- NÃO cite remuneração nem benefícios (eles são exibidos separadamente pelo sistema).
- Se não houver informação suficiente sobre a empresa, escreva uma apresentação curta e genérica usando só o segmento; não preencha lacunas.
- Não use o nome da empresa se estiver marcado como "NÃO divulgar".

Retorne APENAS um JSON válido: {"intro": "<2 a 4 frases sobre a oportunidade>", "company_intro": "<1 a 3 frases sobre a empresa e o modelo de negócio, apenas com informações autorizadas>"}

${wrapped.block}

${authorized.block}`;

    let out: any = {};
    try {
      const { text } = await generateText({ model, prompt });
      const m = text.match(/\{[\s\S]*\}/);
      out = m ? JSON.parse(m[0]) : {};
    } catch (e: any) {
      throw new Error(e?.message || "Falha ao chamar a IA");
    }
    const intro = String(out.intro ?? "").trim().slice(0, 3000);
    const company_intro = String(out.company_intro ?? "").trim().slice(0, 3000);
    const allowed = allowedTextFor(src, { benefits: data.benefits, show_salary: false, company_authorized: data.company_authorized });
    const warnings = findUnsupportedClaims([intro, company_intro].join("\n"), allowed);
    await audit(sb, context.userId, "job_posting.generate", data.job_id, { warnings: warnings.length, injection_signals: [...wrapped.signals, ...authorized.signals].length });
    return { intro, company_intro, warnings };
  });

/** Salva o rascunho (não altera a página pública). Cria a divulgação na primeira vez. */
export const savePostingDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ job_id: z.string().uuid(), content: ContentSchema, company_authorized: z.string().max(4000).default("") }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { row, missing } = await loadPosting(sb, data.job_id);
    if (missing) throw new Error(MIGRATION_HINT);
    const fields = { draft: data.content, company_authorized: data.company_authorized.trim(), updated_at: new Date().toISOString() };
    if (row) {
      const { error } = await sb.from("job_postings").update(fields).eq("job_id", data.job_id);
      if (error) fail(error);
      return { slug: row.slug as string };
    }
    let lastErr: any = null;
    for (let i = 0; i < 4; i += 1) {
      const rand = Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("") + "x";
      const slug = slugify(data.content.title || "vaga", rand);
      const { error } = await sb.from("job_postings").insert({ job_id: data.job_id, slug, created_by: context.userId, ...fields });
      if (!error) { await audit(sb, context.userId, "job_posting.create", data.job_id); return { slug }; }
      lastErr = error;
      if (!/duplicate|unique/i.test(error.message)) break;
    }
    return fail(lastErr);
  });

/** Aprova: valida contra os dados reais e congela a versão que a página pública vai exibir. */
export const approvePosting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ job_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { row, missing } = await loadPosting(sb, data.job_id);
    if (missing) throw new Error(MIGRATION_HINT);
    if (!row) throw new Error("Salve o rascunho antes de aprovar.");
    const src = await loadSources(sb, data.job_id);
    const content = normalizeContent(row.draft);
    if (!content.title) throw new Error("O título do cargo é obrigatório.");
    if (!content.intro) throw new Error("Escreva (ou gere) o texto de apresentação da vaga antes de aprovar.");
    const allowed = allowedTextFor(src, { benefits: content.benefits, show_salary: content.show_salary, company_authorized: row.company_authorized });
    const issues = findUnsupportedClaims(contentToCheckText(content), allowed);
    if (issues.length) throw new Error("Revise o texto antes de aprovar: " + issues.join(" "));
    const snapshot = buildSnapshot(src, content, hashSources(src));
    const now = new Date().toISOString();
    const { error } = await sb.from("job_postings").update({ approved_snapshot: snapshot, approved_at: now, approved_by: context.userId, updated_at: now }).eq("job_id", data.job_id);
    if (error) fail(error);
    await audit(sb, context.userId, "job_posting.approve", data.job_id);
    return { ok: true };
  });

/** Publicar / retirar da página de carreiras. Independe do status interno da vaga. */
export const setPostingPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ job_id: z.string().uuid(), published: z.boolean() }).parse(v))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { row, missing } = await loadPosting(sb, data.job_id);
    if (missing) throw new Error(MIGRATION_HINT);
    if (!row) throw new Error("Nenhuma divulgação criada para esta vaga.");
    if (data.published && !row.approved_snapshot) throw new Error("Aprove o texto antes de publicar.");
    const now = new Date().toISOString();
    const patch = data.published ? { is_published: true, published_at: now, updated_at: now } : { is_published: false, unpublished_at: now, updated_at: now };
    const { error } = await sb.from("job_postings").update(patch).eq("job_id", data.job_id);
    if (error) fail(error);
    await audit(sb, context.userId, data.published ? "job_posting.publish" : "job_posting.unpublish", data.job_id);
    return { ok: true };
  });

/** Página pública: só devolve a versão aprovada de divulgações publicadas. Nada interno. */
export const getPublicPosting = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) => z.object({ slug: z.string().max(80).refine(isValidSlug) }).parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await (supabaseAdmin as any)
      .from("job_postings").select("slug, approved_snapshot, published_at")
      .eq("slug", data.slug).eq("is_published", true).maybeSingle();
    if (!row?.approved_snapshot) return null;
    return { snapshot: row.approved_snapshot as ApprovedSnapshot, published_at: row.published_at as string };
  });

export { EMPTY_CONTENT };
