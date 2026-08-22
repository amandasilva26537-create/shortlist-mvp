import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Pencil, Lock, ExternalLink, FileText, Linkedin, Sparkles, ListPlus, Trash2, Archive, ChevronDown } from "lucide-react";
import { getCandidate, archiveCandidate, deleteCandidate } from "@/lib/db/candidates.functions";
import { listCandidateShortlistLinks, removeCandidateFromShortlist, updateCandidateShortlistStatus } from "@/lib/db/shortlists.functions";
import { AddToShortlistDialog } from "@/components/candidate/AddToShortlistDialog";
import { TagChips, TagPicker, BlockListWarning } from "@/components/candidate/CandidateTags";
import { ExperienceItem, LanguageList } from "@/components/candidate/ProfileBits";
import { toast } from "sonner";

const SECONDARY_LABELS: Record<string, string> = {
  documents: "Documentos e arquivos",
  additional: "Informações adicionais",
  shortlists: "Vagas e shortlists",
  internal: "Anotações internas",
};

function sortByYearDesc(items: any[]): any[] {
  const year = (o: any) => {
    const m = String(o?.end ?? o?.year ?? o?.start ?? "").match(/\d{4}/);
    return m ? Number(m[0]) : 0;
  };
  return [...items].sort((a, b) => year(b) - year(a));
}


export const Route = createFileRoute("/candidates/$candidateId")({
  head: ({ params }) => ({ meta: [{ title: `Candidato · ${params.candidateId}` }] }),
  component: CandidatePage,
});

