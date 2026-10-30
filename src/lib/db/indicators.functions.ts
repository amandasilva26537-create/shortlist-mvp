import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { z } from "zod";
import {
  applyFilters, byRecruiter, closedByMonth, computeJobs, computeStats, normBrand, shortlistRows,
  type Brand, type Dataset,
} from "@/lib/indicators";

const isMissing = (m?: string) => /schema cache|does not exist|Could not find/i.test(m ?? "");
const ALL: Brand[] = ["moove", "portus"];

/** Lê todas as linhas (o banco limita 1000 por consulta). Tabela ausente = lista vazia. */
async function fetchAll(q: () => any, optional = false): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await q().range(from, from + 999);
    if (error) { if (optional && isMissing(error.message)) return []; throw new Error(error.message); }
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/**
 * Marcas que o usuário pode ver: administradores veem as duas (visão consolidada);
 * os demais, apenas as marcas liberadas em user_brand_access. Sem liberação = sem acesso aos indicadores.
 */
async function allowedBrands(sb: any, userId: string, roles: string[] | undefined): Promise<{ brands: Brand[]; isAdmin: boolean }> {
  if (roles?.includes("admin")) return { brands: ALL, isAdmin: true };
  const { data, error } = await sb.from("user_brand_access").select("brand").eq("user_id", userId);
  if (error) return { brands: [], isAdmin: false };
  const brands = [...new Set((data ?? []).map((r: any) => normBrand(r.brand)))] as Brand[];
  return { brands, isAdmin: false };
}

export const getIndicators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      brand: z.enum(["all", "moove", "portus"]).default("all"),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
      clientId: z.string().uuid().nullable().default(null),
      recruiter: z.string().max(120).nullable().default(null),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { brands, isAdmin } = await allowedBrands(sb, context.userId, (context as any).roles);
    if (!brands.length) return { noAccess: true as const, isAdmin };

    const [jobs, clients, shortlists, hiredLinks, hiredApps, closedStage, profiles] = await Promise.all([
      fetchAll(() => sb.from("jobs").select("id, title, status, created_at, client_id, created_by").order("id")),
      fetchAll(() => sb.from("clients").select("id, name, brand").order("id")),
      fetchAll(() => sb.from("shortlists").select("id, job_id, status, published_at, created_at, responsible, owner_id").order("id")),
      fetchAll(() => sb.from("shortlist_candidates").select("shortlist_id, candidate_id, status").eq("status", "contratado").order("shortlist_id")),
      fetchAll(() => sb.from("applications").select("job_id, candidate_id").eq("status", "hired").order("id"), true),
      fetchAll(() => sb.from("job_stage_history").select("job_id, created_at").eq("stage", "closed").order("id"), true),
      fetchAll(() => sb.from("profiles").select("id, full_name").order("id")),
    ]);
    const closedStageDates: Record<string, string[]> = {};
    for (const r of closedStage) (closedStageDates[r.job_id] ??= []).push(r.created_at);
    const people: Record<string, string> = {};
    for (const p of profiles) if (p.full_name) people[p.id] = p.full_name;
    const ds: Dataset = { jobs, clients, shortlists, hiredLinks, hiredApps, closedStageDates, people };

    const brand = data.brand !== "all" && !brands.includes(data.brand) ? null : data.brand;
    if (brand === null) return { noAccess: true as const, isAdmin };
    const base = { brands, brand, from: data.from, to: data.to };
    const all = computeJobs(ds);
    const inBrand = applyFilters(all, { brands, brand });
    const scope = applyFilters(all, { ...base, clientId: data.clientId });
    // cliente selecionado precisa pertencer à empresa escolhida
    const clientOk = !data.clientId || inBrand.some((j) => j.clientId === data.clientId);
    const scopeJobs = clientOk ? scope : [];
    const focus = data.recruiter ? scopeJobs.filter((j) => j.recruiterKey === data.recruiter) : scopeJobs;

    const clientOptions = [...new Map(inBrand.map((j) => [j.clientId, { id: j.clientId, name: j.client, brand: j.brand }])).values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const recruiterOptions = [...new Map(inBrand.filter((j) => !data.clientId || j.clientId === data.clientId).map((j) => [j.recruiterKey, { key: j.recruiterKey, name: j.recruiter }])).values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    return {
      noAccess: false as const, isAdmin, brands,
      options: { clients: clientOptions, recruiters: recruiterOptions },
      stats: computeStats(focus, base),
      chart: closedByMonth(focus, base),
      shortlistRows: shortlistRows(focus, base),
      recruiterRows: byRecruiter(scopeJobs, base),
      jobsByRecruiter: scopeJobs.map((j) => ({ ...j })),
    };
  });
