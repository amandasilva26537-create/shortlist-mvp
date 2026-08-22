import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { generateText } from "ai";
import { z } from "zod";
import { AI_MODEL, createLovableAiGateway, requireApiKey } from "./gateway.server";
import { SHORTLIST_WRITING_STYLE, genderInstruction } from "./writing-style";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const mammoth = await import("mammoth");
  const buf = Buffer.from(bytes);
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value || "";
}

function isTextualMime(mime: string): boolean {
  return mime.startsWith("text/") || mime === "application/json" || mime === "application/xml" || mime === "text/csv";
}

async function toModelPart(
  bytes: Uint8Array,
  mime: string,
  label: string,
): Promise<{ part?: any; text?: string; note: string }> {
  if (mime.startsWith("image/")) {
    return { part: { type: "image", image: bytes, mediaType: mime }, note: label };
  }
  if (mime === "application/pdf") {
    return { part: { type: "file", data: bytes, mediaType: mime, filename: label }, note: label };
  }
  if (mime === DOCX_MIME || label.toLowerCase().endsWith(".docx")) {
    try {
      const txt = await extractDocxText(bytes);
      return { text: `\n\n--- Conteúdo de ${label} (DOCX) ---\n${txt}`, note: label };
    } catch (e: any) {
      return { note: `${label} (falha ao extrair DOCX: ${e?.message ?? "erro"})` };
    }
  }
  if (isTextualMime(mime)) {
    try {
      const txt = new TextDecoder().decode(bytes);
      return { text: `\n\n--- Conteúdo de ${label} ---\n${txt}`, note: label };
    } catch {
      return { note: `${label} (texto ilegível)` };
    }
  }
  return { note: `${label} (formato ${mime} não suportado pela IA)` };
}

