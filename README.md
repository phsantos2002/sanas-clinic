# Sanas Pulse — SaaS de Marketing 360 com IA

CRM integrado ao WhatsApp com IA para micro empreendedores brasileiros.
O cliente abre o sistema, a IA cuida de tudo: atende leads, agenda, produz conteúdo e monitora anúncios.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js App Router, React 19, TypeScript strict |
| Banco | PostgreSQL (Supabase) via Prisma 5 |
| Auth | Supabase Auth (Email + OAuth) |
| IA | Anthropic Claude (Assistente), OpenAI/Gemini (conteúdo), Replicate/Fal.ai (imagens) |
| WhatsApp | Meta Cloud API + Uazapi + Evolution API |
| Ads | Meta Graph API v18.0 |
| Storage | Vercel Blob |
| Deploy | Vercel (Serverless + Edge + Cron) |

## Módulos

| Módulo | Descrição |
|--------|-----------|
| Dashboard | Alertas IA + KPIs + Agenda + Atalhos |
| Chat | WhatsApp + Assistente IA (Claude) + Templates + Broadcast + Equipe |
| Pipeline | Kanban drag-and-drop + Lead Scoring + Tags + Filtros |
| Ads | Meta Ads completo — campanhas, KPIs, alertas, otimização |
| Estúdio | Acervo de assets + Chat criativo IA + Projetos |
| Postagens | Calendário + Biblioteca + Campanhas WA + Métricas |
| Analytics | Funil + LTV + CAC + ROAS + Scores + IA Insights |
| Config | Negócio + Integrações + Automações + Pipeline + Conta |

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

**Configuradas pelo usuário na interface (Config > Integrações):**
OpenAI, Gemini, Replicate, Fal.ai, Meta Pixel, Meta Ads, Google Business

## CRON Jobs (vercel.json)

| Schedule | Rota | Função |
|----------|------|--------|
| `*/5 * * * *` | `/api/cron/run-workflows` | Retoma workflows em delay |
| `0 * * * *` | `/api/cron/collect-metrics` | Coleta métricas Meta Ads |
| `0 6 * * *` | `/api/cron/score-leads` | Recalcula lead scoring |
| `0 8 * * *` | `/api/cron/publish-posts` | Publica posts agendados |
| `0 9 * * *` | `/api/cron/reactivate-leads` | Dispara reativação de leads inativos |
| `0 10 * * 1` | `/api/cron/suggest-content` | Sugere pauta da semana |

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
