import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { generateText } from "ai";
import { z } from "zod";
import { AI_MODEL, createLovableAiGateway, requireApiKey } from "./gateway.server";
import { SHORTLIST_WRITING_STYLE, EXECUTIVE_WRITING_STYLE, SUMMARY_PROMPT_VERSION, genderInstruction } from "./writing-style";

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
  for (const marker of [`/object/public/${bucket}/`, `/object/sign/${bucket}/`]) {
    const i = url.indexOf(marker);
    if (i === -1) continue;
    const rest = url.slice(i + marker.length).split("?")[0]!;
    return decodeURIComponent(rest);
  }
  return null;
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
Idade: ${(cand as any).age ?? ""}
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
  "basic_info": { "full_name": string, "current_position": string, "current_company": string, "area": string, "city": string, "state": string, "country": string, "work_model": string, "age": number|null, "salary_expectation": number|null, "linkedin_url": string, "email": string, "phone": string },
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
- Use "" (string vazia) ou null (para salary_expectation e age) quando não encontrar.
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
    if (emptyStr((cand as any).age) && typeof bi.age === "number" && !isNaN(bi.age)) {
      basicPatch.age = bi.age;
    }
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
      prompt: `Você é a recrutadora responsável. Reescreva o texto abaixo aplicando a instrução, mantendo veracidade. Respeite a concordância de gênero indicada no contexto (masculino, feminino ou linguagem neutra quando a pessoa preferir não identificar) e nunca use "ele(a)" ou barras.

${SHORTLIST_WRITING_STYLE}

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
    const promptText = `Você é a recrutadora responsável por esta vaga. Avalie a aderência DESTA pessoa a ESTA vaga específica. Seja HONESTA — não infle percentuais. Nunca aplique nota mínima obrigatória.

===== COMO RACIOCINAR ANTES DE ESCREVER (OBRIGATÓRIO) =====
Analise EM CONJUNTO, antes de produzir qualquer texto:
1. descrição, missão, responsabilidades, resultados esperados e requisitos da VAGA;
2. currículo completo e cadastro do candidato;
3. TODA a entrevista/transcrição e as respostas dadas nela;
4. observações, parecer e orientações do recrutador;
5. resultados, números e métricas informados pelo candidato;
6. demais informações do processo (testes, DISC, notas internas, documentos).

A VAGA determina o FOCO. O currículo e a entrevista são as FONTES DE EVIDÊNCIA. As orientações do recrutador definem o que merece MAIOR DESTAQUE — mas nunca autorizam criar informação inexistente.

Pergunta central a responder: "Considerando especificamente ESTA vaga, quais experiências, resultados, competências e evidências REAIS encontradas no currículo e na entrevista tornam esta pessoa relevante para esta oportunidade?"

Use SOMENTE informações realmente presentes no material fornecido. Se algo não estiver disponível, retorne "" ou [] ou marque status "unknown".

${EXECUTIVE_WRITING_STYLE}

${genderInstruction(cAny.gender, cAny.full_name)}


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
Formação complementar/cursos: ${JSON.stringify(cAny.courses ?? [])}
Informações adicionais do processo: ${JSON.stringify(cAny.additional_info ?? {})}
DISC (material bruto): ${cAny.disc_raw ?? ""}
ORIENTAÇÕES E PARECER DO RECRUTADOR (definem o foco do texto): ${cAny.recruiter_note ?? ""}
ENTREVISTA / TRANSCRIÇÃO COMPLETA (leia por inteiro antes de escrever): ${cAny.transcript ?? ""}
Notas internas: ${cAny.internal_notes ?? ""}

