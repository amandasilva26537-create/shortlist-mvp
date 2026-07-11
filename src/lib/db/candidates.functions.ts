import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CandidateInput = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1),
  photo_url: z.string().nullable().optional(),
  current_position: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  work_model: z.string().nullable().optional(),
  salary_expectation: z.number().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  resume_url: z.string().nullable().optional(),
  transcript: z.string().nullable().optional(),
  recruiter_note: z.string().nullable().optional(),
  disc_raw: z.string().nullable().optional(),
  disc_profile: z.string().nullable().optional(),
  disc_scores: z.any().nullable().optional(),
});

export const listCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCandidate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: cand, error } = await context.supabase
      .from("candidates")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cand) return null;
    const [{ data: docs }, { data: evals }] = await Promise.all([
      context.supabase.from("candidate_documents").select("*").eq("candidate_id", data.id),
      context.supabase.from("candidate_job_evaluations").select("*").eq("candidate_id", data.id),
    ]);
    return { ...cand, documents: docs ?? [], evaluations: evals ?? [] };
  });

export const upsertCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => CandidateInput.parse(v))
  .handler(async ({ data, context }) => {
    const payload = { ...data, created_by: context.userId };
    const query = data.id
      ? context.supabase.from("candidates").update(payload).eq("id", data.id).select("*").single()
      : context.supabase.from("candidates").insert(payload).select("*").single();
    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    return row;
  });

export const addCandidateDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      candidate_id: z.string().uuid(),
      kind: z.string(),
      label: z.string().nullable().optional(),
      url: z.string(),
      visible_to_client: z.boolean().optional(),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("candidate_documents")
      .insert(data)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setDocumentVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid(), visible_to_client: z.boolean() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("candidate_documents")
      .update({ visible_to_client: data.visible_to_client })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("candidates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
