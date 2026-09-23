import { ExperienceItem, LanguageList, SkillTags } from "@/components/candidate/ProfileBits";
import { ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { patchCandidate, updateCandidateExperience } from "@/lib/db/candidates.functions";
import {
  EditableBlock,
  arrayToLines,
  linesToArray,
  linesToObjects,
  objectsToLines,
} from "@/components/candidate/EditableField";
import { toast } from "sonner";

const EDU_FIELDS = ["course", "institution", "start", "end", "status"];
const COURSE_FIELDS = ["name", "institution", "year", "workload"];
const LANG_FIELDS = ["language", "level"];

/** Mantém apenas experiências de 2020 em diante (empregos atuais sempre entram). */
function isFrom2020(exp: any): boolean {
  const text = `${exp?.start ?? ""} ${exp?.end ?? ""}`;
  if (exp?.current === true || /atual|present/i.test(text)) return true;
  const years = text.match(/\b(19|20)\d{2}\b/g);
  if (!years || years.length === 0) return true;
  return Math.max(...years.map(Number)) >= 2020;
}

/** Informações profissionais do candidato (sem DISC), reutilizadas pelo recrutador e pelo cliente. */
export function ProfessionalProfileView({ candidate: c, editable }: { candidate: any; editable?: boolean }) {
  const comp = c.competencies && typeof c.competencies === "object" ? c.competencies : {};
  const docs: any[] = Array.isArray(c.documents) ? c.documents : [];
  const qc = useQueryClient();
  const saveExp = useServerFn(updateCandidateExperience);
  const savePatch = useServerFn(patchCandidate);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["candidate", c.id] });
    qc.invalidateQueries({ queryKey: ["portal-candidate"] });
    qc.invalidateQueries({ queryKey: ["candidates"] });
    qc.invalidateQueries({ queryKey: ["shortlist"] });
  };

  const onSaveExperience = async (index: number, next: any) => {
    try {
      await saveExp({ data: { id: c.id, index, experience: next } });
      invalidate();
      toast.success("Experiência atualizada");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar experiência");
      throw e;
    }
  };

  const patch = async (p: Record<string, any>) => {
    try {
      await savePatch({ data: { id: c.id, patch: p } });
      invalidate();
      toast.success("Alteração salva");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar");
      throw e;
    }
  };

  const compBlock = (key: string, title: string) => (
    <EditableBlock
      title={title}
      editable={editable}
      isEmpty={!(comp[key]?.length > 0)}
      toDraft={() => arrayToLines(comp[key])}
      fromDraft={(v) => linesToArray(v)}
      hint="Um item por linha."
      onSave={(items) => patch({ competencies: { ...comp, [key]: items } })}
    >
      <SkillTags items={comp[key] ?? []} />
    </EditableBlock>
  );

  const experiences: { exp: any; index: number }[] = (Array.isArray(c.trajectory) ? c.trajectory : [])
    .map((exp: any, index: number) => ({ exp, index }))
    .filter(({ exp }: any) => isFrom2020(exp));

  return (
    <div className="space-y-4">
      <EditableBlock
        title="Resumo do candidato"
        editable={editable}
        isEmpty={!c.executive_summary}
        toDraft={() => textOf(c.executive_summary)}
        fromDraft={(v) => v.trim()}
        rows={7}
        onSave={(v) => patch({ executive_summary: v })}
      >
        <Text value={textOf(c.executive_summary)} />
      </EditableBlock>

      <div>
        <SubHeading>Experiência</SubHeading>
        <div className="space-y-3">
          {experiences.length > 0 ? (
            experiences.map(({ exp, index }) => (
              <ExperienceItem
                key={index}
                exp={exp}
                defaultOpen
                compact={false}
                editable={editable}
                onSave={editable ? (next) => onSaveExperience(index, next) : undefined}
              />
            ))
          ) : (
            <Card title="Experiência profissional">
              <Empty />
            </Card>
          )}
        </div>
      </div>

      <div>
        <SubHeading>Formação Acadêmica</SubHeading>
        <div className="space-y-3">
          <EditableBlock
            title="Formação acadêmica"
            hideTitle
            editable={editable}
            isEmpty={!(c.education?.length > 0)}
            toDraft={() => objectsToLines(c.education, EDU_FIELDS)}
            fromDraft={(v) => linesToObjects(v, EDU_FIELDS)}
            hint="Uma formação por linha: curso | instituição | início | fim | situação"
            onSave={(items) => patch({ education: items })}
          >
            {(c.education ?? []).map((e: any, i: number) => (
              <div key={i} className="mb-1 text-sm">
                •{" "}
                {[e.course, e.institution, [e.start, e.end].filter(Boolean).join("—"), e.status]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            ))}
          </EditableBlock>

          <EditableBlock
            title="Cursos e certificações"
            editable={editable}
            isEmpty={!(c.courses?.length > 0)}
            toDraft={() => objectsToLines(c.courses, COURSE_FIELDS)}
            fromDraft={(v) => linesToObjects(v, COURSE_FIELDS)}
            hint="Um curso por linha: nome | instituição | ano | carga horária"
            onSave={(items) => patch({ courses: items })}
          >
            {(c.courses ?? []).slice(0, 10).map((e: any, i: number) => (
              <div key={i} className="mb-1 text-sm">
                • {[e.name, e.institution, e.year, e.workload].filter(Boolean).join(" · ")}
              </div>
            ))}
          </EditableBlock>
        </div>
      </div>

      <div>
        <SubHeading>Idiomas</SubHeading>
        <EditableBlock
          title="Idiomas"
          hideTitle
          editable={editable}
          isEmpty={!(c.languages?.length > 0)}
          toDraft={() => objectsToLines(c.languages, LANG_FIELDS)}
          fromDraft={(v) => linesToObjects(v, LANG_FIELDS)}
          hint="Um idioma por linha: idioma | nível (Básico, Intermediário, Avançado, Nativo)"
          onSave={(items) => patch({ languages: items })}
        >
          <LanguageList items={c.languages ?? []} />
        </EditableBlock>
      </div>

      <div>
        <SubHeading>Competências</SubHeading>
        <div className="grid gap-4 md:grid-cols-2">
          {compBlock("tools", "Ferramentas, sistemas e plataformas")}
          {compBlock("hard_skills", "Habilidades técnicas")}
          {compBlock("soft_skills", "Habilidades comportamentais")}
        </div>
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

/** Aceita texto puro ou estruturas antigas (array/objeto) vindas da geração automática. */
function textOf(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join("\n");
  if (typeof value === "object") {
    return Object.values(value)
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .join("\n");
  }
  return String(value);
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
  return <p className="text-sm text-muted-foreground">Sem informações nesta seção.</p>;
}
