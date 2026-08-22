import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { generateDiscResult } from "@/lib/ai/ai.functions";
import { toast } from "sonner";

const DISC_FACTORS = [
  { key: "D", label: "Dominância", color: "#dc2626" },
  { key: "I", label: "Influência", color: "#f59e0b" },
  { key: "S", label: "Estabilidade", color: "#16a34a" },
  { key: "C", label: "Conformidade", color: "#2563eb" },
] as const;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-elevated p-5">
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  );
}

function ClampText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 420;
  return (
    <div>
      <div className={`whitespace-pre-wrap text-sm ${!open && long ? "line-clamp-6" : ""}`}>{text}</div>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-xs font-medium text-primary hover:underline">
          {open ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  );
}

function Empty() {
  return <div className="card-elevated p-6 text-sm text-muted-foreground text-center">Sem informações nesta seção.</div>;
}

interface DiscSectionProps {
  candidate: any;
  readOnly?: boolean;
}

export function DiscSection({ candidate, readOnly = false }: DiscSectionProps) {
  const qc = useQueryClient();
  const genFn = useServerFn(generateDiscResult);
  const d: any = candidate.disc_scores && typeof candidate.disc_scores === "object" ? candidate.disc_scores : {};
  const num = (v: any) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));
  const values = DISC_FACTORS.map((f) => ({ ...f, value: num(d[f.key]) }));
  const max = Math.max(100, ...values.map((v) => v.value ?? 0));
  const hasRaw = values.some((v) => v.value !== null) || !!candidate.disc_raw;

  const gen = useMutation({
    mutationFn: () => genFn({ data: { candidate_id: candidate.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidate", candidate.id] });
      toast.success("Resultado DISC atualizado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar resultado DISC"),
  });

  if (!hasRaw) {
    return (
      <Card title="Perfil comportamental (DISC)">
        <div className="text-sm text-muted-foreground">
          {readOnly
            ? "Nenhuma informação comportamental disponível."
            : "Cadastre os dados brutos de Dominância, Influência, Estabilidade e Conformidade para gerar o resultado."}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card title="Perfil comportamental (DISC)">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            {candidate.disc_profile && <div className="text-lg font-semibold">{candidate.disc_profile}</div>}
            {!readOnly && <div className="text-xs text-muted-foreground">Dados brutos do teste</div>}
          </div>
          {!readOnly && (
            <Button size="sm" onClick={() => gen.mutate()} disabled={gen.isPending}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              {gen.isPending ? "Gerando…" : d.generated_at ? "Atualizar resultado DISC" : "Gerar resultado DISC"}
            </Button>
          )}
        </div>

        {/* Gráfico com os quatro fatores */}
        <div className="space-y-3">
          {values.map((f) => (
            <div key={f.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{f.key} · {f.label}</span>
                <span className="text-muted-foreground">{f.value ?? "—"}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${((f.value ?? 0) / max) * 100}%`, background: f.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {!readOnly && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {values.map((f) => (
              <div key={f.key} className="rounded-lg border border-border p-3 text-center">
                <div className="text-xs text-muted-foreground">{f.key}</div>
                <div className="text-lg font-semibold">{f.value ?? "—"}</div>
              </div>
            ))}
          </div>
        )}

        {!readOnly && candidate.disc_raw && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-muted-foreground">Resultado bruto</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs">{candidate.disc_raw}</pre>
          </details>
        )}
      </Card>

      {d.dominant && (
        <Card title="Perfil predominante">
          <div className="text-sm">
            {d.dominant}
            {d.secondary ? ` · secundário: ${d.secondary}` : ""}
          </div>
        </Card>
      )}
      {d.behavior_summary && <Card title="Resumo do resultado"><ClampText text={d.behavior_summary} /></Card>}
      {d.strengths?.length > 0 && <Card title="Pontos fortes"><Bullets items={d.strengths} /></Card>}
      {d.attention_points?.length > 0 && <Card title="Pontos de atenção"><Bullets items={d.attention_points} /></Card>}
      {d.communication_style && <Card title="Forma de comunicação"><div className="text-sm whitespace-pre-wrap">{d.communication_style}</div></Card>}
      {d.work_style && <Card title="Estilo de trabalho"><div className="text-sm whitespace-pre-wrap">{d.work_style}</div></Card>}
      {d.leadership_style && <Card title="Estilo de liderança"><div className="text-sm whitespace-pre-wrap">{d.leadership_style}</div></Card>}
      {d.motivators?.length > 0 && <Card title="Motivadores"><Bullets items={d.motivators} /></Card>}
      {d.ideal_environment && <Card title="Ambiente de melhor desempenho"><div className="text-sm whitespace-pre-wrap">{d.ideal_environment}</div></Card>}
    </div>
  );
}
