-- =====================================================================
-- ATS · Etapa 1 — FUNDAÇÃO (somente ADITIVA)
-- ---------------------------------------------------------------------
-- * Cria tabelas NOVAS. Não altera, renomeia nem remove nenhuma tabela,
--   coluna, política ou dado existente (sem DROP, sem TRUNCATE, sem UPDATE
--   em tabelas atuais).
-- * Reutiliza: clients, jobs, candidates, shortlists, shortlist_candidates,
--   profiles, user_roles (apenas por chave estrangeira / leitura).
-- * Todas as tabelas novas: RLS ligada, acesso anônimo revogado.
-- * NÃO foi aplicada ao banco. Aplicar somente após revisão (ver
--   docs/ats/ARQUITETURA-ETAPA-1.md).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Funções auxiliares (schema private, não exposto pela API)
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.ats_is_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role::text = 'admin');
$$;

-- Acesso por marca (moove | portus). Admin enxerga as duas.
CREATE TABLE IF NOT EXISTS public.user_brand_access (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand text NOT NULL CHECK (brand IN ('moove','portus')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, brand)
);

CREATE OR REPLACE FUNCTION private.ats_can_access_brand(_uid uuid, _brand text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.is_active_member(_uid)
     AND (private.ats_is_admin(_uid)
          OR EXISTS (SELECT 1 FROM public.user_brand_access b WHERE b.user_id = _uid AND b.brand = _brand));
$$;

-- Impede UPDATE/DELETE em tabelas de evidência (auditoria, histórico).
CREATE OR REPLACE FUNCTION private.ats_forbid_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Tabela somente de inserção (%).', TG_TABLE_NAME USING ERRCODE = '42501';
END $$;

-- ---------------------------------------------------------------------
-- 1. Candidaturas (vaga × empresa × candidato × recrutador responsável)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,   -- preenchido por trigger a partir da vaga
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  shortlist_id uuid REFERENCES public.shortlists(id) ON DELETE SET NULL,     -- reaproveita shortlists, sem duplicar
  brand text NOT NULL CHECK (brand IN ('moove','portus')),                  -- preenchido por trigger (não falsificável)
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','shortlist','import','moovelist','career_page','referral')),
  stage text NOT NULL DEFAULT 'applied'
    CHECK (stage IN ('applied','screening','interview','tests','shortlisted','client_interview','offer','hired')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','rejected','withdrawn','hired')),
  rejection_reason text,
  responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,    -- recrutador responsável
  last_changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);
CREATE INDEX IF NOT EXISTS idx_applications_job ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON public.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_client ON public.applications(client_id);
CREATE INDEX IF NOT EXISTS idx_applications_brand_stage ON public.applications(brand, stage);
CREATE INDEX IF NOT EXISTS idx_applications_responsible ON public.applications(responsible_user_id);

CREATE OR REPLACE FUNCTION private.ats_applications_derive() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_client uuid; v_brand text;
BEGIN
  SELECT j.client_id, lower(coalesce(c.brand, 'portus'))
    INTO v_client, v_brand
    FROM public.jobs j JOIN public.clients c ON c.id = j.client_id
   WHERE j.id = NEW.job_id;
  IF v_client IS NULL THEN RAISE EXCEPTION 'Vaga sem empresa vinculada.'; END IF;
  IF v_brand NOT IN ('moove','portus') THEN RAISE EXCEPTION 'Marca da empresa inválida: %', v_brand; END IF;
  NEW.client_id := v_client;   -- ignora qualquer valor enviado pelo cliente da API
  NEW.brand := v_brand;
  IF NEW.shortlist_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.shortlists s WHERE s.id = NEW.shortlist_id AND s.job_id = NEW.job_id) THEN
    RAISE EXCEPTION 'Shortlist não pertence a esta vaga.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_applications_derive ON public.applications;
