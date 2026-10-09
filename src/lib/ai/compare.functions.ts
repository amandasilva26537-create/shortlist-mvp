import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { generateText } from "ai";
import { z } from "zod";
import { AI_MODEL, createLovableAiGateway, requireApiKey } from "./gateway.server";

export type CompareAnalysis = {
  cards: { candidate_id: string; differential: string; contribution: string; attention: string | null }[];
  matrix: { requirement: string; cells: { candidate_id: string; evidence: string | null }[] }[];
};

const clean = (v: any): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Análise comparativa: diferenciais, contribuição, pontos de atenção e matriz de evidências — só com dados da shortlist. */
async function buildAnalysis(job: any, rows: { candidate: any; evaluation: any | null }[]): Promise<CompareAnalysis> {
  const jobCtx = {
    titulo: job?.title,
    descricao: job?.description ?? job?.ai_structure?.summary ?? null,
    requisitos_e_criterios: { eliminatorios: job?.must_have ?? [], desejaveis: job?.nice_to_have ?? [], hard_skills: job?.hard_skills ?? [], soft_skills: job?.soft_skills ?? [] },
    competencias_avaliadas: job?.radar_competencies ?? [],
    estrutura_da_vaga: job?.ai_structure ?? null,
  };
  const people = rows.map(({ candidate: c, evaluation: e }) => ({
    candidate_id: c.id,
    primeiro_nome: String(c.full_name ?? "").trim().split(/\s+/)[0],
    headline_para_a_vaga: e?.job_headline ?? c.headline ?? null,
    diferencial: e?.key_differentiator ?? null,
    pontos_fortes: Array.isArray(e?.top_strengths) ? e.top_strengths : [],
    resumo_para_a_vaga: e?.job_specific_summary ?? null,
    parecer: e?.recruiter_opinion ?? null,
    case_principal: e?.main_case ?? null,
    riscos_ja_registrados: Array.isArray(e?.risk_items) ? e.risk_items : [],
    criterios_eliminatorios: Array.isArray(e?.eliminatory_checklist) ? e.eliminatory_checklist : [],
    notas: e?.recruiter_scores ?? e?.dimension_scores ?? {},
    disc: c.disc_profile ?? null,
    cargo_atual: [c.current_position, c.current_company].filter(Boolean).join(" · ") || null,
    trajetoria: Array.isArray(c.trajectory) ? c.trajectory.slice(0, 8) : [],
    resultados: c.main_results ?? c.achievements ?? null,
    especialidades: c.specialties ?? null,
    competencias: c.competencies ?? null,
    formacao: c.education ?? null,
  }));

  const gateway = createLovableAiGateway(requireApiKey());
  const { text } = await generateText({
    model: gateway(AI_MODEL),
    prompt: `Você é uma recrutadora sênior. Prepare uma comparação imparcial entre candidatos de UMA shortlist, para o cliente entender o que cada um oferece de DIFERENTE para a vaga e decidir com mais segurança.

VAGA:
${JSON.stringify(jobCtx, null, 2)}

CANDIDATOS (única fonte de verdade — currículo, análise e entrevista já consolidados na shortlist):
${JSON.stringify(people, null, 2)}

Entregue:
1) "cards": para CADA candidato
   - "differential": UMA frase curta (máx. 18 palavras) com o principal diferencial para esta vaga.
   - "contribution": a experiência ou competência que mais contribui para a vaga, com a evidência concreta (máx. 30 palavras).
   - "attention": um ponto de atenção relevante e real, SOMENTE se houver base nos dados (riscos registrados, critério parcial/não atendido, lacuna clara). Caso contrário, null.
2) "matrix": os 4 ou 5 requisitos MAIS IMPORTANTES da vaga. Para cada requisito, em "cells", uma evidência objetiva e curta (máx. 12 palavras, ex.: "Gestão de 20 pessoas", "Abertura de novos mercados") por candidato.
   - Se não houver evidência suficiente nos dados, use exatamente null. Ausência de informação NÃO significa ausência de competência: nunca escreva que a pessoa "não tem" algo.

Regras:
- Use somente informações presentes nos dados. NÃO invente experiências, empresas, números ou resultados.
- Explique diferenças reais entre os candidatos; não repita descrições genéricas nem os mesmos textos em candidatos diferentes.
- Linguagem profissional, objetiva, baseada em evidências. Sem elogios genéricos nem interpretações exageradas.
- NÃO declare vencedor, ranking ou "melhor candidato".
- Comece "differential" pelo primeiro nome da pessoa. Português do Brasil.

Retorne APENAS JSON válido:
{"cards":[{"candidate_id":"<id>","differential":"...","contribution":"...","attention":null}],"matrix":[{"requirement":"...","cells":[{"candidate_id":"<id>","evidence":"..." }]}]}`,
  });
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  const parsed = JSON.parse(first !== -1 ? cleaned.slice(first, last + 1) : cleaned);
  const valid = new Set(rows.map((r) => r.candidate.id));
  const cards = (Array.isArray(parsed?.cards) ? parsed.cards : [])
    .filter((c: any) => valid.has(c?.candidate_id))
    .map((c: any) => ({
      candidate_id: c.candidate_id,
      differential: clean(c.differential) ?? "",
      contribution: clean(c.contribution) ?? "",
      attention: clean(c.attention),
    }));
  const matrix = (Array.isArray(parsed?.matrix) ? parsed.matrix : [])
    .filter((m: any) => clean(m?.requirement))
    .slice(0, 5)
    .map((m: any) => ({
      requirement: String(m.requirement).trim(),
      cells: rows.map((r) => ({
        candidate_id: r.candidate.id as string,
        evidence: clean((Array.isArray(m.cells) ? m.cells : []).find((x: any) => x?.candidate_id === r.candidate.id)?.evidence),
      })),
    }));
  return { cards, matrix };
}

