import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ShortlistInput = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  job_id: z.string().uuid(),
  number: z.number().optional(),
  title: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  status: z.enum(["draft", "sent", "closed"]).optional(),
  responsible: z.string().nullable().optional(),
  send_date: z.string().nullable().optional(),
});

export const listShortlists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shortlists")
      .select("*, clients(name), jobs(title)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getShortlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: sl, error } = await context.supabase
      .from("shortlists")
      .select("*, clients(*), jobs(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sl) return null;
    const { data: links } = await context.supabase
      .from("shortlist_candidates")
      .select("*, candidates(*)")
      .eq("shortlist_id", data.id)
      .order("position");
    return { ...sl, candidates: links ?? [] };
  });

export const nextShortlistNumber = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ client_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("shortlists")
      .select("number")
      .eq("client_id", data.client_id)
      .order("number", { ascending: false })
      .limit(1);
    const max = rows?.[0]?.number ?? 0;
    return { number: max + 1 };
  });

export const upsertShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ShortlistInput.parse(v))
  .handler(async ({ data, context }) => {
    const payload = { ...data, owner_id: context.userId } as any;
    const query = data.id
      ? context.supabase.from("shortlists").update(payload).eq("id", data.id).select("*").single()
      : context.supabase.from("shortlists").insert(payload).select("*").single();
    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    return row;
  });

export const setShortlistCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      shortlist_id: z.string().uuid(),
      candidate_ids: z.array(z.string().uuid()),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await context.supabase.from("shortlist_candidates").delete().eq("shortlist_id", data.shortlist_id);
    if (data.candidate_ids.length > 0) {
      const rows = data.candidate_ids.map((cid, i) => ({
        shortlist_id: data.shortlist_id,
        candidate_id: cid,
        position: i,
      }));
      const { error } = await context.supabase.from("shortlist_candidates").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const publishShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: links } = await context.supabase
      .from("shortlist_candidates")
      .select("candidate_id")
      .eq("shortlist_id", data.id);
    if (!links || links.length === 0) throw new Error("Adicione ao menos um candidato antes de publicar");
    const { data: row, error } = await context.supabase
      .from("shortlists")
      .update({ status: "sent", published_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("shortlists").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
