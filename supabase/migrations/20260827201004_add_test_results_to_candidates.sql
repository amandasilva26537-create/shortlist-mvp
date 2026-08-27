-- Lista de resultados de testes do candidato (DISC, teste técnico, vídeo de
-- apresentação, etc), cada item com título, formato e link/texto.
-- Aditivo apenas: não remove nem altera nenhuma coluna existente.
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS test_results jsonb;
