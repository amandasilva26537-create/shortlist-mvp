
-- 1. Private schema for internal helpers not exposed via API
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- 2. Recreate has_role in private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
-- No grants to anon/authenticated: policies invoke it as owner via the policy engine,
-- but since it lives in a non-exposed schema PostgREST cannot call it directly.
-- Postgres still requires the querying role to have USAGE on the schema and EXECUTE
-- on the function when the function is referenced from within a policy expression.
GRANT USAGE ON SCHEMA private TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, anon;

-- 3. Rewrite all policies that referenced public.has_role
DROP POLICY IF EXISTS "clients owner all" ON public.clients;
CREATE POLICY "clients owner all" ON public.clients
  FOR ALL TO authenticated
  USING ((owner_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK ((owner_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "jobs owner all" ON public.jobs;
CREATE POLICY "jobs owner all" ON public.jobs
  FOR ALL TO authenticated
  USING ((created_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK ((created_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "candidates owner all" ON public.candidates;
CREATE POLICY "candidates owner all" ON public.candidates
  FOR ALL TO authenticated
  USING ((created_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK ((created_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "docs via candidate" ON public.candidate_documents;
CREATE POLICY "docs via candidate" ON public.candidate_documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_documents.candidate_id AND ((c.created_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_documents.candidate_id AND ((c.created_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))));

DROP POLICY IF EXISTS "eval via job" ON public.candidate_job_evaluations;
CREATE POLICY "eval via job" ON public.candidate_job_evaluations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = candidate_job_evaluations.job_id AND ((j.created_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = candidate_job_evaluations.job_id AND ((j.created_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))));

DROP POLICY IF EXISTS "shortlists owner all" ON public.shortlists;
CREATE POLICY "shortlists owner all" ON public.shortlists
  FOR ALL TO authenticated
  USING ((owner_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK ((owner_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "sc via shortlist owner" ON public.shortlist_candidates;
CREATE POLICY "sc via shortlist owner" ON public.shortlist_candidates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shortlists s WHERE s.id = shortlist_candidates.shortlist_id AND ((s.owner_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shortlists s WHERE s.id = shortlist_candidates.shortlist_id AND ((s.owner_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))));

DROP POLICY IF EXISTS "mf owner read" ON public.manager_feedback;
CREATE POLICY "mf owner read" ON public.manager_feedback
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shortlists s WHERE s.id = manager_feedback.shortlist_id AND ((s.owner_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))));

DROP POLICY IF EXISTS "activities own" ON public.activities;
CREATE POLICY "activities own" ON public.activities
  FOR ALL TO authenticated
  USING ((actor_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (actor_id = auth.uid());

-- 4. Drop public.has_role now that all references point to private.has_role
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 5. Helper to read the share token from the incoming request headers
CREATE OR REPLACE FUNCTION public.current_share_token()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.headers', true)::json->>'x-share-token', '');
$$;
REVOKE ALL ON FUNCTION public.current_share_token() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_share_token() TO anon, authenticated;

-- 6. Tighten anon-facing policies to require the correct share token
DROP POLICY IF EXISTS "shortlists public by token" ON public.shortlists;
CREATE POLICY "shortlists public by token" ON public.shortlists
  FOR SELECT TO anon
  USING (
    status = 'sent'
    AND share_token IS NOT NULL
    AND public.current_share_token() IS NOT NULL
    AND share_token = public.current_share_token()
  );

DROP POLICY IF EXISTS "sc public via published shortlist" ON public.shortlist_candidates;
CREATE POLICY "sc public via published shortlist" ON public.shortlist_candidates
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.shortlists s
    WHERE s.id = shortlist_candidates.shortlist_id
      AND s.status = 'sent'
      AND s.share_token IS NOT NULL
      AND s.share_token = public.current_share_token()
  ));

DROP POLICY IF EXISTS "candidates public via published shortlist" ON public.candidates;
CREATE POLICY "candidates public via published shortlist" ON public.candidates
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.shortlist_candidates sc
    JOIN public.shortlists s ON s.id = sc.shortlist_id
    WHERE sc.candidate_id = candidates.id
      AND s.status = 'sent'
      AND s.share_token IS NOT NULL
      AND s.share_token = public.current_share_token()
  ));

DROP POLICY IF EXISTS "jobs public via published shortlist" ON public.jobs;
CREATE POLICY "jobs public via published shortlist" ON public.jobs
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.shortlists s
    WHERE s.job_id = jobs.id
      AND s.status = 'sent'
      AND s.share_token IS NOT NULL
      AND s.share_token = public.current_share_token()
  ));

DROP POLICY IF EXISTS "eval public via published shortlist" ON public.candidate_job_evaluations;
CREATE POLICY "eval public via published shortlist" ON public.candidate_job_evaluations
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.shortlist_candidates sc
    JOIN public.shortlists s ON s.id = sc.shortlist_id
    WHERE sc.candidate_id = candidate_job_evaluations.candidate_id
      AND s.job_id = candidate_job_evaluations.job_id
      AND s.status = 'sent'
      AND s.share_token IS NOT NULL
      AND s.share_token = public.current_share_token()
  ));

DROP POLICY IF EXISTS "docs public visible only" ON public.candidate_documents;
CREATE POLICY "docs public visible only" ON public.candidate_documents
  FOR SELECT TO anon
  USING (
    visible_to_client = true
    AND EXISTS (
      SELECT 1 FROM public.shortlist_candidates sc
      JOIN public.shortlists s ON s.id = sc.shortlist_id
      WHERE sc.candidate_id = candidate_documents.candidate_id
        AND s.status = 'sent'
        AND s.share_token IS NOT NULL
        AND s.share_token = public.current_share_token()
    )
  );

DROP POLICY IF EXISTS "mf public read" ON public.manager_feedback;
CREATE POLICY "mf public read" ON public.manager_feedback
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.shortlists s
    WHERE s.id = manager_feedback.shortlist_id
      AND s.status = 'sent'
      AND s.share_token IS NOT NULL
      AND s.share_token = public.current_share_token()
  ));
