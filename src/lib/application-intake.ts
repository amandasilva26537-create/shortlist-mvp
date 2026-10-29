/** Candidatura pela Página de Carreiras — regras puras (validação, consentimento, hash). */
import { z } from "zod";

export const POLICY_VERSION = "2026-10-v1";
export const APPLY_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const CONSENT_TEXT = {
  selection_process:
    "Li e estou ciente de que a Moove Talent tratará meus dados (nome, contato e currículo) para avaliar minha candidatura a esta vaga.",
  talent_pool: "Autorizo manter meus dados no banco de talentos da Moove Talent para futuras oportunidades.",
  client_sharing: "Autorizo o envio do meu perfil à empresa contratante desta vaga, caso eu avance no processo.",
  ai_analysis:
    "Autorizo a análise do meu currículo com apoio de inteligência artificial, que pode envolver prestadores localizados fora do Brasil.",
} as const;

export const ApplicationFormSchema = z.object({
  slug: z.string().min(8).max(80),
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(200),
  phone: z.string().trim().max(30).optional().default(""),
  linkedin_url: z.string().trim().max(300).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  consent_selection: z.literal(true, { errorMap: () => ({ message: "É necessário aceitar o tratamento dos dados para se candidatar." }) }),
  consent_talent_pool: z.boolean().default(false),
  consent_client_sharing: z.boolean().default(false),
  consent_ai: z.boolean().default(false),
  /** Honeypot: humanos não preenchem. */
  website: z.string().max(200).optional().default(""),
  file: z.object({
    name: z.string().min(1).max(200),
    mime: z.string().max(120).default(""),
    base64: z.string().min(10).max(Math.ceil((APPLY_MAX_FILE_BYTES * 4) / 3) + 100),
  }),
});
export type ApplicationForm = z.infer<typeof ApplicationFormSchema>;

/** Aceita só URLs do LinkedIn (https). Retorna "" se inválida. */
export function normalizeLinkedin(v: string): string {
  const t = v.trim();
  if (!t) return "";
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    if (!/(^|\.)linkedin\.com$/i.test(u.hostname)) return "";
    return `https://${u.hostname.toLowerCase()}${u.pathname}`.replace(/\/+$/, "").slice(0, 300);
  } catch { return ""; }
}

export function normalizePhone(v: string): string {
  const t = v.replace(/[^\d+()\-\s.]/g, "").trim();
  return t.replace(/\D/g, "").length >= 6 ? t.slice(0, 30) : "";
}

export function decodeBase64(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new Error("Arquivo inválido.");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export async function sha256Text(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ConsentRow { purpose_code: string; granted: boolean; text: string }

/** Finalidades registradas: a obrigatória sempre; as opcionais só quando marcadas. */
export function buildConsentRows(f: Pick<ApplicationForm, "consent_talent_pool" | "consent_client_sharing" | "consent_ai">): ConsentRow[] {
  const rows: ConsentRow[] = [{ purpose_code: "selection_process", granted: true, text: CONSENT_TEXT.selection_process }];
  if (f.consent_talent_pool) rows.push({ purpose_code: "talent_pool", granted: true, text: CONSENT_TEXT.talent_pool });
  if (f.consent_client_sharing) rows.push({ purpose_code: "client_sharing", granted: true, text: CONSENT_TEXT.client_sharing });
  if (f.consent_ai) {
    rows.push({ purpose_code: "ai_analysis", granted: true, text: CONSENT_TEXT.ai_analysis });
    rows.push({ purpose_code: "international_transfer", granted: true, text: CONSENT_TEXT.ai_analysis });
  }
  return rows;
}

export const RATE_LIMIT_PER_HOUR = 5;
