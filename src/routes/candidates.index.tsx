import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Archive, Pencil, Eye, FileText, Linkedin, Image as ImageIcon, Trash2, ListPlus } from "lucide-react";
import { listCandidates, archiveCandidate, deleteCandidate } from "@/lib/db/candidates.functions";
import { listCandidateShortlistLinks } from "@/lib/db/shortlists.functions";
import { listTags } from "@/lib/db/tags.functions";
import { AddToShortlistDialog } from "@/components/candidate/AddToShortlistDialog";
import { TagChips, tagDotClasses } from "@/components/candidate/CandidateTags";
import { toast } from "sonner";


export const Route = createFileRoute("/candidates/")({
  head: () => ({
    meta: [
      { title: "Candidatos · Moove List" },
      { name: "description", content: "Banco de candidatos avaliados pela Moove List com filtros por vaga, senioridade e status do processo." },
      { property: "og:title", content: "Candidatos · Moove List" },
      { property: "og:description", content: "Base de talentos avaliados e prontos para compor shortlists executivas." },
      { property: "og:url", content: "https://intel-select-hub.lovable.app/candidates" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://intel-select-hub.lovable.app/candidates" }],
  }),
  component: CandidatesList,
});


function CandidatesList() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listCandidates);
  const archFn = useServerFn(archiveCandidate);
  const delFn = useServerFn(deleteCandidate);
  const { data: candidates = [], isLoading } = useQuery({ queryKey: ["candidates"], queryFn: () => listFn() });
  const archive = useMutation({
    mutationFn: (v: { id: string; archive: boolean }) => archFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["candidates"] }); toast.success("Atualizado"); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["candidates"] }); toast.success("Candidato excluído"); setToDelete(null); },
    onError: (e: any) => toast.error(e.message ?? "Falha ao excluir"),
  });

  const [toDelete, setToDelete] = useState<any>(null);
  const [addToSl, setAddToSl] = useState<any>(null);


  const [q, setQ] = useState("");
  const [area, setArea] = useState<string>("all");
  const [seniority, setSeniority] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [wm, setWm] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [hasLinkedin, setHasLinkedin] = useState<string>("all");
  const [hasResume, setHasResume] = useState<string>("all");
  const [hasPhoto, setHasPhoto] = useState<string>("all");
  const [tagIds, setTagIds] = useState<string[]>([]);

  const tagsFn = useServerFn(listTags);
  const { data: allTags = [] } = useQuery({ queryKey: ["tags"], queryFn: () => tagsFn() });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return candidates.filter((c: any) => {
      if (term) {
        const hay = [c.full_name, c.current_position, c.area, c.city, c.current_company, c.linkedin_url, c.phone, c.email, ...(c.competencies?.hard_skills ?? []), ...(c.competencies?.soft_skills ?? []), ...(c.tags ?? []).map((t: any) => t.name)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (area !== "all" && c.area !== area) return false;
      if (seniority !== "all" && c.seniority !== seniority) return false;
      if (city !== "all" && c.city !== city) return false;
      if (wm !== "all" && c.work_model !== wm) return false;
      if (status !== "all" && c.status !== status) return false;
      if (hasLinkedin === "yes" && !c.linkedin_url) return false;
      if (hasLinkedin === "no" && c.linkedin_url) return false;
      if (hasResume === "yes" && !c.resume_url) return false;
      if (hasResume === "no" && c.resume_url) return false;
      if (hasPhoto === "yes" && !c.photo_url) return false;
      if (hasPhoto === "no" && c.photo_url) return false;
      if (tagIds.length > 0) {
        const own = new Set<string>((c.tags ?? []).map((t: any) => t.id));
        if (!tagIds.some((id) => own.has(id))) return false;
      }
      return true;
    });
  }, [candidates, q, area, seniority, city, wm, status, hasLinkedin, hasResume, hasPhoto, tagIds]);

  const uniques = (k: string) => Array.from(new Set(candidates.map((c: any) => c[k]).filter(Boolean))) as string[];


  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-primary">Banco de talentos</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Candidatos</h1>
            <div className="mt-1 text-sm text-muted-foreground">{candidates.length} candidato(s) cadastrado(s) · {filtered.length} exibido(s)</div>
          </div>
          <Button onClick={() => nav({ to: "/candidates/new" })}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo candidato
          </Button>
        </div>

        <div className="card-elevated mb-4 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por nome, cargo, área, cidade, empresa, competência, LinkedIn, telefone ou e-mail…" className="pl-9" />
          </div>
          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <FilterSelect label="Área" value={area} setValue={setArea} options={uniques("area")} />
            <FilterSelect label="Senioridade" value={seniority} setValue={setSeniority} options={uniques("seniority")} />
            <FilterSelect label="Cidade" value={city} setValue={setCity} options={uniques("city")} />
            <FilterSelect label="Modelo" value={wm} setValue={setWm} options={["Remoto","Híbrido","Presencial","Flexível","Não informado"]} />
            <FilterSelect label="Status" value={status} setValue={setStatus} options={["rascunho","em_processamento","aguardando_revisao","perfil_revisado","ativo","arquivado"]} />
            <FilterSelect label="LinkedIn" value={hasLinkedin} setValue={setHasLinkedin} options={["yes","no"]} labels={{ yes: "Possui", no: "Não possui" }} />
            <FilterSelect label="Currículo" value={hasResume} setValue={setHasResume} options={["yes","no"]} labels={{ yes: "Possui", no: "Não possui" }} />
            <FilterSelect label="Foto" value={hasPhoto} setValue={setHasPhoto} options={["yes","no"]} labels={{ yes: "Possui", no: "Não possui" }} />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
              <span className="mr-1 text-xs font-medium text-muted-foreground">Etiquetas:</span>
              {allTags.map((t: any) => {
                const on = tagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setTagIds((prev) => (on ? prev.filter((id) => id !== t.id) : [...prev, t.id]))
                    }
                    className={
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors " +
                      (on ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:bg-secondary")
                    }
                  >
                    <span className={`h-2 w-2 rounded-full ${tagDotClasses(t.color)}`} />
                    {t.name}
                    <span className="text-[10px] opacity-70">{t.candidate_count}</span>
                  </button>
                );
              })}
              {tagIds.length > 0 && (
                <button type="button" onClick={() => setTagIds([])} className="ml-1 text-xs text-primary hover:underline">
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>


        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="card-elevated p-10 text-center text-sm text-muted-foreground">
            Nenhum candidato encontrado. <Link to="/candidates/new" className="text-primary underline">Cadastrar o primeiro</Link>.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c: any) => (
              <div key={c.id} className="card-elevated p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14">
                    {c.photo_url && <AvatarImage src={c.photo_url} alt={c.full_name} />}
                    <AvatarFallback>{c.full_name?.split(" ").slice(0,2).map((s: string) => s[0]).join("").toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{c.full_name}</div>
                    <div className="truncate text-sm text-muted-foreground">{c.current_position || "—"}{c.area ? ` · ${c.area}` : ""}</div>
                    <div className="truncate text-xs text-muted-foreground">{[c.city, c.work_model, c.age ? `${c.age} anos` : null].filter(Boolean).join(" · ") || "—"}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <TagChips tags={c.tags} max={4} />
                {c.mini_bio && <div className="text-sm text-muted-foreground line-clamp-3">{c.mini_bio}</div>}

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {c.photo_url && <ImageIcon className="h-3.5 w-3.5" />}
                  {c.resume_url && <FileText className="h-3.5 w-3.5" />}
                  {c.linkedin_url && <Linkedin className="h-3.5 w-3.5" />}
                  {c.salary_expectation && <span>R$ {Number(c.salary_expectation).toLocaleString("pt-BR")}</span>}
                  <span className="ml-auto">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                  <Link to="/candidates/$candidateId" params={{ candidateId: c.id }} className="flex-1 min-w-[120px]">
                    <Button variant="outline" size="sm" className="w-full"><Eye className="mr-1 h-3.5 w-3.5" />Ver perfil</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => setAddToSl(c)} title="Adicionar à shortlist" aria-label="Adicionar à shortlist">
                    <ListPlus className="h-3.5 w-3.5" />
                  </Button>
                  <Link to="/candidates/new" search={{ id: c.id } as any}>
                    <Button variant="ghost" size="sm" title="Editar" aria-label="Editar candidato"><Pencil className="h-3.5 w-3.5" /></Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => archive.mutate({ id: c.id, archive: c.status !== "arquivado" })} title={c.status === "arquivado" ? "Desarquivar" : "Arquivar"} aria-label={c.status === "arquivado" ? "Desarquivar candidato" : "Arquivar candidato"}>
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setToDelete(c)} title="Excluir" aria-label="Excluir candidato" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteCandidateDialog
        candidate={toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={(id) => remove.mutate(id)}
        pending={remove.isPending}
      />

      {addToSl && (
        <AddToShortlistDialog
          candidateId={addToSl.id}
          candidateName={addToSl.full_name}
          open={!!addToSl}
          onOpenChange={(v) => !v && setAddToSl(null)}
        />
      )}
    </AppShell>
  );
}

