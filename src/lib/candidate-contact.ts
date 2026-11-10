/** Cadastro de candidato: telefone e e-mail são obrigatórios para salvar. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const digits = (s: string) => s.replace(/\D/g, "");

/** Retorna mensagens de erro (vazio = ok). Telefone aceita +, espaços, parênteses e hífens; precisa de 8 a 15 dígitos. */
export function validateContact(input: { email?: string | null; phone?: string | null }): { email?: string; phone?: string } {
  const out: { email?: string; phone?: string } = {};
  const email = (input.email ?? "").trim();
  const phone = (input.phone ?? "").trim();
  if (!email) out.email = "E-mail é obrigatório.";
  else if (!EMAIL_RE.test(email)) out.email = "E-mail inválido.";
  if (!phone) out.phone = "Telefone é obrigatório.";
  else {
    const n = digits(phone).length;
    if (n < 8 || n > 15 || /[^\d+()\-.\s]/.test(phone)) out.phone = "Telefone inválido (use DDD/país e número).";
  }
  return out;
}

export const contactErrorMessage = (e: { email?: string; phone?: string }) => [e.phone, e.email].filter(Boolean).join(" ");

/** Status "provisórios" do fluxo de cadastro (registro temporário durante a geração com IA): ainda não é o salvamento final. */
export const PROVISIONAL_STATUSES = new Set(["rascunho", "em_processamento", "aguardando_revisao"]);
