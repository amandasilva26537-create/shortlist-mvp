import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { z } from "zod";

const JobInput = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  title: z.string().min(1),
  area: z.string().nullable().optional(),
  seniority: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  work_model: z.string().nullable().optional(),
  contract_type: z.string().nullable().optional(),
  salary_min: z.number().nullable().optional(),
  salary_max: z.number().nullable().optional(),
  manager_name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  briefing_url: z.string().nullable().optional(),
  recruiter_notes: z.string().nullable().optional(),
  meeting_transcript: z.string().nullable().optional(),
  pasted_text: z.string().nullable().optional(),
  documents: z.array(z.any()).optional(),
  ai_structure: z.any().nullable().optional(),
  must_have: z.array(z.string()).optional(),
  nice_to_have: z.array(z.string()).optional(),
  hard_skills: z.array(z.string()).optional(),
  soft_skills: z.array(z.string()).optional(),
  radar_competencies: z.any().nullable().optional(),
  status: z.string().optional(),
});

export const listJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jobs")
      .select("*, clients(name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("jobs")
      .select("*, clients(name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const upsertJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => JobInput.parse(v))
  .handler(async ({ data, context }) => {
    const payload = { ...data, created_by: context.userId };
    const query = data.id
      ? context.supabase.from("jobs").update(payload).eq("id", data.id).select("*").single()
      : context.supabase.from("jobs").insert(payload).select("*").single();
    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("jobs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
