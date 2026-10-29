/**
 * Registro de auditoria (somente servidor). Ainda NÃO está ligado a nenhuma tela
 * ou função existente — será usado pelas próximas etapas do ATS.
 *
 * As tabelas são novas e não constam nos tipos gerados do Supabase, por isso o
 * cliente é tratado como `any` aqui. Falha de auditoria nunca deve derrubar a ação
 * principal, mas é sempre escrita no log do servidor.
 */
type AuditAction =
  | "view" | "download_resume" | "export" | "share_view" | "create" | "update"
  | "delete" | "ai_send" | "consent_change" | "dsr_update" | "login_denied";

export interface AuditEvent {
  actorUserId?: string | null;
  actorKind?: "staff" | "client_portal" | "system" | "integration";
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  candidateId?: string | null;
  brand?: "moove" | "portus" | null;
  /** Nunca colocar dados pessoais em metadata (apenas ids, contagens, códigos). */
  metadata?: Record<string, string | number | boolean | null | string[]>;
}

export async function logAccess(supabase: any, e: AuditEvent): Promise<void> {
  try {
    const { error } = await supabase.from("access_audit_log").insert({
      actor_user_id: e.actorUserId ?? null,
      actor_kind: e.actorKind ?? "staff",
      action: e.action,
      entity_type: e.entityType,
      entity_id: e.entityId ?? null,
      candidate_id: e.candidateId ?? null,
      brand: e.brand ?? null,
      metadata: e.metadata ?? {},
    });
    if (error) console.error("[audit] falha ao registrar:", error.message);
  } catch (err: any) {
    console.error("[audit] erro inesperado:", err?.message ?? err);
  }
}

export interface AiUsageEvent {
  actorUserId?: string | null;
  functionName: string;
  provider: string;
  model: string;
  candidateId?: string | null;
  entityType?: string;
  entityId?: string | null;
  inputChars?: number;
  inputFiles?: number;
  injectionSignals?: string[];
  status?: "ok" | "error" | "blocked";
}

export async function logAiUsage(supabase: any, e: AiUsageEvent): Promise<void> {
  try {
    const { error } = await supabase.from("ai_processing_log").insert({
      actor_user_id: e.actorUserId ?? null,
      function_name: e.functionName,
      provider: e.provider,
      model: e.model,
      candidate_id: e.candidateId ?? null,
      entity_type: e.entityType ?? null,
      entity_id: e.entityId ?? null,
      input_chars: e.inputChars ?? null,
      input_files: e.inputFiles ?? null,
      injection_signals: e.injectionSignals ?? [],
      status: e.status ?? "ok",
    });
    if (error) console.error("[ai-log] falha ao registrar:", error.message);
  } catch (err: any) {
    console.error("[ai-log] erro inesperado:", err?.message ?? err);
  }
}
