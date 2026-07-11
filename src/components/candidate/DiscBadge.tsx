import type { DiscType } from "@/lib/mock-data";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

const discInfo: Record<
  string,
  { name: string; summary: string; traits: string[]; comm: string; strengths: string[]; attention: string[] }
> = {
  D: {
    name: "Dominância",
    summary: "Orientado a resultado, direto, competitivo.",
    traits: ["Rápido em decisões", "Foco em execução", "Alta assertividade"],
    comm: "Direta, objetiva e sem rodeios.",
    strengths: ["Decisão rápida", "Iniciativa", "Foco em meta", "Confiança"],
    attention: ["Impaciência", "Baixa escuta", "Pouca delegação", "Autoritarismo"],
  },
  I: {
    name: "Influência",
    summary: "Sociável, entusiasmado, persuasivo.",
    traits: ["Alto engajamento", "Comunicação inspiracional", "Networking"],
    comm: "Calorosa, expressiva, entusiasmada.",
    strengths: ["Engajamento", "Persuasão", "Otimismo", "Colaboração"],
    attention: ["Menor foco em detalhes", "Excesso de otimismo", "Dispersão", "Emotividade"],
  },
  S: {
    name: "Estabilidade",
    summary: "Confiável, paciente, colaborativo.",
    traits: ["Alta consistência", "Escuta atenta", "Constrói relações longas"],
    comm: "Serena, respeitosa e paciente.",
    strengths: ["Confiabilidade", "Empatia", "Estabilidade", "Cooperação"],
    attention: ["Resistência a mudança", "Baixa assertividade", "Aversão a conflito", "Ritmo mais lento"],
  },
  C: {
    name: "Conformidade",
    summary: "Analítico, preciso, orientado a padrões.",
    traits: ["Qualidade e rigor", "Análise profunda", "Processo estruturado"],
    comm: "Precisa, técnica e baseada em dados.",
    strengths: ["Precisão", "Análise", "Qualidade", "Organização"],
    attention: ["Perfeccionismo", "Lentidão em decisão", "Distância emocional", "Rigidez"],
  },
};

const combinedInfo = (disc: DiscType) => {
  const primary = disc[0] as keyof typeof discInfo;
  const secondary = disc[1] as keyof typeof discInfo | undefined;
  const p = discInfo[primary]!;
  if (!secondary) return p;
  const s = discInfo[secondary]!;
  return {
    name: `${p.name} + ${s.name}`,
    summary: `Combina ${p.name.toLowerCase()} com traços de ${s.name.toLowerCase()}.`,
    traits: [p.traits[0]!, s.traits[0]!, p.traits[1]!],
    comm: p.comm,
    strengths: p.strengths.slice(0, 2).concat(s.strengths.slice(0, 2)),
    attention: p.attention.slice(0, 2).concat(s.attention.slice(0, 2)),
  };
};

export function DiscBadge({
  disc,
  scores,
  size = "md",
}: {
  disc: DiscType;
  scores: { d: number; i: number; s: number; c: number };
  size?: "sm" | "md";
}) {
  const info = combinedInfo(disc);
  const data = [
    { axis: "D", value: scores.d },
    { axis: "I", value: scores.i },
    { axis: "S", value: scores.s },
    { axis: "C", value: scores.c },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={
            (size === "sm"
              ? "h-6 px-2 text-[11px] "
              : "h-7 px-2.5 text-xs ") +
            "inline-flex items-center gap-1 rounded-full border border-border bg-primary-soft font-semibold uppercase tracking-wider text-primary transition hover:brightness-95"
          }
          aria-label={`Perfil DISC ${disc}`}
        >
          {disc}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <div className="border-b border-border p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">DISC</div>
              <div className="text-base font-semibold">{info.name}</div>
            </div>
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
              {disc}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{info.summary}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <div className="h-32">
            <ResponsiveContainer>
              <RadarChart data={data} outerRadius="80%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Radar
                  dataKey="value"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <div className="mb-1 font-semibold text-foreground">Comunicação</div>
              <div className="text-muted-foreground">{info.comm}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border p-4 text-xs">
          <div>
            <div className="mb-1.5 font-semibold text-foreground">Pontos fortes</div>
            <ul className="space-y-1 text-muted-foreground">
              {info.strengths.slice(0, 4).map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1.5 font-semibold text-foreground">Atenção</div>
            <ul className="space-y-1 text-muted-foreground">
              {info.attention.slice(0, 4).map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
