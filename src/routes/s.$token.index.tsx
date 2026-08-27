import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPortalShortlist, getPortalCandidate } from "@/lib/db/portal.functions";
import { PortalWordmark } from "@/components/shortlist/PortusBrand";
import { PortalCandidateView } from "@/components/shortlist/PortalCandidateView";
import {
  ClientEvaluationPanel,
  loadIdentity,
  saveIdentity,
  type PortalIdentity,
} from "@/components/shortlist/ClientEvaluationPanel";

export const Route = createFileRoute("/s/$token/")({
  ssr: false,
  head: () => ({ meta: [{ title: "ShortList Portus" }] }),
  component: Portal,
});

function Portal() {
  const { token } = Route.useParams();
  const getFn = useServerFn(getPortalShortlist);
  const { data } = useQuery({ queryKey: ["portal", token], queryFn: () => getFn({ data: { token } }) });

  const [identity, setIdentity] = useState<PortalIdentity | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdentity(loadIdentity(token));
  }, [token]);

  const ordered = useMemo(() => {
    if (!data) return [] as any[];
    const byId = new Map((data.evaluations as any[]).map((e: any) => [e.candidate_id, e]));
    return [...(data.candidates as any[])].sort((a: any, b: any) => {
      const ma = byId.get(a.candidate_id)?.overall_match ?? -1;
      const mb = byId.get(b.candidate_id)?.overall_match ?? -1;
      if (mb !== ma) return mb - ma;
      return (a.position ?? 0) - (b.position ?? 0);
    });
  }, [data]);

  const safeIdx = Math.max(0, Math.min(idx, ordered.length - 1));
  const currentLink = ordered[safeIdx];
  const currentId: string | undefined = currentLink?.candidate_id;

  const candidateFn = useServerFn(getPortalCandidate);
  const { data: detail } = useQuery({
    queryKey: ["portal-candidate", token, currentId],
    queryFn: () => candidateFn({ data: { token, candidate_id: currentId! } }),
    enabled: !!currentId && !!identity,
  });

  if (!data) {
    return (
      <div className="portus-theme min-h-screen grid place-items-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const brand = (data.shortlist.clients as any)?.brand ?? "portus";
  const themeClass = brand === "moove" ? "moove-theme" : "portus-theme";

  const header = (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 md:px-6">
        <PortalWordmark brand={brand} />
        <div className="min-w-0 text-right">
          <div className="truncate text-xs font-medium text-muted-foreground">
            {data.shortlist.clients?.name}
          </div>
          <div className="truncate text-sm font-semibold">
            {data.shortlist.title || data.shortlist.jobs?.title}
          </div>
        </div>
      </div>
    </header>
  );

  if (!identity) {
    const submit = () => {
      if (!name.trim() || !role.trim()) return;
      const id = { name: name.trim(), role: role.trim() };
      saveIdentity(token, id);
      setIdentity(id);
    };
    return (
      <div className={`${themeClass} min-h-screen`}>
        {header}
        <div className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h1 className="text-base font-semibold">Antes de começar, identifique-se</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Suas avaliações e comentários ficarão vinculados a estes dados.
            </p>
            <div className="mt-4 space-y-3">
              <Input placeholder="Seu nome — Ex: João Silva" value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                placeholder="Cargo e empresa — Ex: Diretor de Operações, Acme"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
              <Button className="w-full" onClick={submit} disabled={!name.trim() || !role.trim()}>
                Ver candidatos
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const goto = (i: number) => {
    setIdx(Math.max(0, Math.min(ordered.length - 1, i)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };




  const candidate = detail?.candidate ?? currentLink?.candidates;
  const evaluation =
    detail?.evaluation ?? (data.evaluations as any[]).find((e: any) => e.candidate_id === currentId) ?? null;

  return (
    <div className={`${themeClass} min-h-screen overflow-x-hidden pb-12`}>
      {header}

      {/* 1. Cabeçalho da shortlist */}
      <div className="border-b border-border bg-primary-soft/60">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--portal-strong)" }}
          >
            Shortlist executiva
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {data.shortlist.title || data.shortlist.jobs?.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.shortlist.jobs?.title} · {ordered.length} candidatos apresentados
          </p>
          {data.shortlist.message && (
            <p className="mt-3 rounded-xl border border-border bg-card p-3 text-sm">{data.shortlist.message}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              Avaliando como <b className="text-foreground">{identity.name}</b> · {identity.role}
            </span>
            <button
              className="underline hover:text-foreground"
              onClick={() => {
                setName(identity.name);
                setRole(identity.role);
                setIdentity(null);
              }}
            >
              alterar
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        {ordered.length === 0 || !candidate ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhum candidato nesta shortlist ainda.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[68fr_32fr]">
            <div className="min-w-0 space-y-4">
              {/* 2. Navegação entre candidatos */}
              <nav
                aria-label="Navegação entre candidatos"
                className="rounded-2xl border border-border bg-card p-3 shadow-sm"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0 text-sm text-muted-foreground">
                    Candidato <b className="text-foreground">{safeIdx + 1}</b> de{" "}
                    <b className="text-foreground">{ordered.length}</b>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => goto(safeIdx - 1)} disabled={safeIdx === 0}>
                      <ChevronLeft className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Anterior</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goto(safeIdx + 1)}
                      disabled={safeIdx === ordered.length - 1}
                    >
                      <span className="mr-1 hidden sm:inline">Próximo</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {ordered.map((o: any, i: number) => (
                    <button
                      key={o.candidate_id}
                      onClick={() => goto(i)}
                      aria-label={`Ir para candidato ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        i === safeIdx ? "w-8 bg-primary" : "w-2 bg-border hover:bg-primary/40"
                      }`}
                    />
                  ))}
                </div>
              </nav>

              <PortalCandidateView
                candidate={candidate}
                evaluation={evaluation}
                jobId={data.shortlist.job_id}
                shortlistId={data.shortlist.id}
              />

            </div>

            {/* 6. Painel de avaliação */}
            <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              <ClientEvaluationPanel
                token={token}
                candidateId={candidate.id}
                candidateName={candidate.full_name}
                identity={identity}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
