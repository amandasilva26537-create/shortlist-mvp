ALTER TABLE public.candidate_job_evaluations
  ADD COLUMN IF NOT EXISTS prompt_version integer NOT NULL DEFAULT 0;