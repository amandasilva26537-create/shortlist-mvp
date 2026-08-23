import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MatchRing } from "@/components/candidate/MatchRing";
import { DiscSection } from "@/components/candidate/DiscSection";
import { ProfessionalProfileView } from "@/components/candidate/ProfessionalProfileView";
import { AnalysisContent } from "@/components/shortlist/AnalysisContent";
import { CandidateSectionMenu, type CandidateSection } from "@/components/shortlist/CandidateSectionMenu";
import { Briefcase, MapPin, Clock, Linkedin, Star, DollarSign, User } from "lucide-react";
import { salaryLabel } from "@/lib/format";


interface Props {
  candidate: any;
  evaluation: any | null;
  jobId: string;
  shortlistId: string;
}

/** Resumo do candidato + menu de três botões que abre o conteúdo detalhado na mesma tela. */
export function PortalCandidateView({ candidate: c, evaluation: ev, jobId, shortlistId }: Props) {
  const [section, setSection] = useState<CandidateSection | null>(null);
  const match = typeof ev?.overall_match === "number" ? ev.overall_match : null;
  const salary = salaryLabel(c);

  const initials = (c.full_name ?? "")
    .split(" ")
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-4">
      {/* Resumo principal do candidato */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-[#00D6A3] via-[#009B76] to-[#007A5E]" />
        <div className="p-5 md:p-6">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 sm:flex sm:items-start">
            {c.photo_url ? (
              <img
                src={c.photo_url}
                alt={c.full_name}
                className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-border"
              />
            ) : (
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-primary-soft text-xl font-semibold text-primary">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{c.full_name}</h2>
              {c.headline && <p className="mt-1 text-sm text-muted-foreground">{c.headline}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {c.current_position && <Chip icon={Briefcase}>{c.current_position}</Chip>}
                {c.city && <Chip icon={MapPin}>{c.city}</Chip>}
                {c.work_model && <Chip icon={Clock}>{c.work_model}</Chip>}
                {c.age && <Chip icon={User}>{c.age} anos</Chip>}
                {salary && <Chip icon={DollarSign}>Pretensão: {salary}</Chip>}
                {c.disc_profile && <Badge variant="secondary" className="rounded-full">DISC {c.disc_profile}</Badge>}

                {c.linkedin_url && (
                  <a
                    href={c.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-medium text-primary hover:underline"
                  >
                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                )}
              </div>
            </div>
            {match != null && (
              <div className="hidden shrink-0 sm:block">
                <MatchRing value={match} size={84} label="match" />
              </div>
            )}
          </div>

          {ev?.key_differentiator && (
            <div className="mt-5 rounded-xl border border-primary/30 bg-primary-soft p-4">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#007A5E]">
                <Star className="h-3 w-3" /> Principal diferencial para a vaga
              </div>
              <p className="text-sm">{ev.key_differentiator}</p>
            </div>
          )}
        </div>
      </section>

      {/* Menu com os três botões */}
      <CandidateSectionMenu value={section} onChange={setSection} />

      {/* Conteúdo selecionado (um por vez, na mesma tela) */}
      {section === "analysis" && (
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <AnalysisContent
            candidate={c}
            jobId={jobId}
            shortlistId={shortlistId}
            evaluation={ev}
            readOnly
          />
        </div>
      )}

      {section === "profile" && <ProfessionalProfileView candidate={c} />}

      {section === "behavior" && <DiscSection candidate={c} readOnly />}

      {!section && (
        <p className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
          Escolha uma das opções acima para ver a análise, o perfil completo ou o perfil comportamental.
        </p>
      )}
    </div>
  );
}

function Chip({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}
