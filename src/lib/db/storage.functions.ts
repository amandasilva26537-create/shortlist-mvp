import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { openAccess } from "@/integrations/supabase/open-access";

/**
 * Upload de arquivos pelo backend.
 *
 * Os buckets são privados e não possuem políticas públicas: o navegador nunca
 * escreve direto no storage. O arquivo chega aqui em base64 e é gravado com a
 * credencial de serviço, evitando qualquer acesso anônimo aos documentos.
 */
export const uploadAppFile = createServerFn({ method: "POST" })
  .middleware([openAccess])
  .inputValidator((v: unknown) =>
    z
      .object({
        bucket: z.enum(["candidate-files", "client-logos", "job-briefings"]),
        path: z.string().min(1).max(300),
        content_type: z.string().max(200).optional(),
        data_base64: z.string().min(1).max(28_000_000),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const safePath = data.path.replace(/\.\./g, "_").replace(/[^a-zA-Z0-9/._-]/g, "_");
    const raw = atob(data.data_base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    const contentType = data.content_type || "application/octet-stream";
    const blob = new Blob([bytes], { type: contentType });
    const { error } = await context.supabase.storage.from(data.bucket).upload(safePath, blob, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(`Falha no upload: ${error.message}`);
    // Buckets são privados: devolvemos uma URL assinada de longa duração.
    const { data: signed, error: signError } = await context.supabase.storage
      .from(data.bucket)
      .createSignedUrl(safePath, 60 * 60 * 24 * 365 * 5);
    if (signError || !signed?.signedUrl) throw new Error(`Falha ao gerar link do arquivo: ${signError?.message ?? "desconhecido"}`);
    return { path: safePath, url: signed.signedUrl };
  });