CREATE TRIGGER trg_applications_derive BEFORE INSERT OR UPDATE OF job_id, shortlist_id ON public.applications
  FOR EACH ROW EXECUTE FUNCTION private.ats_applications_derive();
DROP TRIGGER IF EXISTS trg_applications_updated ON public.applications;
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.application_stage_history (
  id bigserial PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_hist_app ON public.application_stage_history(application_id, created_at);

CREATE OR REPLACE FUNCTION private.ats_applications_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.application_stage_history(application_id, from_stage, to_stage, from_status, to_status, changed_by)
    VALUES (NEW.id, CASE WHEN TG_OP='UPDATE' THEN OLD.stage END, NEW.stage,
            CASE WHEN TG_OP='UPDATE' THEN OLD.status END, NEW.status,
            coalesce(NEW.last_changed_by, auth.uid()));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_applications_history ON public.applications;
CREATE TRIGGER trg_applications_history AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION private.ats_applications_history();
DROP TRIGGER IF EXISTS trg_app_hist_immutable ON public.application_stage_history;
CREATE TRIGGER trg_app_hist_immutable BEFORE UPDATE OR DELETE ON public.application_stage_history
  FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION private.ats_forbid_mutation();

-- ---------------------------------------------------------------------
-- 2. Currículos PDF — armazenamento PRIVADO (sem URL pública/permanente)
--    A tabela guarda só o caminho no bucket. Links temporários (60–300 s)
--    são gerados pelo backend a cada acesso e registrados na auditoria.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ats-resumes', 'ats-resumes', false, 10485760,
        ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;
-- Propositalmente NENHUMA política em storage.objects para este bucket:
-- anon/authenticated não leem nem gravam; apenas o backend (service role).

CREATE TABLE IF NOT EXISTS public.candidate_resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  brand text NOT NULL CHECK (brand IN ('moove','portus')),
  storage_bucket text NOT NULL DEFAULT 'ats-resumes' CHECK (storage_bucket = 'ats-resumes'),
  storage_path text NOT NULL UNIQUE,            -- {brand}/{candidate_id}/{uuid}.{pdf|docx}
  original_filename text,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  sha256 text,
  scan_status text NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending','clean','rejected')),
  scan_flags text[] NOT NULL DEFAULT '{}',      -- ex.: pdf_javascript, docx_macro, injection_signal
  extracted_text_at timestamptz,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (storage_path !~ '\.\.' AND storage_path !~ '^/')
);
CREATE INDEX IF NOT EXISTS idx_resumes_candidate ON public.candidate_resumes(candidate_id);