const IdsInput = z.array(z.string().uuid()).min(2).max(3);

export const generateCompareInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ shortlist_id: z.string().uuid(), candidate_ids: IdsInput }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: sl } = await context.supabase.from("shortlists").select("job_id, jobs(*)").eq("id", data.shortlist_id).maybeSingle();
    if (!sl) throw new Error("Shortlist não encontrada");
    const { data: links } = await context.supabase
      .from("shortlist_candidates")
      .select("candidate_id, candidates(*)")
      .eq("shortlist_id", data.shortlist_id)
      .in("candidate_id", data.candidate_ids);
    const { data: evals } = await context.supabase
      .from("candidate_job_evaluations")
      .select("*")
      .eq("job_id", (sl as any).job_id)
      .in("candidate_id", data.candidate_ids);
    const rows = (links ?? []).map((l: any) => ({
      candidate: l.candidates,
      evaluation: (evals ?? []).find((e: any) => e.candidate_id === l.candidate_id) ?? null,
    }));
    if (rows.length < 2) throw new Error("Selecione candidatos da mesma shortlist");
    return { analysis: await buildAnalysis((sl as any).jobs, rows) };
  });

/** Versão do portal do cliente: valida o token da shortlist enviada. */
export const generatePortalCompareInsights = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => z.object({ token: z.string().min(16), candidate_ids: IdsInput }).parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sl } = await supabaseAdmin
      .from("shortlists")
      .select("id, job_id, jobs(*)")
      .eq("share_token", data.token)
      .eq("status", "sent")
      .maybeSingle();
    if (!sl) throw new Error("Shortlist não encontrada");
    const { data: links } = await supabaseAdmin
      .from("shortlist_candidates")
      .select(
        "candidate_id, candidates(id, full_name, headline, trajectory, current_position, current_company, disc_profile, main_results, achievements, specialties, competencies, education)",
      )
      .eq("shortlist_id", (sl as any).id)
      .in("candidate_id", data.candidate_ids);
    const { data: evals } = await supabaseAdmin
      .from("candidate_job_evaluations")
      .select("*")
      .eq("job_id", (sl as any).job_id)
      .in("candidate_id", data.candidate_ids);
    const rows = (links ?? []).map((l: any) => ({
      candidate: l.candidates,
      // somente campos que o cliente já enxerga na shortlist
      evaluation: pickClientSafe((evals ?? []).find((e: any) => e.candidate_id === l.candidate_id)),
    }));
    if (rows.length < 2) throw new Error("Selecione candidatos da mesma shortlist");
    return { analysis: await buildAnalysis((sl as any).jobs, rows) };
  });

function pickClientSafe(e: any) {
  if (!e) return null;
  return {
    job_headline: e.job_headline,
    key_differentiator: e.key_differentiator,
    top_strengths: e.top_strengths,
    job_specific_summary: e.job_specific_summary,
    recruiter_opinion: e.recruiter_opinion,
    main_case: e.main_case,
    risk_items: e.risk_items,
    eliminatory_checklist: e.eliminatory_checklist,
    dimension_scores: e.dimension_scores,
    recruiter_scores: e.recruiter_scores,
  };
}
