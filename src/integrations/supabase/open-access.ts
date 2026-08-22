import { createMiddleware } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Acesso aberto: o sistema opera sem login.
 *
 * Este middleware substitui a verificação de sessão. Todas as operações de
 * dados passam a rodar com a chave de serviço do backend, ignorando as
 * políticas de acesso por usuário. Mantém a mesma forma de contexto
 * (`supabase`, `userId`, `claims`) para não alterar os handlers existentes.
 */

/** Identidade única usada como autor de todos os registros no modo aberto. */
export const OPEN_ACCESS_USER_ID = "00000000-0000-0000-0000-000000000001";

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

  const key = SERVICE_KEY || PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error("Backend não configurado: SUPABASE_URL / chave ausente.");
  }

  const supabase = createClient<Database>(SUPABASE_URL, key, {
    global: { fetch: createServiceFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  return next({
    context: {
      supabase,
      userId: OPEN_ACCESS_USER_ID,
      claims: { sub: OPEN_ACCESS_USER_ID, role: "open_access" } as Record<string, unknown>,
    },
  });
});
