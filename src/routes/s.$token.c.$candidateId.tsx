import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExperienceItem, LanguageList } from "@/components/candidate/ProfileBits";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Linkedin, FileDown, ExternalLink } from "lucide-react";
import { getPortalCandidate } from "@/lib/db/portal.functions";

export const Route = createFileRoute("/s/$token/c/$candidateId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Perfil do candidato" }] }),
  component: PortalCandidatePage,
});

function PortalCandidatePage() {
  const { token, candidateId } = Route.useParams();
  const getFn = useServerFn(getPortalCandidate);
  const { data, isLoading } = useQuery({
    queryKey: ["portal-candidate", token, candidateId],
    queryFn: () => getFn({ data: { token, candidate_id: candidateId } }),
  });

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando…</div>;
  }
  if (!data) {
    return (
      <div className="min-h-screen grid place-items-center p-8 text-sm text-muted-foreground">
        Perfil não encontrado.
      </div>
    );
  }

  const c: any = data.candidate;
  const initials = (c.full_name ?? "").split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 md:px-8">
          <Link
            to="/s/$token"
            params={{ token }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a shortlist
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-8">
        <div className="card-elevated p-6 mb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              {c.photo_url && <AvatarImage src={c.photo_url} alt={c.full_name} />}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-tight">{c.full_name}</h1>
                {c.disc_profile && <Badge variant="secondary">{c.disc_profile}</Badge>}
              </div>
              {c.headline && <div className="mt-1 text-sm font-medium text-primary">{c.headline}</div>}
              <div className="mt-1 text-sm text-muted-foreground">
                {[c.current_position, c.current_company, c.area, c.city, c.work_model].filter(Boolean).join(" · ")}
              </div>
              {c.linkedin_url && (
                <div className="mt-1 text-xs">
                  <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    <Linkedin className="h-3 w-3" /> LinkedIn
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="experience">Experiência e Formação</TabsTrigger>
            <TabsTrigger value="skills">Competências</TabsTrigger>
            <TabsTrigger value="disc">Perfil comportamental</TabsTrigger>
            {c.documents?.length > 0 && <TabsTrigger value="documents">Documentos</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {c.mini_bio && <Card title="Resumo profissional"><ClampText text={c.mini_bio} /></Card>}
            {c.full_bio && <Card title="Resumo profissional detalhado"><ClampText text={c.full_bio} /></Card>}
            {c.executive_summary?.length > 0 && <Card title="Resumo executivo"><Bullets items={c.executive_summary} /></Card>}
            {c.specialties?.length > 0 && <Card title="Áreas de especialidade"><Tags items={c.specialties} /></Card>}
            {(c.achievements?.length > 0 || c.main_results?.length > 0) && (
              <Card title="Destaques da carreira">
                {c.achievements?.length > 0 && <Bullets items={c.achievements} />}
                {c.main_results?.length > 0 && (
                  <div className={c.achievements?.length > 0 ? "mt-3" : ""}>
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Principais resultados</div>
                    <Bullets items={c.main_results} />
                  </div>
                )}
              </Card>
            )}
            {c.main_case && Object.values(c.main_case).some(Boolean) && (
              <Card title="Principal case">
                {["context", "challenge", "action", "result"].map((k) => c.main_case[k] && (
                  <div key={k} className="mb-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">{({ context: "Contexto", challenge: "Desafio", action: "Ação", result: "Resultado" } as any)[k]}</div>
                    <div className="text-sm">{c.main_case[k]}</div>
                  </div>
                ))}
              </Card>
            )}
            {c.strengths?.length > 0 && (
              <Card title="Pontos fortes">
                {c.strengths.map((s: any, i: number) => (
                  <div key={i} className="mb-2">
                    <div className="font-medium text-sm">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.evidence}</div>
                  </div>
                ))}
              </Card>
            )}
            {c.work_style && <Card title="Estilo de atuação">{c.work_style}</Card>}
            {c.professional_moment && Object.values(c.professional_moment).some(Boolean) && (
              <Card title="Momento profissional">
                {Object.entries({ reason_for_move: "Motivo da movimentação", looking_for: "O que busca", availability: "Disponibilidade", expectations: "Expectativas" }).map(([k, label]) => c.professional_moment[k] && (
                  <div key={k} className="mb-1 text-sm"><span className="text-muted-foreground">{label}: </span>{c.professional_moment[k]}</div>
                ))}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="experience" className="mt-4 space-y-6">
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Experiência profissional</h2>
              {c.trajectory?.length > 0 ? (
                <div className="space-y-3">
                  {c.trajectory.map((t: any, i: number) => (
                    <ExperienceItem key={i} exp={t} defaultOpen={i < 3} compact={i >= 3} />
                  ))}
                </div>
              ) : <Empty />}
            </section>

            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Formação e desenvolvimento</h2>
              <div className="space-y-4">
                {c.education?.length > 0 && <Card title="Formação acadêmica">{c.education.map((e: any, i: number) => (
                  <div key={i} className="text-sm mb-1">• {[e.course, e.institution, [e.start, e.end].filter(Boolean).join("—"), e.status].filter(Boolean).join(" · ")}</div>
                ))}</Card>}
                {c.courses?.length > 0 && <Card title="Cursos, certificações e eventos">{c.courses.map((e: any, i: number) => (
                  <div key={i} className="text-sm mb-1">• {[e.name, e.institution, e.year, e.workload].filter(Boolean).join(" · ")}</div>
                ))}</Card>}
                {c.languages?.length > 0 && <Card title="Idiomas"><LanguageList items={c.languages} /></Card>}
                {c.competencies?.technical?.length > 0 && <Card title="Conhecimentos complementares"><Tags items={c.competencies.technical} /></Card>}
                {!c.education?.length && !c.courses?.length && !c.languages?.length && !c.competencies?.technical?.length && <Empty />}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="skills" className="mt-4 space-y-4">
            {(c.competencies?.hard_skills?.length > 0 || c.competencies?.tools?.length > 0 || c.competencies?.soft_skills?.length > 0 || c.competencies?.leadership?.length > 0) ? (
              <>
                {c.competencies?.hard_skills?.length > 0 && <Card title="Habilidades técnicas"><Tags items={c.competencies.hard_skills.slice(0, 15)} /></Card>}
                {c.competencies?.tools?.length > 0 && <Card title="Ferramentas"><Tags items={c.competencies.tools.slice(0, 15)} /></Card>}
                {c.competencies?.soft_skills?.length > 0 && <Card title="Habilidades comportamentais"><Tags items={c.competencies.soft_skills.slice(0, 15)} /></Card>}
                {c.competencies?.leadership?.length > 0 && <Card title="Habilidades de liderança"><Tags items={c.competencies.leadership.slice(0, 15)} /></Card>}
              </>
            ) : <Empty />}
          </TabsContent>

          <TabsContent value="disc" className="mt-4">
            {c.disc_scores || c.disc_raw ? (
              <Card title="Perfil comportamental (DISC)">
                {c.disc_profile && <div className="text-lg font-semibold mb-2">{c.disc_profile}</div>}
                {c.disc_scores && typeof c.disc_scores === "object" && (
                  <div className="grid grid-cols-4 gap-3 my-3">
                    {["D", "I", "S", "C"].map((l) => (
                      <div key={l} className="rounded-lg border border-border p-3 text-center">
                        <div className="text-xs text-muted-foreground">{l}</div>
                        <div className="text-lg font-semibold">{c.disc_scores[l] ?? "—"}</div>
                      </div>
                    ))}
                  </div>
                )}
                {c.disc_scores?.behavior_summary && <div className="text-sm mt-2"><b>Resumo:</b> {c.disc_scores.behavior_summary}</div>}
                {c.disc_scores?.communication_style && <div className="text-sm"><b>Comunicação:</b> {c.disc_scores.communication_style}</div>}
                {c.disc_scores?.ideal_environment && <div className="text-sm"><b>Ambiente ideal:</b> {c.disc_scores.ideal_environment}</div>}
              </Card>
            ) : <Empty />}
          </TabsContent>


          {c.documents?.length > 0 && (
            <TabsContent value="documents" className="mt-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {c.documents.map((d: any) => (
                  <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="card-soft p-4 hover:bg-secondary/40 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{d.label || d.kind}</div>
                      <div className="text-xs text-muted-foreground">{d.kind}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-elevated p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={i} className="text-sm">• {it}</li>
      ))}
    </ul>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <Badge key={i} variant="secondary" className="text-xs">{it}</Badge>
      ))}
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-muted-foreground">Sem informações disponíveis.</div>;
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
