-- Roteiros de entrevista por vaga (Etapa 5). Somente adições.
-- kind: 'recruiter' agora; 'manager' (gestor/cliente) reservado para uma etapa futura.
CREATE TABLE IF NOT EXISTS public.job_interview_scripts (
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'recruiter' CHECK (kind IN ('recruiter', 'manager')),
  duration_min integer NOT NULL DEFAULT 30 CHECK (duration_min BETWEEN 10 AND 180),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by_ai boolean NOT NULL DEFAULT false,
  generated_at timestamptz,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, kind)
);

ALTER TABLE public.job_interview_scripts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_interview_scripts FROM anon, public;
GRANT ALL ON public.job_interview_scripts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_interview_scripts TO authenticated;
DROP POLICY IF EXISTS "interview scripts team all" ON public.job_interview_scripts;
CREATE POLICY "interview scripts team all" ON public.job_interview_scripts
  FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid()))
  WITH CHECK (private.is_active_member(auth.uid()));
-- Sem acesso anônimo: o roteiro do recrutador é interno e nunca é exposto ao portal do cliente.
