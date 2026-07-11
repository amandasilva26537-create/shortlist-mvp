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

function extractJson(text: string): any {
  // Strip markdown fences and try to parse the largest JSON object.
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
  const direct = tryParse(cleaned);
  if (direct) return direct;
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const slice = cleaned.slice(first, last + 1);
    const parsed = tryParse(slice);
    if (parsed) return parsed;
    // Best-effort: try to close a truncated object.
    const repaired = tryParse(slice + "}".repeat(5));
    if (repaired) return repaired;
  }
  throw new Error("A IA respondeu em formato inválido. Tente novamente ou envie mais contexto.");
}

function pathFromPublicUrl(url: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length));
}

async function fileToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  // Buffer is available in the worker/node runtime.
  return Buffer.from(buf).toString("base64");
}

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

    // Download attached documents so the model can actually read them.
    const fileParts: any[] = [];
    const attachedList: string[] = [];
    for (const d of docs ?? []) {
      const path = pathFromPublicUrl(d.url, "candidate-files");
      if (!path) continue;
      const { data: blob, error } = await context.supabase.storage.from("candidate-files").download(path);
      if (error || !blob) { attachedList.push(`${d.kind}: ${d.label} (erro ao baixar)`); continue; }
      const mime = blob.type || (path.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
      const b64 = await fileToBase64(blob);
      const isImage = mime.startsWith("image/");
      if (isImage) {
        fileParts.push({ type: "image", image: `data:${mime};base64,${b64}`, mediaType: mime });
      } else {
        fileParts.push({ type: "file", data: `data:${mime};base64,${b64}`, mediaType: mime, filename: d.label ?? "arquivo" });
      }
      attachedList.push(`${d.kind}: ${d.label}`);
    }

    // Also attach the candidate photo when it's a data URL.
    if (typeof cand.photo_url === "string" && cand.photo_url.startsWith("data:image/")) {
      const [, mimePart, b64] = cand.photo_url.match(/^data:([^;]+);base64,(.+)$/) || [];
      if (b64) fileParts.push({ type: "image", image: `data:${mimePart};base64,${b64}`, mediaType: mimePart });
    }

    const promptText = `Você é um analista sênior de talentos. Estruture o perfil executivo do candidato abaixo e responda APENAS com um objeto JSON válido (sem comentários, sem markdown, sem texto antes ou depois).

REGRAS ABSOLUTAS:
- Use SOMENTE informações presentes no material fornecido (dados manuais, textos colados, arquivos anexados como currículo, DISC, entrevista, parecer).
- NUNCA invente cargos, empresas, datas, números, formação, cursos, idiomas ou competências.
- Se um dado não estiver disponível, retorne string vazia "" ou array vazio [].
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

Arquivos anexados (leia o conteúdo): ${attachedList.join(" | ") || "nenhum"}

${data.instruction ? `Instrução adicional do recrutador: ${data.instruction}` : ""}

Retorne um objeto JSON com EXATAMENTE estas chaves:
{
  "headline": string,
  "mini_bio": string,
  "full_bio": string,
  "executive_summary": string[],
  "specialties": string[],
  "main_results": string[],
  "achievements": string[],
  "main_case": { "context": string, "challenge": string, "action": string, "result": string },
  "strengths": [{ "title": string, "evidence": string }],
  "work_style": string,
  "professional_moment": { "reason_for_move": string, "looking_for": string, "availability": string, "expectations": string },
  "motivators": string[],
  "trajectory": [{ "company": string, "segment": string, "role": string, "start": string, "end": string, "duration": string, "location": string, "work_model": string, "scope": string, "responsibilities": string[], "deliveries": string[], "results": string[], "team_size": string, "reason_for_leaving": string }],
  "education": [{ "course": string, "institution": string, "type": string, "area": string, "start": string, "end": string, "status": string }],
  "courses": [{ "name": string, "institution": string, "year": string, "status": string, "workload": string }],
  "languages": [{ "language": string, "level": string, "professional_use": string }],
  "competencies": { "hard_skills": string[], "soft_skills": string[], "leadership": string[], "tools": string[], "technical": string[] },
  "disc": null OR { "dominant": string, "secondary": string, "D": number, "I": number, "S": number, "C": number, "behavior_summary": string, "communication_style": string, "strengths": string[], "attention_points": string[], "ideal_environment": string },
  "inconsistencies": string[]
}`;

    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);

    let output: any;
    try {
      const { text } = await generateText({
        model,
        messages: [{ role: "user", content: [{ type: "text", text: promptText }, ...fileParts] as any }],
      });
      output = extractJson(text);
    } catch (err: any) {
      throw new Error(err?.message || "Falha ao chamar a IA");
    }

    const normArr = (v: any) => Array.isArray(v) ? v : [];
    const patch: any = {
      headline: output.headline ?? null,
      mini_bio: output.mini_bio ?? null,
      full_bio: output.full_bio ?? null,
      executive_summary: normArr(output.executive_summary),
      specialties: normArr(output.specialties),
      main_results: normArr(output.main_results),
      achievements: normArr(output.achievements),
      main_case: output.main_case ?? null,
      strengths: normArr(output.strengths),
      work_style: output.work_style ?? null,
      professional_moment: output.professional_moment ?? null,
      motivators: normArr(output.motivators),
      trajectory: normArr(output.trajectory),
      education: normArr(output.education),
      courses: normArr(output.courses),
      languages: normArr(output.languages),
      competencies: output.competencies ?? null,
      inconsistencies: normArr(output.inconsistencies),
      ai_profile: output,
      status: "aguardando_revisao",
      disc_scores: output.disc ?? cand.disc_scores,
      disc_profile: output.disc?.dominant ? `${output.disc.dominant}${output.disc.secondary ? "/" + output.disc.secondary : ""}` : cand.disc_profile,
    };
    const { error: upErr } = await context.supabase.from("candidates").update(patch).eq("id", data.candidate_id);
    if (upErr) throw new Error(upErr.message);
    return output;
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
