# Moove Select — Fase Funcional (MVP Operacional)

Transformar o MVP visual atual em uma ferramenta real, preservando 100% do design, tokens, componentes e estrutura de rotas já criadas. Nada é reconstruído — os componentes existentes passam a ler e escrever no banco.

## Estratégia

1. **Ativar Lovable Cloud** (Postgres + Auth + Storage + Edge Functions + IA Gateway).
2. **Migração de schema completa** em uma única leva (clientes, vagas, candidatos, shortlists, documentos, feedbacks, rascunhos, roles).
3. **Substituir `src/lib/mock-data.ts`** por hooks reais (`useClients`, `useJobs`, `useCandidates`, `useShortlists`) baseados em TanStack Query + server functions. Os componentes visuais continuam iguais.
4. **Servir dados de exemplo via seed opcional** — o usuário pode limpar com um botão "Apagar exemplos" e começar do zero.
5. **IA real** via Lovable AI Gateway (`google/gemini-3-flash-preview`) para os 3 pontos-chave: estruturar vaga, gerar perfil de candidato, analisar shortlist + campo livre "Pedir ajuste à IA" em cada tela.
6. **Uploads** (currículo, foto, briefing, DISC, portfólio) via Storage com bucket privado e URLs assinadas.
7. **Portal do cliente** por `share_token` público (sem login), com permissões de leitura/comentário/decisão apenas.

## Entregas (em ordem)

### 1. Infra & Auth
- Ativar Cloud, criar `LOVABLE_API_KEY`.
- Migração: tabelas + `user_roles` (admin/recruiter/client) + RLS por tenant + `service_role` grants + trigger `handle_new_user`.
- Buckets: `avatars`, `resumes`, `briefings`, `disc`, `portfolios` (privados).
- Rota `/auth` (email/senha + Google) e layout `_authenticated` já gerenciado pela integração.

### 2. Schema (uma migração)
```
clients(id, name, logo_url, segment, website, city, state, country,
        contact_name, contact_role, internal_notes, owner_id, created_at)
jobs(id, client_id, title, area, seniority, location, work_model,
     contract_type, salary_min, salary_max, manager_name, description,
     briefing_url, recruiter_notes, meeting_transcript,
     ai_structure jsonb,        -- objetivo, missão, desafios, critérios etc.
     must_have[], nice_to_have[], hard_skills[], soft_skills[],
     radar_competencies jsonb, status, created_by, created_at)
candidates(id, full_name, photo_url, current_role, city, work_model,
           salary_expectation, linkedin_url,
           resume_url, transcript, recruiter_note, disc_raw,
           disc_profile, disc_scores jsonb,
           created_by, created_at)
candidate_documents(id, candidate_id, kind, url, visible_to_client)
candidate_job_evaluations(id, candidate_id, job_id, overall_match,
                          ai_generated jsonb, strengths, risks,
                          interview_questions, inconsistencies)
shortlists(id, client_id, job_id, number, title, message, status,
           owner_id, share_token, published_at, created_at)
shortlist_candidates(shortlist_id, candidate_id, position, PRIMARY KEY)
manager_feedback(id, shortlist_id, candidate_id, rating, favorite,
                 decision, comment, client_identifier, created_at)
activities(id, actor_id, entity_type, entity_id, action, created_at)
drafts(id, user_id, kind, entity_id, payload jsonb, updated_at)
```
+ GRANTs, RLS por `owner_id`/`created_by`, política pública por `share_token` para leitura do portal.

### 3. Camada de dados (substitui mock)
- `src/lib/queries/*.functions.ts` — `listClients`, `getClient`, `upsertClient`, `deleteClient`, idem para jobs/candidates/shortlists.
- `src/lib/queries/hooks.ts` — hooks TanStack Query que os componentes existentes passam a consumir.
- `src/lib/mock-data.ts` fica só como *seed opcional* acionado por botão "Carregar exemplos" / "Apagar exemplos" no dashboard.
- Autosave de rascunho: `useAutosaveDraft(kind, entityId, payload)` grava em `drafts` a cada 2s.

### 4. Dashboard operacional
- **Ações rápidas** (barra no topo): Novo cliente · Nova vaga · Nova shortlist · Novo candidato · Continuar rascunho · Ver shortlists enviadas.
- **"Continuar de onde parei"**: lista `drafts` do usuário + shortlists em rascunho + candidatos aguardando revisão.
- KPIs passam a refletir dados reais.

