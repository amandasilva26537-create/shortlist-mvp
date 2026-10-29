# Plano de independência do Lovable

> **ATUALIZAÇÃO (29/10, noite) — caminho recomendado hoje:** a documentação oficial do Lovable informa que o projeto tem **backup diário (guarda cerca de 14 dias)** e **exportação completa do banco** (arquivo PostgreSQL, com estrutura, dados, usuários e hashes de senha; não inclui arquivos do storage). Fontes: https://docs.lovable.dev/features/database-backups. Uma fonte de terceiros (https://axonbuild.com/blog/lovable-export-database/) afirma que o Lovable **não entrega a chave de serviço nem a connection string** ao dono do projeto. Se isso se confirmar, o script `backup.mjs` (que exige a chave de serviço) só poderá ser usado após migrar para um Supabase da sua própria conta. Até lá: (1) exportar o banco pelo painel do Lovable (More → Database → Manage → Settings) a cada semana; (2) baixar os arquivos em Cloud → Storage; (3) guardar tudo em 2 lugares, criptografado. Isso também resolve a pendência da seção 3 (estrutura do banco).

Objetivo: se o Lovable tiver problema ou deixar de existir, você continua com **seus dados** e consegue **colocar o sistema de pé em outro lugar**.

## 1. Mapa de dependências

| Peça | Onde está hoje | Está seguro? | O que fazer |
|---|---|---|---|
| Código do sistema | GitHub `amandasilva26537-create/shortlist-mvp` (sua conta) | **Sim** | Nada. Mantenha a conta com verificação em 2 etapas. |
| Banco de dados (candidatos, vagas, avaliações…) | Projeto Supabase gerenciado pelo Lovable (`ppaqxtubxyhhejjhksmq`) | **Depende**: sem backup seu, só existe lá | Backup (seção 2) + exportar estrutura (seção 3) |
| Arquivos (currículos, briefings, logos) | Storage desse mesmo projeto | **Idem** | Backup (seção 2) |
| Usuários e logins | Autenticação desse projeto | **Parcial**: senhas não saem por API | Após restaurar, cada pessoa redefine a senha |
| Login com Google | "Lovable Cloud Auth" (`@lovable.dev/cloud-auth-js`) | **Quebra** se o Lovable sair | Trocar pelo Google nativo do Supabase (seção 5) |
| IA (análises, perfis, comparação) | Gateway de IA do Lovable (`LOVABLE_API_KEY`) | **Para de funcionar** | Trocar de provedor (seção 4) |
| Site publicado | Hospedagem do Lovable (build preparado para Cloudflare) | Código é seu; hospedagem não | Seção 6 |

O arquivo `.env` do repositório só tem URL e chave **pública** (publishable), que são públicas por natureza. A chave de serviço (acesso total) não está no GitHub — e **não deve estar nunca**.

## 2. Backup independente (pronto)

Script: `scripts/backup/backup.mjs` — não precisa instalar nada além do Node 18+. Exporta **todas as tabelas, a lista de usuários e todos os arquivos**, tudo **criptografado** (AES-256-GCM; nomes de arquivo também ficam ocultos). Testado com servidor de teste (paginação de milhares de linhas, frase errada, adulteração).

**Preparação (uma vez)**
1. Instale o Node 18 ou mais novo (nodejs.org).
2. Baixe o projeto do GitHub (ou `git clone`).
3. Pegue a **chave de serviço** (`service_role` / `sb_secret_…`) do projeto. **Se você não conseguir ver essa chave, o problema principal é esse: você precisa de acesso ao painel do Supabase do projeto — pergunte ao suporte do Lovable como obter acesso direto ao backend (Lovable Cloud).**
4. Escolha uma **frase-senha** longa (16+ caracteres) e guarde em um gerenciador de senhas. **Sem ela o backup não abre. Não guarde junto do backup.**

**Rodar (PowerShell, na pasta do projeto)** — as variáveis valem só nessa janela; não salve a chave em arquivo do projeto:
```powershell
$env:SUPABASE_URL="https://SEU-PROJETO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="(cole a chave aqui — nunca envie a ninguém)"
$env:BACKUP_PASSPHRASE="(sua frase-senha)"
node scripts/backup/backup.mjs backup D:\Backups\ShortList
node scripts/backup/backup.mjs verify D:\Backups\ShortList\shortlist-backup-AAAAMMDD-HHMMSS
```
O `verify` abre tudo e confere os hashes. Só considere o backup válido depois dele dizer **VERIFICAÇÃO OK**. O script também avisa se algum bucket está **público**.