Retorne APENAS um objeto JSON válido com EXATAMENTE estas chaves:
{
  "overall_match": number,                          // 0..100, honesto, sem piso
  "job_headline": string,                           // HEADLINE ORIENTADA À VAGA — ver regras detalhadas abaixo
  "key_differentiator": string,                     // 1 frase objetiva, ligada ao escopo DESTA vaga
  "job_specific_summary": string,                   // RESUMO DO CANDIDATO PARA ESTA VAGA — ver regras detalhadas abaixo
  "recruiter_opinion": string,                      // PARECER DO RECRUTADOR — ver regras detalhadas abaixo
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
  "radar_scores": { "<nome da competência da vaga>": number }
}

===== REGRA CENTRAL: A VAGA DEFINE O POSICIONAMENTO, A TRAJETÓRIA FORNECE AS EVIDÊNCIAS =====
Toda a apresentação do candidato é construída especificamente para ESTA vaga. Vale para "job_headline", "job_specific_summary", "recruiter_opinion", "top_strengths", "main_case", "key_differentiator", "radar_scores" e qualquer texto de aderência.

Antes de escrever cada campo, pergunte internamente: "Esta informação ajuda o cliente a entender a aderência deste candidato especificamente para ESTA vaga?" Se não ajudar, não recebe destaque.

- Não posicione o candidato pela área em que trabalhou historicamente quando essa área não for o escopo da vaga atual. A trajetória anterior entra como EVIDÊNCIA, nunca como posicionamento.
- Varra TODO o currículo e TODA a entrevista buscando evidências ligadas ao escopo da vaga: estratégia da área, liderança, gestão de equipe, planejamento, orçamento, aquisição e crescimento, funil, indicadores, receita, integração com áreas correlatas (ex.: Comercial), gestão de projetos, processos, tomada de decisão e responsabilidade por resultados.
- Experiências de outras áreas aparecem apenas quando comprovam uma competência relevante para a vaga.
- Não esconda a trajetória: organize e priorize. O que não conversa com a vaga fica em segundo plano ou fora.
- NUNCA atribua cargo, senioridade, escopo ou especialidade que a pessoa não tem para aproximá-la da vaga. Se as evidências do escopo da vaga não existirem, não invente e não sugira por analogia — registre objetivamente o que precisa ser validado.

===== REGRAS DO "job_headline" (HEADLINE PARA ESTA VAGA) =====
Formato estilo LinkedIn: APENAS palavras-chave separadas por " | ". NUNCA frases, verbos conjugados, adjetivos ou pontuação final.

- No MÁXIMO 4 palavras-chave (pode ter 3). Cada palavra-chave tem 1 ou 2 palavras.
- Orientada à VAGA atual e sustentada pela experiência REAL do candidato.
- NÃO copie cargo atual, último cargo nem a profissão histórica predominante.
- Sem nome de empresa, sem senioridade inventada, sem "especialista em".

Antes de gerar, considere: (1) qual é a vaga da shortlist; (2) quais experiências reais sustentam a candidatura para ela; (3) quais 4 eixos melhor representam essa aderência.

Exemplos corretos:
- "Marketing | Growth | Lançamentos | Aquisição"
- "Comercial | Gestão de Times | Funil | Receita"
Exemplos errados (frases): "Profissional de marketing com sólida experiência em growth", "Marketing | Estratégia, Growth e Gestão de Aquisição".
Se as evidências de escopo ampliado NÃO existirem, use palavras-chave fiéis ao que a pessoa realmente fez — sem inflar.


===== REGRAS DO "job_specific_summary" (RESUMO DO CANDIDATO) =====
NÃO é um resumo do currículo nem da trajetória em ordem cronológica. É uma análise executiva e estratégica que mostra por que a experiência REAL desta pessoa é relevante para ESTA vaga.

Formato: 5 a 7 frases corridas (1 ou 2 parágrafos). Sem bullets, sem títulos. Registro executivo, 3ª pessoa, factual.

