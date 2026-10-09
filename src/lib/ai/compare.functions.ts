import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { generateText } from "ai";
import { z } from "zod";
import { AI_MODEL, createLovableAiGateway, requireApiKey } from "./gateway.server";

type Insight = { candidate_id: string; text: string };

/** Gera, para cada candidato, o principal ponto forte em relação à vaga, usando só dados da shortlist. */
async function buildInsights(job: any, rows: { candidate: any; evaluation: any | null }[]): Promise<Insight[]> {
  const jobCtx = {
    titulo: job?.title,
    criterios_eliminatorios_e_requisitos: job?.must_have ?? [],
    desejaveis: job?.nice_to_have ?? [],
    competencias_avaliadas: job?.radar_competencies ?? [],
    resumo: job?.ai_structure?.summary ?? job?.description ?? null,
  };
  const people = rows.map(({ candidate: c, evaluation: e }) => ({
    candidate_id: c.id,
    primeiro_nome: String(c.full_name ?? "").trim().split(/\s+/)[0],
    headline_para_a_vaga: e?.job_headline ?? c.headline ?? null,
    diferencial: e?.key_differentiator ?? null,
    pontos_fortes: Array.isArray(e?.top_strengths) ? e.top_strengths : [],
    resumo_para_a_vaga: e?.job_specific_summary ?? null,
    trajetoria: Array.isArray(c.trajectory) ? c.trajectory.slice(0, 6) : [],
    criterios_eliminatorios: Array.isArray(e?.eliminatory_checklist) ? e.eliminatory_checklist : [],
    notas: e?.recruiter_scores ?? e?.dimension_scores ?? {},
  }));

  const gateway = createLovableAiGateway(requireApiKey());
  const { text } = await generateText({
    model: gateway(AI_MODEL),
    prompt: `Você é uma recrutadora sênior preparando uma comparação imparcial entre candidatos de UMA shortlist, para ajudar o cliente a entender os diferentes pontos fortes de cada profissional.

VAGA:
${JSON.stringify(jobCtx, null, 2)}

CANDIDATOS (única fonte de verdade):
${JSON.stringify(people, null, 2)}

Para CADA candidato, escreva UM texto curto (1 a 2 frases, máx. 45 palavras) explicando o PRINCIPAL PONTO FORTE em relação aos requisitos desta vaga.

Regras:
- Use somente evidências presentes nos dados acima (experiências, pontos fortes, resumo, critérios, notas). NÃO invente experiências, empresas, números ou resultados.
- Relacione o ponto forte a um requisito/competência da vaga e cite a evidência concreta.
- Cada candidato deve ter um diferencial próprio; destaque o que o distingue dos demais.
- Sem elogios genéricos, sem adjetivos vazios, sem linguagem promocional.
- NÃO declare vencedor, ranking ou "melhor candidato". Não compare notas entre pessoas.
- Comece o texto pelo primeiro nome da pessoa. Português do Brasil.
- Se os dados de um candidato forem insuficientes para afirmar um ponto forte, devolva text vazio ("").

Retorne APENAS JSON válido: {"insights":[{"candidate_id":"<id>","text":"..."}]}`,
  });
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  const parsed = JSON.parse(first !== -1 ? cleaned.slice(first, last + 1) : cleaned);
  const valid = new Set(rows.map((r) => r.candidate.id));
  return (Array.isArray(parsed?.insights) ? parsed.insights : [])
    .filter((i: any) => valid.has(i?.candidate_id) && typeof i?.text === "string" && i.text.trim())
    .map((i: any) => ({ candidate_id: i.candidate_id, text: i.text.trim() }));
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
    return { insights: await buildInsights((sl as any).jobs, rows) };
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
        "candidate_id, candidates(id, full_name, headline, trajectory, current_position, current_company)",
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
    return { insights: await buildInsights((sl as any).jobs, rows) };
  });

function pickClientSafe(e: any) {
  if (!e) return null;
  return {
    job_headline: e.job_headline,
    key_differentiator: e.key_differentiator,
    top_strengths: e.top_strengths,
    job_specific_summary: e.job_specific_summary,
    eliminatory_checklist: e.eliminatory_checklist,
    dimension_scores: e.dimension_scores,
    recruiter_scores: e.recruiter_scores,
  };
}