### 5. Fluxos CRUD (formulários reais)
- **Cliente** (`/clients/new` + drawer reaproveitável): formulário com todos os campos + botões *Salvar*, *Salvar e criar vaga*, *Cancelar*.
- **Vaga** (`/jobs/new`): seleciona cliente ou cria inline; todos os campos; upload de briefing; botão **"Gerar estrutura da vaga com IA"** que chama server fn `structureJobWithAI` → preenche seção editável; botão **"Pedir ajuste à IA"** com campo livre; botões *Salvar rascunho*, *Salvar vaga*, *Salvar e criar shortlist*.
- **Candidato** (`/candidates/new` ou dentro da shortlist): uploads (currículo, foto, parecer, transcrição, LinkedIn, DISC, portfólio, certificados); botão **"Gerar perfil do candidato com IA"** → server fn `generateCandidateProfile({candidateId, jobId?})` cria `candidate_job_evaluations`; tela de revisão com seções (Headline, Bio, Trajetória, Skills, DISC, Aderência, Checklist, Radar, Documentos) e por seção: Editar / Salvar / Regenerar / Remover / Adicionar.
- **Shortlist** (`/shortlists/new` — wizard já existe, agora persiste): 4 passos + Título/Número (auto-sugerido: `Shortlist NN` do cliente)/Data/Mensagem/Status/Responsável; adicionar candidatos novos ou existentes; reordenar (drag); botões *Salvar rascunho*, *Continuar depois*, *Revisar*, *Publicar*.

### 6. IA (server functions)
`src/lib/ai/*.functions.ts` usando `createLovableAiGatewayProvider` + `generateText` com `Output.object`:
- `structureJobWithAI(jobId)` — briefing → estrutura completa.
- `generateCandidateProfile(candidateId, jobId?)` — documentos → perfil + aderência.
- `analyzeShortlistWithAI(shortlistId, prompt?)` — comparação/parecer.
- `refineSection({entity, entityId, section, instruction})` — o campo livre "Pedir ajuste à IA" (aplica só na seção indicada, nunca no perfil todo sem confirmação).

Todas rodam no servidor com `requireSupabaseAuth`. Persistem em `ai_structure` / `candidate_job_evaluations.ai_generated`. Nada é retornado sem `NoObjectGeneratedError` guardado.

### 7. Publicação da shortlist
- Botão *Publicar* → valida (≥1 candidato, todos revisados) → prévia → seleção de documentos visíveis por candidato → gera `share_token` (nanoid) → `published_at = now()` → status `sent`.
- Ações: Copiar link, Abrir como cliente (`/s/$token`), Gerar PDF (rota `/pdf/$candidateId` já existe), Nova versão, Voltar edição.

### 8. Portal do cliente (`/s/$token`)
- Já existe visualmente; passa a ler via server fn pública filtrada por token.
- Comentários / favorito / decisão (aprovar/reprovar/2ª entrevista) gravam em `manager_feedback` com `client_identifier` (nome digitado pelo gestor — sem login).
- Cliente vê apenas documentos marcados como `visible_to_client=true`; transcrição, parecer interno e inconsistências ficam fora do payload público.

### 9. Estados vazios elegantes
Em cada listagem: mensagem + botão de criação (padrão já do design system, usando `EmptyState`).

## Fora desta fase (fica para depois)
Banco de talentos global, LinkedIn scraping, agenda, WhatsApp, ATS, pipeline, videoentrevistas, analytics avançado. Já mapeado no plano anterior.

## Detalhes técnicos (para referência)
- Server fns em `src/lib/**/*.functions.ts`, helpers server-only em `*.server.ts`.
- Loaders de rotas autenticadas usam `context.queryClient.ensureQueryData`.
- Uploads via `supabase.storage.from(bucket).upload` no cliente + URLs assinadas server-side quando o cliente do portal precisa acessar.
- `share_token`: coluna única, política `TO anon SELECT USING (share_token = current_setting('request.jwt.claims',true)::json->>'token')` **NÃO** — em vez disso, server fn pública `getShortlistByToken(token)` usando client publishable server-side + WHERE por token, retornando apenas colunas seguras.
- Autosave em `drafts` para todo formulário longo (vaga, candidato, shortlist).
- Migração única para minimizar idas ao aprovador.
- Nenhum componente visual existente é reescrito — apenas trocam a fonte de dados de `mock-data` para hooks reais.

## Critério de conclusão
O usuário consegue, em uma sessão nova: cadastrar cliente → criar vaga → estruturar com IA → editar → criar shortlist → adicionar candidato com uploads → gerar perfil com IA → revisar/editar → publicar → copiar link → abrir portal → deixar comentário e decisão. Ao recarregar, tudo persiste. Botão para apagar exemplos deixa a base limpa.