ESTRUTURA OBRIGATÓRIA do texto (em sequência, sem rótulos visíveis):
1. Enquadramento: senioridade, escopo atual e por que a trajetória conversa com o desafio DESTA vaga (setores/mercados e porte da operação, quando informados).
2. Escopo e método: o que a pessoa efetivamente conduziu — estrutura sob responsabilidade (headcount, times diretos/indiretos), orçamento/verba/receita, processos, rituais, sistemas de gestão e indicadores acompanhados.
3. Resultados com dados: números, percentuais, valores, prazos e metas atingidas. Se houver métrica, ela precisa aparecer no texto.
4. Aderência aos requisitos críticos da vaga: quais must-have e competências avaliadas ficam sustentados por evidência concreta.
5. Fechamento objetivo: o ponto de maior aderência e, se aplicável, o que ainda precisa ser validado — sem recomendação nem elogio.

Pelo menos uma frase precisa conter dado quantitativo sempre que o material tiver qualquer número (equipe, orçamento, receita, %, volume, prazo, carteira, metas). Nunca escreva "resultados relevantes" ou "equipe grande" no lugar do dado real.

Priorize, nesta ordem de importância, quando houver evidência:
- experiências mais relacionadas à posição em avaliação;
- senioridade e escopo de atuação; nível de autonomia e responsabilidade;
- responsabilidades relevantes para a vaga;
- liderança e gestão (tamanho de equipe, times indiretos, gestão de gestores);
- resultados alcançados, com números e métricas;
- faturamento, orçamento, verba ou metas sob responsabilidade;
- projetos relevantes, mercados e segmentos atendidos;
- competências decisivas para a vaga; progressão profissional;
- experiências transferíveis para o desafio atual.
Sempre que existirem números, dados ou resultados concretos, coloque-os em destaque no texto.

USO DA ENTREVISTA: a entrevista COMPLEMENTA o currículo. Se uma informação importante para a vaga não aparece detalhada no currículo mas foi explicada na entrevista (ex.: currículo diz "Gerente de Marketing" e na entrevista a pessoa relata liderar 8 pessoas, gerir R$ 500 mil/mês de investimento e responder pela estratégia de aquisição), USE a informação da entrevista, porque ela mostra a dimensão real da experiência.

ADERÊNCIA À VAGA: não deixe o cargo atual ou a especialidade principal do currículo dominar o resumo automaticamente. Se a trajetória é concentrada em uma especialidade (ex.: tráfego pago) mas a vaga é mais ampla (ex.: Head de Marketing), procure no currículo e na entrevista evidências reais ligadas ao escopo da vaga — estratégia, liderança, gestão de equipe, gestão de orçamento, planejamento, visão de negócio, aquisição, crescimento, indicadores, funil, integração com vendas, gestão de projetos, processos, tomada de decisão e responsabilidade por resultados — e destaque o que existir. Se não existir, não invente e não sugira por analogia.

ORIENTAÇÕES DO RECRUTADOR: definem o foco. Se o recrutador pedir destaque para liderança e resultados da operação, procure essas evidências no currículo e na entrevista e priorize-as no texto. A orientação nunca cria informação.

LINGUAGEM: profissional, natural, estratégica, objetiva e factual. Sem opinião pessoal e sem elogio. Proibido: "excelente profissional", "perfil muito forte", "profissional extremamente competente", "candidato diferenciado", "certamente agregará", e equivalentes. Em vez de elogiar, mostre a evidência:
- Errado: "Possui excelente capacidade de liderança."
- Certo: "Liderou uma equipe de 12 profissionais e respondeu pela estruturação dos processos, acompanhamento dos indicadores e desenvolvimento do time."
O cliente deve formar a própria opinião a partir dos fatos apresentados.

NUNCA invente experiências, competências, responsabilidades, números, resultados, liderança, ferramentas, projetos ou conhecimentos. O objetivo não é fazer a pessoa parecer perfeita — é apresentar, da forma mais estratégica possível, as evidências REAIS de aderência à vaga. Quando um ponto importante não estiver informado, diga de forma natural que ainda precisa ser validado.

