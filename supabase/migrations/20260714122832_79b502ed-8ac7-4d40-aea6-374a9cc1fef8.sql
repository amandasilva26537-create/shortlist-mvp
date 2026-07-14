
-- Strengthen current_share_token() so trivially short values never match
CREATE OR REPLACE FUNCTION public.current_share_token()
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN length(coalesce(nullif(current_setting('request.headers', true)::json->>'x-share-token', ''), '')) >= 16
    THEN current_setting('request.headers', true)::json->>'x-share-token'
    ELSE NULL
  END;
$$;

-- Rebuild policies with an explicit minimum length gate + exact match
DROP POLICY IF EXISTS "shortlists public by token" ON public.shortlists;
CREATE POLICY "shortlists public by token" ON public.shortlists
FOR SELECT TO anon, authenticated
USING (
  status = 'sent'
  AND share_token IS NOT NULL
  AND length(share_token) >= 16
  AND current_share_token() IS NOT NULL
  AND share_token = current_share_token()
);

DROP POLICY IF EXISTS "sc public via published shortlist" ON public.shortlist_candidates;
CREATE POLICY "sc public via published shortlist" ON public.shortlist_candidates
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.shortlists s
  WHERE s.id = shortlist_candidates.shortlist_id
    AND s.status = 'sent'
    AND s.share_token IS NOT NULL
    AND length(s.share_token) >= 16
    AND current_share_token() IS NOT NULL
    AND s.share_token = current_share_token()
));

DROP POLICY IF EXISTS "candidates public via published shortlist" ON public.candidates;
CREATE POLICY "candidates public via published shortlist" ON public.candidates
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.shortlist_candidates sc
  JOIN public.shortlists s ON s.id = sc.shortlist_id
  WHERE sc.candidate_id = candidates.id
    AND s.status = 'sent'
    AND s.share_token IS NOT NULL
    AND length(s.share_token) >= 16
    AND current_share_token() IS NOT NULL
    AND s.share_token = current_share_token()
));

DROP POLICY IF EXISTS "jobs public via published shortlist" ON public.jobs;
CREATE POLICY "jobs public via published shortlist" ON public.jobs
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.shortlists s
  WHERE s.job_id = jobs.id
    AND s.status = 'sent'
    AND s.share_token IS NOT NULL
    AND length(s.share_token) >= 16
    AND current_share_token() IS NOT NULL
    AND s.share_token = current_share_token()
));

DROP POLICY IF EXISTS "eval public via published shortlist" ON public.candidate_job_evaluations;
CREATE POLICY "eval public via published shortlist" ON public.candidate_job_evaluations
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.shortlist_candidates sc
  JOIN public.shortlists s ON s.id = sc.shortlist_id
  WHERE sc.candidate_id = candidate_job_evaluations.candidate_id
    AND s.job_id = candidate_job_evaluations.job_id
    AND s.status = 'sent'
    AND s.share_token IS NOT NULL
    AND length(s.share_token) >= 16
    AND current_share_token() IS NOT NULL
    AND s.share_token = current_share_token()
));

DROP POLICY IF EXISTS "docs public visible only" ON public.candidate_documents;
CREATE POLICY "docs public visible only" ON public.candidate_documents
FOR SELECT TO anon, authenticated
USING (
  visible_to_client = true
  AND EXISTS (
    SELECT 1 FROM public.shortlist_candidates sc
    JOIN public.shortlists s ON s.id = sc.shortlist_id
    WHERE sc.candidate_id = candidate_documents.candidate_id
      AND s.status = 'sent'
      AND s.share_token IS NOT NULL
      AND length(s.share_token) >= 16
      AND current_share_token() IS NOT NULL
      AND s.share_token = current_share_token()
  )
);

DROP POLICY IF EXISTS "mf public read" ON public.manager_feedback;
CREATE POLICY "mf public read" ON public.manager_feedback
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.shortlists s
  WHERE s.id = manager_feedback.shortlist_id
    AND s.status = 'sent'
    AND s.share_token IS NOT NULL
    AND length(s.share_token) >= 16
    AND current_share_token() IS NOT NULL
    AND s.share_token = current_share_token()
));
