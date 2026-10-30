-- Recrutador oficial (cadastrado em Equipe) e datas do processo na vaga, usados nos Indicadores de Recrutamento.
-- Apenas ADICIONA colunas (nulas). Não altera nem apaga dados existentes.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS recruiter_id uuid,
  ADD COLUMN IF NOT EXISTS opened_on date,
  ADD COLUMN IF NOT EXISTS sl1_date date,
  ADD COLUMN IF NOT EXISTS sl2_date date,
  ADD COLUMN IF NOT EXISTS sl3_date date,
  ADD COLUMN IF NOT EXISTS closed_on date;

-- Se o recrutador for excluído da Equipe, a vaga fica "sem recrutador" (não é apagada).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_recruiter_id_fkey') THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON public.jobs (recruiter_id);