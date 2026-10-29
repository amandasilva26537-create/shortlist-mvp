-- Divulgação da vaga (MVP). Somente adições: não altera nem remove nada de vagas, clientes,
-- shortlists ou candidatos. O cadastro de vagas existente permanece intacto.
--
-- Uma divulgação por vaga. "approved_snapshot" é a cópia congelada que a página pública exibe;
-- editar o rascunho depois NÃO muda a página pública até nova aprovação.
-- "is_published" é independente do status interno da vaga (aberta/pausada/etc.).

CREATE TABLE IF NOT EXISTS public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  company_authorized text NOT NULL DEFAULT '',
  approved_snapshot jsonb,
  approved_at timestamptz,
  approved_by uuid,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  unpublished_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_postings_publish_needs_approval CHECK (NOT is_published OR approved_snapshot IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS job_postings_public_idx ON public.job_postings (slug) WHERE is_published;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_postings TO authenticated;
GRANT ALL ON public.job_postings TO service_role;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job postings team all" ON public.job_postings;
CREATE POLICY "job postings team all" ON public.job_postings
  FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid()))
  WITH CHECK (private.is_active_member(auth.uid()));

-- Leitura pública apenas pelo backend (valida slug + is_published). Sem acesso anônimo direto.
REVOKE ALL ON public.job_postings FROM anon;
