
-- Move is_active_member to private schema (not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_active_member(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _uid
      AND ur.role IN ('admin','recruiter')
      AND COALESCE(p.status, 'active') = 'active'
  );
$$;

REVOKE ALL ON FUNCTION private.is_active_member(uuid) FROM PUBLIC, anon, authenticated;

-- Rewrite policies to reference private.is_active_member
DROP POLICY IF EXISTS "clients team all" ON public.clients;
CREATE POLICY "clients team all" ON public.clients FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid())) WITH CHECK (private.is_active_member(auth.uid()));

DROP POLICY IF EXISTS "jobs team all" ON public.jobs;
CREATE POLICY "jobs team all" ON public.jobs FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid())) WITH CHECK (private.is_active_member(auth.uid()));

DROP POLICY IF EXISTS "candidates team all" ON public.candidates;
CREATE POLICY "candidates team all" ON public.candidates FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid())) WITH CHECK (private.is_active_member(auth.uid()));

DROP POLICY IF EXISTS "docs team all" ON public.candidate_documents;
CREATE POLICY "docs team all" ON public.candidate_documents FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid())) WITH CHECK (private.is_active_member(auth.uid()));

DROP POLICY IF EXISTS "eval team all" ON public.candidate_job_evaluations;
CREATE POLICY "eval team all" ON public.candidate_job_evaluations FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid())) WITH CHECK (private.is_active_member(auth.uid()));

DROP POLICY IF EXISTS "shortlists team all" ON public.shortlists;
CREATE POLICY "shortlists team all" ON public.shortlists FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid())) WITH CHECK (private.is_active_member(auth.uid()));

DROP POLICY IF EXISTS "sc team all" ON public.shortlist_candidates;
CREATE POLICY "sc team all" ON public.shortlist_candidates FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid())) WITH CHECK (private.is_active_member(auth.uid()));

DROP POLICY IF EXISTS "mf team read" ON public.manager_feedback;
CREATE POLICY "mf team read" ON public.manager_feedback FOR SELECT TO authenticated
  USING (private.is_active_member(auth.uid()));

DROP POLICY IF EXISTS "activities team read" ON public.activities;
CREATE POLICY "activities team read" ON public.activities FOR SELECT TO authenticated
  USING (private.is_active_member(auth.uid()));
DROP POLICY IF EXISTS "activities self write" ON public.activities;
CREATE POLICY "activities self write" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND private.is_active_member(auth.uid()));

DROP POLICY IF EXISTS "profiles team read" ON public.profiles;
CREATE POLICY "profiles team read" ON public.profiles FOR SELECT TO authenticated
  USING (private.is_active_member(auth.uid()) OR id = auth.uid());

-- Drop the public version created in the previous migration
DROP FUNCTION IF EXISTS public.is_active_member(uuid);
