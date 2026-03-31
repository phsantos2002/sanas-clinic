# LuxCRM — Plataforma SaaS de Marketing 360 com IA

CRM integrado ao WhatsApp com IA para micro empreendedores brasileiros.
O cliente abre o sistema, a IA cuida de tudo. Ele so aprova, ajusta e acompanha resultados.

## Stack

- **Framework**: Next.js 16.1.6, React 19, Tailwind CSS 4
- **Database**: PostgreSQL (Supabase) + Prisma 5
- **Auth**: Supabase Auth (Email + OAuth)
- **IA**: Anthropic Claude (Assistente), OpenAI (conteudo), Replicate/Fal.ai (imagens/video)
- **WhatsApp**: Meta Cloud API + Uazapi + Evolution API
- **Ads**: Meta Graph API v18.0
- **Storage**: Vercel Blob
- **Deploy**: Vercel com CRON jobs

## Modulos

| Modulo | Descricao |
|--------|-----------|
| Dashboard | Alertas IA + KPIs + Agenda + Atalhos |
| Chat | WhatsApp + Assistente IA (Claude 12 tools) + Templates + Broadcast + Equipe |
| Pipeline | Kanban drag-and-drop + Lead Scoring + Tags + Filtros |
| Ads | Meta Ads completo (18 componentes) — campanhas, KPIs, alertas, otimizacao |
| Estudio | Acervo de assets + Chat criativo com IA + Projetos + Conexoes |
| Postagens | Calendario + Biblioteca + Campanhas WA + Metricas |
| Analytics | Funil + LTV + CAC + ROAS + Scores + IA Insights |
| Config | Negocio + Integracoes + Automacoes (17 toggles) + Pipeline + Conta |

## Setup Local

```bash
# Clonar
git clone https://github.com/phsantos2002/sanas-clinic.git
cd sanas-clinic

# Instalar
npm install

# Configurar .env (copiar de .env.example)
cp .env.example .env
# Preencher: SUPABASE_URL, ANON_KEY, DATABASE_URL, DIRECT_URL

# Prisma
npx prisma db push
npx prisma generate

# Rodar
npm run dev
```

## Variaveis de Ambiente

Ver `.env.example` para lista completa. Principais:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Auth
- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL
- `ANTHROPIC_API_KEY` — Assistente IA (Claude)
- `CRON_SECRET` — Protecao dos CRON endpoints

Chaves configuradas pelo usuario na interface (Config > Integracoes):
OpenAI, Replicate, Fal.ai, Meta Pixel, Meta Ads, Google Business

## CRON Jobs

| Schedule | Rota | Funcao |
|----------|------|--------|
| Diario 8h | /api/cron/publish-posts | Publica posts agendados |
| Diario 6h | /api/cron/score-leads | Recalcula lead scoring |

## Licenca

Proprietario. Todos os direitos reservados.
