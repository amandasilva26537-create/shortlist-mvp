import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { z } from "zod";

/** Etiquetas internas de candidatos (nunca aparecem no perfil compartilhado). */

export const listTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: tags, error } = await context.supabase
      .from("tags")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: links } = await context.supabase.from("candidate_tags").select("tag_id");
    const counts = new Map<string, number>();
    for (const l of links ?? []) counts.set(l.tag_id, (counts.get(l.tag_id) ?? 0) + 1);
    return (tags ?? []).map((t) => ({ ...t, candidate_count: counts.get(t.id) ?? 0 }));
  });

export const upsertTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        color: z.string().min(1).default("slate"),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const payload = { name: data.name.trim(), color: data.color };
    const query = data.id
      ? context.supabase.from("tags").update(payload).eq("id", data.id).select("*").single()
      : context.supabase.from("tags").insert(payload).select("*").single();
    const { data: row, error } = await query;
    if (error) {
      if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
        throw new Error("Já existe uma etiqueta com esse nome.");
      }
      throw new Error(error.message);
    }
    return row;
  });

export const deleteTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    // O vínculo com os candidatos é removido em cascata; os candidatos permanecem.
    const { error } = await context.supabase.from("tags").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCandidateTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        candidate_id: z.string().uuid(),
        tag_id: z.string().uuid(),
        active: z.boolean(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    if (data.active) {
      const { error } = await context.supabase
        .from("candidate_tags")
        .upsert(
          { candidate_id: data.candidate_id, tag_id: data.tag_id },
          { onConflict: "candidate_id,tag_id" },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("candidate_tags")
        .delete()
        .eq("candidate_id", data.candidate_id)
        .eq("tag_id", data.tag_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Sugestões de habilidades e ferramentas já cadastradas, para evitar duplicidade. */
export const listSkillSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("candidates").select("competencies");
    if (error) throw new Error(error.message);
    const buckets: Record<string, Set<string>> = {
      hard_skills: new Set(),
      soft_skills: new Set(),
      leadership: new Set(),
      tools: new Set(),
      technical: new Set(),
    };
    for (const row of data ?? []) {
      const comp = (row.competencies ?? {}) as Record<string, unknown>;
      for (const key of Object.keys(buckets)) {
        const arr = comp[key];
        if (Array.isArray(arr)) {
          for (const item of arr) {
            if (typeof item === "string" && item.trim()) buckets[key]!.add(item.trim());
          }
        }
      }
    }
    return Object.fromEntries(
      Object.entries(buckets).map(([k, v]) => [k, Array.from(v).sort((a, b) => a.localeCompare(b, "pt-BR"))]),
    ) as Record<string, string[]>;
  });
