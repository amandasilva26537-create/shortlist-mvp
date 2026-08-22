import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { z } from "zod";
import { CandidateInput } from "./candidates.schema";


export const listCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const { data: links } = await context.supabase
      .from("candidate_tags")
      .select("candidate_id, tags(id, name, color)");
    const byCandidate = new Map<string, any[]>();
    for (const l of links ?? []) {
      if (!l.tags) continue;
      const arr = byCandidate.get(l.candidate_id) ?? [];
      arr.push(l.tags);
      byCandidate.set(l.candidate_id, arr);
    }
    return rows.map((c) => ({ ...c, tags: byCandidate.get(c.id) ?? [] }));
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
    const { data: tagLinks } = await context.supabase
      .from("candidate_tags")
      .select("tags(id, name, color)")
      .eq("candidate_id", data.id);
    return {
      ...cand,
      documents: docs ?? [],
      tags: (tagLinks ?? []).map((l: any) => l.tags).filter(Boolean),
    };
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
