-- Dados iniciais (somente INSERT, idempotente). Aplicar DEPOIS da fundação.

INSERT INTO public.data_processing_purposes (code, name, description, requires_consent) VALUES
 ('selection_process','Processo seletivo','Avaliar o candidato para a vaga à qual se candidatou.', false),
 ('talent_pool','Banco de talentos','Manter dados após o fim do processo para futuras oportunidades.', true),
 ('client_sharing','Compartilhamento com a empresa contratante','Enviar perfil/análise do candidato à empresa cliente via shortlist.', true),
 ('ai_analysis','Análise assistida por IA','Enviar dados do candidato a provedores de IA para estruturar perfil e análise.', true),
 ('international_transfer','Transferência internacional','Tratamento por prestadores localizados fora do Brasil.', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.retention_policies (data_category, retention_months, action_after, legal_note, active) VALUES
 ('candidate_profile', NULL, 'review', 'Prazo a definir (processo seletivo vs. banco de talentos).', false),
 ('resume_file', NULL, 'delete', 'Prazo a definir.', false),
 ('application', NULL, 'anonymize', 'Prazo a definir.', false),
 ('consent_record', NULL, 'review', 'Manter como prova pelo prazo legal definido pelo jurídico.', false),
 ('access_audit_log', NULL, 'review', 'Prazo a definir.', false)
ON CONFLICT (data_category) DO NOTHING;

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
