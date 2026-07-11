import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pencil, Lock, ExternalLink, FileText, Linkedin, Sparkles } from "lucide-react";
import { getCandidate } from "@/lib/db/candidates.functions";

export const Route = createFileRoute("/candidates/$candidateId")({
  head: ({ params }) => ({ meta: [{ title: `Candidato · ${params.candidateId}` }] }),
  component: CandidatePage,
});

function CandidatePage() {
  const { candidateId } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getCandidate);
  const { data, isLoading } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => getFn({ data: { id: candidateId } }),
  });
  const c: any = data;

  if (isLoading) return <AppShell><div className="text-sm text-muted-foreground">Carregando…</div></AppShell>;
  if (!c) return <AppShell><div className="text-sm text-muted-foreground">Candidato não encontrado.</div></AppShell>;

  const initials = (c.full_name ?? "").split(" ").slice(0,2).map((s: string) => s[0]).join("").toUpperCase();

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/candidates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <Button onClick={() => navigate({ to: "/candidates/new", search: { id: candidateId } as any })}>
            <Pencil className="mr-1.5 h-4 w-4" /> Editar
          </Button>
        </div>

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
                <StatusBadge status={c.status} />
              </div>
              {c.headline && <div className="mt-1 text-sm font-medium text-primary">{c.headline}</div>}
              <div className="mt-1 text-sm text-muted-foreground">
                {[c.current_position, c.current_company, c.area, c.city, c.work_model].filter(Boolean).join(" · ")}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {c.salary_expectation && <>Pretensão: R$ {Number(c.salary_expectation).toLocaleString("pt-BR")} · </>}
                Cadastrado em {new Date(c.created_at).toLocaleDateString("pt-BR")}
                {c.linkedin_url && <> · <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1"><Linkedin className="h-3 w-3" />LinkedIn</a></>}
              </div>
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
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="additional">Adicionais</TabsTrigger>
            <TabsTrigger value="internal"><Lock className="h-3 w-3 mr-1" />Interno</TabsTrigger>
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
                {["context","challenge","action","result"].map((k) => c.main_case[k] && (
                  <div key={k} className="mb-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">{({context:"Contexto",challenge:"Desafio",action:"Ação",result:"Resultado"} as any)[k]}</div>
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
                {Object.entries({reason_for_move:"Motivo da movimentação",looking_for:"O que busca",availability:"Disponibilidade",expectations:"Expectativas"}).map(([k,label]) => c.professional_moment[k] && (
                  <div key={k} className="mb-1 text-sm"><span className="text-muted-foreground">{label}: </span>{c.professional_moment[k]}</div>
                ))}
              </Card>
            )}
            {c.motivators?.length > 0 && <Card title="Motivadores de carreira"><Tags items={c.motivators} /></Card>}
            {!c.headline && !c.mini_bio && (
              <div className="card-elevated p-10 text-center">
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-sm text-muted-foreground mb-3">O perfil ainda não foi gerado pela IA.</div>
                <Button onClick={() => navigate({ to: "/candidates/new", search: { id: candidateId } as any })}>Editar e gerar perfil</Button>
              </div>
            )}
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
            {c.competencies ? Object.entries({hard_skills:"Hard skills",soft_skills:"Soft skills",leadership:"Liderança",tools:"Ferramentas",technical:"Técnicos"}).map(([k,label]) => (c.competencies[k]?.length > 0) && (
              <Card key={k} title={label}><Tags items={c.competencies[k]} /></Card>
            )) : <Empty />}
          </TabsContent>

          <TabsContent value="disc" className="mt-4">
            {c.disc_scores || c.disc_raw ? (
              <Card title="Perfil DISC">
                {c.disc_profile && <div className="text-lg font-semibold mb-2">{c.disc_profile}</div>}
                {c.disc_scores && typeof c.disc_scores === "object" && (
                  <div className="grid grid-cols-4 gap-3 my-3">
                    {["D","I","S","C"].map((l) => (
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
                {c.disc_raw && <details className="mt-3"><summary className="text-xs text-muted-foreground cursor-pointer">Resultado bruto</summary><pre className="text-xs mt-2 whitespace-pre-wrap">{c.disc_raw}</pre></details>}
              </Card>
            ) : <Empty />}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            {c.documents?.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {c.documents.map((d: any) => (
                  <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="card-elevated p-3 flex items-center gap-3 hover:border-primary transition-colors">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{d.label}</div>
                      <div className="text-[11px] text-muted-foreground">{d.kind}{!d.visible_to_client && " · interno"}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            ) : <Empty />}
          </TabsContent>

          <TabsContent value="additional" className="mt-4">
            {c.additional_info ? (
              <Card title="Informações adicionais">
                <div className="whitespace-pre-wrap text-sm">{typeof c.additional_info === "string" ? c.additional_info : JSON.stringify(c.additional_info, null, 2)}</div>
              </Card>
            ) : <Empty />}
          </TabsContent>

          <TabsContent value="internal" className="mt-4 space-y-4">
            <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3 text-xs text-amber-800">
              <Lock className="h-3.5 w-3.5 inline mr-1" />Informações internas — nunca aparecem para o cliente.
            </div>
            <Card title="Contato">
              <div className="text-sm">Telefone: {c.phone || "—"}</div>
              <div className="text-sm">E-mail: {c.email || "—"}</div>
            </Card>
            {c.recruiter_note && <Card title="Parecer do recrutador"><div className="whitespace-pre-wrap text-sm">{c.recruiter_note}</div></Card>}
            {c.transcript && <Card title="Resumo/transcrição da entrevista"><div className="whitespace-pre-wrap text-sm">{c.transcript}</div></Card>}
            {c.internal_notes && <Card title="Observações internas"><div className="whitespace-pre-wrap text-sm">{c.internal_notes}</div></Card>}
            {c.inconsistencies?.length > 0 && <Card title="Inconsistências detectadas"><Bullets items={c.inconsistencies} /></Card>}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: any }) {
  return <div className="card-elevated p-5"><div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</div><div className="text-sm">{children}</div></div>;
}
function Bullets({ items }: { items: string[] }) { return <ul className="list-disc pl-5 space-y-1">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>; }
function Tags({ items }: { items: string[] }) { return <div className="flex flex-wrap gap-1.5">{items.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}</div>; }
function Empty() { return <div className="card-elevated p-6 text-sm text-muted-foreground text-center">Sem informações nesta seção.</div>; }
function StatusBadge({ status }: { status?: string }) {
  const map: Record<string,{ label: string; cls: string }> = {
    rascunho: { label: "Rascunho", cls: "bg-muted text-muted-foreground" },
    em_processamento: { label: "Processando", cls: "bg-blue-100 text-blue-700" },
    aguardando_revisao: { label: "Aguardando revisão", cls: "bg-amber-100 text-amber-700" },
    perfil_revisado: { label: "Revisado", cls: "bg-emerald-100 text-emerald-700" },
    ativo: { label: "Ativo", cls: "bg-primary-soft text-primary" },
    arquivado: { label: "Arquivado", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status ?? "rascunho"] ?? map.rascunho;
  return <Badge className={s.cls + " border-0"}>{s.label}</Badge>;
}
