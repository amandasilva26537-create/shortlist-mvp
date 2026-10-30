import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { z } from "zod";
import { collectSources } from "@/lib/job-posting";
import { defaultDuration, isLeadership, normalizeScript, rescaleMinutes, type InterviewScript } from "@/lib/interview-script";

const MIGRATION_HINT = "Roteiros de entrevista ainda não ativados no banco de dados (migração pendente).";
const isMissing = (m?: string) => /schema cache|does not exist|Could not find/i.test(m ?? "");

async function loadJob(sb: any, jobId: string) {
  const { data: job, error } = await sb.from("jobs").select("*, clients(*)").eq("id", jobId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!job) throw new Error("Vaga não encontrada.");
  const src = collectSources(job, job.clients);
  return { src, leadership: isLeadership(src.title, src.seniority) };
}

async function audit(sb: any, userId: string, action: string, jobId: string) {
  try { await sb.from("activities").insert({ action, actor_id: userId, entity_type: "job_interview_script", entity_id: jobId, metadata: {} } as any); } catch { /* best-effort */ }
}

export const getInterviewScript = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ job_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { src, leadership } = await loadJob(sb, data.job_id);
    const { data: row, error } = await sb.from("job_interview_scripts").select("*").eq("job_id", data.job_id).eq("kind", "recruiter").maybeSingle();
    const base = { title: src.title, leadership, default_duration: defaultDuration(leadership) };
    if (error) return { ...base, missing: isMissing(error.message), script: null as InterviewScript | null, generated_by_ai: false, updated_at: null as string | null };
    const script = row ? normalizeScript(row.content, row.duration_min, leadership).script : null;
    return { ...base, missing: false, script, generated_by_ai: !!row?.generated_by_ai, updated_at: (row?.updated_at ?? null) as string | null };
  });

