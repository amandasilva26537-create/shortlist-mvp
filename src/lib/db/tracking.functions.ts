import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { z } from "zod";

const STAGES = [
  "published", "receiving_cvs", "screening", "interviews", "tests",
  "shortlist_sent", "hiring_manager_interview", "post_interview_feedback", "decision_offer", "closed",
] as const;

const MIGRATION_HINT = "Recurso de acompanhamento ainda não ativado no banco de dados (migração pendente).";
const isMissing = (m?: string) => /schema cache|does not exist|Could not find/i.test(m ?? "");

/** Registra uma nova etapa (sempre cria uma linha no histórico) e atualiza a etapa atual da vaga. */
export const setJobStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ job_id: z.string().uuid(), stage: z.enum(STAGES), note: z.string().max(1000).nullable().optional() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { error: hErr } = await (context.supabase as any).from("job_stage_history").insert({
      job_id: data.job_id,
      stage: data.stage,
      note: data.note?.trim() || null,
      created_by: context.userId,
    } as any);
    if (hErr) throw new Error(isMissing(hErr.message) ? MIGRATION_HINT : hErr.message);
    const { error } = await context.supabase.from("jobs").update({ process_stage: data.stage } as any).eq("id", data.job_id);
    if (error) throw new Error(isMissing(error.message) ? MIGRATION_HINT : error.message);
    return { ok: true };
  });

export const listJobStageHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ job_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("job_stage_history" as any)
      .select("id, stage, note, created_at")
      .eq("job_id", data.job_id)
      .order("created_at", { ascending: false });
    if (error) return isMissing(error.message) ? [] : (() => { throw new Error(error.message); })();
    return rows ?? [];
  });

export const saveJobShortlistDueDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ job_id: z.string().uuid(), due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("jobs").update({ shortlist_due_date: data.due_date } as any).eq("id", data.job_id);
    if (error) throw new Error(isMissing(error.message) ? MIGRATION_HINT : error.message);
    return { ok: true };
  });

/**
 * Página pública do cliente: acesso somente por token da vaga. Devolve apenas dados de acompanhamento
 * (empresa, vaga, status, etapas, datas, observação mais recente). Nada de candidatos ou dados internos.
 */
export const getPublicTracking = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) => z.object({ token: z.string().min(16).max(64) }).parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job } = await (supabaseAdmin as any)
      .from("jobs")
      .select("id, title, status, process_stage, shortlist_due_date, clients(name, brand)")
      .eq("tracking_token", data.token)
      .maybeSingle();
    if (!job) return null;
    const { data: history } = await (supabaseAdmin as any)
      .from("job_stage_history")
      .select("stage, note, created_at")
      .eq("job_id", job.id)
      .order("created_at", { ascending: true });
    const rows: { stage: string; note: string | null; created_at: string }[] = history ?? [];
    // Data mais recente de cada etapa registrada
    const stageDates: Record<string, string> = {};
    for (const r of rows) stageDates[r.stage] = r.created_at;
    const lastWithNote = [...rows].reverse().find((r) => r.note && r.note.trim());
    return {
      company: job.clients?.name ?? "",
      brand: job.clients?.brand ?? "portus",
      job_title: job.title as string,
      job_status: job.status as string,
      current_stage: (job.process_stage as string | null) ?? null,
      shortlist_due_date: (job.shortlist_due_date as string | null) ?? null,
      stage_dates: stageDates,
      latest_note: lastWithNote ? { text: lastWithNote.note!, date: lastWithNote.created_at } : null,
      closed_at: stageDates["closed"] ?? null,
      last_update: rows.length ? rows[rows.length - 1]!.created_at : null,
    };
  });
