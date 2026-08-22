import { Badge } from "@/components/ui/badge";
import { MatchRing } from "@/components/candidate/MatchRing";
import { DiscSection } from "@/components/candidate/DiscSection";
import { ExperienceItem, LanguageList, SkillTags } from "@/components/candidate/ProfileBits";
import { Briefcase, MapPin, Clock, Linkedin, Star, ExternalLink } from "lucide-react";

interface Props {
  candidate: any;
  evaluation: any | null;
}

/** Página contínua: cabeçalho do candidato + análise da vaga + perfil profissional. */
export function PortalCandidateView({ candidate: c, evaluation: ev }: Props) {
  const match = typeof ev?.overall_match === "number" ? ev.overall_match : null;
  const initials = (c.full_name ?? "")
    .split(" ")
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase();

  const risks: any[] = Array.isArray(ev?.risk_items) ? ev.risk_items : [];
  const comp = c.competencies ?? {};
  const docs: any[] = Array.isArray(c.documents) ? c.documents : [];

  return (
    <div className="space-y-6">
      {/* 3. Cabeçalho do candidato */}
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
        </div>
      </section>

      {/* 4. Análise para esta vaga */}
      <section id="analise-vaga" className="scroll-mt-28">
        <SectionHeading>Análise para esta vaga</SectionHeading>
        <div className="space-y-4">
          {ev?.key_differentiator && (
            <div className="rounded-xl border border-primary/30 bg-primary-soft p-4">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#007A5E]">
                <Star className="h-3 w-3" /> Principal diferencial para a vaga
              </div>
              <p className="text-sm">{ev.key_differentiator}</p>
            </div>
          )}

          <Card title="Parecer do recrutador">
            <Text value={ev?.recruiter_opinion} />
          </Card>

          <Card title="Resumo executivo">
            <Text value={ev?.job_specific_summary} />
          </Card>

          <Card title="Pontos para aprofundar">
            {risks.length > 0 ? (
              <ul className="space-y-3">
                {risks.map((r, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{r.point}</span>
                    </div>
                    {r.mitigation && (
                      <div className="mt-1 pl-3.5 text-xs text-muted-foreground">{r.mitigation}</div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
          </Card>

          {!ev && (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center text-sm text-muted-foreground">
              Análise para esta vaga ainda não disponível.
            </div>
          )}
        </div>
      </section>

      {/* 5. Perfil profissional */}
      <section id="perfil-profissional" className="scroll-mt-28">
        <SectionHeading>Perfil profissional</SectionHeading>

        <div className="space-y-4">
          {c.mini_bio && <Card title="Mini bio"><Text value={c.mini_bio} /></Card>}

          <div>
            <SubHeading>Experiência e Formação</SubHeading>
            <div className="space-y-3">
              {c.trajectory?.length > 0 ? (
                c.trajectory.map((t: any, i: number) => (
                  <ExperienceItem key={i} exp={t} defaultOpen compact={false} />
                ))
              ) : (
                <Card title="Experiência profissional"><Empty /></Card>
              )}
              {c.education?.length > 0 && (
                <Card title="Formação acadêmica">
                  {c.education.map((e: any, i: number) => (
                    <div key={i} className="mb-1 text-sm">
                      • {[e.course, e.institution, [e.start, e.end].filter(Boolean).join("—"), e.status].filter(Boolean).join(" · ")}
                    </div>
                  ))}
                </Card>
              )}
              {c.courses?.length > 0 && (
                <Card title="Cursos e certificações">
                  {c.courses.slice(0, 10).map((e: any, i: number) => (
                    <div key={i} className="mb-1 text-sm">
                      • {[e.name, e.institution, e.year, e.workload].filter(Boolean).join(" · ")}
                    </div>
                  ))}
                </Card>
              )}
            </div>
          </div>

          <div>
            <SubHeading>Competências</SubHeading>
            <div className="grid gap-4 md:grid-cols-2">
              {comp.technical?.length > 0 && (
                <Card title="Conhecimentos complementares"><SkillTags items={comp.technical} /></Card>
              )}
              {comp.hard_skills?.length > 0 && (
                <Card title="Habilidades técnicas"><SkillTags items={comp.hard_skills} /></Card>
              )}
              {comp.tools?.length > 0 && <Card title="Ferramentas"><SkillTags items={comp.tools} /></Card>}
              {comp.soft_skills?.length > 0 && (
                <Card title="Habilidades comportamentais"><SkillTags items={comp.soft_skills} /></Card>
              )}
              {comp.leadership?.length > 0 && (
                <Card title="Habilidades de liderança"><SkillTags items={comp.leadership} /></Card>
              )}
              {c.languages?.length > 0 && <Card title="Idiomas"><LanguageList items={c.languages} /></Card>}
            </div>
            {!comp.technical?.length &&
              !comp.hard_skills?.length &&
              !comp.tools?.length &&
              !comp.soft_skills?.length &&
              !comp.leadership?.length &&
              !c.languages?.length && <Card title="Competências"><Empty /></Card>}
          </div>

          <div>
            <SubHeading>Perfil comportamental e DISC</SubHeading>
            <DiscSection candidate={c} readOnly />
          </div>

          {docs.length > 0 && (
            <div>
              <SubHeading>Portfólio e arquivos</SubHeading>
              <div className="grid gap-2 sm:grid-cols-2">
                {docs.map((d: any) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition hover:bg-secondary"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{d.label || d.kind}</div>
                      <div className="truncate text-xs text-muted-foreground">{d.kind}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight">
      <span className="h-4 w-1 rounded-full bg-primary" />
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">{children}</h3>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Text({ value }: { value?: string | null }) {
  if (!value) return <Empty />;
  return <p className="whitespace-pre-wrap text-sm leading-relaxed">{value}</p>;
}

function Empty() {
  return <span className="text-sm text-muted-foreground">Sem informações disponíveis.</span>;
}
