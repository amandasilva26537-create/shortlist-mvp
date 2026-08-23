import { uploadAppFile } from "@/lib/db/storage.functions";

async function fileToBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Envia o arquivo pelo backend (buckets privados) e devolve a URL de referência. */
export async function uploadFileViaServer(
  bucket: "candidate-files" | "client-logos" | "job-briefings",
  path: string,
  file: File,
): Promise<string> {
  const data_base64 = await fileToBase64(file);
  const res: any = await uploadAppFile({
    data: { bucket, path, content_type: file.type || undefined, data_base64 },
  });
  return res.url as string;
}
