# Shortlist Executiva — Flashcards + Análise por Vaga

Escopo restrito: apenas a experiência da shortlist já criada (visão do recrutador em `/shortlists/$id` e visão do cliente em `/s/$token`). **Não** altero candidatos, vagas, clientes.

## 1. Modelo de dados (migration aditiva)

Estender `candidate_job_evaluations` (já existe) com colunas específicas por vaga:

- `job_specific_summary` (text) — resumo executivo até 4 linhas, específico da vaga
- `recruiter_opinion` (text) — parecer unificado (recomendação + parecer)
- `main_case` (jsonb) — `{ context, challenge, action, result, relation_to_job }`
- `risks` (jsonb[]) — `[{ point, mitigation }]`
- `motivational_factor` (text)
- `eliminatory_checklist` (jsonb) — `[{ criterion, status: yes|partial|no|unknown, evidence }]`
- `top_strengths` (jsonb) — `[{ title, evidence }]`
- `radar_scores` (jsonb) — `{ [competency]: number }` (0–100) para o radar
- `dimension_scores` (jsonb) — barras: hard, soft, experience, leadership, communication, strategy, execution, cultural_fit, adaptability
- `key_differentiator` (text) — usado no flashcard
- `manual_order` (int) — para reordenação manual em `shortlist_candidates` (já tem `order_index`, uso esse)

Cálculo de `overall_match` continua honesto (média ponderada pelos pesos da vaga). Sem piso mínimo.

## 2. IA — nova server function `evaluateCandidateForJob`

Em `src/lib/ai/ai.functions.ts` (adicionar, não substituir). Recebe `{ shortlist_id, candidate_id }`, lê:

- `candidates.*` (perfil IA, DISC, transcrição, parecer, currículo)
- `jobs.*` (must/nice have, hard/soft, competências, contexto, resultados esperados, pesos)
- documentos anexados (já usa `toModelPart`)

Prompt pede JSON estrito com todas as chaves da tabela acima. Persiste em `candidate_job_evaluations`. Botão "Recalcular análise com IA" por candidato + "Analisar todos".

Parecer do recrutador: IA gera 1ª versão em tom consultivo humano; recrutador edita tudo.

## 3. UI — `/shortlists/$id` (visão recrutador)

Substituir a lista atual por experiência de **flashcards**:

```text
┌─────────────────────────────────────────────┐
│  ‹  Candidato 2 de 5     [Comparar] [+Cand] │
├─────────────────────────────────────────────┤
│  [foto]  Nome                       92%     │
│          Headline                  match    │
│          Cargo • Área • Cidade              │
│          Remoto • R$ 25k • Imediata • DISC  │
│                                             │
│          Diferencial principal: "…"         │
│                                             │
│     [ Ver análise ]  [ Ver perfil ]         │
└─────────────────────────────────────────────┘
        ‹                              ›
```

- Navegação: botões, setas ←/→, swipe (framer-motion drag), indicador "n de N".
- Ordenação automática por `overall_match` desc; drag-handle para reordenar manual (persistido em `shortlist_candidates.order_index`).
- Componentes novos em `src/components/shortlist/`:
  - `FlashcardDeck.tsx` — controlador de navegação
  - `CandidateFlashcard.tsx` — card frontal (dados essenciais)
  - `AnalysisPanel.tsx` — Sheet lateral com accordions
  - `CompareDrawer.tsx` — comparação lado a lado
  - `MatchBar.tsx`, `ChecklistItem` (reuso), `CompetencyRadar` (reuso)

### AnalysisPanel — ordem exata pedida

1. **Compatibilidade** — anel + barras de dimensões + radar + badges com justificativa curta
2. **Resumo executivo para a vaga** (4 linhas)
3. **Parecer do recrutador** (editável, textarea rica)
4. **Principal case** (Contexto / Desafio / Ação / Resultado / Relação com a vaga)
5. **Riscos & Trade-offs** (lista editável ponto + mitigação)
6. **Fator motivacional**
7. **Critérios eliminatórios** (checklist com evidências)
8. **Principais pontos fortes** (3–5 com evidência)
9. **Botão "Ver perfil completo"** → navega para `/candidates/$id?returnTo=/shortlists/$id&cursor=$candidateId`

Cada seção com botão de edição inline (recrutador) e "Refinar com IA" (reusa `refineText`).

## 4. Perfil completo com retorno

Em `candidates.$candidateId.tsx`: quando `returnTo` presente, mostrar botão "Voltar para a shortlist" que navega para `/shortlists/$id?cursor=$candidateId`. O deck lê `?cursor` e abre no candidato certo.

## 5. Comparação

Novo componente `CompareDrawer` acionado por "Comparar candidatos":
- Multi-select de 2+ candidatos da shortlist atual
- Tabela lado a lado: %, eliminatórios, desejáveis, hard, soft, liderança, comunicação, radar sobreposto, DISC, diferenciais
- Rodapé: resumo comparativo gerado por `analyzeShortlist` (já existe) restrito aos selecionados — nunca escolhe vencedor

## 6. Visão do cliente (`/s/$token`)

Mesmo deck de flashcards em modo read-only:
- Sem edição, sem "Recalcular IA"
- Mantém: favoritar, aprovar/reprovar, solicitar entrevista, comentar (já existente em `manager_feedback`)
- Botão "Comparar" habilitado
- Botão "Ver perfil completo" abre versão read-only do perfil (mesma rota com flag)

## 7. Detalhes técnicos

- Reordenação manual persiste via server fn `updateShortlistOrder` (nova, em `src/lib/db/shortlists.functions.ts`)
- Query keys: `["shortlist", id]`, `["evaluation", shortlistId, candidateId]`
- Sem quebrar rotas existentes; `shortlists.$shortlistId.tsx` é o único arquivo de página reescrito
- Nada é removido — `CandidateProfile`, `MatchRing`, `CompetencyRadar`, `ChecklistItem`, `DiscBadge`, `ManagerFeedbackPanel` são reusados

## Arquivos afetados

**Novos**
- `supabase/migrations/<ts>_evaluation_extend.sql`
- `src/components/shortlist/FlashcardDeck.tsx`
- `src/components/shortlist/CandidateFlashcard.tsx`
- `src/components/shortlist/AnalysisPanel.tsx`
- `src/components/shortlist/CompareDrawer.tsx`
- `src/components/shortlist/MatchBar.tsx`
- `src/components/shortlist/RiskEditor.tsx`

**Editados (sem remover funcionalidade)**
- `src/lib/ai/ai.functions.ts` — add `evaluateCandidateForJob`
- `src/lib/db/shortlists.functions.ts` — add `updateShortlistOrder`, `updateEvaluation`
- `src/routes/shortlists.$shortlistId.tsx` — usa o deck
- `src/routes/s.$token.tsx` — usa o deck (read-only)
- `src/routes/candidates.$candidateId.tsx` — botão "Voltar para a shortlist" quando `returnTo` presente
- `src/integrations/supabase/types.ts` — regenerado após migration

## Fora do escopo (não faço agora)

- Alterações em candidatos/vagas/clientes
- Exclusão de qualquer funcionalidade
- Novos tipos de conta/permissões (mantenho recrutador vs cliente atual)

Quer que eu prossiga com esse plano? Posso também dividir em duas entregas (1: flashcards + análise + perfil-com-retorno; 2: comparação avançada + visão cliente refinada) se preferir ver algo funcionando mais rápido.