/** Gera o roteiro com IA usando SOMENTE os dados cadastrados da vaga (sem notas internas, transcrição ou dados do cliente). */
export const generateInterviewScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ job_id: z.string().uuid(), duration_min: z.number().int().min(10).max(180).optional() }).parse(v))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { src, leadership } = await loadJob(sb, data.job_id);
    const duration = data.duration_min ?? defaultDuration(leadership);
    const { generateText } = await import("ai");
    const { AI_MODEL, createLovableAiGateway, requireApiKey } = await import("@/lib/ai/gateway.server");
    const { wrapUntrusted, UNTRUSTED_CONTENT_POLICY } = await import("@/lib/security/untrusted-content");
    const model = createLovableAiGateway(requireApiKey())(AI_MODEL);
    const facts = {
      cargo: src.title, area: src.area, senioridade: src.seniority, modelo_de_trabalho: src.work_model, tipo_de_contratacao: src.contract_type,
      resumo: src.summary, missao: src.mission, responsabilidades: src.responsibilities, requisitos_obrigatorios: src.must_have,
      diferenciais: [...src.nice_to_have, ...src.differentials], competencias_tecnicas: src.hard_skills, ferramentas: src.tools, competencias_comportamentais: src.soft_skills,
      formacao: src.education, idiomas: src.languages, vaga_de_lideranca: leadership,
    };
    const wrapped = wrapUntrusted("DADOS_DA_VAGA", JSON.stringify(facts, null, 2), { maxChars: 12000 });
    const prompt = `${UNTRUSTED_CONTENT_POLICY}

Você é um consultor sênior de recrutamento. Crie um ROTEIRO DE ENTREVISTA PARA O RECRUTADOR em português do Brasil, com duração total de ${duration} minutos${leadership ? " (vaga de liderança: inclua uma seção de liderança e gestão de equipe)" : " (vaga operacional)"}.

REGRAS OBRIGATÓRIAS
- Use SOMENTE os dados de DADOS_DA_VAGA. Não invente requisitos, benefícios, salário, tecnologias, metas ou fatos sobre a empresa.
- Cubra: experiências e trajetória, requisitos obrigatórios, competências técnicas e ferramentas, competências comportamentais e situações reais do cargo (situacionais), além de motivação e expectativas.
- Misture perguntas dos tipos "tecnica", "comportamental" e "situacional". Prefira perguntas abertas que peçam exemplos reais (situação, ação, resultado).
- Cada pergunta deve indicar em "evaluates" qual requisito/competência da vaga ela avalia, "good_signs" (2-3 sinais objetivos de boa resposta) e "watch_for" (1-2 pontos para aprofundar).
- Em "criteria", crie critérios objetivos (um por requisito obrigatório e competência-chave) com descrição de resposta fraca (1), adequada (3) e forte (5).
- NUNCA faça perguntas sobre idade, estado civil, filhos, gravidez, religião, raça/cor, orientação sexual, deficiência, saúde, posição política ou nacionalidade.
- As seções devem somar ${duration} minutos (inclua abertura e encerramento curtos no texto, não como seções).

Retorne APENAS JSON válido:
{"duration_min":${duration},"leadership":${leadership},"opening":"texto de abertura (1-3 frases)","sections":[{"title":"","minutes":0,"questions":[{"type":"tecnica|comportamental|situacional","text":"","evaluates":"","good_signs":[""],"watch_for":[""]}]}],"criteria":[{"name":"","weak":"","adequate":"","strong":""}],"closing":"encerramento (1-2 frases)"}

${wrapped.block}`;
    let out: any;
    try {
      const { text } = await generateText({ model, prompt });
      const m = text.match(/\{[\s\S]*\}/);
      out = m ? JSON.parse(m[0]) : {};
    } catch (e: any) { throw new Error(e?.message || "Falha ao chamar a IA"); }
    const { script: n, removed } = normalizeScript({ ...out, duration_min: duration, leadership }, duration, leadership);
    if (!n.sections.some((s) => s.questions.length)) throw new Error("A IA não devolveu perguntas válidas. Tente gerar novamente.");
    const script = rescaleMinutes({ ...n, duration_min: duration, leadership });
    const now = new Date().toISOString();
    const { error } = await sb.from("job_interview_scripts").upsert({ job_id: data.job_id, kind: "recruiter", duration_min: duration, content: script, generated_by_ai: true, generated_at: now, updated_by: context.userId, updated_at: now }, { onConflict: "job_id,kind" });
    if (error) throw new Error(isMissing(error.message) ? MIGRATION_HINT : error.message);
    await audit(sb, context.userId, "interview_script.generate", data.job_id);
    return { script, removed_questions: removed.length };
  });

export const saveInterviewScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ job_id: z.string().uuid(), script: z.any() }).parse(v))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { leadership } = await loadJob(sb, data.job_id);
    const { script, removed } = normalizeScript(data.script, defaultDuration(leadership), leadership);
    if (removed.length) throw new Error("Há pergunta sobre tema não permitido (vida pessoal ou característica protegida). Remova: “" + removed[0]!.slice(0, 80) + "…”");
    const { error } = await sb.from("job_interview_scripts").upsert({ job_id: data.job_id, kind: "recruiter", duration_min: script.duration_min, content: script, updated_by: context.userId, updated_at: new Date().toISOString() }, { onConflict: "job_id,kind" });
    if (error) throw new Error(isMissing(error.message) ? MIGRATION_HINT : error.message);
    await audit(sb, context.userId, "interview_script.save", data.job_id);
    return { script };
  });

/** Quais vagas já têm roteiro (para a página Roteiros de Entrevista). */
export const listInterviewScripts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("job_interview_scripts").select("job_id, duration_min, generated_by_ai, updated_at").eq("kind", "recruiter");
    if (error) return { available: !isMissing(error.message) ? true : false, byJob: {} as Record<string, any> };
    const byJob: Record<string, any> = {};
    for (const r of data ?? []) byJob[r.job_id] = r;
    return { available: true, byJob };
  });
