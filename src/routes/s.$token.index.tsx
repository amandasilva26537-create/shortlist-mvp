import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPortalShortlist } from "@/lib/db/portal.functions";
import { FlashcardDeck } from "@/components/shortlist/FlashcardDeck";
import {
  ClientEvaluationPanel,
  loadIdentity,
  saveIdentity,
  type PortalIdentity,
} from "@/components/shortlist/ClientEvaluationPanel";

export const Route = createFileRoute("/s/$token/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Shortlist" }] }),
  component: Portal,
});

function Portal() {
  const { token } = Route.useParams();
  const getFn = useServerFn(getPortalShortlist);
  const { data } = useQuery({ queryKey: ["portal", token], queryFn: () => getFn({ data: { token } }) });

  const [identity, setIdentity] = useState<PortalIdentity | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [current, setCurrent] = useState<any>(null);

  useEffect(() => {
    setIdentity(loadIdentity(token));
  }, [token]);

  const onCurrentChange = useCallback((c: any) => setCurrent(c), []);

  if (!data) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando…</div>;

  const header = (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="text-[11px] uppercase tracking-widest text-primary">{data.shortlist.clients?.name}</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{data.shortlist.title || data.shortlist.jobs?.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.shortlist.jobs?.title} · {data.candidates.length} candidatos apresentados</p>
        {data.shortlist.message && <p className="mt-3 rounded-lg bg-primary-soft p-3 text-sm">{data.shortlist.message}</p>}
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
      <div className="min-h-screen bg-background">
        {header}
        <div className="mx-auto max-w-md px-5 py-10">
          <div className="card-soft p-5">
            <h2 className="text-base font-semibold">Antes de começar, identifique-se</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Suas avaliações e comentários ficarão vinculados a estes dados.
            </p>
            <div className="mt-4 space-y-3">
              <Input placeholder="Seu nome — Ex: João Silva" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Cargo e empresa — Ex: Diretor de Operações, Acme" value={role} onChange={(e) => setRole(e.target.value)} />
              <Button className="w-full" onClick={submit} disabled={!name.trim() || !role.trim()}>
                Ver candidatos
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const links = (data.candidates as any[]).map((cl: any) => ({ ...cl, candidates: cl.candidates }));

  return (
    <div className="min-h-screen bg-background">
      {header}

      <div className="mx-auto max-w-6xl p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Avaliando como <b className="text-foreground">{identity.name}</b> · {identity.role}</span>
          <button className="underline hover:text-foreground" onClick={() => { setName(identity.name); setRole(identity.role); setIdentity(null); }}>
            alterar
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <FlashcardDeck
              shortlistId={data.shortlist.id}
              jobId={data.shortlist.job_id}
              links={links}
              evaluations={data.evaluations as any[]}
              readOnly
              analysisBasePath={`/s/${token}/analysis`}
              profileBasePath={`/s/${token}/c`}
              onCurrentChange={onCurrentChange}
            />
          </div>
          <div className="lg:sticky lg:top-6 lg:self-start">
            {current && (
              <ClientEvaluationPanel
                token={token}
                candidateId={current.id}
                candidateName={current.full_name}
                identity={identity}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
