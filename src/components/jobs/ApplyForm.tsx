import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { submitPublicApplication } from "@/lib/db/applications.functions";
import { APPLY_MAX_FILE_BYTES, CONSENT_COMBINED } from "@/lib/application-intake";

const toBase64 = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(new Error("Não foi possível ler o arquivo."));
    r.readAsDataURL(f);
  });

export function ApplyForm({ slug }: { slug: string }) {
  const fn = useServerFn(submitPublicApplication);
  const [f, setF] = useState({ full_name: "", email: "", phone: "", linkedin_url: "", city: "", website: "" });
  const [accepted, setAccepted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");

  const m = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Anexe seu currículo em PDF ou DOCX.");
      if (file.size > APPLY_MAX_FILE_BYTES) throw new Error("O arquivo passa de 5 MB.");
      if (!accepted) throw new Error("É necessário aceitar o tratamento dos dados para se candidatar.");
      return fn({ data: { slug, ...f, consent_selection: true as const, consent_talent_pool: false, consent_client_sharing: true, consent_ai: true,
        file: { name: file.name, mime: file.type, base64: await toBase64(file) } } });
    },
    onError: (e: any) => setErr(e?.message ?? "Não foi possível enviar."),
  });

  if (m.isSuccess)
    return (
      <section id="candidatar" className="mt-12 scroll-mt-6 rounded-3xl border-[1.5px] bg-white p-8 text-center" style={{ borderColor: "#EFE6FB" }}>
        <CheckCircle2 className="mx-auto h-8 w-8" style={{ color: "#7612D6" }} />
        <h2 className="mt-3 text-lg font-semibold" style={{ fontFamily: "Poppins, sans-serif" }}>Candidatura recebida!</h2>
        <p className="mt-1 text-sm text-muted-foreground">Obrigado pelo interesse. Nossa equipe vai analisar seu perfil e entrar em contato se avançarmos.</p>
      </section>
    );

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <section id="candidatar" className="mt-12 scroll-mt-6 rounded-3xl border-[1.5px] bg-white p-6 md:p-8" style={{ borderColor: "#EFE6FB" }}>
      <span className="mb-4 block h-1 w-12 rounded bg-[#7612D6]" />
      <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>Candidate-se a esta vaga</h2>
      <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); setErr(""); m.mutate(); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label className="text-xs">Nome completo *</Label><Input required value={f.full_name} onChange={set("full_name")} autoComplete="name" /></div>
          <div><Label className="text-xs">E-mail *</Label><Input required type="email" value={f.email} onChange={set("email")} autoComplete="email" /></div>
          <div><Label className="text-xs">Telefone / WhatsApp</Label><Input value={f.phone} onChange={set("phone")} autoComplete="tel" /></div>
          <div><Label className="text-xs">Cidade / País</Label><Input value={f.city} onChange={set("city")} /></div>
        </div>
        <div><Label className="text-xs">LinkedIn</Label><Input value={f.linkedin_url} onChange={set("linkedin_url")} placeholder="linkedin.com/in/seu-perfil" /></div>
        <div>
          <Label className="text-xs">Currículo (PDF ou DOCX, até 5 MB) *</Label>
          <Input type="file" required accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        {/* honeypot: invisível para pessoas */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>Site<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></label>
        </div>

        <div className="space-y-2 rounded-2xl p-4 text-xs" style={{ background: "#EFE6FB66" }}>
          <label className="flex items-start gap-2"><Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" /><span>{CONSENT_COMBINED} <b>(obrigatório)</b></span></label>
          <p className="pt-1 text-muted-foreground">Você pode pedir acesso, correção ou exclusão dos seus dados, ou revogar o consentimento, a qualquer momento, pelo contato da Moove Talent.</p>
        </div>

        {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
        <Button type="submit" disabled={m.isPending} className="h-11 rounded-full bg-[#7612D6] px-7 text-white hover:-translate-y-0.5 hover:bg-[#7612D6] transition-transform" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 500 }}>{m.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Enviar candidatura</Button>
      </form>
    </section>
  );
}