-- ---------------------------------------------------------------------
-- 3. LGPD: finalidades, consentimentos, retenção, solicitações do titular
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_processing_purposes (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  legal_basis text,                              -- a definir com assessoria jurídica (LGPD art. 7º)
  requires_consent boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.data_processing_purposes (code, name, description, requires_consent) VALUES
 ('selection_process','Processo seletivo','Avaliar o candidato para a vaga à qual se candidatou.', false),
 ('talent_pool','Banco de talentos','Manter dados após o fim do processo para futuras oportunidades.', true),
 ('client_sharing','Compartilhamento com a empresa contratante','Enviar perfil/análise do candidato à empresa cliente via shortlist.', true),
 ('ai_analysis','Análise assistida por IA','Enviar dados do candidato a provedores de IA para estruturar perfil e análise.', true),
 ('international_transfer','Transferência internacional','Tratamento por prestadores localizados fora do Brasil.', true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,   -- prova sobrevive à exclusão do perfil
  subject_email_hash text,                                                -- sha256(lower(email)) p/ localizar após exclusão
  purpose_code text NOT NULL REFERENCES public.data_processing_purposes(code),
  granted boolean NOT NULL,
  policy_version text NOT NULL,
  channel text NOT NULL DEFAULT 'manual' CHECK (channel IN ('form','manual','email','import','moovelist')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,                            -- texto exibido, user-agent etc. (sem dados sensíveis)
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consent_candidate ON public.consent_records(candidate_id, purpose_code);
CREATE INDEX IF NOT EXISTS idx_consent_email_hash ON public.consent_records(subject_email_hash);

CREATE OR REPLACE FUNCTION private.ats_consent_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Consentimentos não podem ser apagados.' USING ERRCODE='42501'; END IF;
  -- única mudança permitida: registrar revogação
  IF NEW.purpose_code IS DISTINCT FROM OLD.purpose_code OR NEW.granted IS DISTINCT FROM OLD.granted
     OR NEW.policy_version IS DISTINCT FROM OLD.policy_version OR NEW.granted_at IS DISTINCT FROM OLD.granted_at
     OR NEW.evidence IS DISTINCT FROM OLD.evidence THEN
    RAISE EXCEPTION 'Consentimento é imutável; registre uma revogação.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_consent_guard ON public.consent_records;
CREATE TRIGGER trg_consent_guard BEFORE UPDATE OR DELETE ON public.consent_records
  FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION private.ats_consent_guard();

CREATE TABLE IF NOT EXISTS public.retention_policies (
  data_category text PRIMARY KEY,
  retention_months integer CHECK (retention_months IS NULL OR retention_months > 0),
  action_after text NOT NULL DEFAULT 'review' CHECK (action_after IN ('review','anonymize','delete')),
  legal_note text,
  active boolean NOT NULL DEFAULT false,         -- só ativar depois de definido com jurídico
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.retention_policies (data_category, retention_months, action_after, legal_note, active) VALUES
 ('candidate_profile', NULL, 'review', 'Prazo a definir (processo seletivo vs. banco de talentos).', false),
 ('resume_file', NULL, 'delete', 'Prazo a definir.', false),
 ('application', NULL, 'anonymize', 'Prazo a definir.', false),
 ('consent_record', NULL, 'review', 'Manter como prova pelo prazo legal definido pelo jurídico.', false),
 ('access_audit_log', NULL, 'review', 'Prazo a definir.', false)
ON CONFLICT (data_category) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.candidate_retention (
  candidate_id uuid PRIMARY KEY REFERENCES public.candidates(id) ON DELETE CASCADE,
  purpose_code text NOT NULL REFERENCES public.data_processing_purposes(code) DEFAULT 'selection_process',
  retain_until timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','review','anonymize_pending','anonymized')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  requester_name text,
  requester_email text,
  request_type text NOT NULL CHECK (request_type IN
    ('confirmation','access','correction','anonymization','deletion','portability','sharing_info','consent_revocation','objection')),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','identity_check','in_progress','completed','rejected')),
  received_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL DEFAULT (now() + interval '15 days'),   -- confirmar prazo com o jurídico
  completed_at timestamptz,
  handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dsr_status_due ON public.data_subject_requests(status, due_at);
DROP TRIGGER IF EXISTS trg_dsr_updated ON public.data_subject_requests;
CREATE TRIGGER trg_dsr_updated BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 4. Auditoria de acesso e de uso de IA (somente inserção)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.access_audit_log (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,                                   -- sem FK: o log sobrevive à remoção do usuário
  actor_kind text NOT NULL DEFAULT 'staff' CHECK (actor_kind IN ('staff','client_portal','system','integration')),
  action text NOT NULL CHECK (action IN
    ('view','download_resume','export','share_view','create','update','delete','ai_send','consent_change','dsr_update','login_denied')),
  entity_type text NOT NULL,
  entity_id uuid,
  candidate_id uuid,
  brand text CHECK (brand IS NULL OR brand IN ('moove','portus')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_audit_candidate ON public.access_audit_log(candidate_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.access_audit_log(actor_user_id, occurred_at DESC);
DROP TRIGGER IF EXISTS trg_audit_immutable ON public.access_audit_log;
CREATE TRIGGER trg_audit_immutable BEFORE UPDATE OR DELETE ON public.access_audit_log
  FOR EACH ROW EXECUTE FUNCTION private.ats_forbid_mutation();

CREATE TABLE IF NOT EXISTS public.ai_processing_log (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  function_name text NOT NULL,
  provider text NOT NULL,                  -- ex.: lovable-ai-gateway
  model text NOT NULL,                     -- ex.: google/gemini-3-flash-preview
  candidate_id uuid,
  entity_type text,
  entity_id uuid,
  input_chars integer,
  input_files integer,
  injection_signals text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','error','blocked'))
);
CREATE INDEX IF NOT EXISTS idx_ai_log_candidate ON public.ai_processing_log(candidate_id, occurred_at DESC);
DROP TRIGGER IF EXISTS trg_ai_log_immutable ON public.ai_processing_log;
CREATE TRIGGER trg_ai_log_immutable BEFORE UPDATE OR DELETE ON public.ai_processing_log
  FOR EACH ROW EXECUTE FUNCTION private.ats_forbid_mutation();

-- ---------------------------------------------------------------------
-- 5. Registro de operadores / serviços externos (transferência internacional)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.external_processors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  service text NOT NULL,
  data_categories text[] NOT NULL DEFAULT '{}',
  purpose text,
  processing_country text,                 -- NULL = ainda não confirmado
  transfer_mechanism text,                 -- ex.: cláusulas-padrão ANPD — a definir
  dpa_signed boolean NOT NULL DEFAULT false,
  trains_on_data text CHECK (trains_on_data IS NULL OR trains_on_data IN ('no','yes','unknown')),
  status text NOT NULL DEFAULT 'in_use' CHECK (status IN ('in_use','planned','disabled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Itens identificados no código (campos a confirmar ficam NULL / false):
INSERT INTO public.external_processors (name, service, data_categories, purpose, notes) VALUES
 ('Supabase (Lovable Cloud)','Banco de dados, autenticação e arquivos',
   ARRAY['dados cadastrais','currículos','avaliações'],'Armazenamento e autenticação','Região do projeto a confirmar.'),
 ('Lovable AI Gateway','Intermediário de chamadas de IA',
   ARRAY['dados cadastrais','texto de currículo','PDF/DOCX/imagens','transcrições'],'Análise e estruturação de perfis','Repassa ao provedor do modelo.'),
 ('Google (Gemini) — modelo google/gemini-3-flash-preview','Modelo de IA generativa',
   ARRAY['dados cadastrais','texto de currículo','PDF/DOCX/imagens','transcrições'],'Análise e estruturação de perfis','Confirmar retenção/treinamento e região.'),
 ('Lovable (hospedagem e relatório de erros)','Publicação e telemetria de erros',
   ARRAY['dados técnicos de navegação'],'Hospedagem','Confirmar o que o relatório de erros captura.'),
 ('Google Fonts','Fontes web',ARRAY['IP do navegador'],'Tipografia','Carregado no navegador de todos os visitantes.')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. RLS e permissões
--    O backend atual usa a chave de serviço (ignora RLS). As políticas abaixo
--    são a camada de defesa em profundidade para qualquer acesso direto.
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_brand_access','applications','application_stage_history','candidate_resumes',
    'data_processing_purposes','consent_records','retention_policies','candidate_retention','data_subject_requests',
    'access_audit_log','ai_processing_log','external_processors']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, public', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Candidaturas e derivados: equipe ativa COM acesso à marca.
GRANT SELECT, INSERT, UPDATE ON public.applications TO authenticated;
GRANT DELETE ON public.applications TO authenticated;
DROP POLICY IF EXISTS "applications brand read" ON public.applications;
CREATE POLICY "applications brand read" ON public.applications FOR SELECT TO authenticated
  USING (private.ats_can_access_brand(auth.uid(), brand));
DROP POLICY IF EXISTS "applications brand write" ON public.applications;
CREATE POLICY "applications brand write" ON public.applications FOR INSERT TO authenticated
  WITH CHECK (private.ats_can_access_brand(auth.uid(), brand));
DROP POLICY IF EXISTS "applications brand update" ON public.applications;
CREATE POLICY "applications brand update" ON public.applications FOR UPDATE TO authenticated
  USING (private.ats_can_access_brand(auth.uid(), brand))
  WITH CHECK (private.ats_can_access_brand(auth.uid(), brand));
DROP POLICY IF EXISTS "applications admin delete" ON public.applications;
CREATE POLICY "applications admin delete" ON public.applications FOR DELETE TO authenticated
  USING (private.ats_is_admin(auth.uid()));

GRANT SELECT ON public.application_stage_history TO authenticated;
DROP POLICY IF EXISTS "app history brand read" ON public.application_stage_history;
CREATE POLICY "app history brand read" ON public.application_stage_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
                 AND private.ats_can_access_brand(auth.uid(), a.brand)));

GRANT SELECT ON public.candidate_resumes TO authenticated;     -- metadados; o arquivo só sai pelo backend
DROP POLICY IF EXISTS "resumes brand read" ON public.candidate_resumes;
CREATE POLICY "resumes brand read" ON public.candidate_resumes FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND private.ats_can_access_brand(auth.uid(), brand));

-- Tabelas de governança: leitura para equipe ativa; alteração só admin.
GRANT SELECT ON public.data_processing_purposes, public.retention_policies, public.external_processors TO authenticated;
DROP POLICY IF EXISTS "purposes team read" ON public.data_processing_purposes;
CREATE POLICY "purposes team read" ON public.data_processing_purposes FOR SELECT TO authenticated
  USING (private.is_active_member(auth.uid()));
DROP POLICY IF EXISTS "retention policies team read" ON public.retention_policies;
CREATE POLICY "retention policies team read" ON public.retention_policies FOR SELECT TO authenticated
  USING (private.is_active_member(auth.uid()));
DROP POLICY IF EXISTS "processors admin read" ON public.external_processors;
CREATE POLICY "processors admin read" ON public.external_processors FOR SELECT TO authenticated
  USING (private.ats_is_admin(auth.uid()));

-- Dados pessoais de governança: somente admin (inclui leitura).
GRANT SELECT ON public.consent_records, public.candidate_retention, public.data_subject_requests,
               public.access_audit_log, public.ai_processing_log, public.user_brand_access TO authenticated;
DROP POLICY IF EXISTS "consent admin read" ON public.consent_records;
CREATE POLICY "consent admin read" ON public.consent_records FOR SELECT TO authenticated
  USING (private.ats_is_admin(auth.uid()));
DROP POLICY IF EXISTS "retention admin read" ON public.candidate_retention;
CREATE POLICY "retention admin read" ON public.candidate_retention FOR SELECT TO authenticated
  USING (private.ats_is_admin(auth.uid()));
DROP POLICY IF EXISTS "dsr admin read" ON public.data_subject_requests;
CREATE POLICY "dsr admin read" ON public.data_subject_requests FOR SELECT TO authenticated
  USING (private.ats_is_admin(auth.uid()));
DROP POLICY IF EXISTS "audit admin read" ON public.access_audit_log;
CREATE POLICY "audit admin read" ON public.access_audit_log FOR SELECT TO authenticated
  USING (private.ats_is_admin(auth.uid()));
DROP POLICY IF EXISTS "ai log admin read" ON public.ai_processing_log;
CREATE POLICY "ai log admin read" ON public.ai_processing_log FOR SELECT TO authenticated
  USING (private.ats_is_admin(auth.uid()));
DROP POLICY IF EXISTS "brand access own or admin read" ON public.user_brand_access;
CREATE POLICY "brand access own or admin read" ON public.user_brand_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.ats_is_admin(auth.uid()));
-- Escritas nessas tabelas: apenas pelo backend (service_role). Nenhuma política de INSERT/UPDATE/DELETE
-- para authenticated => negado por padrão.
