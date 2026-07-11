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

// ============ Generate candidate profile for a job ============
const CandidateProfileSchema = z.object({
  headline: z.string(),
  mini_bio: z.string(),
  full_bio: z.string(),
  trajectory: z.array(z.object({ company: z.string(), role: z.string(), period: z.string(), highlights: z.array(z.string()) })),
  main_results: z.array(z.string()),
  achievements: z.array(z.string()),
  main_case: z.string(),
  hard_skills: z.array(z.object({ name: z.string(), level: z.number() })),
  soft_skills: z.array(z.object({ name: z.string(), level: z.number() })),
  disc_interpretation: z.string(),
  strengths: z.array(z.string()),
  attention_points: z.array(z.string()),
  interview_questions: z.array(z.string()),
  inconsistencies: z.array(z.string()),
  overall_match: z.number(),
  checklist: z.array(z.object({ requirement: z.string(), status: z.string() })),
  radar: z.array(z.object({ competency: z.string(), value: z.number() })),
});

export const generateCandidateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      candidate_id: z.string().uuid(),
      job_id: z.string().uuid().optional(),
      instruction: z.string().optional(),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const [{ data: cand, error: e1 }, jobRes] = await Promise.all([
      context.supabase.from("candidates").select("*").eq("id", data.candidate_id).single(),
      data.job_id
        ? context.supabase.from("jobs").select("*").eq("id", data.job_id).single()
        : Promise.resolve({ data: null, error: null } as any),
    ]);
    if (e1) throw new Error(e1.message);
    const job = jobRes.data;

    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);

    const prompt = `Você é um analista sênior de talentos. Crie o perfil executivo de um candidato para apresentação a um gestor cliente.

CANDIDATO:
Nome: ${cand.full_name}
Cargo atual: ${cand.current_position ?? "—"}
Cidade: ${cand.city ?? "—"}
Modelo: ${cand.work_model ?? "—"}
Pretensão: ${cand.salary_expectation ?? "—"}
DISC (bruto): ${cand.disc_raw ?? "—"} — Perfil: ${cand.disc_profile ?? "—"}
Parecer do recrutador: ${cand.recruiter_note ?? "—"}
Transcrição/resumo entrevista: ${cand.transcript ?? "—"}
Currículo (URL): ${cand.resume_url ?? "—"}

${job ? `VAGA-ALVO:
Título: ${job.title}
Must-have: ${(job.must_have ?? []).join(", ")}
Nice-to-have: ${(job.nice_to_have ?? []).join(", ")}
Estrutura: ${JSON.stringify(job.ai_structure ?? {})}` : ""}

${data.instruction ? `Instrução adicional: ${data.instruction}` : ""}

Retorne JSON completo do perfil. Aderência (overall_match) de 0 a 100. Checklist status: "yes" | "partial" | "no". Radar: 6 a 8 competências com valor 0-100. Nível das skills 0-100.`;

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: CandidateProfileSchema }),
        prompt,
      });
      if (data.job_id) {
        await context.supabase.from("candidate_job_evaluations").upsert({
          candidate_id: data.candidate_id,
          job_id: data.job_id,
          overall_match: output.overall_match,
          ai_generated: output,
          strengths: output.strengths,
          risks: output.attention_points,
          interview_questions: output.interview_questions,
          inconsistencies: output.inconsistencies,
          checklist: output.checklist,
          radar: output.radar,
        }, { onConflict: "candidate_id,job_id" });
      }
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
