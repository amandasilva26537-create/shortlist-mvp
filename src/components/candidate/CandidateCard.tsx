import { Link } from "@tanstack/react-router";
import type { Candidate } from "@/lib/mock-data";
import { formatBRL, initials } from "@/lib/format";
import { MatchRing } from "./MatchRing";
import { DiscBadge } from "./DiscBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, ArrowRight } from "lucide-react";

export function CandidateCard({
  candidate,
  to,
  params,
}: {
  candidate: Candidate;
  to?: string;
  params?: Record<string, string>;
}) {
  const href = to ?? "/candidates/$candidateId";
  const linkParams = params ?? { candidateId: candidate.id };

  return (
    <div className="group card-soft flex flex-col overflow-hidden transition hover:shadow-[var(--shadow-elevated)]">
      <div className="flex items-start gap-4 p-5">
        <Avatar className="h-14 w-14 shrink-0 ring-2 ring-primary-soft">
          <AvatarImage src={candidate.photo} alt={candidate.fullName} />
          <AvatarFallback className="bg-primary-soft text-primary font-semibold">
            {initials(candidate.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold tracking-tight">
                {candidate.fullName}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                {candidate.currentRole}
              </p>
            </div>
            <MatchRing value={candidate.overallMatch} size={48} strokeWidth={4} />
          </div>
        </div>
      </div>

      <div className="px-5 pb-3">
        <p className="line-clamp-2 text-sm text-muted-foreground">{candidate.miniBio}</p>
      </div>

      <div className="mx-5 mb-4 mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{candidate.city}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5" />
          <span className="truncate">{candidate.workModel}</span>
        </div>
        <div className="col-span-2 font-medium text-foreground">
          {formatBRL(candidate.salaryExpectation)}<span className="font-normal text-muted-foreground"> / mês</span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border bg-secondary/40 px-5 py-3">
        <DiscBadge disc={candidate.disc} scores={candidate.discScores} size="sm" />
        <Link
          to={href}
          params={linkParams}
        >
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-primary hover:bg-primary-soft">
            Ver perfil
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
