ALTER TABLE public.manager_feedback ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DELETE FROM public.manager_feedback a
USING public.manager_feedback b
WHERE a.shortlist_id = b.shortlist_id
  AND a.candidate_id = b.candidate_id
  AND lower(coalesce(a.client_identifier,'')) = lower(coalesce(b.client_identifier,''))
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS manager_feedback_unique_reviewer
  ON public.manager_feedback (shortlist_id, candidate_id, lower(coalesce(client_identifier,'')));