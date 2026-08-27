import { useState } from "react";
import { MatchRing } from "@/components/candidate/MatchRing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, MapPin, Building2, DollarSign, Clock, Star, User, Pencil, Save } from "lucide-react";
import { salaryLabel } from "@/lib/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { patchCandidate } from "@/lib/db/candidates.functions";
import { upsertEvaluation } from "@/lib/db/shortlists.functions";
import { toast } from "sonner";

interface Props {
  candidate: any;
  evaluation: any | null;
  readOnly?: boolean;
  jobId?: string;
  shortlistId?: string;
}

const num = (v: string) => {
  const n = Number(String(v).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && String(v).trim() !== "" ? n : null;
};

export function CandidateFlashcard({ candidate, evaluation, readOnly, jobId, shortlistId }: Props) {
  const c = candidate;
  const ev = evaluation;
  const salary = salaryLabel(c);
  const match = typeof ev?.overall_match === "number" ? ev.overall_match : null;
  const editable = !readOnly;

  const qc = useQueryClient();
  const patchFn = useServerFn(patchCandidate);
  const evalFn = useServerFn(upsertEvaluation);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  const startEdit = () => {
    setForm({
      full_name: c.full_name ?? "",
      headline: c.headline ?? "",
      disc_profile: c.disc_profile ?? "",
      current_position: c.current_position ?? "",
      area: c.area ?? "",
      city: c.city ?? "",
      work_model: c.work_model ?? "",
      age: c.age != null ? String(c.age) : "",
      salary_min: c.salary_min != null ? String(c.salary_min) : "",
      salary_max: c.salary_max != null ? String(c.salary_max) : "",
      salary_expectation: c.salary_expectation != null ? String(c.salary_expectation) : "",
      availability: c.professional_moment?.availability ?? "",
      key_differentiator: ev?.key_differentiator ?? "",
    });
    setEditing(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      await patchFn({
        data: {
          id: c.id,
          patch: {
            full_name: form.full_name?.trim() || c.full_name,
            headline: form.headline || null,
            disc_profile: form.disc_profile || null,
            current_position: form.current_position || null,
            area: form.area || null,
            city: form.city || null,
            work_model: form.work_model || null,
            age: num(form.age),
            salary_min: num(form.salary_min),
            salary_max: num(form.salary_max),
            salary_expectation: num(form.salary_expectation),
            professional_moment: {
              ...(c.professional_moment && typeof c.professional_moment === "object" ? c.professional_moment : {}),
              availability: form.availability || null,
            },
          },
        },
      });
      if (jobId) {
        await evalFn({
          data: {
            candidate_id: c.id,
            job_id: jobId,
            ...(shortlistId ? { shortlist_id: shortlistId } : {}),
            key_differentiator: form.key_differentiator || null,
          },
        });
      }
    },
    onSuccess: () => {
      if (shortlistId) {
        qc.invalidateQueries({ queryKey: ["shortlist", shortlistId] });
        qc.invalidateQueries({ queryKey: ["shortlist-evaluations", shortlistId] });
      }
      qc.invalidateQueries({ queryKey: ["candidate", c.id] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      setEditing(false);
      toast.success("Dados atualizados");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const initials = (c.full_name ?? "")
    .split(" ")
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg animate-scale-in">
      {/* Faixa decorativa superior */}
      <div className="h-1.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <div className="p-6 md:p-8">
        {editable && !editing && (
          <div className="mb-4 flex justify-end print:hidden">
            <Button size="sm" variant="outline" onClick={startEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar dados
            </Button>
          </div>
        )}

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nome completo"><Input value={form.full_name} onChange={set("full_name")} /></Field>
              <Field label="Perfil DISC"><Input value={form.disc_profile} onChange={set("disc_profile")} /></Field>
              <Field label="Cargo"><Input value={form.current_position} onChange={set("current_position")} /></Field>
              <Field label="Área"><Input value={form.area} onChange={set("area")} /></Field>
              <Field label="Cidade"><Input value={form.city} onChange={set("city")} /></Field>
              <Field label="Modelo de trabalho"><Input value={form.work_model} onChange={set("work_model")} /></Field>
              <Field label="Idade"><Input value={form.age} onChange={set("age")} inputMode="numeric" /></Field>
              <Field label="Disponibilidade"><Input value={form.availability} onChange={set("availability")} /></Field>
              <Field label="Pretensão mínima (R$)"><Input value={form.salary_min} onChange={set("salary_min")} inputMode="numeric" /></Field>
              <Field label="Pretensão máxima (R$)"><Input value={form.salary_max} onChange={set("salary_max")} inputMode="numeric" /></Field>
              <Field label="Pretensão (valor único, R$)"><Input value={form.salary_expectation} onChange={set("salary_expectation")} inputMode="numeric" /></Field>
            </div>
            <Field label="Headline / posicionamento">
              <Textarea rows={2} value={form.headline} onChange={set("headline")} />
            </Field>
            {jobId && (
              <Field label="Principal diferencial para a vaga">
                <Textarea rows={3} value={form.key_differentiator} onChange={set("key_differentiator")} />
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={save.isPending}>
                Cancelar
              </Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                <Save className="mr-1.5 h-3.5 w-3.5" /> {save.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {/* Foto + match */}
            <div className="flex items-start gap-4 md:flex-col md:items-center md:gap-3">
              {c.photo_url ? (
                <img src={c.photo_url} alt="" className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/20" />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-full bg-primary-soft text-2xl font-semibold text-primary">
                  {initials}
                </div>
              )}
              {match != null && <MatchRing value={match} size={72} label="match" />}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold tracking-tight">{c.full_name}</h2>
                  {c.headline && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.headline}</p>
                  )}
                </div>
                {c.disc_profile && <Badge variant="secondary" className="text-xs">DISC {c.disc_profile}</Badge>}
              </div>

              {/* Chips essenciais */}
              <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {c.current_position && <Chip icon={Briefcase} label="Cargo" value={c.current_position} />}
                {c.area && <Chip icon={Building2} label="Área" value={c.area} />}
                {c.city && <Chip icon={MapPin} label="Cidade" value={c.city} />}
                {c.work_model && <Chip icon={Clock} label="Modelo" value={c.work_model} />}
                {c.age && <Chip icon={User} label="Idade" value={`${c.age} anos`} />}
                {salary && <Chip icon={DollarSign} label="Pretensão salarial" value={salary} />}

                {c.professional_moment?.availability && (
                  <Chip icon={Clock} label="Disponibilidade" value={c.professional_moment.availability} />
                )}
              </div>

              {/* Diferencial */}
              {ev?.key_differentiator && (
                <div className="mt-5 rounded-xl border border-primary/30 bg-primary-soft/50 p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    <Star className="h-3 w-3" /> Principal diferencial para a vaga
                  </div>
                  <div className="text-sm text-foreground">{ev.key_differentiator}</div>
                </div>
              )}
              {!ev && (
                <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                  Análise para esta vaga ainda não disponível.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Chip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
