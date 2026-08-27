CREATE TABLE IF NOT EXISTS public.candidate_test_results (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  title text not null,
  format text not null default 'other',
  url text,
  content text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_ctr_candidate ON public.candidate_test_results(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ctr_job ON public.candidate_test_results(job_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_test_results TO authenticated;
GRANT ALL ON public.candidate_test_results TO service_role;

ALTER TABLE public.candidate_test_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "test results team all" ON public.candidate_test_results;
CREATE POLICY "test results team all" ON public.candidate_test_results
  FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid()))
  WITH CHECK (private.is_active_member(auth.uid()));