===== REGRAS DO "recruiter_opinion" (PARECER DO RECRUTADOR) =====
Padrão de linguagem: parecer de recrutamento apresentado a um cliente. Profissional, objetivo, claro e baseado em evidências. Não pode parecer texto de IA, nem informal/conversado, nem rebuscado.

Formato: 3 a 4 parágrafos curtos, texto corrido, sem bullets e sem títulos. 3ª pessoa. Frases diretas, uma ideia por frase.

SEQUÊNCIA:
1. Abertura com a experiência e as áreas de atuação relevantes para a vaga (tempo de experiência e campos de atuação). Ex.: "O profissional possui 14 anos de experiência em redação e conteúdo, com atuação em estratégia, copy, inbound marketing e construção de jornadas de comunicação."
2. O que efetivamente fez, com exemplos concretos nomeando empresa/projeto quando informado. Ex.: "Na Huggy, participou da estratégia de comunicação durante uma mudança na tarifação do WhatsApp que poderia gerar impacto relevante na base de clientes."
3. Resultados, números e evidências que sustentam isso, atribuídos à fonte quando vierem do relato. Ex.: "Segundo as informações apresentadas, diante de uma estimativa de churn de 20%, o índice registrado ficou entre 7% e 8%."
4. Relação com ESTA vaga e fechamento com os principais pontos de aderência. Ex.: "Os principais pontos de aderência estão na experiência com conteúdo e copy, visão de funil e capacidade de estruturar comunicações considerando diferentes etapas da jornada do cliente."

FONTES: currículo, cadastro e TODA a entrevista/transcrição, além das anotações do recrutador. Cite ferramentas, métricas, tamanho de equipe, orçamento, receita, volume de operação e resultados sempre que essas informações existirem. Destaque somente experiências relevantes para a vaga atual e explique brevemente por que têm relação com a posição.

RESPONDA OBJETIVAMENTE: (1) qual é a experiência relevante; (2) o que fez; (3) quais resultados/números/evidências sustentam; (4) o que dessa experiência tem relação com esta vaga.

EVITAR: excesso de adjetivos, linguagem promocional, genérica ou informal. Proibido usar (nem variações): "consegue fazer", "manda bem", "mexeu com", "super estratégico", "perfil incrível", "excelente profissional", "demonstrou domínio total", "vocabulário impecável", "forte combinação", "trajetória consolidada", "perfil híbrido", "combinação entre", "robusta experiência", "sólida experiência", "ampla expertise", "profissional diferenciado".

Em vez de qualificar, apresente a evidência:
- Errado: "Possui excelente visão analítica." → Certo: "Apresentou conhecimento de métricas como CAC e conversão e explicou como utiliza esses indicadores no acompanhamento do funil."
- Errado: "Demonstra domínio total de escrita estratégica." → Certo: "A experiência apresenta relação com a vaga pela atuação em escrita, construção de mensagens e comunicação em diferentes etapas da jornada do cliente."

NUNCA invente informação para deixar o parecer mais completo. Se algo relevante não estiver informado, registre objetivamente que precisa ser validado.


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
  - Se não houver evidência para um critério eliminatório, use "unknown" e explique.
- Não invente. Prefira "" a inventar.`;

    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);
    let output: any;
    try {
      const { text } = await generateText({
        model,
        prompt: promptText,
        temperature: 0.25,
      });
      output = extractJson(text);
    } catch (err: any) {
      throw new Error(err?.message || "Falha ao chamar a IA");
    }

    // Persistir
    const patch: any = {
      overall_match: typeof output.overall_match === "number" ? Math.round(output.overall_match) : null,
      job_headline: output.job_headline ?? null,
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
      ai_generated: output,
      prompt_version: SUMMARY_PROMPT_VERSION,
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
  .inputValidator((v: unknown) =>
    z.object({ candidate_id: z.string().uuid(), job_id: z.string().uuid().optional() }).parse(v),
  )
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

    let jobContext = "";
    if (data.job_id) {
      const { data: job } = await context.supabase
        .from("jobs")
        .select("title, seniority, area, description, must_have, nice_to_have, hard_skills, soft_skills")
        .eq("id", data.job_id)
        .maybeSingle();
      const j: any = job;
      if (j) {
        jobContext = `\nVAGA DESTA SHORTLIST (use para relacionar o resultado):
