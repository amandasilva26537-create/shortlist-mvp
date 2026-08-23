import type { Candidate } from "@/lib/mock-data";
import { formatBRL, initials } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MatchRing } from "./MatchRing";
import { DiscBadge } from "./DiscBadge";
import { CompetencyRadar } from "./CompetencyRadar";
import { ChecklistItem } from "./ChecklistItem";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  MapPin,
  Briefcase,
  Wallet,
  Calendar,
  Linkedin,
  TrendingUp,
  Target,
  Users,
  Award,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import type { ReactNode } from "react";

function Chip({ icon: Icon, children }: { icon: React.ElementType; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {children}
    </span>
  );
}

function SkillBar({ name, level }: { name: string; level: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground">{level}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${level}%` }}
        />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section className="card-soft p-6">
      {eyebrow && (
        <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-primary">
          {eyebrow}
        </div>
      )}
      <h3 className="mb-4 text-base font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

export function CandidateProfile({
  candidate,
  hideActions,
  actions,
}: {
  candidate: Candidate;
  hideActions?: boolean;
  actions?: ReactNode;
}) {
  const c = candidate;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Hero */}
      <div className="card-elevated overflow-hidden">
        <div className="bg-gradient-to-br from-primary-soft to-transparent p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <Avatar className="h-24 w-24 shrink-0 ring-4 ring-card md:h-28 md:w-28">
              <AvatarImage src={c.photo} alt={c.fullName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                {initials(c.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DiscBadge disc={c.disc} scores={c.discScores} />
                <span className="text-xs text-muted-foreground">
                  {c.currentRole} · {c.currentCompany}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                {c.fullName}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">
                {c.headline}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip icon={MapPin}>{c.city}</Chip>
                <Chip icon={Briefcase}>{c.workModel}</Chip>
                {c.age && <Chip icon={Calendar}>{c.age} anos</Chip>}
                <Chip icon={Wallet}>{formatBRL(c.salaryExpectation)}</Chip>
                <Chip icon={Calendar}>{c.availability}</Chip>
                <a
                  href={c.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium hover:bg-primary-soft hover:text-primary"
                >
                  <Linkedin className="h-3.5 w-3.5" />
                  LinkedIn
                </a>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MatchRing value={c.overallMatch} size={96} strokeWidth={7} label="Match" />
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Overall
              </div>
            </div>
          </div>
        </div>
        {actions && !hideActions && (
          <div className="border-t border-border bg-card px-6 py-3 md:px-8">{actions}</div>
        )}
      </div>

      {/* Skills grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SectionCard title="Hard skills" eyebrow="Técnico">
          <div className="space-y-3">
            {c.hardSkills.map((s) => (
              <SkillBar key={s.name} {...s} />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Soft skills" eyebrow="Comportamento">
          <div className="space-y-3">
            {c.softSkills.map((s) => (
              <SkillBar key={s.name} {...s} />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Perfil executivo" eyebrow="Métricas">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Fit cultural", value: c.culturalFit },
              { label: "Experiência", value: c.experienceYears * 5 > 100 ? 100 : c.experienceYears * 5 },
              { label: "Comunicação", value: c.communication },
              { label: "Liderança", value: c.leadership },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-secondary/60 p-3">
                <div className="text-2xl font-semibold">{m.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Checklist */}
      <SectionCard title="Checklist eliminatório" eyebrow="Requisitos da vaga">
        <div className="grid gap-2 md:grid-cols-2">
          {c.checklist.map((item) => (
            <ChecklistItem key={item.requirement} {...item} />
          ))}
        </div>
      </SectionCard>

      {/* Radar */}
      <SectionCard title="Radar de competências" eyebrow="Visão 360º">
        <CompetencyRadar
          series={[{ name: c.fullName, color: "var(--primary)", data: c.radar }]}
          height={340}
        />
      </SectionCard>

      {/* Summary bullets */}
      <SectionCard title="Resumo executivo" eyebrow="4 pontos que importam">
        <ul className="space-y-2.5">
          {c.summary.slice(0, 4).map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                {i + 1}
              </div>
              <p className="text-sm leading-relaxed">{b}</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Achievements */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {c.achievements.map((a, i) => {
          const icons = [TrendingUp, Target, Users, Award];
          const Icon = icons[i % 4]!;
          return (
            <div key={a.label} className="card-soft p-4">
              <div className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {a.label}
              </div>
              <div className="mt-0.5 text-sm font-semibold">{a.value}</div>
            </div>
          );
        })}
      </div>

      {/* Experience */}
      <SectionCard title="Experiência profissional" eyebrow="Carreira">
        <Accordion type="multiple" defaultValue={[c.experiences[0]?.company ?? ""]}>
          {c.experiences.map((e) => (
            <AccordionItem key={e.company} value={e.company}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 items-center justify-between pr-3 text-left">
                  <div>
                    <div className="font-semibold">{e.company}</div>
                    <div className="text-xs text-muted-foreground">{e.role}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{e.period}</div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 pt-2 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                      Principais entregas
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {e.deliveries.map((d) => (
                        <li key={d} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                      Principais resultados
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {e.results.map((r) => (
                        <li key={r} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--success)]" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SectionCard>

      {/* Formação */}
      <SectionCard title="Formação, certificações e idiomas">
        <Accordion type="multiple" defaultValue={["edu"]}>
          <AccordionItem value="edu">
            <AccordionTrigger>Formação acadêmica</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 pt-2">
                {c.education.map((ed) => (
                  <li key={ed.institution} className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{ed.institution}</div>
                      <div className="text-xs text-muted-foreground">{ed.degree}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{ed.period}</div>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="cert">
            <AccordionTrigger>Certificações</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1.5 pt-2 text-sm">
                {c.certifications.map((cert) => (
                  <li key={cert} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {cert}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="lang">
            <AccordionTrigger>Idiomas</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 pt-2">
                {c.languages.map((l) => (
                  <li key={l.name} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{l.name}</span>
                    <span className="text-muted-foreground">{l.level}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SectionCard>

      {/* Strengths / attention / risks */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-soft p-5">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--success)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--success)]">
            <ShieldCheck className="h-3.5 w-3.5" /> Pontos fortes
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {c.strengths.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--success)]" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="card-soft p-5">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--warning)]/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--warning)]">
            <AlertTriangle className="h-3.5 w-3.5" /> Atenção
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {c.attentionPoints.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color:var(--warning)]" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="card-soft p-5">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" /> Riscos
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {c.risks.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-destructive" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Potential */}
      <div className="card-elevated flex items-start gap-4 p-6">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Potencial</div>
          <p className="mt-1 text-sm leading-relaxed">{c.potential}</p>
        </div>
      </div>

      {/* Suggested questions */}
      <SectionCard title="Perguntas sugeridas para próxima entrevista" eyebrow="IA">
        <ul className="space-y-2">
          {c.suggestedQuestions.map((q, i) => (
            <li key={q} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="text-sm">
                <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                {q}
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
