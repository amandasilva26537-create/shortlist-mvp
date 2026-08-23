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
    const { error } = await context.supabase.storage.from(data.bucket).upload(safePath, bytes, {
      contentType: data.content_type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return {
      path: safePath,
      url: `${process.env["SUPABASE_URL"]}/storage/v1/object/public/${data.bucket}/${safePath}`,
    };
  });
