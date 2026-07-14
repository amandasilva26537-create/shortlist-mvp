
-- 1) Extend profiles with status and role_title
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS role_title text,
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 2) is_active_member helper (admin OR active recruiter)
CREATE OR REPLACE FUNCTION public.is_active_member(_uid uuid)
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

GRANT EXECUTE ON FUNCTION public.is_active_member(uuid) TO authenticated;

-- 3) Rewrite RLS policies for shared internal access
-- clients
DROP POLICY IF EXISTS "clients owner all" ON public.clients;
CREATE POLICY "clients team all" ON public.clients
  FOR ALL TO authenticated
  USING (public.is_active_member(auth.uid()))
  WITH CHECK (public.is_active_member(auth.uid()));

-- jobs
DROP POLICY IF EXISTS "jobs owner all" ON public.jobs;
CREATE POLICY "jobs team all" ON public.jobs
  FOR ALL TO authenticated
  USING (public.is_active_member(auth.uid()))
  WITH CHECK (public.is_active_member(auth.uid()));

-- candidates
DROP POLICY IF EXISTS "candidates owner all" ON public.candidates;
CREATE POLICY "candidates team all" ON public.candidates
  FOR ALL TO authenticated
  USING (public.is_active_member(auth.uid()))
  WITH CHECK (public.is_active_member(auth.uid()));

-- candidate_documents
DROP POLICY IF EXISTS "docs via candidate" ON public.candidate_documents;
CREATE POLICY "docs team all" ON public.candidate_documents
  FOR ALL TO authenticated
  USING (public.is_active_member(auth.uid()))
  WITH CHECK (public.is_active_member(auth.uid()));

-- candidate_job_evaluations
DROP POLICY IF EXISTS "eval via job" ON public.candidate_job_evaluations;
CREATE POLICY "eval team all" ON public.candidate_job_evaluations
  FOR ALL TO authenticated
  USING (public.is_active_member(auth.uid()))
  WITH CHECK (public.is_active_member(auth.uid()));

-- shortlists
DROP POLICY IF EXISTS "shortlists owner all" ON public.shortlists;
CREATE POLICY "shortlists team all" ON public.shortlists
  FOR ALL TO authenticated
  USING (public.is_active_member(auth.uid()))
  WITH CHECK (public.is_active_member(auth.uid()));

-- shortlist_candidates
DROP POLICY IF EXISTS "sc via shortlist owner" ON public.shortlist_candidates;
CREATE POLICY "sc team all" ON public.shortlist_candidates
  FOR ALL TO authenticated
  USING (public.is_active_member(auth.uid()))
  WITH CHECK (public.is_active_member(auth.uid()));

-- manager_feedback owner read -> team read
DROP POLICY IF EXISTS "mf owner read" ON public.manager_feedback;
CREATE POLICY "mf team read" ON public.manager_feedback
  FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()));

-- activities: allow team to read all, but only actor can insert as themselves
DROP POLICY IF EXISTS "activities own" ON public.activities;
CREATE POLICY "activities team read" ON public.activities
  FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()));
CREATE POLICY "activities self write" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "activities admin manage" ON public.activities
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) profiles: allow team to read profiles of team members; admin can update any profile
CREATE POLICY "profiles team read" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()) OR id = auth.uid());

CREATE POLICY "profiles admin manage" ON public.profiles
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- 5) user_roles: admin can read/manage all roles
CREATE POLICY "roles admin read" ON public.user_roles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "roles admin manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Ensure the very first user becomes admin if there is none yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, 'admin'::public.app_role FROM auth.users ORDER BY created_at ASC LIMIT 1
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