export const structureJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ job_id: z.string().uuid(), instruction: z.string().optional() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { data: job, error } = await context.supabase.from("jobs").select("*").eq("id", data.job_id).single();
    if (error) throw new Error(error.message);

    // Download attached documents.
    const fileParts: any[] = [];
    const attachedList: string[] = [];
    const extraTexts: string[] = [];
    const docs = Array.isArray((job as any).documents) ? (job as any).documents : [];
    for (const d of docs) {
      const path = pathFromPublicUrl(d.url, "job-briefings");
      if (!path) continue;
      const { data: blob, error: dErr } = await context.supabase.storage.from("job-briefings").download(path);
      if (dErr || !blob) { attachedList.push(`${d.label} (erro ao baixar)`); continue; }
      const label = d.label ?? "arquivo";
      const mime = blob.type || (path.endsWith(".pdf") ? "application/pdf" : path.endsWith(".docx") ? DOCX_MIME : "application/octet-stream");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const r = await toModelPart(bytes, mime, label);
      if (r.part) fileParts.push(r.part);
      if (r.text) extraTexts.push(r.text);
      attachedList.push(r.note);
    }

    const promptText = `Você é um consultor sênior de recrutamento executivo. Analise TODO o material fornecido (dados básicos + textos colados + arquivos anexados como PDFs de descrição, briefing, transcrição de reunião) e estruture a vaga.

Responda APENAS com um objeto JSON válido, sem markdown ou comentários. Use somente informações presentes no material — se algo não estiver disponível, use "" ou [].

DADOS BÁSICOS DA VAGA:
Cliente: ${job.client_id}
Título: ${job.title}
Área: ${job.area ?? ""}
Cidade/Localização: ${job.location ?? ""}
Modelo: ${job.work_model ?? ""}
Contratação: ${job.contract_type ?? ""}
Faixa salarial: ${job.salary_min ?? ""} - ${job.salary_max ?? ""}
Gestor: ${job.manager_name ?? ""}

TEXTO COLADO PELO RECRUTADOR:
${job.pasted_text ?? ""}

NOTAS DO RECRUTADOR:
${job.recruiter_notes ?? ""}

TRANSCRIÇÃO DO ALINHAMENTO:
${job.meeting_transcript ?? ""}

Arquivos anexados: ${attachedList.join(" | ") || "nenhum"}

${data.instruction ? `Instrução adicional do recrutador: ${data.instruction}` : ""}

Retorne um objeto JSON com EXATAMENTE estas chaves:
{
  "summary": string,
  "mission": string,
  "hiring_context": string,
  "responsibilities": string[],
  "expected_results": string[],
  "must_have": [{ "name": string, "description": string, "weight": number, "evidence": string }],
  "nice_to_have": [{ "name": string, "description": string, "weight": number }],
  "hard_skills": string[],
  "soft_skills": string[],
  "evaluation_competencies": [{ "name": string, "weight": number }],
  "tools": string[],
  "education": [{ "level": string, "area": string, "required": boolean }],
  "languages": [{ "language": string, "level": string, "required": boolean }],
  "differentials": string[],
  "ideal_profile": string,
  "less_fit_profile": string
}

Regras:
- weight de 1 a 10 (inteiros).
- evaluation_competencies: entre 5 e 10 itens (liderança, comunicação, estratégia, execução, etc.).
- must_have: apenas critérios REALMENTE obrigatórios/eliminatórios.
- nice_to_have: diferenciais que aumentam aderência mas não eliminam.`;

    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);

    let output: any;
    try {
      const { text } = await generateText({
        model,
        messages: [{ role: "user", content: [{ type: "text", text: promptText + (extraTexts.length ? "\n\nCONTEÚDO EXTRAÍDO DOS ARQUIVOS:\n" + extraTexts.join("\n") : "") }, ...fileParts] as any }],
      });
      output = extractJson(text);
    } catch (err: any) {
      throw new Error(err?.message || "Falha ao chamar a IA");
    }

    const normArr = (v: any) => (Array.isArray(v) ? v : []);
    const mustArr = normArr(output.must_have);
    const niceArr = normArr(output.nice_to_have);
    const update = {
      ai_structure: output,
      must_have: mustArr.map((c: any) => (typeof c === "string" ? c : c?.name)).filter(Boolean),
      nice_to_have: niceArr.map((c: any) => (typeof c === "string" ? c : c?.name)).filter(Boolean),
      hard_skills: normArr(output.hard_skills),
      soft_skills: normArr(output.soft_skills),
      radar_competencies: normArr(output.evaluation_competencies),
    };
    await context.supabase.from("jobs").update(update).eq("id", data.job_id);
    return output;
  });

