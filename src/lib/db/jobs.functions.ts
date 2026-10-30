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
  recruiter_id: z.string().uuid().nullable().optional(),
  opened_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  sl1_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  sl2_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  sl3_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  closed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
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
    const NEW = ["recruiter_id", "opened_on", "sl1_date", "sl2_date", "sl3_date", "closed_on"];
    const run = (payload: any) => {
      const q = data.id
        ? context.supabase.from("jobs").update(payload).eq("id", data.id).select("*").single()
        : context.supabase.from("jobs").insert(payload).select("*").single();
      return q;
    };
    let payload: any = { ...data, created_by: context.userId };
    let { data: row, error } = await run(payload);
    let skipped = false;
    // banco ainda sem as colunas novas (migração pendente): salva a vaga sem elas, sem perder o resto
    if (error && /schema cache|does not exist|Could not find/i.test(error.message) && NEW.some((k) => error!.message.includes(k))) {
      payload = Object.fromEntries(Object.entries(payload).filter(([k]) => !NEW.includes(k)));
      skipped = NEW.some((k) => (data as any)[k]);
      ({ data: row, error } = await run(payload));
    }
    if (error) throw new Error(error.message);
    if (skipped) (row as any)._skippedRecruitFields = true;
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

export const updateJobStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["open", "paused", "cancelled", "closed"]) }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("jobs").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
