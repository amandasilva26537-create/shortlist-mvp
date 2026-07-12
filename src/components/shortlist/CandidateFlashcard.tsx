import { MatchRing } from "@/components/candidate/MatchRing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Building2, DollarSign, Clock, Sparkles, User, ChevronRight } from "lucide-react";

interface Props {
  candidate: any;
  evaluation: any | null;
  onOpenAnalysis: () => void;
  onOpenProfile: () => void;
  readOnly?: boolean;
}

function fmtSalary(v: any) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? Number(v.replace(/[^\d.,]/g, "").replace(",", ".")) : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function CandidateFlashcard({ candidate, evaluation, onOpenAnalysis, onOpenProfile }: Props) {
  const c = candidate;
  const ev = evaluation;
  const match = typeof ev?.overall_match === "number" ? ev.overall_match : null;
  const initials = (c.full_name ?? "")
    .split(" ")
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg animate-scale-in">
      {/* Faixa decorativa superior */}
      <div className="h-1.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <div className="p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* Foto + match */}
          <div className="flex items-start gap-4 md:flex-col md:items-center md:gap-3">
            {c.photo_url ? (
              <img src={c.photo_url} alt="" className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/20" />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-full bg-primary-soft text-2xl font-semibold text-primary">
                {initials}
              </div>
            )}
            {match != null && <MatchRing value={match} size={72} label="match" />}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold tracking-tight">{c.full_name}</h2>
                {c.headline && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.headline}</p>
                )}
              </div>
              {c.disc_profile && <Badge variant="secondary" className="text-xs">DISC {c.disc_profile}</Badge>}
            </div>

            {/* Chips essenciais */}
            <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {c.current_position && (
                <Chip icon={Briefcase} label="Cargo" value={c.current_position} />
              )}
              {c.area && <Chip icon={Building2} label="Área" value={c.area} />}
              {c.city && <Chip icon={MapPin} label="Cidade" value={c.city} />}
              {c.work_model && <Chip icon={Clock} label="Modelo" value={c.work_model} />}
              {c.salary_expectation != null && c.salary_expectation !== "" && (
                <Chip icon={DollarSign} label="Pretensão" value={fmtSalary(c.salary_expectation)} />
              )}
              {c.professional_moment?.availability && (
                <Chip icon={Clock} label="Disponibilidade" value={c.professional_moment.availability} />
              )}
            </div>

            {/* Diferencial */}
            {ev?.key_differentiator && (
              <div className="mt-5 rounded-xl border border-primary/30 bg-primary-soft/50 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3 w-3" /> Principal diferencial para a vaga
                </div>
                <div className="text-sm text-foreground">{ev.key_differentiator}</div>
              </div>
            )}
            {!ev && (
              <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                Análise para esta vaga ainda não gerada. Use "Gerar análise com IA" para calcular a compatibilidade.
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button onClick={onOpenAnalysis} className="flex-1 min-w-[160px]">
            <Sparkles className="mr-2 h-4 w-4" /> Ver análise
            <ChevronRight className="ml-auto h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onOpenProfile} className="flex-1 min-w-[160px]">
            <User className="mr-2 h-4 w-4" /> Ver perfil completo
          </Button>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
