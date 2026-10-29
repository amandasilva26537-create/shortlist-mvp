import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";

const isMissing = (m?: string) => /schema cache|does not exist|Could not find/i.test(m ?? "");

/** Visão agregada das candidaturas por vaga (para menu Candidaturas e Dashboard). Somente leitura. */
export const getApplicationsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const empty = { available: false, perJob: {} as Record<string, { total: number; active: number; prescreened: number; last_at: string | null }>, newLast7d: 0, prescreened: 0, recent: [] as any[] };
    const { data: apps, error } = await sb.from("applications").select("id, job_id, status, stage, applied_at, candidates(full_name), jobs(title, clients(name))").order("applied_at", { ascending: false }).limit(2000);
    if (error) { if (isMissing(error.message)) return empty; throw new Error(error.message); }
    const { data: ms } = await sb.from("application_matches").select("application_id, prescreened");
    const pre = new Set<string>((ms ?? []).filter((m: any) => m.prescreened).map((m: any) => m.application_id));
    const perJob: typeof empty.perJob = {};
    const week = Date.now() - 7 * 864e5;
    let newLast7d = 0, prescreened = 0;
    for (const a of apps ?? []) {
      const j = (perJob[a.job_id] ??= { total: 0, active: 0, prescreened: 0, last_at: null });
      j.total += 1;
      const isActive = a.status === "active" || a.status === "hired";
      if (isActive) { j.active += 1; if (pre.has(a.id)) { j.prescreened += 1; prescreened += 1; } if (+new Date(a.applied_at) >= week) newLast7d += 1; }
      if (!j.last_at || a.applied_at > j.last_at) j.last_at = a.applied_at;
    }
    const recent = (apps ?? []).slice(0, 6).map((a: any) => ({ id: a.id, job_id: a.job_id, name: a.candidates?.full_name ?? "Candidato", job: a.jobs?.title ?? "", client: a.jobs?.clients?.name ?? "", applied_at: a.applied_at }));
    return { available: true, perJob, newLast7d, prescreened, recent };
  });

/** Estado da divulgação de cada vaga (rascunho / aprovada / publicada). Somente leitura. */
export const getPostingsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("job_postings").select("job_id, slug, is_published, approved_at, published_at, updated_at");
    if (error) { if (isMissing(error.message)) return { available: false, byJob: {} as Record<string, any> }; throw new Error(error.message); }
    const byJob: Record<string, { slug: string; is_published: boolean; approved: boolean; published_at: string | null }> = {};
    for (const p of data ?? []) byJob[p.job_id] = { slug: p.slug, is_published: !!p.is_published, approved: !!p.approved_at, published_at: p.published_at ?? null };
    return { available: true, byJob };
  });

/** Atividades recentes de divulgação/candidaturas (log de atividades, sem dados pessoais). */
export const getRecentActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("activities").select("id, action, entity_type, entity_id, created_at").like("action", "job_posting.%").order("created_at", { ascending: false }).limit(8);
    if (error) return [] as any[];
    return data ?? [];
  });
