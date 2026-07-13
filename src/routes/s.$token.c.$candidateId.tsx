import { createFileRoute, Link } from "@tanstack/react-router";
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
            <TabsTrigger value="trajectory">Trajetória</TabsTrigger>
            <TabsTrigger value="education">Formação</TabsTrigger>
            <TabsTrigger value="skills">Competências</TabsTrigger>
            <TabsTrigger value="disc">DISC</TabsTrigger>
            {c.documents?.length > 0 && <TabsTrigger value="documents">Documentos</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {c.mini_bio && <Card title="Mini bio">{c.mini_bio}</Card>}
            {c.full_bio && <Card title="Bio completa"><div className="whitespace-pre-wrap">{c.full_bio}</div></Card>}
            {c.executive_summary?.length > 0 && <Card title="Resumo executivo"><Bullets items={c.executive_summary} /></Card>}
            {c.specialties?.length > 0 && <Card title="Especialidades"><Tags items={c.specialties} /></Card>}
            {c.main_results?.length > 0 && <Card title="Principais resultados"><Bullets items={c.main_results} /></Card>}
            {c.achievements?.length > 0 && <Card title="Principais conquistas"><Bullets items={c.achievements} /></Card>}
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
            {c.professional_moment && (
              <Card title="Momento profissional">
                {Object.entries({ reason_for_move: "Motivo da movimentação", looking_for: "O que busca", availability: "Disponibilidade", expectations: "Expectativas" }).map(([k, label]) => c.professional_moment[k] && (
                  <div key={k} className="mb-1 text-sm"><span className="text-muted-foreground">{label}: </span>{c.professional_moment[k]}</div>
                ))}
              </Card>
            )}
            {c.motivators?.length > 0 && <Card title="Motivadores de carreira"><Tags items={c.motivators} /></Card>}
          </TabsContent>

          <TabsContent value="trajectory" className="mt-4">
            {c.trajectory?.length > 0 ? (
              <div className="space-y-3">
                {c.trajectory.map((t: any, i: number) => (
                  <div key={i} className="card-elevated p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{t.role} — {t.company}</div>
                        <div className="text-xs text-muted-foreground">{[t.segment, t.location, t.work_model].filter(Boolean).join(" · ")}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{t.start} — {t.end} {t.duration && `(${t.duration})`}</div>
                    </div>
                    {t.scope && <div className="mt-2 text-sm">{t.scope}</div>}
                    {t.responsibilities?.length > 0 && <div className="mt-2"><div className="text-xs font-semibold text-muted-foreground">Responsabilidades</div><Bullets items={t.responsibilities} /></div>}
                    {t.results?.length > 0 && <div className="mt-2"><div className="text-xs font-semibold text-muted-foreground">Resultados</div><Bullets items={t.results} /></div>}
                    {t.team_size && <div className="mt-2 text-xs text-muted-foreground">Equipe: {t.team_size}</div>}
                  </div>
                ))}
              </div>
            ) : <Empty />}
          </TabsContent>

          <TabsContent value="education" className="mt-4 space-y-4">
            {c.education?.length > 0 && <Card title="Formação acadêmica">{c.education.map((e: any, i: number) => (
              <div key={i} className="text-sm mb-1">• {[e.course, e.institution, `${e.start}—${e.end}`, e.status].filter(Boolean).join(" · ")}</div>
            ))}</Card>}
            {c.courses?.length > 0 && <Card title="Cursos e certificações">{c.courses.map((e: any, i: number) => (
              <div key={i} className="text-sm mb-1">• {[e.name, e.institution, e.year, e.workload].filter(Boolean).join(" · ")}</div>
            ))}</Card>}
            {c.languages?.length > 0 && <Card title="Idiomas">{c.languages.map((e: any, i: number) => (
              <div key={i} className="text-sm mb-1">• {[e.language, e.level, e.professional_use].filter(Boolean).join(" · ")}</div>
            ))}</Card>}
            {!c.education?.length && !c.courses?.length && !c.languages?.length && <Empty />}
          </TabsContent>

          <TabsContent value="skills" className="mt-4 space-y-4">
            {c.competencies ? Object.entries({ hard_skills: "Hard skills", soft_skills: "Soft skills", leadership: "Liderança", tools: "Ferramentas", technical: "Técnicos" }).map(([k, label]) => (c.competencies[k]?.length > 0) && (
              <Card key={k} title={label}><Tags items={c.competencies[k]} /></Card>
            )) : <Empty />}
          </TabsContent>

          <TabsContent value="disc" className="mt-4">
            {c.disc_scores || c.disc_raw ? (
              <Card title="Perfil DISC">
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
