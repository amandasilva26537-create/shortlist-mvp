/**
 * Validação de currículos enviados (PDF/DOCX) ANTES de gravar no storage ou
 * enviar a qualquer serviço. Não substitui um antivírus: é uma barreira
 * básica contra arquivos que executam código, estouram memória ou fingem ser outro tipo.
 */

export const RESUME_MAX_BYTES = 10 * 1024 * 1024;
export const RESUME_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;
export type ResumeKind = keyof typeof RESUME_TYPES;

export interface UploadCheck {
  ok: boolean;
  kind?: ResumeKind;
  mime?: string;
  /** Motivos de rejeição (ok=false) ou avisos (ok=true). */
  flags: string[];
}

const dec = new TextDecoder("latin1");

function startsWith(bytes: Uint8Array, sig: number[], offset = 0) {
  return sig.every((b, i) => bytes[offset + i] === b);
}

function extOf(name: string): string {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(name.trim());
  return m ? m[1]!.toLowerCase() : "";
}

/** Procura marcadores perigosos em PDF (aceita nomes escritos com #xx). */
function pdfRiskFlags(bytes: Uint8Array): string[] {
  const text = dec.decode(bytes.subarray(0, Math.min(bytes.length, RESUME_MAX_BYTES)));
  const flat = text.replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const flags: string[] = [];
  const rules: [string, RegExp][] = [
    ["pdf_javascript", /\/(JavaScript|JS)\b/],
    ["pdf_launch_action", /\/Launch\b/],
    ["pdf_open_action", /\/(OpenAction|AA)\b/],
    ["pdf_embedded_file", /\/(EmbeddedFile|EmbeddedFiles)\b/],
    ["pdf_submit_form", /\/(SubmitForm|ImportData)\b/],
    ["pdf_encrypted", /\/Encrypt\b/],
    ["pdf_rich_media", /\/(RichMedia|XFA)\b/],
  ];
  for (const [code, re] of rules) if (re.test(flat)) flags.push(code);
  return flags;
}

/** Lê o diretório central do ZIP (sem descompactar) para detectar macros e zip-bomb. */
function docxRiskFlags(bytes: Uint8Array): string[] {
  const flags: string[] = [];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i -= 1) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return ["docx_zip_invalid"];
  const entries = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  if (entries > 2000) flags.push("docx_too_many_entries");
  let totalUncompressed = 0;
  let hasDocumentXml = false;
  for (let n = 0; n < Math.min(entries, 2000); n += 1) {
    if (off + 46 > bytes.length || dv.getUint32(off, true) !== 0x02014b50) { flags.push("docx_zip_invalid"); break; }
    const compSize = dv.getUint32(off + 20, true);
    const rawSize = dv.getUint32(off + 24, true);
    const nameLen = dv.getUint16(off + 28, true);
    const extraLen = dv.getUint16(off + 30, true);
    const commentLen = dv.getUint16(off + 32, true);
    const name = dec.decode(bytes.subarray(off + 46, off + 46 + nameLen)).toLowerCase();
    totalUncompressed += rawSize;
    if (name === "word/document.xml") hasDocumentXml = true;
    if (name.includes("vbaproject") || name.endsWith(".bin") && name.includes("vba")) flags.push("docx_macro");
    if (name.includes("activex") || name.includes("/embeddings/")) flags.push("docx_embedded_object");
    if (name.includes("..") || name.startsWith("/")) flags.push("docx_path_traversal");
    if (compSize > 0 && rawSize / compSize > 200 && rawSize > 5_000_000) flags.push("docx_zip_bomb_ratio");
    off += 46 + nameLen + extraLen + commentLen;
  }
  if (!hasDocumentXml) flags.push("docx_not_word_document");
  if (totalUncompressed > 100 * 1024 * 1024) flags.push("docx_zip_bomb_size");
  return Array.from(new Set(flags));
}

const HARD_REJECT = new Set([
  "pdf_javascript", "pdf_launch_action", "pdf_open_action", "pdf_embedded_file", "pdf_submit_form", "pdf_rich_media",
  "docx_macro", "docx_embedded_object", "docx_path_traversal", "docx_zip_bomb_ratio", "docx_zip_bomb_size",
  "docx_too_many_entries", "docx_zip_invalid", "docx_not_word_document",
]);

/**
 * Valida nome, tamanho, tipo declarado e conteúdo real (assinatura) do arquivo.
 * `pdf_encrypted` entra como aviso (ok=true), pois a IA não consegue ler esses PDFs.
 */
export function validateResumeUpload(input: { filename: string; declaredMime?: string | null; bytes: Uint8Array }): UploadCheck {
  const { filename, declaredMime, bytes } = input;
  const flags: string[] = [];
  if (bytes.length === 0) return { ok: false, flags: ["empty_file"] };
  if (bytes.length > RESUME_MAX_BYTES) return { ok: false, flags: ["file_too_large"] };

  const ext = extOf(filename);
  if (/\.(\w{1,6})\.(\w{1,6})$/.test(filename) && !/\.(pdf|docx)$/i.test(filename)) flags.push("double_extension");
  if (ext !== "pdf" && ext !== "docx") return { ok: false, flags: [...flags, "extension_not_allowed"] };

  const isPdf = startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]) || // %PDF- (aceita até 1 KB de lixo antes)
    dec.decode(bytes.subarray(0, 1024)).includes("%PDF-");
  const isZip = startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
  const kind: ResumeKind | null = isPdf && ext === "pdf" ? "pdf" : isZip && ext === "docx" ? "docx" : null;
  if (!kind) return { ok: false, flags: [...flags, "content_does_not_match_extension"] };

  const expected = RESUME_TYPES[kind];
  if (declaredMime && declaredMime !== expected && declaredMime !== "application/octet-stream") flags.push("declared_mime_mismatch");

  const risks = kind === "pdf" ? pdfRiskFlags(bytes) : docxRiskFlags(bytes);
  flags.push(...risks);
  const rejected = flags.some((f) => HARD_REJECT.has(f));
  return { ok: !rejected, kind, mime: expected, flags };
}

/**
 * Caminho de armazenamento 100% gerado pelo sistema. O nome enviado pelo usuário
 * nunca entra no caminho (evita traversal, sobrescrita e caracteres perigosos).
 */
export function buildResumeStoragePath(brand: "moove" | "portus", candidateId: string, kind: ResumeKind): string {
  if (!/^[0-9a-f-]{36}$/i.test(candidateId)) throw new Error("candidate_id inválido");
  return `${brand}/${candidateId}/${globalThis.crypto.randomUUID()}.${kind}`;
}

/** Nome de arquivo para exibição/Content-Disposition (nunca usado como caminho). */
export function safeDisplayFilename(name: string): string {
  return name.replace(/[\u0000-\u001F\u007F"\\/:*?<>|]/g, "_").replace(/\.{2,}/g, ".").slice(0, 120) || "curriculo";
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await globalThis.crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}
