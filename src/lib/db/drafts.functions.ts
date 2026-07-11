import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listDrafts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("drafts")
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      kind: z.string(),
      entity_id: z.string().uuid().nullable().optional(),
      title: z.string().nullable().optional(),
      payload: z.any(),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, user_id: context.userId };
    const query = data.id
      ? context.supabase.from("drafts").update(payload).eq("id", data.id).select("*").single()
      : context.supabase.from("drafts").insert(payload).select("*").single();
    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("drafts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
