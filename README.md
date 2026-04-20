# Sanas Pulse — CRM de Performance para quem anuncia no Meta

Do clique no Meta Ads ao cliente agendado, em uma tela só.
SaaS B2C focado em **clínicas** (estética, odontológica, saúde) e **serviços locais** (academia, restaurante, imobiliária) que rodam Meta Ads e convertem no WhatsApp. Pixel + CAPI nativos, atribuição multi-touch, IA que atende no WhatsApp, pipeline que dispara eventos de conversão automaticamente.

## Stack

| Camada    | Tecnologia                                                                          |
| --------- | ----------------------------------------------------------------------------------- |
| Framework | Next.js App Router, React 19, TypeScript strict                                     |
| Banco     | PostgreSQL (Supabase) via Prisma 5                                                  |
| Auth      | Supabase Auth (Email + OAuth)                                                       |
| IA        | Anthropic Claude (Assistente), OpenAI/Gemini (conteúdo), Replicate/Fal.ai (imagens) |
| WhatsApp  | Meta Cloud API + Uazapi + Evolution API                                             |
| Ads       | Meta Graph API v18.0                                                                |
| Storage   | Vercel Blob                                                                         |
| Deploy    | Vercel (Serverless + Edge + Cron)                                                   |

## Módulos (ordem da nav)

| Módulo     | Descrição                                                                          |
| ---------- | ---------------------------------------------------------------------------------- |
| Dashboard  | Alertas IA + KPIs + Agenda + Atalhos                                               |
| Ads        | Meta Ads completo — Pixel + CAPI, campanhas, KPIs, diagnóstico de fase, alertas IA |
| Chat       | WhatsApp (oficial ou Uazapi) + Assistente IA + Templates + Broadcast + Equipe      |
| Pipeline   | Kanban drag-and-drop + Lead Scoring + Eventos Meta automáticos                     |
| Postagens  | Calendário editorial + publicação multi-plataforma                                 |
| Analytics  | Funil + LTV + CAC + ROAS + Atribuição multi-touch + IA Insights                    |
| Prospecção | CSV import + cadências (secundário — foco do produto é inbound via Meta Ads)       |
| Config     | Negócio + Integrações + Automações + Pipeline + Conta                              |

> Módulos como Estúdio de vídeo IA e white-label Agency existem no schema e podem ser ativados sob demanda, mas não fazem parte do pitch atual.

## Setup Local

```bash
# 1. Clonar e instalar
git clone <repo>
cd projeto-lux
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Preencha: SUPABASE_URL, ANON_KEY, DATABASE_URL, DIRECT_URL, CRON_SECRET, META_APP_SECRET

# 3. Banco de dados
npx prisma generate
npx prisma db push        # dev: aplica schema direto
# ou: npx prisma migrate deploy   # prod: aplica migrations

# 4. Seed (opcional — cria usuário demo + dados de exemplo)
npm run db:seed

# 5. Rodar
npm run dev               # http://localhost:3000
```

## Variáveis de Ambiente

Ver `.env.example` para documentação completa.

**Obrigatórias no servidor:**

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Auth
- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL (Supabase Pooler)
- `CRON_SECRET` — Protege endpoints `/api/cron/*`
- `META_APP_SECRET` — Verificação HMAC de webhooks Meta
- `ANTHROPIC_API_KEY` — Chave Claude para o Assistente IA do dashboard (sem ela, o chat retorna 503)

**Configuradas pelo usuário na interface (Config > Integrações):**
OpenAI, Gemini, Replicate, Fal.ai, Meta Pixel, Meta Ads, Google Business

## CRON Jobs (vercel.json)

| Schedule      | Rota                         | Função                               |
| ------------- | ---------------------------- | ------------------------------------ |
| `*/5 * * * *` | `/api/cron/run-workflows`    | Retoma workflows em delay            |
| `0 * * * *`   | `/api/cron/collect-metrics`  | Coleta métricas Meta Ads             |
| `0 6 * * *`   | `/api/cron/score-leads`      | Recalcula lead scoring               |
| `0 8 * * *`   | `/api/cron/publish-posts`    | Publica posts agendados              |
| `0 9 * * *`   | `/api/cron/reactivate-leads` | Dispara reativação de leads inativos |
| `0 10 * * 1`  | `/api/cron/suggest-content`  | Sugere pauta da semana               |

Todos protegidos por `Authorization: Bearer $CRON_SECRET`.

## Scripts Disponíveis

```bash
npm run dev           # Servidor de desenvolvimento
npm run build         # Build de produção
npm run typecheck     # Checagem de tipos TypeScript
npm run lint          # ESLint
npm run lint:fix      # ESLint com auto-fix
npm run format        # Prettier
npm run test          # Vitest
npm run test:coverage # Coverage (>40%)
npm run db:migrate    # Cria migration com Prisma
npm run db:seed       # Seed de demonstração
npm run db:studio     # Prisma Studio (GUI do banco)
```

## Arquitetura

Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para fluxos detalhados.

## Runbooks

Ver [`docs/RUNBOOKS.md`](docs/RUNBOOKS.md) para operações em produção.

## Licença

Proprietário. Todos os direitos reservados.
