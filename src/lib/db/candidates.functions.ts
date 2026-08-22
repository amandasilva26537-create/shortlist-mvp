import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { z } from "zod";

const CandidateInput = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1),
  photo_url: z.string().nullable().optional(),
  current_position: z.string().nullable().optional(),
  current_company: z.string().nullable().optional(),
  area: z.string().nullable().optional(),
  seniority: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  work_model: z.string().nullable().optional(),
  salary_expectation: z.number().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  resume_url: z.string().nullable().optional(),
  transcript: z.string().nullable().optional(),
  recruiter_note: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  disc_raw: z.string().nullable().optional(),
  disc_profile: z.string().nullable().optional(),
  disc_scores: z.any().nullable().optional(),
  // AI-generated / editable structured fields
  headline: z.string().nullable().optional(),
  mini_bio: z.string().nullable().optional(),
  full_bio: z.string().nullable().optional(),
  executive_summary: z.any().nullable().optional(),
  specialties: z.any().nullable().optional(),
  main_results: z.any().nullable().optional(),
  achievements: z.any().nullable().optional(),
  main_case: z.any().nullable().optional(),
  strengths: z.any().nullable().optional(),
  work_style: z.string().nullable().optional(),
  professional_moment: z.any().nullable().optional(),
  motivators: z.any().nullable().optional(),
  trajectory: z.any().nullable().optional(),
  education: z.any().nullable().optional(),
  courses: z.any().nullable().optional(),
  languages: z.any().nullable().optional(),
  competencies: z.any().nullable().optional(),
  additional_info: z.any().nullable().optional(),
  inconsistencies: z.any().nullable().optional(),
  ai_profile: z.any().nullable().optional(),
  status: z.string().nullable().optional(),
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
    const { data: docs } = await context.supabase
      .from("candidate_documents")
      .select("*")
      .eq("candidate_id", data.id)
      .order("created_at", { ascending: false });
    return { ...cand, documents: docs ?? [] };
  });

export const upsertCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => CandidateInput.parse(v))
  .handler(async ({ data, context }) => {
    const payload: any = { ...data };
    if (!data.id) payload.created_by = context.userId;
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

export const deleteCandidateDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("candidate_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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

export const archiveCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid(), archive: z.boolean() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("candidates")
      .update({ status: data.archive ? "arquivado" : "ativo", archived_at: data.archive ? new Date().toISOString() : null })
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
