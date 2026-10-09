-- Acompanhamento do processo seletivo (MVP).
-- Somente adições: não altera, preenche ou remove dados existentes de vagas, shortlists ou candidatos.
-- Vagas antigas ficam SEM etapa (process_stage NULL) e sem datas históricas.

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS process_stage text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS shortlist_due_date date;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS tracking_token text;

-- Token do link de acompanhamento (um por vaga). Gera para as vagas existentes e define o padrão das novas.
UPDATE public.jobs SET tracking_token = replace(gen_random_uuid()::text, '-', '') WHERE tracking_token IS NULL;
ALTER TABLE public.jobs ALTER COLUMN tracking_token SET DEFAULT replace(gen_random_uuid()::text, '-', '');
CREATE UNIQUE INDEX IF NOT EXISTS jobs_tracking_token_key ON public.jobs (tracking_token);

-- Histórico de etapas: cada mudança vira uma linha (inclusive retornos a etapas anteriores).
CREATE TABLE IF NOT EXISTS public.job_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  stage text NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_stage_history_job_idx ON public.job_stage_history (job_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_stage_history TO authenticated;
GRANT ALL ON public.job_stage_history TO service_role;
ALTER TABLE public.job_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job stage history team all" ON public.job_stage_history;
CREATE POLICY "job stage history team all" ON public.job_stage_history
  FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid()))
  WITH CHECK (private.is_active_member(auth.uid()));

-- O cliente lê somente pelo backend, que valida o token. Sem acesso anônimo direto.
REVOKE ALL ON public.job_stage_history FROM anon;