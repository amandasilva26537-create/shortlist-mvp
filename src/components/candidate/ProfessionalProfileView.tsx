import { ExperienceItem, LanguageList, SkillTags } from "@/components/candidate/ProfileBits";
import { ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateCandidateExperience } from "@/lib/db/candidates.functions";
import { toast } from "sonner";

/** Informações profissionais do candidato (sem DISC), reutilizadas pelo recrutador e pelo cliente. */
export function ProfessionalProfileView({ candidate: c, editable }: { candidate: any; editable?: boolean }) {
  const comp = c.competencies ?? {};
  const docs: any[] = Array.isArray(c.documents) ? c.documents : [];
  const qc = useQueryClient();
  const saveExp = useServerFn(updateCandidateExperience);

  const onSaveExperience = async (index: number, next: any) => {
    try {
      await saveExp({ data: { id: c.id, index, experience: next } });
      qc.invalidateQueries({ queryKey: ["candidate", c.id] });
      qc.invalidateQueries({ queryKey: ["portal-candidate"] });
      toast.success("Experiência atualizada");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar experiência");
      throw e;
    }
  };

  return (
    <div className="space-y-4">
      {c.mini_bio && (
        <Card title="Mini bio">
          <Text value={c.mini_bio} />
        </Card>
      )}
      {c.executive_summary && (
        <Card title="Resumo executivo do perfil">
          <Text value={c.executive_summary} />
        </Card>
      )}

      <div>
        <SubHeading>Experiência e Formação</SubHeading>
        <div className="space-y-3">
          {c.trajectory?.length > 0 ? (
            c.trajectory.map((t: any, i: number) => (
              <ExperienceItem
                key={i}
                exp={t}
                defaultOpen
                compact={false}
                editable={editable}
                onSave={editable ? (next) => onSaveExperience(i, next) : undefined}
              />
            ))
          ) : (
            <Card title="Experiência profissional">
              <Empty />
            </Card>
          )}
          {c.education?.length > 0 && (
            <Card title="Formação acadêmica">
              {c.education.map((e: any, i: number) => (
                <div key={i} className="mb-1 text-sm">
                  •{" "}
                  {[e.course, e.institution, [e.start, e.end].filter(Boolean).join("—"), e.status]
                    .filter(Boolean)
                    .join(" · ")}
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
            <Card title="Conhecimentos complementares">
              <SkillTags items={comp.technical} />
            </Card>
          )}
          {comp.hard_skills?.length > 0 && (
            <Card title="Habilidades técnicas">
              <SkillTags items={comp.hard_skills} />
            </Card>
          )}
          {comp.tools?.length > 0 && (
            <Card title="Ferramentas">
              <SkillTags items={comp.tools} />
            </Card>
          )}
          {comp.soft_skills?.length > 0 && (
            <Card title="Habilidades comportamentais">
              <SkillTags items={comp.soft_skills} />
            </Card>
          )}
          {comp.leadership?.length > 0 && (
            <Card title="Habilidades de liderança">
              <SkillTags items={comp.leadership} />
            </Card>
          )}
          {c.languages?.length > 0 && (
            <Card title="Idiomas">
              <LanguageList items={c.languages} />
            </Card>
          )}
        </div>
        {!comp.technical?.length &&
          !comp.hard_skills?.length &&
          !comp.tools?.length &&
          !comp.soft_skills?.length &&
          !comp.leadership?.length &&
          !c.languages?.length && (
            <Card title="Competências">
              <Empty />
            </Card>
          )}
      </div>

      {docs.length > 0 && (
        <div>
          <SubHeading>Portfólio e arquivos</SubHeading>
          <div className="grid gap-2 sm:grid-cols-2">
            {docs.map((d: any, i: number) => (
              <a
                key={d.id ?? i}
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
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">{children}</h3>;
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
