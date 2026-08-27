-- Marca (Moove Talent / Portus) definida na criação da shortlist e travada
-- ali — não depende mais só da marca cadastrada no cliente, que pode mudar
-- depois. Aditivo apenas: não altera nem remove nada existente.
ALTER TABLE public.shortlists
  ADD COLUMN IF NOT EXISTS brand text;