// ============ Refine a single job section with AI ============
export const refineJobSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      section: z.string(),
      current_value: z.any(),
      instruction: z.string().min(3),
      job_context: z.string().optional(),
    }).parse(v),
  )
  .handler(async ({ data }) => {
    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);
    const isArray = Array.isArray(data.current_value);
    const shape = isArray
      ? `um array JSON no MESMO formato do valor atual`
      : `uma string de texto`;
    const { text } = await generateText({
      model,
      prompt: `Você é um consultor sênior de recrutamento. Ajuste APENAS a seção "${data.section}" de uma vaga.

Contexto da vaga: ${data.job_context ?? "—"}

Valor atual:
${JSON.stringify(data.current_value, null, 2)}

Instrução do recrutador: ${data.instruction}

Retorne APENAS ${shape}, sem markdown, sem comentários, sem texto ao redor.`,
    });
    if (isArray) return { value: extractJson(text) };
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim().replace(/^"|"$/g, "");
    return { value: cleaned };
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

async function fileToBytes(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
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
    const extraTexts: string[] = [];
    for (const d of docs ?? []) {
      const path = pathFromPublicUrl(d.url, "candidate-files");
      if (!path) continue;
      const { data: blob, error } = await context.supabase.storage.from("candidate-files").download(path);
      if (error || !blob) { attachedList.push(`${d.kind}: ${d.label} (erro ao baixar)`); continue; }
      const label = `${d.kind}: ${d.label}`;
      const mime = blob.type || (path.endsWith(".pdf") ? "application/pdf" : path.endsWith(".docx") ? DOCX_MIME : "application/octet-stream");
      const bytes = await fileToBytes(blob);
      const r = await toModelPart(bytes, mime, label);
      if (r.part) fileParts.push(r.part);
      if (r.text) extraTexts.push(r.text);
      attachedList.push(r.note);
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

CONCORDÂNCIA DE GÊNERO (obrigatório em todos os textos gerados):
- Gênero informado: ${(cand as any).gender || "Prefere não identificar"}.
- "Masculino": escreva no masculino ("o candidato", "ele", "preparado", "responsável por").
- "Feminino": escreva no feminino ("a candidata", "ela", "preparada", "responsável por").
- "Prefere não identificar" ou vazio: use linguagem neutra, sem marcar gênero (use o nome da pessoa ou "o/a profissional" evitando adjetivos com marca de gênero). Nunca use "ele(a)" nem barras.
- Aplique a concordância em headline, mini_bio, full_bio, executive_summary, strengths, work_style, professional_moment e demais textos.

CANDIDATO (dados manuais):
Nome: ${cand.full_name}
Gênero: ${(cand as any).gender ?? ""}
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
  "basic_info": { "full_name": string, "current_position": string, "current_company": string, "area": string, "city": string, "state": string, "country": string, "work_model": string, "salary_expectation": number|null, "linkedin_url": string, "email": string, "phone": string },
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
}

Regras para basic_info:
- Preencha somente com informações encontradas nos materiais. Não invente.
- Use "" (string vazia) ou null (para salary_expectation) quando não encontrar.
- work_model deve ser um de: "Remoto", "Híbrido", "Presencial", "Flexível" ou "" se não souber.

Regras de conteúdo:
- competencies: cada categoria (hard_skills, tools, soft_skills, leadership, technical) com no máximo 15 itens, apenas o NOME do item (sem nível, sem tempo de experiência, sem observações). Não invente itens que não estejam nos materiais.
- trajectory: ordene da experiência mais recente para a mais antiga. Inclua TODAS as experiências profissionais presentes no currículo, sem excluir nenhuma. Mantenha o MESMO formato detalhado para TODAS: traga scope (resumo do escopo) e até 6 bullets detalhados no total somando responsibilities + deliveries + results. Sempre que o material tiver informações suficientes, preencha os 6 bullets. Cada bullet deve ser uma frase completa e descritiva (não use palavras soltas), com até 50 palavras, descrevendo de forma completa as atividades realizadas na empresa: responsabilidades, processos conduzidos, projetos, áreas/clientes atendidos, resultados obtidos, e plataformas, sistemas e ferramentas utilizadas — mas SOMENTE quando essas informações estiverem disponíveis nos materiais. Nunca invente nada: se a informação não existir, apenas omita. Cada bullet DEVE terminar com ponto final (.).
- languages: level deve ser exatamente um de "Básico", "Intermediário", "Avançado" ou "Nativo". Nunca escreva "Sim", "Não" ou textos livres. Deixe professional_use como "" (não será exibido).
- courses: liste até 10 cursos/certificações que apareçam no currículo ou nos materiais, dos mais recentes para os mais antigos. Não invente cursos; se houver menos de 10, liste apenas os encontrados.`;


    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);

    let output: any;
    try {
      const { text } = await generateText({
        model,
        messages: [{ role: "user", content: [{ type: "text", text: promptText + (extraTexts.length ? "\n\nCONTEÚDO EXTRAÍDO DOS ARQUIVOS:\n" + extraTexts.join("\n") : "") }, ...fileParts] as any }],
      });
      output = extractJson(text);
    } catch (err: any) {
      throw new Error(err?.message || "Falha ao chamar a IA");
    }

    const normArr = (v: any) => Array.isArray(v) ? v : [];
    const emptyStr = (v: any) => v === null || v === undefined || String(v).trim() === "";
    const bi = output.basic_info ?? {};
    // Só preenche campos básicos quando o registro atual estiver vazio, para não sobrescrever entrada manual.
    const basicPatch: any = {};
    const maybeSet = (k: string, v: any) => { if (emptyStr((cand as any)[k]) && !emptyStr(v)) basicPatch[k] = typeof v === "string" ? v.trim() : v; };
    maybeSet("full_name", bi.full_name);
    maybeSet("current_position", bi.current_position);
    maybeSet("current_company", bi.current_company);
    maybeSet("area", bi.area);
    maybeSet("city", bi.city);
    maybeSet("state", bi.state);
    maybeSet("country", bi.country);
    maybeSet("work_model", bi.work_model);
    maybeSet("linkedin_url", bi.linkedin_url);
    maybeSet("email", bi.email);
    maybeSet("phone", bi.phone);
    if (emptyStr(cand.salary_expectation) && typeof bi.salary_expectation === "number" && !isNaN(bi.salary_expectation)) {
      basicPatch.salary_expectation = bi.salary_expectation;
    }

    const patch: any = {
      ...basicPatch,
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
      courses: normArr(output.courses).slice(0, 10),
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
      return `- ${l.candidates.full_name} (${l.candidates.current_position ?? "?"}) — ${genderInstruction(l.candidates.gender, l.candidates.full_name)} Aderência ${ev?.overall_match ?? "?"}%. Forças: ${(ev?.strengths ?? []).join(", ")}. Riscos: ${(ev?.risks ?? []).join(", ")}.`;
    }).join("\n");

    const { text } = await generateText({
      model,
      prompt: `Você é a recrutadora responsável por esta shortlist. Analise os candidatos para a vaga "${sl.jobs.title}" e apoie a decisão do gestor, sem tomá-la.

${SHORTLIST_WRITING_STYLE}

Respeite o gênero indicado ao lado de cada pessoa.

Candidatos:
${brief}

${data.prompt ? `Instrução: ${data.prompt}` : "Gere: (1) resumo comparativo, (2) o que cada pessoa fez que é relevante para esta vaga, (3) sugestão de ordem de apresentação com o motivo, (4) perguntas para desempate."}

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
      prompt: `Você é um editor executivo. Reescreva o texto abaixo aplicando a instrução, mantendo veracidade e tom profissional. Respeite a concordância de gênero indicada no contexto (masculino, feminino ou linguagem neutra quando a pessoa preferir não identificar) e nunca use "ele(a)" ou barras.

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

// ============ Evaluate a candidate for a specific job (shortlist analysis) ============
export const evaluateCandidateForJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      candidate_id: z.string().uuid(),
      job_id: z.string().uuid(),
      shortlist_id: z.string().uuid().optional(),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const [{ data: cand, error: e1 }, { data: job, error: e2 }] = await Promise.all([
      context.supabase.from("candidates").select("*").eq("id", data.candidate_id).single(),
      context.supabase.from("jobs").select("*").eq("id", data.job_id).single(),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);

    const jobAny: any = job;
    const cAny: any = cand;
    const ais: any = jobAny.ai_structure ?? {};
    const promptText = `Você é um consultor sênior de recrutamento executivo. Avalie a aderência DESTE candidato a ESTA vaga específica. Seja HONESTO — não infle percentuais. Nunca aplique nota mínima obrigatória.

Use SOMENTE informações realmente presentes no material fornecido. Se algo não estiver disponível, retorne "" ou [] ou marque status "unknown".

===== VAGA =====
Título: ${jobAny.title}
Área: ${jobAny.area ?? ""}
Cidade/Modelo: ${jobAny.location ?? ""} / ${jobAny.work_model ?? ""}
Resumo: ${jobAny.summary ?? ais.summary ?? ""}
Missão: ${ais.mission ?? ""}
Contexto de contratação: ${ais.hiring_context ?? ""}
Responsabilidades: ${JSON.stringify(ais.responsibilities ?? [])}
Resultados esperados: ${JSON.stringify(ais.expected_results ?? [])}
Must-have (eliminatórios): ${JSON.stringify(ais.must_have ?? jobAny.must_have ?? [])}
Nice-to-have (desejáveis): ${JSON.stringify(ais.nice_to_have ?? jobAny.nice_to_have ?? [])}
Hard skills: ${JSON.stringify(jobAny.hard_skills ?? [])}
Soft skills: ${JSON.stringify(jobAny.soft_skills ?? [])}
Competências avaliadas (com peso): ${JSON.stringify(jobAny.radar_competencies ?? ais.evaluation_competencies ?? [])}

===== CANDIDATO =====
Nome: ${cAny.full_name}
Cargo atual: ${cAny.current_position ?? ""} · ${cAny.current_company ?? ""}
Cidade/Modelo: ${cAny.city ?? ""} / ${cAny.work_model ?? ""}
Pretensão: ${cAny.salary_expectation ?? ""}
DISC: ${cAny.disc_profile ?? ""} — ${JSON.stringify(cAny.disc_scores ?? {})}
Headline: ${cAny.headline ?? ""}
Mini bio: ${cAny.mini_bio ?? ""}
Bio completa: ${cAny.full_bio ?? ""}
Resumo executivo: ${JSON.stringify(cAny.executive_summary ?? [])}
Especialidades: ${JSON.stringify(cAny.specialties ?? [])}
Resultados: ${JSON.stringify(cAny.main_results ?? [])}
Conquistas: ${JSON.stringify(cAny.achievements ?? [])}
Trajetória: ${JSON.stringify(cAny.trajectory ?? [])}
Competências: ${JSON.stringify(cAny.competencies ?? {})}
Formação: ${JSON.stringify(cAny.education ?? [])}
Idiomas: ${JSON.stringify(cAny.languages ?? [])}
Momento profissional: ${JSON.stringify(cAny.professional_moment ?? {})}
Motivadores: ${JSON.stringify(cAny.motivators ?? [])}
Pontos fortes: ${JSON.stringify(cAny.strengths ?? [])}
Case principal (currículo): ${JSON.stringify(cAny.main_case ?? {})}
Parecer do recrutador (bruto): ${cAny.recruiter_note ?? ""}
Entrevista/Transcrição: ${cAny.transcript ?? ""}
Notas internas: ${cAny.internal_notes ?? ""}

Retorne APENAS um objeto JSON válido com EXATAMENTE estas chaves:
{
  "overall_match": number,                          // 0..100, honesto, sem piso
  "key_differentiator": string,                     // 1 frase objetiva
  "job_specific_summary": string,                   // até 4 linhas específicas desta vaga
  "recruiter_opinion": string,                      // 6-10 linhas em tom consultivo humano — como se escrito por um recrutador experiente após entrevistar o candidato. Explique por que está apresentando, comunicação/postura/energia observada na entrevista, coerência currículo↔entrevista, interesse pela vaga e empresa, engajamento, disponibilidade, aderência comportamental, principais evidências. NUNCA use frases prontas como "excelente profissional", "ótima comunicação", "perfil aderente", "forte potencial".
  "main_case": { "context": string, "challenge": string, "action": string, "result": string, "relation_to_job": string },
  "risk_items": [{ "point": string, "mitigation": string }],   // 1-4 riscos concretos + mitigação já validada na entrevista (não hipotética)
  "motivational_factor": string,                    // por que ele quer ESTA vaga, com base em entrevista/parecer
  "eliminatory_checklist": [{ "criterion": string, "status": "yes"|"partial"|"no"|"unknown", "evidence": string }],
  "top_strengths": [{ "title": string, "evidence": string }],  // 3-5 pontos fortes específicos para esta vaga com evidência
  "dimension_scores": {
    "hard_skills": number, "soft_skills": number, "experience": number,
    "leadership": number, "communication": number, "strategy": number,
    "execution": number, "cultural_fit": number, "adaptability": number
  },
  "radar_scores": { "<nome da competência da vaga>": number },
  "cultural_fit": {
    "summary": string,                                // 2-4 linhas sobre a aderência cultural DESTE candidato a ESTA vaga/empresa
    "alignments": [{ "point": string, "evidence": string }],       // 2-5 pontos de alinhamento cultural com evidência
    "attention_points": [{ "point": string, "mitigation": string }] // 0-4 pontos de atenção culturais e como mitigá-los
  }
}

Regras de PONTUAÇÃO (obrigatórias — siga com rigor):
- Todas as pontuações são inteiras 0..100, sem piso mínimo. NÃO use valores padrão (ex: 70, 80, 85, 88, 90). Só use um valor se ele reflete evidência concreta.
- Calcule "overall_match" pela FÓRMULA ponderada abaixo e arredonde:
  overall_match =
     0.40 × (percentual de critérios eliminatórios com status="yes", contando "partial" como 50% e "no"/"unknown" como 0%) +
     0.35 × (média ponderada de dimension_scores usando os pesos das competências avaliadas da vaga; sem pesos, média simples) +
     0.15 × (aderência de senioridade, localização, modelo de trabalho e pretensão salarial vs. vaga, 0..100) +
     0.10 × (aderência de formação/idiomas obrigatórios, 0..100).
- Se QUALQUER critério eliminatório retornar "no", overall_match ≤ 55.
- Se houver 2+ critérios eliminatórios em "unknown", overall_match ≤ 70.
- Cada dimension_score deve ser justificável pela evidência textual do candidato. Diferencie candidatos — não iguale scores entre pessoas com trajetórias distintas.
- radar_scores deve usar exatamente os nomes das competências avaliadas da vaga.
- cultural_fit é ESPECÍFICO desta vaga (empresa, momento, gestor, time) — não repita traços genéricos do candidato.
- Se não houver evidência para um critério eliminatório, use "unknown" e explique.
- Não invente. Prefira "" a inventar.`;

    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);
    let output: any;
    try {
      const { text } = await generateText({
        model,
        prompt: promptText,
        temperature: 0.5,
      });
      output = extractJson(text);
    } catch (err: any) {
      throw new Error(err?.message || "Falha ao chamar a IA");
    }

    // Persistir
    const patch: any = {
      overall_match: typeof output.overall_match === "number" ? Math.round(output.overall_match) : null,
      key_differentiator: output.key_differentiator ?? null,
      job_specific_summary: output.job_specific_summary ?? null,
      recruiter_opinion: output.recruiter_opinion ?? null,
      main_case: output.main_case ?? null,
      risk_items: Array.isArray(output.risk_items) ? output.risk_items : [],
      motivational_factor: output.motivational_factor ?? null,
      eliminatory_checklist: Array.isArray(output.eliminatory_checklist) ? output.eliminatory_checklist : [],
      top_strengths: Array.isArray(output.top_strengths) ? output.top_strengths : [],
      dimension_scores: output.dimension_scores ?? {},
      radar_scores: output.radar_scores ?? {},
      cultural_fit: output.cultural_fit ?? null,
      ai_generated: output,
      shortlist_id: data.shortlist_id ?? null,
    };

    const { data: existing } = await context.supabase
      .from("candidate_job_evaluations")
      .select("id")
      .eq("candidate_id", data.candidate_id)
      .eq("job_id", data.job_id)
      .maybeSingle();

    if (existing) {
      await context.supabase.from("candidate_job_evaluations").update(patch).eq("id", existing.id);
    } else {
      await context.supabase.from("candidate_job_evaluations").insert({
        candidate_id: data.candidate_id,
        job_id: data.job_id,
        ...patch,
      });
    }
    return output;
  });


// ============ Generate DISC result only ============
export const generateDiscResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ candidate_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: cand, error } = await context.supabase
      .from("candidates")
      .select("id, full_name, gender, disc_raw, disc_profile, disc_scores")
      .eq("id", data.candidate_id)
      .single();
    if (error) throw new Error(error.message);
    const cAny: any = cand;
    const prev: any = cAny.disc_scores && typeof cAny.disc_scores === "object" ? cAny.disc_scores : {};
    const num = (v: any) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));
    const raw = { D: num(prev.D), I: num(prev.I), S: num(prev.S), C: num(prev.C) };
    if (raw.D === null && raw.I === null && raw.S === null && raw.C === null && !cAny.disc_raw) {
      throw new Error("Cadastre os dados brutos de DISC (D, I, S, C) antes de gerar o resultado.");
    }

    const genderRule =
      cAny.gender === "feminino"
        ? 'Use concordância feminina ("a candidata", "ela").'
        : cAny.gender === "masculino"
          ? 'Use concordância masculina ("o candidato", "ele").'
          : "Use linguagem neutra, sem marcar gênero; prefira o nome da pessoa.";

    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);
    const { text } = await generateText({
      model,
      prompt: `Você é um especialista em avaliação comportamental DISC. Interprete SOMENTE os dados abaixo e produza o resultado DISC. Não invente dados de currículo nem fale de experiência profissional.

Pessoa: ${cAny.full_name}
${genderRule}
Pontuações brutas: D=${raw.D ?? "?"} I=${raw.I ?? "?"} S=${raw.S ?? "?"} C=${raw.C ?? "?"}
Resultado bruto/relatório: ${cAny.disc_raw ?? "—"}

Responda APENAS com JSON válido, sem markdown, com EXATAMENTE estas chaves:
{
  "D": number, "I": number, "S": number, "C": number,
  "dominant": string,            // fator predominante: "Dominância" | "Influência" | "Estabilidade" | "Conformidade"
  "secondary": string,           // segundo fator, ou ""
  "behavior_summary": string,    // resumo do resultado, 3-5 linhas
  "strengths": string[],         // 4-6 pontos fortes
  "attention_points": string[],  // 3-5 pontos de atenção
  "communication_style": string, // forma de comunicação
  "work_style": string,          // estilo de trabalho
  "leadership_style": string,    // estilo de liderança
  "motivators": string[],        // 3-5 motivadores
  "ideal_environment": string    // ambiente de melhor desempenho
}`,
    });
    const output = extractJson(text);
    const scores = {
      ...prev,
      D: raw.D ?? num(output.D),
      I: raw.I ?? num(output.I),
      S: raw.S ?? num(output.S),
      C: raw.C ?? num(output.C),
      dominant: output.dominant ?? "",
      secondary: output.secondary ?? "",
      behavior_summary: output.behavior_summary ?? "",
      strengths: Array.isArray(output.strengths) ? output.strengths : [],
      attention_points: Array.isArray(output.attention_points) ? output.attention_points : [],
      communication_style: output.communication_style ?? "",
      work_style: output.work_style ?? "",
      leadership_style: output.leadership_style ?? "",
      motivators: Array.isArray(output.motivators) ? output.motivators : [],
      ideal_environment: output.ideal_environment ?? "",
      generated_at: new Date().toISOString(),
    };
    const profile = scores.dominant ? `${scores.dominant}${scores.secondary ? " / " + scores.secondary : ""}` : cAny.disc_profile;
    const { error: upErr } = await context.supabase
      .from("candidates")
      .update({ disc_scores: scores, disc_profile: profile })
      .eq("id", data.candidate_id);
    if (upErr) throw new Error(upErr.message);
    return scores;
  });
