import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { z } from "zod";

// Somente administradores podem gerenciar a equipe.
async function assertAdmin(_supabase: any, _userId: string, roles?: string[]) {
  if (!roles?.includes("admin")) {
    throw new Error("Apenas administradores podem gerenciar a equipe.");
  }
}

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = (context as any).roles as string[] | undefined;
    const profile = (context as any).profile as
      | { full_name?: string; email?: string; role_title?: string; status?: string }
      | null;
    return {
      userId: context.userId,
      isAdmin: !!roles?.includes("admin"),
      isRecruiter: !!roles?.includes("recruiter") || !!roles?.includes("admin"),
      isActive: true,
      status: profile?.status ?? "active",
      profile: profile ?? null,
    };
  });


export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId, (context as any).roles);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role_title, status, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = (profiles ?? []).map((p: any) => p.id);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    return (profiles ?? []).map((p: any) => ({
      ...p,
      roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
    }));
  });

export const inviteRecruiter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      full_name: z.string().min(1),
      email: z.string().email(),
      role_title: z.string().nullable().optional(),
      status: z.enum(["active", "inactive"]).optional(),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId, (context as any).roles);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    let userId: string;
    if (existing?.id) {
      userId = existing.id;
    } else {
      const redirectTo =
        (process.env.PUBLIC_APP_URL as string | undefined) ||
        "https://intel-select-hub.lovable.app/auth";
      const { data: invited, error: inviteErr } = await (supabaseAdmin.auth as any).admin.inviteUserByEmail(
        data.email,
        { data: { full_name: data.full_name }, redirectTo },
      );
      if (inviteErr) {
        // Fallback: create user directly (no email) so the admin can share credentials manually
        const { data: created, error: createErr } = await (supabaseAdmin.auth as any).admin.createUser({
          email: data.email,
          email_confirm: false,
          user_metadata: { full_name: data.full_name },
        });
        if (createErr) throw new Error(inviteErr.message || createErr.message);
        userId = created.user.id;
      } else {
        userId = invited.user.id;
      }
    }

    // Ensure profile row (handle_new_user trigger normally creates it, but be defensive)
    await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: data.full_name,
        email: data.email,
        role_title: data.role_title ?? null,
        status: data.status ?? "active",
      });

    // Ensure recruiter role
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "recruiter" as any }, { onConflict: "user_id,role" });

    return { ok: true, id: userId };
  });

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      id: z.string().uuid(),
      full_name: z.string().min(1).optional(),
      role_title: z.string().nullable().optional(),
      status: z.enum(["active", "inactive"]).optional(),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId, (context as any).roles);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = {};
    if (data.full_name !== undefined) patch.full_name = data.full_name;
    if (data.role_title !== undefined) patch.role_title = data.role_title;
    if (data.status !== undefined) patch.status = data.status;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMemberAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ id: z.string().uuid(), makeAdmin: z.boolean() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId, (context as any).roles);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.makeAdmin) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.id, role: "admin" as any }, { onConflict: "user_id,role" });
    } else {
      if (data.id === context.userId) {
        throw new Error("Você não pode remover o próprio acesso de administrador.");
      }
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.id)
        .eq("role", "admin" as any);
    }
    return { ok: true };
  });

/** Recrutadores oficiais (cadastrados em Equipe, ativos) — usado para escolher o recrutador da vaga. Qualquer usuário autenticado. */
export const listRecruiters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").in("role", ["recruiter", "admin"] as any);
    const ids = [...new Set((roles ?? []).map((r: any) => r.user_id))];
    if (!ids.length) return [] as { id: string; full_name: string }[];
    const { data, error } = await supabaseAdmin.from("profiles").select("id, full_name, status").in("id", ids).order("full_name");
    if (error) throw new Error(error.message);
    return (data ?? []).filter((p: any) => p.full_name && p.status !== "inactive").map((p: any) => ({ id: p.id as string, full_name: p.full_name as string }));
  });

/** Exclui o cadastro de um membro da Equipe. As vagas dele ficam "sem recrutador"; nenhuma vaga/shortlist é apagada. */
export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId, (context as any).roles);
    if (data.id === context.userId) throw new Error("Você não pode excluir o seu próprio cadastro.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // libera as vagas atribuídas (ignora se a coluna ainda não existe)
    await (supabaseAdmin.from("jobs") as any).update({ recruiter_id: null }).eq("recruiter_id", data.id);
    const { error: authErr } = await (supabaseAdmin.auth as any).admin.deleteUser(data.id);
    if (authErr) {
      throw new Error("Não foi possível excluir: este membro tem registros vinculados (vagas, shortlists). Use “Desativar” para tirá-lo da equipe sem perder o histórico.");
    }
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin.from("profiles").delete().eq("id", data.id);
    return { ok: true };
  });
