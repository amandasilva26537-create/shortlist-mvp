import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { AI_MODEL, createLovableAiGateway, requireApiKey } from "./gateway.server";

// ============ Structure a job with AI ============
const JobStructureSchema = z.object({
  objective: z.string(),
  mission: z.string(),
  challenges: z.array(z.string()),
  responsibilities: z.array(z.string()),
  expected_results: z.array(z.string()),
  must_have: z.array(z.string()),
  nice_to_have: z.array(z.string()),
  hard_skills: z.array(z.string()),
  soft_skills: z.array(z.string()),
  evaluation_competencies: z.array(z.object({ name: z.string(), weight: z.number() })),
  company_context: z.string(),
  area_context: z.string(),
  ideal_profile: z.string(),
  points_to_validate: z.array(z.string()),
});

export const structureJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ job_id: z.string().uuid(), instruction: z.string().optional() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { data: job, error } = await context.supabase.from("jobs").select("*").eq("id", data.job_id).single();
    if (error) throw new Error(error.message);

    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);

    const prompt = `Você é um consultor sênior de recrutamento executivo. Analise o briefing abaixo e estruture a vaga.

Vaga: ${job.title}
Área: ${job.area ?? "—"}
Senioridade: ${job.seniority ?? "—"}
Modelo: ${job.work_model ?? "—"}
Localização: ${job.location ?? "—"}
Faixa salarial: ${job.salary_min ?? "?"} - ${job.salary_max ?? "?"}
Descrição: ${job.description ?? "—"}
Notas do recrutador: ${job.recruiter_notes ?? "—"}
Transcrição de alinhamento: ${job.meeting_transcript ?? "—"}

${data.instruction ? `Instrução adicional: ${data.instruction}` : ""}

Retorne JSON com: objective, mission, challenges[], responsibilities[], expected_results[], must_have[], nice_to_have[], hard_skills[], soft_skills[], evaluation_competencies[{name,weight}] (5 a 8 competências, weight 1-10), company_context, area_context, ideal_profile, points_to_validate[].`;

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: JobStructureSchema }),
        prompt,
      });
      const update = {
        ai_structure: output,
        must_have: output.must_have,
        nice_to_have: output.nice_to_have,
        hard_skills: output.hard_skills,
        soft_skills: output.soft_skills,
        radar_competencies: output.evaluation_competencies,
      };
      await context.supabase.from("jobs").update(update).eq("id", data.job_id);
      return output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        throw new Error("A IA não conseguiu estruturar a vaga. Tente novamente com mais contexto.");
      }
      throw err;
    }
  });

// ============ Generate candidate profile (independent of a job) ============
const CandidateProfileSchema = z.object({
  headline: z.string(),
  mini_bio: z.string(),
  full_bio: z.string(),
  executive_summary: z.array(z.string()),
  specialties: z.array(z.string()),
  main_results: z.array(z.string()),
  achievements: z.array(z.string()),
  main_case: z.object({
    context: z.string(),
    challenge: z.string(),
    action: z.string(),
    result: z.string(),
  }),
  strengths: z.array(z.object({ title: z.string(), evidence: z.string() })),
  work_style: z.string(),
  professional_moment: z.object({
    reason_for_move: z.string(),
    looking_for: z.string(),
    availability: z.string(),
    expectations: z.string(),
  }),
  motivators: z.array(z.string()),
  trajectory: z.array(z.object({
    company: z.string(),
    segment: z.string(),
    role: z.string(),
    start: z.string(),
    end: z.string(),
    duration: z.string(),
    location: z.string(),
    work_model: z.string(),
    scope: z.string(),
    responsibilities: z.array(z.string()),
    deliveries: z.array(z.string()),
    results: z.array(z.string()),
    team_size: z.string(),
    reason_for_leaving: z.string(),
  })),
  education: z.array(z.object({ course: z.string(), institution: z.string(), type: z.string(), area: z.string(), start: z.string(), end: z.string(), status: z.string() })),
  courses: z.array(z.object({ name: z.string(), institution: z.string(), year: z.string(), status: z.string(), workload: z.string() })),
  languages: z.array(z.object({ language: z.string(), level: z.string(), professional_use: z.string() })),
  competencies: z.object({
    hard_skills: z.array(z.string()),
    soft_skills: z.array(z.string()),
    leadership: z.array(z.string()),
    tools: z.array(z.string()),
    technical: z.array(z.string()),
  }),
  disc: z.object({
    dominant: z.string(),
    secondary: z.string(),
    D: z.number(),
    I: z.number(),
    S: z.number(),
    C: z.number(),
    behavior_summary: z.string(),
    communication_style: z.string(),
    strengths: z.array(z.string()),
    attention_points: z.array(z.string()),
    ideal_environment: z.string(),
  }).nullable(),
  inconsistencies: z.array(z.string()),
});

