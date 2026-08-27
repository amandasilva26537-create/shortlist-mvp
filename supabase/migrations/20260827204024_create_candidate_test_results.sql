-- Resultados de teste, vinculados a candidato + vaga (não apenas ao candidato).
-- O mesmo candidato pode ter resultados numa vaga e não ter em outra.
-- Tabela nova: não altera nem remove nada existente.
CREATE TABLE IF NOT EXISTS public.candidate_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  title text NOT NULL,
  format text NOT NULL DEFAULT 'link',
  url text,
  content text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS candidate_test_results_candidate_job_idx
  ON public.candidate_test_results (candidate_id, job_id);

-- Mesma postura de segurança das demais tabelas de candidato: o portal do
-- cliente lê exclusivamente através do backend (que valida o token da
-- shortlist), então acesso anônimo direto à tabela é revogado.
REVOKE SELECT ON public.candidate_test_results FROM anon;

-- A coluna candidates.test_results (adicionada numa migração anterior, ainda
-- não aplicada) fica sem uso a partir de agora — o formato correto é este
-- aqui, vinculado a candidato + vaga. Não é necessário removê-la.
