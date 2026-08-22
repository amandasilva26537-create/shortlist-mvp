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

export const getPortalShortlist = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) => z.object({ token: z.string().min(4) }).parse(v))
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
    const [{ data: links }, { data: feedback }] = await Promise.all([
      supabase
        .from("shortlist_candidates")
        .select("*, candidates(id, full_name, photo_url, current_position, city, work_model, linkedin_url, disc_profile, disc_scores)")
        .eq("shortlist_id", sl.id)
        .order("position"),
      supabase.from("manager_feedback").select("*").eq("shortlist_id", sl.id),
    ]);
    const cids = (links ?? []).map((l: any) => l.candidate_id);
    const [{ data: evals }, { data: docs }] = await Promise.all([
      supabase.from("candidate_job_evaluations").select("*").in("candidate_id", cids).eq("job_id", sl.job_id),
      supabase.from("candidate_documents").select("*").in("candidate_id", cids).eq("visible_to_client", true),
    ]);
    return { shortlist: sl, candidates: links ?? [], evaluations: evals ?? [], documents: docs ?? [], feedback: feedback ?? [] };
  });

export const getPortalCandidate = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) =>
    z.object({ token: z.string().min(4), candidate_id: z.string().uuid() }).parse(v),
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
    const { data: link } = await supabase
      .from("shortlist_candidates")
      .select("candidate_id")
      .eq("shortlist_id", sl.id)
      .eq("candidate_id", data.candidate_id)
      .maybeSingle();
    if (!link) return null;
    const { data: candidate, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", data.candidate_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!candidate) return null;
    const {
      internal_notes,
      recruiter_note,
      inconsistencies,
      email,
      phone,
      ...safe
    } = candidate as any;
    const [{ data: docs }, { data: evaluation }] = await Promise.all([
      supabase
        .from("candidate_documents")
        .select("*")
        .eq("candidate_id", data.candidate_id)
        .eq("visible_to_client", true),
      supabase
        .from("candidate_job_evaluations")
        .select("*")
        .eq("candidate_id", data.candidate_id)
        .eq("job_id", sl.job_id)
        .maybeSingle(),
    ]);
    return { candidate: { ...safe, documents: docs ?? [] }, evaluation: evaluation ?? null, shortlist_id: sl.id };
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
    const { error } = await supabaseAdmin.from("manager_feedback").insert({
      shortlist_id: sl.id,
      candidate_id: data.candidate_id,
      client_identifier: data.client_identifier,
      client_role: data.client_role ?? null,
      rating: data.rating ?? null,
      favorite: data.favorite ?? false,
      decision: data.decision ?? null,
      comment: data.comment ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