export const generateCandidateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      candidate_id: z.string().uuid(),
      instruction: z.string().optional(),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { data: cand, error: e1 } = await context.supabase
      .from("candidates").select("*").eq("id", data.candidate_id).single();
    if (e1) throw new Error(e1.message);

    const { data: docs } = await context.supabase
      .from("candidate_documents").select("kind,label,url").eq("candidate_id", data.candidate_id);

    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);

    const prompt = `Você é um analista sênior de talentos. Estruture o perfil executivo do candidato abaixo em JSON.

REGRAS ABSOLUTAS DE CONFIABILIDADE:
- Use SOMENTE informações presentes no material fornecido.
- NUNCA invente cargos, empresas, datas, resultados, números, formação, cursos, idiomas, competências, motivos de saída, tamanho de equipe ou ferramentas.
- Se uma informação não estiver disponível, deixe o campo como string vazia "" ou array vazio [].
- Se dois materiais divergirem, liste em "inconsistencies".

CANDIDATO (dados manuais):
Nome: ${cand.full_name}
Cargo atual: ${cand.current_position ?? ""}
Empresa atual: ${cand.current_company ?? ""}
Área: ${cand.area ?? ""}
Senioridade: ${cand.seniority ?? ""}
Cidade/UF/País: ${cand.city ?? ""} / ${cand.state ?? ""} / ${cand.country ?? ""}
Modelo: ${cand.work_model ?? ""}
Pretensão: ${cand.salary_expectation ?? ""}
LinkedIn: ${cand.linkedin_url ?? ""}
DISC: ${cand.disc_profile ?? ""} | Bruto: ${cand.disc_raw ?? ""}

Parecer do recrutador:
${cand.recruiter_note ?? ""}

Resumo/transcrição da entrevista:
${cand.transcript ?? ""}

Informações adicionais/observações internas:
${cand.internal_notes ?? ""}

Documentos anexados: ${(docs ?? []).map((d: any) => `${d.kind}: ${d.label ?? d.url}`).join(" | ") || "nenhum"}

${data.instruction ? `Instrução adicional do recrutador: ${data.instruction}` : ""}

Gere: headline curta e estratégica; mini_bio (<=240 caracteres); full_bio objetiva em blocos curtos; executive_summary (até 5 bullets); specialties (tags); main_results; achievements; main_case (contexto/desafio/ação/resultado); strengths (3 a 5, cada um com evidência curta); work_style (síntese com base na entrevista e no parecer, sem diagnóstico psicológico); professional_moment; motivators; trajectory (ordem cronológica inversa); education; courses; languages; competencies separadas; disc (se houver material) ou null; inconsistencies.`;

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: CandidateProfileSchema }),
        prompt,
      });
      await context.supabase.from("candidates").update({
        headline: output.headline,
        mini_bio: output.mini_bio,
        full_bio: output.full_bio,
        executive_summary: output.executive_summary,
        specialties: output.specialties,
        main_results: output.main_results,
        achievements: output.achievements,
        main_case: output.main_case,
        strengths: output.strengths,
        work_style: output.work_style,
        professional_moment: output.professional_moment,
        motivators: output.motivators,
        trajectory: output.trajectory,
        education: output.education,
        courses: output.courses,
        languages: output.languages,
        competencies: output.competencies,
        inconsistencies: output.inconsistencies,
        ai_profile: output,
        status: "aguardando_revisao",
        disc_scores: output.disc ?? cand.disc_scores,
        disc_profile: output.disc?.dominant ? `${output.disc.dominant}${output.disc.secondary ? "/" + output.disc.secondary : ""}` : cand.disc_profile,
      }).eq("id", data.candidate_id);
      return output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        throw new Error("A IA não conseguiu gerar o perfil. Envie mais contexto (currículo, parecer, entrevista).");
      }
      throw err;
    }
  });

// ============ Analyze shortlist ============
export const analyzeShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ shortlist_id: z.string().uuid(), prompt: z.string().optional() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { data: sl } = await context.supabase
      .from("shortlists")
      .select("*, jobs(*)")
      .eq("id", data.shortlist_id)
      .single();
    if (!sl) throw new Error("Shortlist não encontrada");
    const { data: links } = await context.supabase
      .from("shortlist_candidates")
      .select("*, candidates(*)")
      .eq("shortlist_id", data.shortlist_id);
    const cids = (links ?? []).map((l: any) => l.candidate_id);
    const { data: evals } = await context.supabase
      .from("candidate_job_evaluations")
      .select("*")
      .in("candidate_id", cids)
      .eq("job_id", sl.job_id);

    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);
    const brief = (links ?? []).map((l: any) => {
      const ev = (evals ?? []).find((e: any) => e.candidate_id === l.candidate_id);
      return `- ${l.candidates.full_name} (${l.candidates.current_position ?? "?"}): aderência ${ev?.overall_match ?? "?"}%. Forças: ${(ev?.strengths ?? []).join(", ")}. Riscos: ${(ev?.risks ?? []).join(", ")}.`;
    }).join("\n");

    const { text } = await generateText({
      model,
      prompt: `Você é um consultor sênior. Analise a shortlist para a vaga "${sl.jobs.title}" e apoie a decisão do gestor, sem tomá-la.

Candidatos:
${brief}

${data.prompt ? `Instrução: ${data.prompt}` : "Gere: (1) resumo comparativo executivo, (2) principais diferenciais de cada candidato, (3) sugestão de ordem de apresentação, (4) perguntas para desempate."}

Responda em português, formatado em Markdown.`,
    });
    return { text };
  });

// ============ Refine a section ============
export const refineText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      current_text: z.string(),
      instruction: z.string().min(3),
      context: z.string().optional(),
    }).parse(v),
  )
  .handler(async ({ data }) => {
    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);
    const { text } = await generateText({
      model,
      prompt: `Você é um editor executivo. Reescreva o texto abaixo aplicando a instrução, mantendo veracidade e tom profissional.

Contexto: ${data.context ?? "—"}

Texto atual:
"""
${data.current_text}
"""

Instrução: ${data.instruction}

Retorne APENAS o texto reescrito, sem comentários.`,
    });
    return { text };
  });
