-- Candidaturas pela Página de Carreiras (Etapa 3). Somente adições.
-- Requer a fundação ATS (20261029120000_ats_foundation.sql) aplicada antes.
-- Registro mínimo de envios públicos, usado apenas para limitar abuso (rate limit). Guarda hash do IP, nunca o IP.

CREATE TABLE IF NOT EXISTS public.public_submission_log (
  id bigserial PRIMARY KEY,
  ip_hash text NOT NULL,
  job_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_public_submission_ip ON public.public_submission_log (ip_hash, created_at DESC);

ALTER TABLE public.public_submission_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_submission_log FROM anon, authenticated, public;
GRANT ALL ON public.public_submission_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.public_submission_log_id_seq TO service_role;
-- Sem políticas: só o backend (service role) lê e grava.