Cargo: ${j.title ?? ""} ${j.seniority ?? ""} ${j.area ?? ""}
Descrição: ${j.description ?? ""}
Requisitos obrigatórios: ${(j.must_have ?? []).join("; ")}
Desejáveis: ${(j.nice_to_have ?? []).join("; ")}
Hard skills: ${(j.hard_skills ?? []).join("; ")}
Soft skills / comportamental desejado: ${(j.soft_skills ?? []).join("; ")}\n`;
      }
    }

    const gateway = createLovableAiGateway(requireApiKey());
    const model = gateway(AI_MODEL);
    const { text } = await generateText({
      model,
      prompt: `Você é a recrutadora responsável e interpreta o DISC. Interprete SOMENTE os dados abaixo e produza o resultado DISC. Não invente dados de currículo nem fale de experiência profissional.

${SHORTLIST_WRITING_STYLE}

Pessoa: ${cAny.full_name}
${genderRule}
${genderInstruction(cAny.gender, cAny.full_name)}
Pontuações brutas: D=${raw.D ?? "?"} I=${raw.I ?? "?"} S=${raw.S ?? "?"} C=${raw.C ?? "?"}
Resultado bruto/relatório: ${cAny.disc_raw ?? "—"}
${jobContext}
REGRAS DE CONTEÚDO:
- "behavior_summary": 3-5 linhas. Explique brevemente o perfil DISC identificado e SEMPRE relacione o resultado com a vaga desta shortlist, mostrando de forma positiva como as características comportamentais podem contribuir para a posição. NÃO inclua riscos, fragilidades ou pontos negativos neste campo.
- "attention_points": apenas 1 ou 2 itens, em tom leve e construtivo, escritos como orientação de gestão, comunicação ou adaptação (ex.: "Pode ter melhor desempenho em ambientes com objetivos claros e autonomia para execução."). NUNCA escreva algo que leve o cliente a desclassificar a pessoa e nunca use o DISC para concluir que ela não serve para a vaga.

Responda APENAS com JSON válido, sem markdown, com EXATAMENTE estas chaves:
{
  "D": number, "I": number, "S": number, "C": number,
  "dominant": string,            // fator predominante: "Dominância" | "Influência" | "Estabilidade" | "Conformidade"
  "secondary": string,           // segundo fator, ou ""
  "behavior_summary": string,    // resumo do resultado, 3-5 linhas, relacionado à vaga, somente positivo
  "strengths": string[],         // 4-6 pontos fortes
  "attention_points": string[],  // 1-2 pontos de atenção, leves e construtivos
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
    } as Record<string, any>;
    // Edições manuais da recrutadora prevalecem sobre a regeneração.
    const edited: string[] = Array.isArray(prev.manual_edits) ? prev.manual_edits : [];
    for (const key of edited) {
      if (key !== "disc_profile" && key in prev) scores[key] = prev[key];
    }
    scores.manual_edits = edited;
    const profile = edited.includes("disc_profile")
      ? cAny.disc_profile
      : scores.dominant
        ? `${scores.dominant}${scores.secondary ? " / " + scores.secondary : ""}`
        : cAny.disc_profile;
    const { error: upErr } = await context.supabase
      .from("candidates")
      .update({ disc_scores: scores, disc_profile: profile })
      .eq("id", data.candidate_id);
    if (upErr) throw new Error(upErr.message);
    return scores;
  });