**Boas práticas**
- Rodar semanalmente e depois de grandes importações; manter **3 cópias**, em **2 lugares** diferentes, 1 deles fora do computador (ex.: Google Drive — o backup já é criptografado).
- O backup contém dados pessoais de candidatos: aplique a política de retenção definida na Etapa 1 (apagar backups antigos também).
- Testar uma restauração por trimestre.

**Limites desta ferramenta**: a API não entrega hashes de senha nem funções/políticas do banco. Por isso a seção 3.

## 3. Estrutura do banco (ação pendente, importante)

O repositório **não contém a estrutura original** das tabelas (`clients`, `jobs`, `candidates`…), só 24 migrations parciais. Sem a estrutura, os dados do backup não têm onde ser restaurados.

Faça uma destas (qualquer uma serve):
- **Preferida:** com a *connection string* do banco (Supabase → Project Settings → Database), rodar:
  `pg_dump --schema-only --no-owner --schema=public --schema=private "<connection-string>" > estrutura.sql`
- Peça ao Lovable (chat) para **exportar a estrutura completa do banco (tabelas, funções, políticas RLS, buckets) como SQL** e commitar em `supabase/`.
- Alternativa parcial: o backup já guarda o `openapi.json` (colunas e tipos), mas não as políticas.

Guarde `estrutura.sql` junto com cada backup. Essa é a peça que falta para a independência ser real.

## 4. IA fora do gateway do Lovable

O código usa `@ai-sdk/openai-compatible` apontando para `https://ai.gateway.lovable.dev/v1`. Trocar de provedor é **uma mudança em um arquivo** (`src/lib/ai/gateway.server.ts`: `baseURL`, chave e nome do modelo), desde que o provedor tenha API compatível com OpenAI (OpenAI, Google Gemini via endpoint compatível, OpenRouter, Anthropic via compat, etc.).

Antes de trocar, comparar: região/transferência internacional, retenção, uso para treino, suporte a PDF/imagem (hoje enviamos PDFs e imagens), custo, contrato de tratamento de dados (DPA). Depois da troca, rodar as análises em 3 candidatos conhecidos e comparar os resultados.

## 5. Login

- E-mail e senha: nativo do Supabase — continua funcionando em qualquer lugar.
- Google: hoje passa pelo broker do Lovable. Em outro ambiente: ativar o provedor Google no Supabase (Authentication → Providers) com credenciais suas do Google Cloud, e trocar a chamada em `src/routes/auth.tsx` por `supabase.auth.signInWithOAuth({ provider: "google" })`.

## 6. Hospedagem

- O build é do TanStack Start com Nitro, hoje com alvo **Cloudflare** por padrão. Também dá para publicar em Node (Render, Railway, Fly) ou Vercel mudando o preset do Nitro no build.
- Variáveis de ambiente necessárias no servidor: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, chave do provedor de IA, `PUBLIC_APP_URL`, `LOVABLE_CRON_SECRET` (se houver rotinas agendadas). No build: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- Domínio próprio: hoje o site usa `elite-candidate-insight.lovable.app`. Um domínio seu (ex.: `app.moovetalent.com`) permite trocar de hospedagem sem mudar os links enviados a clientes. **Recomendo configurar isso cedo** — os links `/s/<token>` e `/acompanhamento/<token>` já enviados passam a funcionar em qualquer hospedagem.

## 7. Roteiro de recuperação (se o Lovable sair do ar)

1. Criar um projeto Supabase novo (região escolhida por você).
2. Aplicar `estrutura.sql` e depois as migrations de `supabase/migrations/` que não estiverem nela.
3. Restaurar os dados do backup (decriptar com `decrypt`/script de restauração — **a rotina de restauração automática ainda não foi escrita; ver pendências**) e reenviar arquivos aos buckets.
4. Recriar os usuários (e-mails estão no backup); cada um redefine a senha.
5. Publicar o código do GitHub na nova hospedagem com as variáveis da seção 6; apontar o domínio.
6. Trocar o provedor de IA e o login Google (seções 4 e 5).
7. Conferir com o roteiro de testes: login, abrir vaga, shortlist pública, PDF, acompanhamento.

## 8. Pendências desta frente

- [ ] **Você**: conseguir a chave de serviço / acesso ao painel do Supabase (sem isso o backup não roda).
- [ ] Exportar `estrutura.sql` (seção 3).
- [ ] Rodar o primeiro backup + `verify` e me contar o resultado (sem enviar chaves).
- [ ] Escrever e testar o script de **restauração** (depende da estrutura).
- [ ] Definir domínio próprio.
- [ ] Escolher provedor de IA alternativo e testar.
