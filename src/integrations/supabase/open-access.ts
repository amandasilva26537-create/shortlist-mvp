import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Acesso restrito à equipe: exige uma sessão válida (e-mail e senha) de um
 * recrutador ativo. Depois de validar o usuário, as operações de dados rodam
 * com a chave de serviço do backend (os dados são compartilhados por toda a
 * equipe). Mantém a mesma forma de contexto (`supabase`, `userId`, `claims`)
 * para não alterar os handlers existentes.
 */

function isOpaqueKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createServiceFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    }
    if (isOpaqueKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

export const openAccess = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SERVICE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];

  // A checagem de equipe precisa da chave de serviço: com a chave pública as
  // leituras de perfil/papéis voltam vazias e o acesso é negado por engano.
  const key = SERVICE_KEY;
  if (!SUPABASE_URL || !key || !PUBLISHABLE_KEY) {
    throw new Error("Backend indisponível no momento. Tente novamente em instantes.");
  }

  const authHeader = getRequest()?.headers?.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    throw new Error("Não autorizado: faça login para acessar o sistema.");
  }

  const authClient = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { fetch: createServiceFetch(PUBLISHABLE_KEY) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    throw new Error("Sessão inválida ou expirada. Faça login novamente.");
  }

  const supabase = createClient<Database>(SUPABASE_URL, key, {
    global: { fetch: createServiceFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const [{ data: profile, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
    supabase.from("profiles").select("status, full_name, email, role_title").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (pErr || rErr) console.error("[open-access] read error", pErr?.message, rErr?.message);
  console.error("[open-access] user", user.id, "profile", JSON.stringify(profile), "roles", JSON.stringify(roles));

  const roleList = (roles ?? []).map((r: any) => String(r.role));
  const isMember = roleList.length > 0 && (profile?.status ?? "active") === "active";
  if (!isMember) {
    throw new Error("Acesso não liberado. Solicite ao administrador que inclua seu e-mail na equipe.");
  }

  return next({
    context: {
      supabase,
      userId: user.id,
      roles: roleList,
      profile: profile ?? null,
      claims: { sub: user.id, email: user.email, roles: roleList } as Record<string, unknown>,
    },
  });
});
