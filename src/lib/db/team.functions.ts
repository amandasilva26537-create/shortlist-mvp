import { createServerFn } from "@tanstack/react-start";
import { openAccess as requireSupabaseAuth } from "@/integrations/supabase/open-access";
import { z } from "zod";

// Acesso aberto: o sistema funciona sem login, então não há papéis a validar.
// A função é mantida para não alterar os handlers que já a chamam.
async function assertAdmin(_supabase: any, _userId: string) {
  return;
}

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Modo aberto: todo visitante tem acesso total de recrutador e administrador.
    return {
      userId: context.userId,
      isAdmin: true,
      isRecruiter: true,
      isActive: true,
      status: "active",
      profile: null as { full_name?: string; email?: string; role_title?: string; status?: string } | null,
    };
  });

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
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
    await assertAdmin(context.supabase, context.userId);
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
    await assertAdmin(context.supabase, context.userId);
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
    await assertAdmin(context.supabase, context.userId);
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