function DeleteCandidateDialog({ candidate, onClose, onConfirm, pending }: { candidate: any; onClose: () => void; onConfirm: (id: string) => void; pending: boolean }) {
  const linksFn = useServerFn(listCandidateShortlistLinks);
  const { data: links = [] } = useQuery({
    queryKey: ["candidate-shortlists", candidate?.id],
    queryFn: () => linksFn({ data: { candidate_id: candidate.id } }),
    enabled: !!candidate,
  });
  return (
    <AlertDialog open={!!candidate} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir candidato?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza de que deseja excluir <b>{candidate?.full_name}</b>? Esta ação removerá o candidato do banco de candidatos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {links.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            Este candidato está vinculado a {links.length} shortlist(s). Ao excluir, ele também será removido dessas shortlists:
            <ul className="list-disc pl-5 mt-1">
              {links.map((l: any) => (
                <li key={l.shortlist_id}>{l.shortlists?.title || `Shortlist ${l.shortlists?.number}`} · {l.shortlists?.jobs?.title} · {l.shortlists?.clients?.name}</li>
              ))}
            </ul>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={() => candidate && onConfirm(candidate.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {pending ? "Excluindo…" : "Excluir candidato"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


function FilterSelect({ label, value, setValue, options, labels }: { label: string; value: string; setValue: (v: string) => void; options: string[]; labels?: Record<string,string> }) {
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: Todos</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{labels?.[o] ?? o}</SelectItem>)}
      </SelectContent>
    </Select>
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
