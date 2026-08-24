-- Adiciona o campo de notas (0-10) atribuídas pela recrutadora por competência/requisito.
-- Aditivo apenas: não remove nem altera nenhuma coluna existente.
ALTER TABLE public.candidate_job_evaluations
  ADD COLUMN IF NOT EXISTS recruiter_scores jsonb;
