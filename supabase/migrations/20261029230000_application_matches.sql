-- Match da CANDIDATURA (Etapa 4). Somente adições; separado das avaliações/Match das shortlists.
-- Requer a fundação ATS (applications) aplicada antes.

CREATE TABLE IF NOT EXISTS public.job_match_settings (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  prescreen_min integer NOT NULL DEFAULT 70 CHECK (prescreen_min BETWEEN 0 AND 100),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.application_matches (
  application_id uuid PRIMARY KEY REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('ai', 'keywords')),
  match_version text NOT NULL,
  requirements_hash text NOT NULL,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  assessments jsonb NOT NULL DEFAULT '[]'::jsonb,
  breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  score_max integer NOT NULL CHECK (score_max BETWEEN 0 AND 100),
  coverage integer NOT NULL CHECK (coverage BETWEEN 0 AND 100),
  prescreened boolean NOT NULL DEFAULT false,
  resume_id uuid,
  model text,
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_application_matches_job ON public.application_matches (job_id, score DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['job_match_settings', 'application_matches'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, public', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s team all" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s team all" ON public.%I FOR ALL TO authenticated USING (private.is_active_member(auth.uid())) WITH CHECK (private.is_active_member(auth.uid()))', t, t);
  END LOOP;
END $$;
