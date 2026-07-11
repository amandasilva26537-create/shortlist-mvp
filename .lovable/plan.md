
# Moove Select — MVP Plan

Plataforma premium de apresentação inteligente de candidatos. Não é ATS, não é CRM, não é RH. Ajuda o gestor a **decidir mais rápido**.

## 1. Arquitetura

**Stack:** TanStack Start (já configurado) + Tailwind v4 + shadcn + Lovable Cloud (Postgres + Auth + Storage + Edge Functions) + Lovable AI Gateway (Gemini) para geração dos perfis executivos.

**Camadas:**
- Frontend SPA/SSR com rotas tipadas
- Server functions (`createServerFn`) para CRUD e chamadas de IA
- Portal público do cliente por link/token (rota `/s/$token`) — sem login
- Auth por roles: `admin`, `recruiter`, `client` (tabela `user_roles` + `has_role()`)

## 2. Banco de dados (Lovable Cloud)

```text
profiles(id, full_name, avatar_url)
user_roles(user_id, role)                     -- app_role: admin|recruiter|client
clients(id, name, logo_url, contact_name, email, phone, created_at)
client_users(client_id, user_id)              -- vincula usuário cliente
jobs(id, client_id, title, area, work_model, salary_min, salary_max,
     description, must_have[], nice_to_have[], status)
candidates(id, full_name, photo_url, current_role, city, work_model,
           salary_expectation, linkedin_url, disc_profile, disc_scores jsonb,
           resume_url, interview_transcript, notes,
           ai_generated jsonb)                -- headline, bio, resumo, cases,
                                              -- hard/soft skills, radar, checklist,
                                              -- perguntas, forças, riscos, potencial
shortlists(id, job_id, version, status, share_token, created_by, created_at)
shortlist_candidates(shortlist_id, candidate_id, overall_match, position)
manager_feedback(id, shortlist_candidate_id, user_id, rating, favorite,
                 decision, comment, created_at)  -- decision: approved|rejected|second_interview
activities(id, actor_id, entity_type, entity_id, action, created_at)
```

RLS: recruiter/admin veem tudo do tenant; client vê apenas shortlists via `client_users` ou token público. `service_role` para edge functions de IA.

## 3. Rotas

**App autenticado (`_authenticated`):**
- `/` Dashboard
- `/clients` · `/clients/$id`
- `/jobs` · `/jobs/$id`
- `/shortlists` · `/shortlists/new` · `/shortlists/$id`
- `/candidates/$id` (perfil executivo)
- `/compare?ids=…`

**Público:**
- `/auth` login
- `/s/$token` portal do cliente (mobile-first)
- `/s/$token/c/$candidateId` perfil no portal
- `/api/pdf/$candidateId` PDF executivo (1 página)

## 4. Design System

Tokens em `src/styles.css` (oklch equivalentes):
- `--background #FAFBFC` · `--card #FFFFFF` · `--muted #F4F7FA`
- `--primary #79A7CC` · `--primary-hover #5F92BD` · `--primary-soft #EAF4FB`
- `--gold #F5DD63` (destaques) · `--brand-brown #4A2505` (identidade)
- `--success #22C55E` · `--danger #EF4444` · `--warning #FACC15` · `--muted-foreground #6B7280`
- Fonte Inter (via `<link>` no root)
- Radius 14px, sombras `0 1px 2px rgb(0 0 0 / .04)`, transições 200ms

Componentes-chave: `CandidateCard`, `MatchRing`, `DiscBadge` + popover com radar DISC, `RadarChart` (Recharts), `ChecklistItem` (atende/parcial/não), `Accordion` (experiências), `Stepper` (criar shortlist), `EmptyState`, `KpiCard`.

## 5. Telas / wireframes

**Dashboard:** 6 KPIs em grid + feed "Últimas Atividades" + CTA "Nova Shortlist".

**Clientes:** grid de cards (logo, nome, vagas ativas, shortlists) → detalhe com abas Vagas / Shortlists / Histórico.

**Vagas:** lista minimalista → detalhe com must-have/nice-to-have em chips.

**Nova Shortlist (wizard 4 passos):** Cliente → Vaga → Candidatos (upload PDF/foto/transcrição/DISC → IA processa) → Revisar & Publicar (gera `share_token`).

**Perfil Executivo:** hero (foto, nome, cargo, headline, cidade, modelo, pretensão, DISC badge, Overall Match ring) → 6 cards de skills → checklist eliminatório → radar → resumo executivo (4 bullets) → cards de conquistas → experiências (accordion) → formação/idiomas (accordion) → painel lateral de observações do gestor (nota, favorito, aprovar/reprovar/2ª entrevista).

**Comparação:** até 4 candidatos lado a lado — resumo imparcial da IA no topo, radar sobreposto, tabela de skills, checklist, notas, DISC, Overall Match.

**Portal do Cliente (mobile-first):** header com vaga/empresa/versão + timeline + grid de cards → tocar abre perfil (mesmo layout, sem dados internos) → botão Aprovar/Reprovar/Comentar.

**PDF Executivo:** rota que renderiza HTML A4 → print (via `window.print` com CSS `@page`), 1 página, foto + resumo + radar + checklist + DISC + forças/atenção + match.

## 6. IA (Lovable AI Gateway, `google/gemini-3-flash-preview`)

Server function `generateCandidateProfile({ candidateId })`:
1. Lê currículo/transcrição/notas/DISC
2. Structured output (Zod) gera todo o `ai_generated`
3. Persiste no candidato

Server function `generateComparison({ candidateIds, jobId })` — resumo imparcial multi-cenário.

## 7. Entregas do MVP (ordem)

1. Ativar Lovable Cloud + migrations + roles + RLS + storage buckets (`avatars`, `resumes`)
2. Design tokens + shell autenticado (sidebar, topbar) + auth
3. CRUD Clientes / Vagas
4. Cadastro de candidato + upload + edge function IA
5. Perfil Executivo completo
6. Wizard Nova Shortlist
7. Portal do Cliente público por token + observações
8. Comparação
9. PDF executivo
10. Responsivo mobile + polimento

## 8. Fora do escopo (futuro)

Banco de talentos, LinkedIn, agenda, WhatsApp, CRM, ATS, pipeline, marketplace, videoentrevistas, analytics avançado.

## Detalhes técnicos

- `createServerFn` para toda lógica; `.server.ts` só para helpers server-only
- Portal público lê via `share_token` sem sessão (server fn pública + policy `anon SELECT` filtrada por token)
- PDF via rota que imprime HTML (sem libs Node-only — Workers)
- Storage: buckets privados; URLs assinadas
- Uploads: `resume.pdf`, `photo.jpg`, `transcript.txt`

Confirme e eu começo pela ativação do Cloud + design system + shell.
