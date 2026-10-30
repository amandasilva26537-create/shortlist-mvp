import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getInterviewScript } from "@/lib/db/interviews.functions";
import { TYPE_LABEL } from "@/lib/interview-script";

export const Route = createFileRoute("/roteiros/$jobId/pdf")({
  ssr: false,
  head: () => ({ meta: [{ title: "Roteiro de entrevista" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ScriptPdf,
});

/** Página de impressão (Salvar como PDF). Rota interna: exige login como o restante do painel. */
function ScriptPdf() {
  const { jobId } = Route.useParams();
  const fn = useServerFn(getInterviewScript);
  const { data, isLoading } = useQuery({ queryKey: ["interview-script", jobId], queryFn: () => fn({ data: { job_id: jobId } }) });
  const s = data?.script;
  useEffect(() => {
    if (s && new URLSearchParams(window.location.search).get("autoprint") === "1") { const t = setTimeout(() => window.print(), 400); return () => clearTimeout(t); }
  }, [s]);

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  if (!data || !s) return <div className="p-8 text-sm text-muted-foreground">Nenhum roteiro salvo para esta vaga.</div>;
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-[13px] leading-relaxed text-black print:p-0">
      <style>{`@media print { @page { margin: 16mm; } .no-print { display: none } section { break-inside: avoid } }`}</style>
      <div className="no-print mb-4 flex justify-end"><button className="rounded border px-3 py-1.5 text-sm" onClick={() => window.print()}>Imprimir / salvar PDF</button></div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Moove Talent · Documento interno do recrutador</div>
      <h1 className="mt-1 text-2xl font-semibold">Roteiro de entrevista — {data.title}</h1>
      <p className="text-gray-600">Duração aproximada: {s.duration_min} min{s.leadership ? " · vaga de liderança" : ""}</p>
      {s.opening && <p className="mt-4"><b>Abertura.</b> {s.opening}</p>}
      {s.sections.map((sec, i) => (
        <section key={i} className="mt-5">
          <h2 className="border-b border-gray-300 pb-1 text-base font-semibold">{i + 1}. {sec.title} <span className="font-normal text-gray-500">({sec.minutes} min)</span></h2>
          <ol className="mt-2 space-y-3">
            {sec.questions.map((q, j) => (
              <li key={j}>
                <div><span className="text-[10px] font-semibold uppercase text-gray-500">{TYPE_LABEL[q.type]}</span> · {q.text}</div>
                {q.evaluates && <div className="text-gray-600">Avalia: {q.evaluates}</div>}
                {q.good_signs.map((g, k) => <div key={k} className="pl-3 text-gray-700">+ {g}</div>)}
                {q.watch_for.map((w, k) => <div key={k} className="pl-3 text-gray-700">! {w}</div>)}
                <div className="mt-1 text-gray-400">Nota: 1 ○  2 ○  3 ○  4 ○  5 ○   Anotações: ______________________________</div>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {s.criteria.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-gray-300 pb-1 text-base font-semibold">Critérios de avaliação</h2>
          <table className="mt-2 w-full border-collapse text-[12px]">
            <thead><tr className="text-left"><th className="border p-1.5">Critério</th><th className="border p-1.5">1 · fraco</th><th className="border p-1.5">3 · adequado</th><th className="border p-1.5">5 · forte</th></tr></thead>
            <tbody>{s.criteria.map((c, i) => <tr key={i}><td className="border p-1.5 font-medium">{c.name}</td><td className="border p-1.5">{c.weak}</td><td className="border p-1.5">{c.adequate}</td><td className="border p-1.5">{c.strong}</td></tr>)}</tbody>
          </table>
        </section>
      )}
      {s.closing && <p className="mt-5"><b>Encerramento.</b> {s.closing}</p>}
      <p className="mt-6 text-[10px] text-gray-500">Apoio à entrevista. A decisão sobre o candidato é do recrutador. Não faça perguntas sobre vida pessoal ou características protegidas.</p>
    </div>
  );
}
