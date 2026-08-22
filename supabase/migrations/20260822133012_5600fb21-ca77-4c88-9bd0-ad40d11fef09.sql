-- Modo de acesso aberto: não há usuário autenticado, então as colunas de
-- autoria não podem apontar para auth.users.
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_owner_id_fkey;
ALTER TABLE public.clients ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_created_by_fkey;
ALTER TABLE public.jobs ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS candidates_created_by_fkey;
ALTER TABLE public.candidates ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.shortlists DROP CONSTRAINT IF EXISTS shortlists_owner_id_fkey;
ALTER TABLE public.shortlists ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE public.drafts DROP CONSTRAINT IF EXISTS drafts_user_id_fkey;
ALTER TABLE public.drafts ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_actor_id_fkey;