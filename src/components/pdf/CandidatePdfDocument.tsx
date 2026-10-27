import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExperienceItem, LanguageList } from "@/components/candidate/ProfileBits";
import { DiscSection } from "@/components/candidate/DiscSection";
import { AnalysisContent } from "@/components/shortlist/AnalysisContent";

export type PdfSection = "analysis" | "profile" | "disc";
export const PDF_SECTIONS: { key: PdfSection; label: string }[] = [
  { key: "analysis", label: "Análise" },
  { key: "profile", label: "Perfil completo" },
  { key: "disc", label: "Perfil comportamental" },
];

export function parsePdfSections(raw: unknown): PdfSection[] {
  const keys = String(raw ?? "").split(",").map((s) => s.trim());
  const valid = PDF_SECTIONS.map((s) => s.key).filter((k) => keys.includes(k));
  return valid.length ? valid : PDF_SECTIONS.map((s) => s.key);
}

interface Props {
  candidate: any;
  jobTitle?: string | null;
  jobId: string;
  shortlistId: string;
  evaluation: any | null;
  sections: PdfSection[];
  autoprint: boolean;
  onSectionsChange: (next: PdfSection[]) => void;
}

export function CandidatePdfDocument({ candidate: c, jobTitle, jobId, shortlistId, evaluation, sections, autoprint, onSectionsChange }: Props) {
  const initials = (c.full_name ?? "").split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase();
  const printed = useRef(false);

  useEffect(() => {
    if (!autoprint || printed.current) return;
    printed.current = true;
    const t = setTimeout(async () => {
      const imgs = Array.from(document.images).filter((i) => !i.complete);
      await Promise.race([
        Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = () => r(null); }))),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
      window.print();
    }, 1200);
    return () => clearTimeout(t);
  }, [autoprint]);

  const toggle = (k: PdfSection) => {
    const has = sections.includes(k);
    const next = PDF_SECTIONS.map((s) => s.key).filter((x) => (x === k ? !has : sections.includes(x)));
    if (next.length) onSectionsChange(next);
  };

  return (
    <div className="pdf-root min-h-screen bg-background">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { background: #fff !important; }
          .pdf-root, .pdf-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden, .no-print { display: none !important; }
          .pdf-section + .pdf-section { break-before: page; page-break-before: always; }
          .card-elevated, .card-soft { break-inside: avoid; box-shadow: none !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 md:px-8">
          <span className="text-sm font-medium">Páginas do PDF:</span>
          {PDF_SECTIONS.map((s) => (
            <label key={s.key} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={sections.includes(s.key)} onChange={() => toggle(s.key)} />
              {s.label}
            </label>
          ))}
          <Button size="sm" className="ml-auto" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Baixar PDF
          </Button>
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-2 text-xs text-muted-foreground md:px-8">
          Na janela que abrir, escolha "Salvar como PDF" como destino.
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        {sections.map((key) => (
          <section key={key} className="pdf-section mb-10">
            <PdfHeader c={c} initials={initials} jobTitle={jobTitle} title={PDF_SECTIONS.find((s) => s.key === key)!.label} />
            {key === "analysis" && (
              <AnalysisContent candidate={c} jobId={jobId} shortlistId={shortlistId} evaluation={evaluation} readOnly />
            )}
            {key === "profile" && <PdfProfile c={c} />}
            {key === "disc" && <DiscSection candidate={c} readOnly />}
          </section>
        ))}
      </main>
    </div>
  );
}

function PdfHeader({ c, initials, jobTitle, title }: { c: any; initials: string; jobTitle?: string | null; title: string }) {
  return (
    <div className="mb-6 flex items-start gap-4 border-b border-border pb-5">
      {c.photo_url ? (
        <img src={c.photo_url} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-primary/20" />
      ) : (
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary-soft text-xl font-semibold text-primary">{initials}</div>
      )}
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          {title}{jobTitle ? ` · ${jobTitle}` : ""}
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{c.full_name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {[c.current_position, c.current_company, c.city].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>
    </div>
  );
}

/* ---------- Perfil completo (currículo), versão para impressão ---------- */

function PdfProfile({ c }: { c: any }) {
  const comp = c.competencies ?? {};
  return (
    <div className="space-y-4">
      {c.headline && <div className="text-sm font-medium text-primary">{c.headline}</div>}
      {c.mini_bio && <Card title="Mini bio"><p className="whitespace-pre-wrap text-sm">{c.mini_bio}</p></Card>}
      {c.full_bio && <Card title="Resumo profissional detalhado"><p className="whitespace-pre-wrap text-sm">{c.full_bio}</p></Card>}
      {c.executive_summary?.length > 0 && <Card title="Resumo executivo"><Bullets items={c.executive_summary} /></Card>}
      {c.specialties?.length > 0 && <Card title="Áreas de especialidade"><Tags items={c.specialties} /></Card>}
      {(c.achievements?.length > 0 || c.main_results?.length > 0) && (
        <Card title="Destaques da carreira">
          {c.achievements?.length > 0 && <Bullets items={c.achievements} />}
          {c.main_results?.length > 0 && (
            <div className={c.achievements?.length > 0 ? "mt-3" : ""}>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Principais resultados</div>
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
              <div className="text-sm font-medium">{s.title}</div>
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

      {c.trajectory?.length > 0 && (
        <div>
          <h2 className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wider text-primary">Experiência profissional</h2>
          <div className="space-y-3">
            {c.trajectory.map((t: any, i: number) => (
              <div key={i} style={{ breakInside: "avoid" }}><ExperienceItem exp={t} defaultOpen compact={false} /></div>
            ))}
          </div>
        </div>
      )}

      {c.education?.length > 0 && (
        <Card title="Formação acadêmica">{c.education.map((e: any, i: number) => (
          <div key={i} className="mb-1 text-sm">• {[e.course, e.institution, [e.start, e.end].filter(Boolean).join("—"), e.status].filter(Boolean).join(" · ")}</div>
        ))}</Card>
      )}
      {c.courses?.length > 0 && (
        <Card title="Cursos, certificações e eventos">{c.courses.map((e: any, i: number) => (
          <div key={i} className="mb-1 text-sm">• {[e.name, e.institution, e.year, e.workload].filter(Boolean).join(" · ")}</div>
        ))}</Card>
      )}
      {c.languages?.length > 0 && <Card title="Idiomas"><LanguageList items={c.languages} /></Card>}
      {comp.technical?.length > 0 && <Card title="Conhecimentos complementares"><Tags items={comp.technical} /></Card>}
      {comp.hard_skills?.length > 0 && <Card title="Habilidades técnicas"><Tags items={comp.hard_skills} /></Card>}
      {comp.tools?.length > 0 && <Card title="Ferramentas"><Tags items={comp.tools} /></Card>}
      {comp.soft_skills?.length > 0 && <Card title="Habilidades comportamentais"><Tags items={comp.soft_skills} /></Card>}
      {comp.leadership?.length > 0 && <Card title="Habilidades de liderança"><Tags items={comp.leadership} /></Card>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-elevated p-5" style={{ breakInside: "avoid" }}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div>{children}</div>
    </div>
  );
}

function toList(items: unknown): string[] {
  if (Array.isArray(items)) return items as string[];
  if (typeof items === "string")
    return items.split(/\r?\n|(?:^|\s)[•\-–]\s+/).map((s) => s.trim()).filter(Boolean);
  return [];
}
function Bullets({ items }: { items: unknown }) {
  return <ul className="space-y-1">{toList(items).map((it, i) => <li key={i} className="text-sm">• {it}</li>)}</ul>;
}
function Tags({ items }: { items: unknown }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {toList(items).map((it, i) => <Badge key={i} variant="secondary" className="text-xs">{it}</Badge>)}
    </div>
  );
}