function CandidatePage() {
  const { candidateId } = Route.useParams();
  const sp = (Route.useSearch() as any) ?? {};
  const returnTo: string | undefined = sp.returnTo;
  const cursor: string | undefined = sp.cursor;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getCandidate);
  const linksFn = useServerFn(listCandidateShortlistLinks);
  const archFn = useServerFn(archiveCandidate);
  const delFn = useServerFn(deleteCandidate);
  const removeLinkFn = useServerFn(removeCandidateFromShortlist);
  const setStatusFn = useServerFn(updateCandidateShortlistStatus);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);

  const { data, isLoading } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => getFn({ data: { id: candidateId } }),
    enabled: isUuid,
  });
  const { data: shortlistLinks = [] } = useQuery({
    queryKey: ["candidate-shortlists", candidateId],
    queryFn: () => linksFn({ data: { candidate_id: candidateId } }),
    enabled: isUuid,
  });
  const c: any = data;
  const [addOpen, setAddOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [tab, setTab] = useState("overview");


  const removeLink = useMutation({
    mutationFn: (shortlist_id: string) => removeLinkFn({ data: { shortlist_id, candidate_id: candidateId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["candidate-shortlists", candidateId] }); toast.success("Removido da shortlist"); },
  });
  const setStatus = useMutation({
    mutationFn: (v: { shortlist_id: string; status: string }) => setStatusFn({ data: { ...v, candidate_id: candidateId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["candidate-shortlists", candidateId] }); toast.success("Status atualizado"); },
  });
  const archiveM = useMutation({
    mutationFn: (archive: boolean) => archFn({ data: { id: candidateId, archive } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["candidate", candidateId] }); qc.invalidateQueries({ queryKey: ["candidates"] }); toast.success("Atualizado"); },
  });
  const removeM = useMutation({
    mutationFn: () => delFn({ data: { id: candidateId } }),
    onSuccess: () => { toast.success("Candidato excluído"); qc.invalidateQueries({ queryKey: ["candidates"] }); navigate({ to: "/candidates" }); },
    onError: (e: any) => toast.error(e.message ?? "Falha ao excluir"),
  });

  if (isLoading) return <AppShell><div className="text-sm text-muted-foreground">Carregando…</div></AppShell>;
  if (!c) return <AppShell><div className="text-sm text-muted-foreground">Candidato não encontrado.</div></AppShell>;

  const initials = (c.full_name ?? "").split(" ").slice(0,2).map((s: string) => s[0]).join("").toUpperCase();

  const STATUS_OPTIONS = ["adicionado","em_analise","apresentado","entrevista_solicitada","entrevista_agendada","finalista","aprovado","reprovado","contratado","desistiu"];
  const statusLabels: Record<string,string> = {
    adicionado: "Adicionado", em_analise: "Em análise", apresentado: "Apresentado",
    entrevista_solicitada: "Entrevista solicitada", entrevista_agendada: "Entrevista agendada",
    finalista: "Finalista", aprovado: "Aprovado", reprovado: "Reprovado",
    contratado: "Contratado", desistiu: "Desistiu",
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
          {(() => {
            const isShortlist = typeof returnTo === "string" && returnTo.startsWith("/shortlists/");
            if (isShortlist) {
              const url = cursor ? `${returnTo}?cursor=${cursor}` : returnTo;
              return (
                <a href={url} className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline">
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a shortlist
                </a>
              );
            }
            return (
              <Link to="/candidates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </Link>
            );
          })()}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setAddOpen(true)}>
              <ListPlus className="mr-1.5 h-4 w-4" /> Adicionar à shortlist
            </Button>
            <Button onClick={() => navigate({ to: "/candidates/new", search: { id: candidateId } as any })}>
              <Pencil className="mr-1.5 h-4 w-4" /> Editar
            </Button>
            <Button variant="ghost" onClick={() => archiveM.mutate(c.status !== "arquivado")}>
              <Archive className="mr-1.5 h-4 w-4" /> {c.status === "arquivado" ? "Desarquivar" : "Arquivar"}
            </Button>
            <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="mr-1.5 h-4 w-4" />Excluir</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir candidato?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza de que deseja excluir <b>{c.full_name}</b>? Esta ação removerá o candidato do banco de candidatos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {shortlistLinks.length > 0 && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                    Este candidato está vinculado a {shortlistLinks.length} shortlist(s). Ao excluir, ele também será removido dessas shortlists:
                    <ul className="list-disc pl-5 mt-1">
                      {shortlistLinks.map((l: any) => (
                        <li key={l.shortlist_id}>{l.shortlists?.title || `Shortlist ${l.shortlists?.number}`} · {l.shortlists?.jobs?.title} · {l.shortlists?.clients?.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => removeM.mutate()} disabled={removeM.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {removeM.isPending ? "Excluindo…" : "Excluir candidato"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>


        <BlockListWarning tags={c.tags} />

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
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <TagChips tags={c.tags} />
                <TagPicker candidateId={candidateId} candidateTags={c.tags} />
              </div>
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center gap-2 flex-wrap">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="overview">Visão geral</TabsTrigger>
              <TabsTrigger value="experience">Experiência e Formação</TabsTrigger>
              <TabsTrigger value="skills">Competências</TabsTrigger>
              <TabsTrigger value="disc">Perfil comportamental</TabsTrigger>
            </TabsList>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Mais <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => setTab("documents")}>Documentos e arquivos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTab("additional")}>Informações adicionais</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTab("shortlists")}>
                  Vagas e shortlists{shortlistLinks.length > 0 && ` (${shortlistLinks.length})`}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTab("internal")}>
                  <Lock className="mr-2 h-3.5 w-3.5" />Anotações internas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {SECONDARY_LABELS[tab] && (
              <Badge variant="secondary" className="ml-auto">{SECONDARY_LABELS[tab]}</Badge>
            )}
          </div>

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
            {c.professional_moment && Object.values(c.professional_moment).some(Boolean) && (
              <Card title="Momento profissional">
                {Object.entries({reason_for_move:"Motivo da movimentação",looking_for:"O que busca",availability:"Disponibilidade",expectations:"Expectativas"}).map(([k,label]) => c.professional_moment[k] && (
                  <div key={k} className="mb-1 text-sm"><span className="text-muted-foreground">{label}: </span>{c.professional_moment[k]}</div>
                ))}
              </Card>
            )}
            {!c.headline && !c.mini_bio && (
              <div className="card-elevated p-10 text-center">
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-sm text-muted-foreground mb-3">O perfil ainda não foi gerado.</div>
                <Button onClick={() => navigate({ to: "/candidates/new", search: { id: candidateId } as any })}>Editar e gerar perfil</Button>
              </div>
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
                {c.education?.length > 0 && <Card title="Formação acadêmica">{sortByYearDesc(c.education).map((e: any, i: number) => (
                  <div key={i} className="text-sm mb-1">• {[e.course, e.institution, [e.start, e.end].filter(Boolean).join("—"), e.status].filter(Boolean).join(" · ")}</div>
                ))}</Card>}
                {c.courses?.length > 0 && <Card title="Cursos, certificações e eventos">{sortByYearDesc(c.courses).map((e: any, i: number) => (
                  <div key={i} className="text-sm mb-1">• {[e.name, e.institution, e.year, e.workload].filter(Boolean).join(" · ")}</div>
                ))}</Card>}
                {c.languages?.length > 0 && <Card title="Idiomas"><LanguageList items={c.languages} /></Card>}
                {c.competencies?.technical?.length > 0 && <Card title="Conhecimentos complementares"><Tags items={c.competencies.technical} /></Card>}
                {!c.education?.length && !c.courses?.length && !c.languages?.length && !c.competencies?.technical?.length && <Empty />}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="skills" className="mt-4 space-y-4">
            {(c.competencies?.hard_skills?.length > 0 || c.competencies?.soft_skills?.length > 0 || c.competencies?.leadership?.length > 0 || c.competencies?.tools?.length > 0) ? (
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

          <TabsContent value="shortlists" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{shortlistLinks.length} vínculo(s)</div>
              <Button size="sm" onClick={() => setAddOpen(true)}><ListPlus className="mr-1.5 h-3.5 w-3.5" />Adicionar à shortlist</Button>
            </div>
            {shortlistLinks.length === 0 ? (
              <div className="card-elevated p-6 text-center text-sm text-muted-foreground">Este candidato ainda não está em nenhuma shortlist.</div>
            ) : shortlistLinks.map((l: any) => (
              <div key={l.shortlist_id} className="card-elevated p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{l.shortlists?.clients?.name}</div>
                    <div className="font-medium">{l.shortlists?.jobs?.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.shortlists?.title || `Shortlist ${String(l.shortlists?.number).padStart(2, "0")}`} · adicionado em {new Date(l.added_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={l.status} onValueChange={(v) => setStatus.mutate({ shortlist_id: l.shortlist_id, status: v })}>
                      <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {l.shortlists?.jobs?.id && (
                      <Link to="/jobs/$jobId" params={{ jobId: l.shortlists.jobs.id }}>
                        <Button variant="ghost" size="sm">Ver vaga</Button>
                      </Link>
                    )}
                    <Link to="/shortlists/$shortlistId" params={{ shortlistId: l.shortlist_id }}>
                      <Button variant="outline" size="sm">Ver shortlist</Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeLink.mutate(l.shortlist_id)}>Remover</Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <AddToShortlistDialog
        candidateId={candidateId}
        candidateName={c.full_name}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </AppShell>
  );
}


function Card({ title, children }: { title: string; children: any }) {
  return <div className="card-elevated p-5"><div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</div><div className="text-sm">{children}</div></div>;
}
function Bullets({ items }: { items: string[] }) { return <ul className="list-disc pl-5 space-y-1">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>; }
function Tags({ items }: { items: string[] }) { return <div className="flex flex-wrap gap-1.5">{items.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}</div>; }
function Empty() { return <div className="card-elevated p-6 text-sm text-muted-foreground text-center">Sem informações nesta seção.</div>; }

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
