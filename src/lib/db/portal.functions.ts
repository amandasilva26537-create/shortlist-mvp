import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function publicClient(shareToken: string) {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      headers: { "x-share-token": shareToken },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        h.set("x-share-token", shareToken);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// Colunas do candidato liberadas para a visão do cliente (sem e-mail, telefone,
// notas internas ou inconsistências).
const CLIENT_SAFE_CANDIDATE_COLUMNS =
  "id, full_name, photo_url, headline, current_position, current_company, area, seniority, city, state, country, work_model, linkedin_url, mini_bio, full_bio, executive_summary, specialties, main_results, achievements, main_case, strengths, work_style, professional_moment, motivators, trajectory, education, courses, languages, competencies, additional_info, gender, disc_profile, disc_scores, salary_expectation, salary_min, salary_max, status";

export const getPortalShortlist = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) => z.object({ token: z.string().min(16) }).parse(v))
  .handler(async ({ data }) => {
    const supabase = publicClient(data.token);
    const { data: sl, error } = await supabase
      .from("shortlists")
      .select("*, clients(name, logo_url), jobs(*)")
      .eq("share_token", data.token)
      .eq("status", "sent")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sl) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: links }, { data: feedback }] = await Promise.all([
      supabaseAdmin
        .from("shortlist_candidates")
        .select(
          "shortlist_id, candidate_id, position, reviewed, status, visible_documents, candidates(id, full_name, photo_url, current_position, city, work_model, linkedin_url, disc_profile, disc_scores, salary_expectation, salary_min, salary_max)",
        )
        .eq("shortlist_id", sl.id)
        .order("position"),
      supabaseAdmin
        .from("manager_feedback")
        .select("candidate_id, shortlist_id, decision, favorite, rating, comment, client_identifier, client_role, updated_at")
        .eq("shortlist_id", sl.id),
    ]);
    const cids = (links ?? []).map((l: any) => l.candidate_id);
    const [{ data: evals }, { data: docs }] = await Promise.all([
      supabaseAdmin.from("candidate_job_evaluations").select("*").in("candidate_id", cids).eq("job_id", sl.job_id),
      supabaseAdmin
        .from("candidate_documents")
        .select("id, candidate_id, kind, label, url, visible_to_client")
        .in("candidate_id", cids)
        .eq("visible_to_client", true),
    ]);
    return { shortlist: sl, candidates: links ?? [], evaluations: evals ?? [], documents: docs ?? [], feedback: feedback ?? [] };
  });

export const getPortalCandidate = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) =>
    z.object({ token: z.string().min(16), candidate_id: z.string().uuid() }).parse(v),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient(data.token);
    const { data: sl } = await supabase
      .from("shortlists")
      .select("id, job_id")
      .eq("share_token", data.token)
      .eq("status", "sent")
      .maybeSingle();
    if (!sl) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("shortlist_candidates")
      .select("candidate_id")
      .eq("shortlist_id", sl.id)
      .eq("candidate_id", data.candidate_id)
      .maybeSingle();
    if (!link) return null;
    const { data: candidate, error } = await supabaseAdmin
      .from("candidates")
      .select(CLIENT_SAFE_CANDIDATE_COLUMNS)
      .eq("id", data.candidate_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!candidate) return null;
    const [{ data: docs }, { data: evaluation }] = await Promise.all([
      supabaseAdmin
        .from("candidate_documents")
        .select("id, candidate_id, kind, label, url, visible_to_client")
        .eq("candidate_id", data.candidate_id)
        .eq("visible_to_client", true),
      supabaseAdmin
        .from("candidate_job_evaluations")
        .select("*")
        .eq("candidate_id", data.candidate_id)
        .eq("job_id", sl.job_id)
        .maybeSingle(),
    ]);
    return { candidate: { ...(candidate as any), documents: docs ?? [] }, evaluation: evaluation ?? null, shortlist_id: sl.id };
  });

export const getPortalFeedback = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) =>
    z.object({ token: z.string().min(4), client_identifier: z.string().min(1).max(200) }).parse(v),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient(data.token);
    const { data: sl } = await supabase
      .from("shortlists")
      .select("id")
      .eq("share_token", data.token)
      .eq("status", "sent")
      .maybeSingle();
    if (!sl) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("manager_feedback")
      .select("candidate_id, decision, favorite, comment, client_identifier, client_role")
      .eq("shortlist_id", sl.id)
      .ilike("client_identifier", data.client_identifier);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const submitPortalFeedback = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) =>
    z.object({
      token: z.string(),
      candidate_id: z.string().uuid(),
      client_identifier: z.string().min(1).max(200),
      client_role: z.string().max(200).nullable().optional(),
      rating: z.number().min(0).max(5).nullable().optional(),
      favorite: z.boolean().optional(),
      decision: z.string().max(60).nullable().optional(),
      comment: z.string().max(4000).nullable().optional(),
    }).parse(v),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient(data.token);
    const { data: sl } = await supabase
      .from("shortlists")
      .select("id")
      .eq("share_token", data.token)
      .eq("status", "sent")
      .maybeSingle();
    if (!sl) throw new Error("Shortlist não encontrada");
    // Verify the candidate is actually part of this shortlist before writing feedback.
    const { data: membership } = await supabase
      .from("shortlist_candidates")
      .select("candidate_id")
      .eq("shortlist_id", sl.id)
      .eq("candidate_id", data.candidate_id)
      .maybeSingle();
    if (!membership) throw new Error("Candidato não pertence a esta shortlist");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      shortlist_id: sl.id,
      candidate_id: data.candidate_id,
      client_identifier: data.client_identifier,
      client_role: data.client_role ?? null,
      rating: data.rating ?? null,
      favorite: data.favorite ?? false,
      decision: data.decision ?? null,
      comment: data.comment ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await supabaseAdmin
      .from("manager_feedback")
      .select("id")
      .eq("shortlist_id", sl.id)
      .eq("candidate_id", data.candidate_id)
      .ilike("client_identifier", data.client_identifier)
      .maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin.from("manager_feedback").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("manager_feedback").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

