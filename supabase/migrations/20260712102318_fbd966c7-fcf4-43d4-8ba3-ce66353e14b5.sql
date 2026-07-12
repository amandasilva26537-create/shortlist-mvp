
ALTER TABLE public.candidate_job_evaluations
  ADD COLUMN IF NOT EXISTS job_specific_summary text,
  ADD COLUMN IF NOT EXISTS recruiter_opinion text,
  ADD COLUMN IF NOT EXISTS main_case jsonb,
  ADD COLUMN IF NOT EXISTS risk_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS motivational_factor text,
  ADD COLUMN IF NOT EXISTS eliminatory_checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS top_strengths jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dimension_scores jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS radar_scores jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS key_differentiator text,
  ADD COLUMN IF NOT EXISTS shortlist_id uuid REFERENCES public.shortlists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS candidate_job_evaluations_shortlist_id_idx
  ON public.candidate_job_evaluations(shortlist_id);

CREATE UNIQUE INDEX IF NOT EXISTS candidate_job_evaluations_candidate_job_uniq
  ON public.candidate_job_evaluations(candidate_id, job_id);
