
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TYPE public.app_role AS ENUM ('admin','recruiter','client');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text, avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'recruiter');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, logo_url text, segment text, website text,
  city text, state text, country text,
  contact_name text, contact_role text, internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients owner all" ON public.clients FOR ALL TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL, area text, seniority text, location text,
  work_model text, contract_type text,
  salary_min numeric, salary_max numeric,
  manager_name text, description text, briefing_url text,
  recruiter_notes text, meeting_transcript text,
  ai_structure jsonb,
  must_have text[] DEFAULT '{}', nice_to_have text[] DEFAULT '{}',
  hard_skills text[] DEFAULT '{}', soft_skills text[] DEFAULT '{}',
  radar_competencies jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs owner all" ON public.jobs FOR ALL TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL, photo_url text, current_position text,
  city text, work_model text, salary_expectation numeric,
  linkedin_url text, resume_url text, transcript text, recruiter_note text,
  disc_raw text, disc_profile text, disc_scores jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT SELECT ON public.candidates TO anon;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidates owner all" ON public.candidates FOR ALL TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_candidates_updated BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.candidate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  kind text NOT NULL, label text, url text NOT NULL,
  visible_to_client boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_documents TO authenticated;
GRANT SELECT ON public.candidate_documents TO anon;
GRANT ALL ON public.candidate_documents TO service_role;
ALTER TABLE public.candidate_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs via candidate" ON public.candidate_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.candidate_job_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  overall_match integer, ai_generated jsonb,
  strengths text[] DEFAULT '{}', risks text[] DEFAULT '{}',
  interview_questions text[] DEFAULT '{}', inconsistencies text[] DEFAULT '{}',
  checklist jsonb, radar jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_job_evaluations TO authenticated;
GRANT SELECT ON public.candidate_job_evaluations TO anon;
GRANT ALL ON public.candidate_job_evaluations TO service_role;
ALTER TABLE public.candidate_job_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eval via job" ON public.candidate_job_evaluations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE TRIGGER trg_eval_updated BEFORE UPDATE ON public.candidate_job_evaluations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shortlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  number integer NOT NULL DEFAULT 1,
  title text, message text,
  status text NOT NULL DEFAULT 'draft',
  responsible text, send_date date,
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shortlists TO authenticated;
GRANT SELECT ON public.shortlists TO anon;
GRANT ALL ON public.shortlists TO service_role;
ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shortlists owner all" ON public.shortlists FOR ALL TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "shortlists public by token" ON public.shortlists FOR SELECT TO anon USING (status = 'sent' AND share_token IS NOT NULL);
CREATE TRIGGER trg_shortlists_updated BEFORE UPDATE ON public.shortlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shortlist_candidates (
  shortlist_id uuid NOT NULL REFERENCES public.shortlists(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  reviewed boolean NOT NULL DEFAULT false,
  visible_documents text[] DEFAULT '{}',
  PRIMARY KEY (shortlist_id, candidate_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shortlist_candidates TO authenticated;
GRANT SELECT ON public.shortlist_candidates TO anon;
GRANT ALL ON public.shortlist_candidates TO service_role;
ALTER TABLE public.shortlist_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc via shortlist owner" ON public.shortlist_candidates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shortlists s WHERE s.id = shortlist_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shortlists s WHERE s.id = shortlist_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "sc public via published shortlist" ON public.shortlist_candidates FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.shortlists s WHERE s.id = shortlist_id AND s.status = 'sent'));

-- Now cross-referencing anon policies (after shortlists exists)
CREATE POLICY "candidates public via published shortlist" ON public.candidates FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.shortlist_candidates sc
    JOIN public.shortlists s ON s.id = sc.shortlist_id
    WHERE sc.candidate_id = candidates.id AND s.status = 'sent'
  ));

CREATE POLICY "docs public visible only" ON public.candidate_documents FOR SELECT TO anon
  USING (visible_to_client = true AND EXISTS (
    SELECT 1 FROM public.shortlist_candidates sc
    JOIN public.shortlists s ON s.id = sc.shortlist_id
    WHERE sc.candidate_id = candidate_documents.candidate_id AND s.status = 'sent'
  ));

CREATE POLICY "eval public via published shortlist" ON public.candidate_job_evaluations FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.shortlist_candidates sc
    JOIN public.shortlists s ON s.id = sc.shortlist_id
    WHERE sc.candidate_id = candidate_job_evaluations.candidate_id
      AND s.job_id = candidate_job_evaluations.job_id
      AND s.status = 'sent'
  ));

CREATE POLICY "jobs public via published shortlist" ON public.jobs FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.shortlists s WHERE s.job_id = jobs.id AND s.status = 'sent'));

CREATE TABLE public.manager_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortlist_id uuid NOT NULL REFERENCES public.shortlists(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  client_identifier text, rating integer, favorite boolean DEFAULT false,
  decision text, comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_feedback TO authenticated;
GRANT SELECT, INSERT ON public.manager_feedback TO anon;
GRANT ALL ON public.manager_feedback TO service_role;
ALTER TABLE public.manager_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mf owner read" ON public.manager_feedback FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shortlists s WHERE s.id = shortlist_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "mf public insert on published" ON public.manager_feedback FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM public.shortlists s WHERE s.id = shortlist_id AND s.status = 'sent'));
CREATE POLICY "mf public read" ON public.manager_feedback FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.shortlists s WHERE s.id = shortlist_id AND s.status = 'sent'));

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL, entity_id uuid, action text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities own" ON public.activities FOR ALL TO authenticated USING (actor_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (actor_id = auth.uid());

CREATE TABLE public.drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL, entity_id uuid, title text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drafts TO authenticated;
GRANT ALL ON public.drafts TO service_role;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drafts own" ON public.drafts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_drafts_updated BEFORE UPDATE ON public.drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_shortlists_client_number ON public.shortlists(client_id, number);
