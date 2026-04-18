# PROMPT — Contexto Completo do LuxCRM (SaaS de Automação de Marketing e CRM)

Você está recebendo o contexto completo de um SaaS chamado **LuxCRM** (nome interno: Sanas Clinic). Use este documento como base de conhecimento absoluta para discutir qualquer aspecto do sistema — arquitetura, funcionalidades, integrações, banco de dados, fluxos de negócio, UI e decisões técnicas.

---

## 1. VISÃO GERAL DO PRODUTO

O LuxCRM é uma plataforma SaaS brasileira voltada para micro-empreendedores (clínicas estéticas, odontológicas, salões de beleza, restaurantes, academias etc.) que unifica em um só lugar:

- **CRM com pipeline Kanban** de leads
- **WhatsApp integrado** (chat em tempo real, broadcast, templates, equipe multi-atendente)
- **Assistente IA** com 12 ferramentas conectadas ao banco de dados real
- **5 Agentes IA especializados** (estrategista, criativo, comercial, analista, retenção)
- **Gestão de Meta Ads** (campanhas, conjuntos, anúncios, insights, alertas, diagnóstico de fase)
- **Estúdio de Conteúdo** com pipeline de vídeo IA (script → personagens → storyboard → vídeo → legendas)
- **Publicação multi-plataforma** (Instagram, Facebook, TikTok, LinkedIn, Pinterest, Google Business)
- **Calendário editorial** com geração automática de conteúdo por IA
- **Analytics avançado** (funil, LTV, CAC, ROAS, cohort, score distribution, uso de IA)
- **Motor de automações visuais** (workflows com triggers, condições, ações e delays)
- **Atribuição multi-touch** (first-touch, last-touch, linear, time-decay)
- **Conformidade LGPD** (exportação, anonimização, exclusão de dados de leads)
- **Onboarding guiado** em 4 etapas

O objetivo é ser revendido como white-label para agências e profissionais de marketing digital.

---

## 2. STACK TECNOLÓGICA

| Camada         | Tecnologia                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| Framework      | Next.js 16.1.6 (App Router)                                                      |
| UI             | React 19.2.3                                                                     |
| Estilização    | Tailwind CSS 4 (via @tailwindcss/postcss)                                        |
| Componentes UI | Radix UI (Dialog, Dropdown, Label, Progress, Separator, Toast, Slot)             |
| Ícones         | Lucide React                                                                     |
| Toasts         | Sonner                                                                           |
| Drag & Drop    | @dnd-kit (core, sortable, utilities)                                             |
| Gráficos       | Recharts                                                                         |
| Mapas          | Leaflet + react-leaflet                                                          |
| Validação      | Zod                                                                              |
| ORM            | Prisma 5                                                                         |
| Banco de Dados | PostgreSQL (Supabase)                                                            |
| Auth           | Supabase Auth (email/senha + OAuth)                                              |
| Storage        | Vercel Blob                                                                      |
| Deploy         | Vercel (projeto: sanas-clinic-l235)                                              |
| IA — LLM       | OpenAI (gpt-4o-mini), Google Gemini, Anthropic Claude (claude-sonnet-4-20250514) |
| IA — Imagem    | OpenAI DALL-E 3, Fal.ai (Flux Schnell), Replicate (Flux Schnell)                 |
| IA — Vídeo     | Fal.ai (Kling), Replicate (Minimax)                                              |
| IA — TTS       | OpenAI TTS (voz "nova")                                                          |
| WhatsApp       | Uazapi (principal), WhatsApp Cloud API (oficial), Evolution API/WAHA (legado)    |
| Ads            | Meta Graph API v18.0                                                             |
| Social         | Meta Graph API (Instagram/Facebook), Google Business Profile API v4              |
| Variantes CSS  | class-variance-authority (CVA)                                                   |
| Class merge    | clsx + tailwind-merge                                                            |
| Temas          | next-themes                                                                      |

---

## 3. ESTRUTURA DE DIRETÓRIOS

```
projeto-lux/
├── app/                        # Next.js App Router
│   ├── actions/                # 25+ Server Actions (toda lógica de negócio)
│   ├── api/                    # 19 API Routes
│   │   ├── ai/                 # assistant, generate-caption, generate-carousel, generate-image, generate-video
│   │   ├── cron/               # collect-metrics, publish-posts, reactivate-leads, run-workflows, score-leads, suggest-content
│   │   ├── leads/              # Criação pública de leads
│   │   ├── upload/             # Upload de mídia (100MB max)
│   │   ├── webhook/            # evolution, kling, whatsapp
│   │   └── whatsapp/           # proxy + send
│   ├── auth/                   # callback OAuth, reset-password
│   ├── dashboard/              # Todas as páginas autenticadas
│   │   ├── analytics/
│   │   ├── chat/ (+ assistant, broadcast, team, templates)
│   │   ├── meta/
│   │   ├── onboarding/
│   │   ├── overview/
│   │   ├── pipeline/
│   │   ├── posts/ (+ campaigns, library, metrics)
│   │   ├── settings/ (+ account, automations, integrations, pipeline)
│   │   ├── studio/ (+ chat, connect, vault)
│   │   └── workflows/
│   └── login/
├── components/                 # 90+ componentes React organizados por feature
│   ├── ui/                     # 12 primitivos (button, card, dialog, input, etc.)
│   ├── dashboard/              # Header, Nav, Overview, Analytics, Kanban
│   ├── chat/                   # ChatPage, Assistant, Broadcast, Team, Templates
│   ├── kanban/                 # KanbanBoard, KanbanColumn, LeadCard
│   ├── meta/                   # 18+ componentes de Meta Ads
│   ├── social/                 # Calendar, Library, CreatePost, AI Generate
│   ├── studio/                 # Projects, Chat, Vault
│   ├── settings/               # Business, Brand, AI, Automations, Stages
│   ├── modals/                 # CreateLead, EditLead, LeadDetail
│   ├── onboarding/             # Wizard de 4 etapas
│   ├── workflows/              # Builder de automações
│   └── ...
├── services/                   # 18 serviços de lógica de negócio
├── lib/                        # Utilitários (prisma, supabase, rateLimit, validations, utils)
├── types/                      # Definições TypeScript
├── prisma/                     # Schema (747 linhas, 37 modelos)
├── proxy.ts                    # Middleware de auth (Supabase session)
└── public/                     # Assets estáticos
```

---

## 4. BANCO DE DADOS — TODOS OS 37 MODELOS PRISMA

### 4.1 Core CRM

**User** — Entidade principal

- `id` (cuid), `email` (unique), `name`, `photoUrl`, `facebookId` (unique), `createdAt`, `updatedAt`
- Relações com todos os outros modelos

**Lead** — Lead/contato do CRM

- `id`, `name`, `phone`, `email`, `cpf`, `address`, `city`, `notes`, `photoUrl`
- `userId`, `stageId` (FK → Stage)
- `aiEnabled` (boolean — IA responde automaticamente)
- Atribuição: `source`, `medium`, `campaign`, `adSetName`, `adName`, `adAccountName`, `platform`, `referrer`
- Meta Ads: `metaAdId`, `metaAdSetId`, `metaCampaignId`
- Scoring: `score` (0-100), `scoreLabel` ("frio" | "morno" | "quente" | "vip"), `tags` (String[])
- Timestamps: `lastInteractionAt`, `reactivationSentAt`, `createdAt`, `updatedAt`
- `assignedTo` (FK → Attendant)
- Índices: userId, userId+phone, stageId, userId+createdAt, userId+score

**Stage** — Etapas do pipeline

- `id`, `name`, `order`, `eventName` (ex: "Lead", "Contact", "QualifiedLead", "Schedule", "Purchase"), `userId`
- Constraint: unique(userId, order)

**Message** — Mensagens de chat

- `id`, `leadId`, `role` ("user" | "assistant"), `content`, `createdAt`
- Índices: leadId, leadId+createdAt

**LeadStageHistory** — Trilha de auditoria de mudanças de estágio

- `id`, `leadId`, `stageId`, `createdAt`

### 4.2 Configuração

**AIConfig** — Configurações de IA por usuário

- `id`, `userId` (unique), `clinicName`, `systemPrompt`, `sendAudio`, `provider` (default: "openai"), `model` (default: "gpt-4o-mini"), `capabilities`, `apiKey`, `voiceClonePrompt`, `openaiKey`
- `brandIdentity` (Json): logo_url, primary_color, secondary_color, font, business_type, default_tone, target_audience
- Providers de geração: `aiImageProvider`, `aiImageApiKey`, `aiVideoProvider`, `aiVideoApiKey`, `klingApiKey`, `runwayApiKey`, `shotstackApiKey`
- `businessProfile` (Json): name, niche, city, services, avgTicket, differentials
- `automations` (Json): 16 toggles booleanos organizados em 5 categorias

**WhatsAppConfig** — Configuração multi-provider

- Oficial: `phoneNumberId`, `accessToken`, `verifyToken`
- Uazapi: `uazapiServerUrl`, `uazapiAdminToken`, `uazapiInstanceToken`, `uazapiInstanceName`
- `provider` (default: "official"), `userId` (unique)

**Pixel** — Configuração Meta Pixel + Ads

- `pixelId`, `accessToken`, `adAccountId`, `metaAdsToken`, `selectedCampaignId`
- `campaignObjective`, `conversionDestination`, `accountPhase`
- `monthlyBudget`, `bidStrategy`, `businessSegment`, `coverageArea`
- `conversionValue`, `maxCostPerResult`, `bidValue`, `userId`

**GoogleBusinessConfig** — Google Business Profile

- `apiKey`, `placeId`, `whatsappMsg`, `userId` (unique)

**CampaignConfig** — Configuração por campanha Meta

- `campaignId`, `campaignName`, `campaignObjective`, `conversionDestination`, `businessSegment`
- `conversionValue`, `maxCostPerResult`, `monthlyBudget`, `bidStrategy`, `bidValue`
- Constraint: unique(campaignId, userId)

### 4.3 Meta Ads & Tracking

**PixelEvent** — Eventos do Pixel

- `leadId`, `eventName`, `stageName`, `platform` (default: "facebook"), `success`

**Alert** — Alertas de campanha

- `type`: HIGH_FREQUENCY | LOW_CTR | BUDGET_EXHAUSTED | PAYMENT_ERROR | HIGH_CPM | LEARNING_LIMITED | CREATIVE_FATIGUE
- `severity`: WARNING | CRITICAL
- `message`, `suggestion`, `campaignId`, `adSetId`, `adId`, `resolved`

**CampaignAction** — Log de auditoria de ações

- `type`: PAUSE | ACTIVATE | BUDGET_CHANGE | BID_CHANGE | STRATEGY_CHANGE | AD_CREATED | CREATE
- `entityType`: CAMPAIGN | ADSET | AD
- `entityId`, `entityName`, `before`, `after`

**AdTrackingCode** — Códigos UTM/referência

- `code`, `campaignId`, `campaignName`, `adSetId`, `adSetName`, `adId`, `adName`
- Constraint: unique(code, userId)

### 4.4 Social Media

**SocialConnection** — Conexões OAuth

- `platform`: "instagram" | "facebook" | "tiktok" | "linkedin" | "pinterest" | "google_business"
- `accessToken`, `refreshToken`, `pageId`, `profileName`, `profilePicture`, `tokenExpiresAt`, `isActive`
- Constraint: unique(userId, platform)

**SocialPost** — Posts de conteúdo

- `title`, `caption`, `hashtags[]`, `mediaUrls[]`
- `mediaType`: "image" | "video" | "carousel" | "reels" | "story"
- `platforms[]`, `platformSpecific` (Json)
- `status`: "draft" | "scheduled" | "generating" | "ready" | "publishing" | "published" | "failed"
- `aiGenerated`, `aiCostEstimate`, `publishResults` (Json), `engagementData` (Json)
- `scheduledAt`, `publishedAt`

**SocialPostVersion** — Versões por plataforma

- `postId`, `platform`, `caption`, `mediaUrl`, `aspectRatio` ("1:1" | "9:16" | "16:9" | "4:5"), `specs` (Json)

### 4.5 WhatsApp Hub

**Attendant** — Atendentes da equipe

- `name`, `email`, `phone`, `role` ("admin" | "attendant"), `isActive`, `avatar`

**MessageTemplate** — Templates de mensagem

- `name`, `category` ("saudacao" | "follow_up" | "agendamento" | "promo" | "geral")
- `content` (com placeholders {{nome}}, {{clinica}}), `shortcut`, `usageCount`
- Constraint: unique(userId, shortcut)

**BroadcastCampaign** — Campanhas de broadcast

- `name`, `message` (com {{nome}}), `filters` (Json: tags[], scoreMin, stageIds[], source)
- `totalLeads`, `sentCount`, `failedCount`
- `status`: "draft" | "sending" | "completed" | "failed"

### 4.6 Automações

**Workflow** — Definição do workflow

- `name`, `description`, `isActive`
- `trigger` (Json): type + config

**WorkflowStep** — Passos sequenciais

- `workflowId`, `order`, `type` ("condition" | "action" | "delay"), `config` (Json)

**WorkflowExecution** — Execução em runtime

- `workflowId`, `leadId`, `status` ("running" | "completed" | "failed" | "skipped")
- `currentStep`, `logs` (Json), `startedAt`, `completedAt`

### 4.7 IA & Agentes

**AIAgentChat** — Conversas com agentes especializados

- `agentType`: "strategist" | "creative" | "commercial" | "analyst" | "retention"
- `title`, `messages` (Json: [{role, content, timestamp}])
- `feedback`: "approved" | "rejected" | "edited"

**AiUsageLog** — Tracking de custos

- `operation`: "caption" | "image" | "video" | "carousel"
- `provider`: "openai" | "replicate" | "fal"
- `model`, `inputTokens`, `outputTokens`, `costUsd`

### 4.8 Pipeline de Vídeo

**Story** — Projeto de vídeo

- `status`: "draft" | "scripting" | "script_review" | "characters" | "char_review" | "storyboarding" | "storyboard_review" | "video_generating" | "video_review" | "concatenating" | "completed" | "published" | "failed"
- `currentStage`: "script" | "characters" | "storyboard" | "video" | "concat" | "publish"
- `videoType`: "reel" | "story" | "tiktok" | "youtube_short" | "carousel" | "post"
- `targetDuration`, `tone`, `targetAudience`, `niche`
- `scriptRaw`, `scriptJson`, `finalVideoUrl`, `thumbnailUrl`, `caption`, `hashtags`
- Métricas: likes, comments, shares, views, saves, reach

**StoryCharacter** — Personagens IA

- `name`, `description`, `role` ("protagonista" | "paciente" | "narrador")
- `imageUrl`, `imagePrompt`, `imageStatus` ("pending" | "generating" | "done" | "error")
- `isApproved`

**StoryboardFrame** — Frames do storyboard

- `order`, `sceneTitle`, `narration`, `visualDescription`
- `duration`, `cameraDirection`, `transition`, `textOverlay`
- `imageUrl`, `imagePrompt`, `imageStatus`, `imageProvider`

**VideoClip** — Clipes de vídeo gerados

- `order`, `startFrameId`, `endFrameId`, `videoUrl`
- `clipStatus`, `provider` ("kling" | "runway" | "luma"), `model`, `mode` ("standard" | "pro")
- `duration`, `externalTaskId`

### 4.9 Assets & Estúdio

**AssetVault** — Biblioteca de ativos

- `category`: "person" | "space" | "procedure" | "brand" | "reference"
- `name`, `description`, `fileUrl`, `fileType`, `fileName`, `fileSize`
- `metadata` (Json), `isVoiceSample`, `voiceId`, `isFaceReference`, `personName`

**StudioProject** — Projetos de criação

- `title`, `type` (default: "single_post"), `status` (default: "draft")

**StudioChatMessage** — Chat dentro do projeto

- `projectId`, `role`, `content`, `toolsUsed` (Json)

**GeneratedPost** — Posts gerados por IA

- `title`, `type`, `status`, `scriptJson`, `mediaUrls`, `thumbnailUrl`
- `captions` (Json), `hashtags` (Json), `voiceoverUrl`, `scenes` (Json), `finalVideoUrl`
- Métricas e `productionCost`

**GeneratedPostPlatform** — Publicação por plataforma

- `postId`, `platform`, `captionOverride`, `platformPostId`, `status`, `errorMessage`

### 4.10 Campanhas WhatsApp

**WhatsAppCampaign** — Campanhas avançadas

- `name`, `type`, `status`, `baseMessage`, `variations` (Json), `filters` (Json)
- `antiBanConfig` (Json), `riskScore`
- Métricas: totalLeads, sentCount, deliveredCount, readCount, repliedCount, optOutCount, leadsConverted

**WACampaignMessage** — Mensagens individuais

- `campaignId`, `leadId`, `variationIndex`, `messageText`
- `status` ("queued" | ...), `sentAt`, `deliveredAt`, `readAt`, `repliedAt`, `optedOut`

---

## 5. SERVIÇOS DE NEGÓCIO (18 services)

### 5.1 aiChat.ts — Chat IA com Leads

- Suporte dual-provider: OpenAI (gpt-4o-mini) e Google Gemini
- System prompt dinâmico baseado em clinicName + instruções customizadas
- Detecção automática de estágio via marcador `STAGE: <EventName>` na resposta da IA
- Progressão: Lead → Contact → QualifiedLead → Schedule → Purchase
- Máximo 20 mensagens de histórico no contexto
- Respostas sempre em português brasileiro
- Parsing: extrai marcador STAGE via regex, remove da resposta, retorna `{reply, newStageEventName}`

### 5.2 aiAgents.ts — 5 Agentes IA Especializados

Cada agente tem system prompt específico e coleta de contexto própria:

1. **Estrategista** (🎯) — Análise de leads, taxa de conversão, distribuição por estágio/fonte, score médio. Recomenda alocação de budget, prioridades estratégicas, oportunidades de crescimento
2. **Criativo** (🎨) — Top posts, plataformas conectadas, templates. Gera 3 variações de copy, scripts de vídeo, briefings com hooks e CTAs
3. **Comercial** (💰) — Leads quentes (score≥50), leads parados (3+ dias), estágios do pipeline, conversões recentes. Scripts de venda, timing de follow-up, segmentação
4. **Analista** (📊) — Tendências semanais, distribuição de score, custo IA, posts publicados. Taxa de crescimento, anomalias, KPIs
5. **Retenção** (🔄) — Leads inativos (7+ dias), churn 30d, leads ativos 7d, reativados 30d. Mensagens personalizadas de reativação

**Configuração:** OpenAI, model configurável, temperature 0.7, max_tokens 2000, últimas 10 mensagens de contexto
**Custos:** inputTokens × $0.00000015 + outputTokens × $0.0000006

### 5.3 storyboardAI.ts — Pipeline de Vídeo IA

Pipeline completa de produção de vídeo em 7 etapas:

1. `chatForScript()` — Refinamento iterativo via chat
2. `generateScript()` — JSON com title, hook, characters, scenes[], caption, hashtags, cta
3. `generateCharacterImage()` — Prompt fotorrealista por personagem (1:1)
4. `generateFrameImage()` — Um frame por cena (9:16 vertical)
5. `startVideoClipGeneration()` — Async com start/end frame (5-10s)
6. `checkVideoClipStatus()` — Poll por status
7. `generateCaptions()` — Legendas por plataforma (Instagram 2200 chars, TikTok 150, Facebook 500)

**Fallback chain de providers:** Preferred → Fal → Replicate → OpenAI
**Custos:** DALL-E $0.04-0.08, Fal/Replicate $0.003, Vídeo Fal $0.1, Replicate $0.3

**Extras por nicho:** clinica_estetica ("luxury medical spa"), odontologica ("modern dental clinic"), salao_beleza ("chic beauty salon"), restaurante ("food photography"), academia ("modern gym")

### 5.4 workflowEngine.ts — Motor de Automações

**5 Triggers:**

- `new_lead` — quando lead é criado
- `stage_change` — quando lead muda para estágio específico (config: {stageId})
- `inactivity` — sem interação por X dias (config: {days})
- `tag_added` — tag específica adicionada (config: {tag})
- `score_change` — score cruza threshold (config: {direction: "above"|"below", threshold})

**3 Tipos de Step:**

- `condition` — avalia campo do lead contra operador/valor; se falso, para execução
- `action` — executa efeito colateral
- `delay` — pausa X minutos, retomado por cron

**8 Operadores de Condição:** equals, not_equals, gt, lt, gte, lte, contains, not_contains
**6 Campos avaliáveis:** score, source, stage, tags, aiEnabled, scoreLabel

**7 Tipos de Ação:**

1. `send_whatsapp` — mensagem com {{nome}}, {{clinica}}
2. `move_stage` — move lead para estágio
3. `add_tag` / `remove_tag` — gerencia tags
4. `assign_attendant` — atribui ou auto round-robin
5. `update_score` — soma/subtrai delta (0-100)
6. `notify` — log de notificação

**Deduplicação:** previne execução duplicada dentro de 1 hora para mesmo lead+workflow

### 5.5 webhookProcessor.ts — Pipeline de Processamento de Mensagens WhatsApp

Pipeline de 9 passos para cada mensagem recebida:

1. **Deduplicação** — conteúdo + janela de 60 segundos
2. **Find/Create Lead** — upsert com atribuição (source, medium, campaign, Meta IDs)
3. **Fire trigger new_lead** — non-blocking
4. **Update Attribution** — se novos dados e lead sem adId
5. **Save Message** — cria registro + atualiza lastInteractionAt
6. **Generate AI Reply** — se aiEnabled && apiKey configurada (últimas 30 mensagens de histórico)
7. **Save AI Reply** — como message role="assistant"
8. **Send Reply** — via callback sendFn
9. **Update Stage** — se IA detectou novo estágio → atualiza lead, cria histórico, envia pixel event, dispara workflow trigger

### 5.6 leadScoring.ts — Sistema de Pontuação de Leads

**Fórmula (0-100):**

- Progressão de estágio: min(stageHistory.count × 15, 60)
- Contagem de mensagens: min(messages.count × 2, 20)
- Recência: 0 dias = +20, 1-7 dias = +10, 8-30 dias = +5, >30 dias = 0
- Email preenchido: +5
- Qualidade da fonte: Meta CPC = +10, Google = +8, WhatsApp = +5, Manual = +3
- IA habilitada: +3

**Labels:** 80-100 = "vip", 50-79 = "quente", 25-49 = "morno", 0-24 = "frio"

**Funções:**

- `recalculateScores(userId)` — batch de todos os leads
- `recalculateLeadScore(leadId)` — lead individual
- `findLeadsForReactivation(userId, inactiveDays=7)` — leads inativos com aiEnabled, excluindo Purchase e reativados há <3 dias, limite 20, ordenados por score desc

### 5.7 socialPublisher.ts — Publicação Multi-Plataforma

**Plataformas suportadas:**

- **Instagram** — imagem única, carousel, reels (Meta Graph API v18.0, com poll de processamento)
- **Facebook** — foto, vídeo, álbum multi-foto, reels
- **Google Business** — post com mídia única (MyBusiness API v4, pt-BR)

**Fluxo:** Query posts com status="scheduled" AND scheduledAt<=now → marca "publishing" → publica em conexões ativas → status final "published" ou "failed" → armazena resultados em publishResults JSON

**Coleta de métricas:** Posts publicados nos últimos 7 dias → Meta Graph → likes, comments, shares, impressions → atualiza engagementData

### 5.8 attribution.ts — Atribuição Multi-Touch

**4 Modelos:**

1. **first_touch** — 100% crédito à primeira interação
2. **last_touch** — 100% crédito à última interação
3. **linear** — crédito igual entre todos os touchpoints
4. **time_decay** — mais peso para touchpoints recentes (half-life: 7 dias, peso = 0.5^(idade/halfLife))

**Funções adicionais:**

- `buildUTMUrl()` — constrói URLs com utm_source, utm_medium, utm_campaign, etc.
- `hashForCAPI()` — SHA256 para Conversions API
- `sendEnhancedConversion()` — Meta CAPI com dados hasheados (ph, em, fn, ln, country="br")

### 5.9 contentSuggestion.ts — Sugestões de Conteúdo

**Benchmarks por setor (SECTOR_BENCHMARKS):**

- clinica_estetica/instagram: dias [2,3,4], horas [10,12,19]
- clinica_odontologica, salao_beleza, restaurante, default
- Cada setor × plataforma (instagram, facebook, tiktok)

**Funções:**

- `suggestBestTimes()` — 7 slots semanais otimizados por engajamento histórico (últimos 50 posts)
- `generateWeeklyContentSuggestions()` — plano de 5 posts com IA (OpenAI, temperature 0.9)
  - Output: [{day_offset, time, type, platforms, title, caption, hashtags}]
  - Cria posts como draft com aiGenerated=true

### 5.10 marketIntelligence.ts — Inteligência de Mercado

- `searchCompetitorAds()` — Meta Ad Library API v18.0, busca por termos no Brasil
- `getTrendingTopics()` — Placeholder (Google Trends sem API oficial)
- `generateMarketAnalysis()` — Relatório JSON completo: analysis, suggestions[], copyVariations[] (por ângulo: urgência, autoridade, prova social...), gaps[], positioning

### 5.11 metaAds.ts — Integração Meta Ads

- `fetchMetaAdsInsights()` — Insights de conta (last_30d): spend, impressions, reach, clicks, CTR, CPM, CPC
- `fetchMetaCampaigns()` — Lista campanhas ACTIVE/PAUSED com insights (limite 20)
- Breakdown por action_type e cost_per_action_type

### 5.12 whatsappUazapi.ts — Integração Uazapi

- Gestão de instância: criar, conectar, QR code, desconectar
- Configuração de webhooks: mensagem, conexão
- Envio de mensagens: `/send/text`
- Sync de chats/mensagens: fetch paginado com busca e filtros

### 5.13 whatsappCloud.ts — API Oficial WhatsApp

- Endpoint: `graph.facebook.com/v18.0/{phoneNumberId}/messages`
- Formato: `{messaging_product: "whatsapp", type: "text", to, text: {body}}`

### 5.14 whatsappService.ts — Router Unificado

- `sendMessage(config, to, text)` — roteia para Uazapi se provider==="uazapi", senão para API oficial
- Normalização de telefone incluída

### 5.15 facebookEvents.ts — Conversão Facebook Pixel

- Dispatch via Conversions API
- Hash SHA256 de dados do usuário (telefone)
- Auto-dispara em mudanças de estágio → tabela PixelEvent

### 5.16 textToSpeech.ts — TTS

- OpenAI TTS (tts-1), voz "nova", formato MP3

### 5.17 evolutionApi.ts — Uazapi via Environment

- Usado por jobs de background sem config do banco
- `sendWhatsAppMessage()`, `sendWhatsAppAudio()` (base64 PTT)

### 5.18 Benchmarks e Utilitários

- `lib/rateLimit.ts` — Rate limiting in-memory por sliding window (API: 60/min, Webhook: 300/min, AI: 20/min, Upload: 30/min)
- `lib/prisma.ts` — Singleton global do PrismaClient
- `lib/validations.ts` — Schemas Zod (lead, post, message, brandIdentity, pagination)
- `lib/utils.ts` — `cn()` = clsx + tailwind-merge
- `lib/thermometerTexts.ts` — Textos de classificação de temperatura de lead

---

## 6. API ROUTES (19 endpoints)

### 6.1 AI (5 endpoints) — Auth: Supabase + API key, Rate: 20/min

| Rota                        | Método | Função                                                             |
| --------------------------- | ------ | ------------------------------------------------------------------ |
| `/api/ai/assistant`         | POST   | Assistente IA Claude com 12 ferramentas (ver seção 7)              |
| `/api/ai/generate-caption`  | POST   | Legendas para redes sociais (prompt, contentType, platforms, tone) |
| `/api/ai/generate-carousel` | POST   | Slides de carousel (topic, slideCount 3-10, tone, platforms)       |
| `/api/ai/generate-image`    | POST   | Geração de imagem (DALL-E ou Replicate) → Vercel Blob              |
| `/api/ai/generate-video`    | POST   | Geração de vídeo (Kling ou FAL) → Vercel Blob                      |

### 6.2 CRON (6 endpoints) — Auth: Bearer CRON_SECRET, Rate: 300/min

| Rota                         | Método | Função                                                      |
| ---------------------------- | ------ | ----------------------------------------------------------- |
| `/api/cron/collect-metrics`  | GET    | Coleta métricas de engajamento de posts publicados          |
| `/api/cron/publish-posts`    | GET    | Publica posts agendados cuja hora passou                    |
| `/api/cron/reactivate-leads` | GET    | Envia mensagens de reativação para leads inativos (7+ dias) |
| `/api/cron/run-workflows`    | GET    | Retoma execuções de workflow pausadas/atrasadas             |
| `/api/cron/score-leads`      | GET    | Recalcula scoring de todos os leads                         |
| `/api/cron/suggest-content`  | GET    | Gera sugestões semanais de conteúdo por IA                  |

### 6.3 WhatsApp (3 endpoints)

| Rota                    | Método   | Auth        | Função                                                      |
| ----------------------- | -------- | ----------- | ----------------------------------------------------------- |
| `/api/whatsapp`         | GET      | Supabase    | Proxy: chats, messages, details, status da instância Uazapi |
| `/api/whatsapp/send`    | POST     | Supabase    | Envia mensagem via Uazapi (30/min)                          |
| `/api/webhook/whatsapp` | GET/POST | Meta verify | Webhook Meta Cloud API (verificação + incoming messages)    |

### 6.4 Outros

| Rota                     | Método | Auth                    | Função                                                                              |
| ------------------------ | ------ | ----------------------- | ----------------------------------------------------------------------------------- |
| `/api/leads`             | POST   | x-api-key (Pixel token) | Criação pública de leads com UTM tracking                                           |
| `/api/webhook/evolution` | POST   | Nenhuma                 | Webhook Evolution API para WhatsApp                                                 |
| `/api/webhook/kling`     | POST   | Nenhuma                 | Callback de geração de vídeo Kling                                                  |
| `/api/upload`            | POST   | Supabase                | Upload multipart para Vercel Blob (JPEG, PNG, WebP, GIF, MP4, MOV, WebM; max 100MB) |
| `/auth/callback`         | POST   | Supabase OAuth          | Troca token + cria usuário + stages padrão                                          |

---

## 7. ASSISTENTE IA — 12 FERRAMENTAS

O assistente usa Claude (claude-sonnet-4-20250514) com max_tokens 2000 e 12 tools conectadas ao banco real:

1. **get_pipeline_summary** — totalLeads, hotLeads, stuckLeads, unansweredLeads, byStage[]
2. **get_leads** (status: hot|cold|stuck|all, limit) — nome, telefone, score, label, fonte, estágio, tags, diasSemInteração
3. **get_ad_performance** — gastoTotal, impressões, cliques, CTR, CPM, CPC, leads, CPL (últimos 7 dias)
4. **get_recent_posts** (limit) — título, tipo, plataformas, publicadoEm, engagement
5. **get_funnel_metrics** — totalLeads, funil[{estágio, evento, leads, percentual}]
6. **generate_post_idea** (topic, format, tone) — tópico, formato, tom, nicho, nota
7. **get_weekly_summary** — newLeads, newClients, publishedPosts (7 dias)
8. **search_competitor_ads** (search_terms) — Meta Ad Library, limite 10
9. **prepare_broadcast** (message, filter: hot|cold|inactive|all) — preview com leadsAlvo
10. **get_top_posts** (limit) — ordenados por engagement (likes+comments+shares)
11. **get_scheduled_posts** — posts futuros agendados, limite 10
12. **get_assets** (category) — assets do vault com nome, categoria, descrição, metadados

**Regras do system prompt:** Sempre português BR, usar dados REAIS das tools, mostrar preview antes de ação, direto e prático, bullet points, sugerir próxima ação no final.

---

## 8. PÁGINAS E FUNCIONALIDADES DA UI

### 8.1 Login (`/login`)

- Formulário email/senha com tabs Login/Cadastro
- Recuperação de senha
- Background gradiente estilizado

### 8.2 Onboarding (`/dashboard/onboarding`) — 4 etapas

- **Passo 0:** Boas-vindas + nome do negócio
- **Passo 1:** Seleção de nicho (12 opções com emojis: Clínica de Estética, Odontológica, Salão, Restaurante, Academia, Pet Shop, Imobiliária, Advocacia, Contabilidade, Educação, Saúde, Outro)
- **Passo 2:** Detalhes (cidade, serviços, ticket médio, público-alvo)
- **Passo 3:** Tom de comunicação (Profissional, Acolhedor, Descontraído, Luxo, Jovem) + checklist do que será configurado
- Ao finalizar: cria businessProfile, brandIdentity, stages padrão

### 8.3 Overview (`/dashboard/overview`)

- **IntelligentDashboard:** Alertas coloridos (urgente, warning, positivo) + KPIs (leads hoje, leads quentes, clientes mês, posts semana, chats ativos, agendados, rascunhos, score médio) + Agenda do dia + Quick Actions (Perguntar IA, Criar Post, Ver Pipeline, Broadcast)
- **DashboardOverviewClient:** Date range picker + filtro de fonte + gráfico donut de conversas + bar chart de origens + export CSV

### 8.4 Chat (`/dashboard/chat`) — 5 sub-abas

**WhatsApp (principal):**

- Split view: sidebar (lista de chats com busca, tabs Pessoal/Grupos, refresh) + área de chat (header com nome/telefone, thread de mensagens, input)
- Envio com optimistic updates
- Sync em tempo real via `/api/whatsapp` proxy

**Assistente IA:**

- Chat com Claude + 6 quick actions pré-definidas ("Como estão meus ads?", "Quantos leads entraram hoje?", etc.)
- Histórico de 10 mensagens enviado ao assistant

**Templates:**

- CRUD de templates com nome, conteúdo, categoria (Saudação, Follow-up, Agendamento, Promoção, Geral), shortcut, contagem de uso

**Broadcast:**

- Criar campanhas com nome, mensagem (com {{nome}}), filtros (tags, score mínimo, estágio)
- Executar com confirmação
- Status: Draft, Sending, Completed, Failed

**Equipe:**

- CRUD de atendentes (nome, email, telefone)
- Distribuição round-robin de leads
- Status ativo/inativo

### 8.5 Pipeline (`/dashboard/pipeline`)

- **Kanban board** com drag-and-drop (dnd-kit)
- **Table view** alternativa
- Cards de fonte com contagem (Meta Ads, WhatsApp, Manual, Desconhecido)
- Filtros: busca, fonte, estágio, score, tags
- **Filtros salvos** no localStorage
- Export CSV dos leads filtrados
- Modal de detalhe do lead (mensagens, histórico de estágio, eventos pixel)

### 8.6 Meta Ads (`/dashboard/meta`)

- Card de fase da conta (LEARNING, STABILIZING, SCALING, MATURE)
- Tabs de campanhas (ACTIVE/PAUSED)
- Painel de campanha com insights, ad sets, budget
- Wizard de criação de campanha (multi-step)
- Configuração de objetivo, destino de conversão, bid strategy
- Alertas de campanha (HIGH_FREQUENCY, LOW_CTR, etc.)

### 8.7 Estúdio (`/dashboard/studio`) — 4 sub-abas

**Projetos:** Lista de projetos de criação com contagem de mensagens e posts

**Acervo (Vault):**

- Grid de assets por categoria (Pessoas, Espaço, Procedimentos, Marca, Referências)
- Upload com metadata (nome, descrição, face reference, voice sample)
- Filtro por categoria com contagem

**Chat IA:**

- Interface de chat para criação de conteúdo
- 6 quick prompts (ideias de post, scripts de Reels, etc.)
- Cria projeto automaticamente na primeira mensagem

**Conexões:** Conectar plataformas sociais

### 8.8 Posts (`/dashboard/posts`) — 4 sub-abas

**Calendário:**

- Grid mensal com navegação por mês
- Indicadores de posts por dia (hora, tipo, status com cores)
- Stats: Agendados, Rascunhos, Publicados, IA Gerados
- Botões: "Agendar Post" e "Gerar com IA"

**Biblioteca:**

- Grid de posts com thumbnails
- Filtros: status, tipo de mídia, plataforma
- Ações: visualizar, editar, deletar

**Campanhas WhatsApp:** Gestão de campanhas avançadas

**Métricas:**

- Stats cards (Total Posts, Alcance, Engajamento, Conexões, Agendados)
- Performance por plataforma (bar chart com percentuais)
- Tipos de conteúdo (Image, Video, Carousel, Reels, Story)
- Top 5 posts por engajamento
- Plataformas conectadas com status

### 8.9 Analytics (`/dashboard/analytics`)

- Seletor de campanha (todas ou individual)
- Cards de campanha com KPIs (CTR, CPM, CPC com indicadores de qualidade)
- Métricas: Gasto (R$), Leads, Taxa de conversão, ROI, Score médio
- Termômetros de qualidade (bom/ok/ruim)
- Estratégia insights com status indicators
- Breakdown demográfico (idade, gênero)
- Performance por plataforma

**Advanced Analytics:**

- Funil de conversão (bar chart com estágios, percentual, dias médios, dropoff)
- LTV por fonte (leads, clientes, conversão%, LTV estimado R$)
- CAC & ROAS por canal (gasto, CPL, CPA, ROAS)
- Distribuição de score (Frio, Morno, Quente, VIP)
- Uso de IA (operações, custo total, breakdown por operação)
- Insights gerados automaticamente

### 8.10 Settings (`/dashboard/settings`) — 5 sub-abas

**Negócio:** Perfil do negócio + Identidade da marca (logo, cores, fontes, tom, público)

**Conta:** Email, nome, foto, senha, exclusão de conta

**Integrações:** WhatsApp (Uazapi), Facebook Pixel, Meta Ads, Google Business, chaves de geração (imagem/vídeo)

**Automações:** 16 toggles em 5 categorias:

- WhatsApp: Boas-vindas, Follow-up 24h, Confirmação agendamento, Lembretes, Reativação, Pesquisa NPS
- Conteúdo: Sugestões semanais IA, Auto-publicar, Coletar métricas
- Engajamento: Coletar comentários, Sugestões IA de resposta, Auto-like, Classificar seguidores
- Ads: Alerta CPL, Alerta frequência, Eventos CAPI
- Pipeline: Scoring diário, Alerta leads parados

**Pipeline:** Gerenciamento de estágios (criar, editar, reordenar, excluir)

### 8.11 Workflows (`/dashboard/workflows`)

- Lista de workflows com trigger icon/badge, action badges, contagem de execuções
- Play/Pause toggle, Delete
- Modal de criação: nome → trigger (5 tipos com ícones) → configuração do trigger → ação (7 tipos) → configuração da ação

---

## 9. SERVER ACTIONS (25+ arquivos)

Todas as operações de banco passam por Server Actions em `app/actions/`. Principais:

| Arquivo                | Funções Principais                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `auth.ts`              | signIn (email/Facebook), signUp, signOut, resetPassword, updatePassword                                      |
| `leads.ts`             | CRUD completo, moveLead, addTag, removeTag, getLeadTimeline, refreshLeadScore, getDashboardStats, deleteLead |
| `messages.ts`          | getLeadsWithMessages, toggleAI, sendManualMessage                                                            |
| `stages.ts`            | CRUD de estágios com reordenação                                                                             |
| `aiConfig.ts`          | get/save AIConfig (com mascaramento de chaves)                                                               |
| `aiAgents.ts`          | sendAgentMessage, getAgentChats, setAgentFeedback                                                            |
| `pixel.ts`             | get/save Pixel, saveSelectedCampaign, saveCampaignObjective                                                  |
| `meta.ts`              | getMetaCampaigns, getMetaAdSets, getMetaAds, updateCampaignStatus                                            |
| `alerts.ts`            | generateAlerts (6 regras), resolveAlert, getAlerts                                                           |
| `analytics.ts`         | getAnalytics, getAdCreativeReport                                                                            |
| `advancedAnalytics.ts` | getFunnel, getLTV, getCAC, getCohort, getScoreDistribution, getAIUsageReport, exportCSV/JSON                 |
| `social.ts`            | getSocialConnections, saveSocialConnection                                                                   |
| `dashboard.ts`         | getDashboardIntelligence (alertas, KPIs, agenda)                                                             |
| `brandSettings.ts`     | get/save BrandIdentity, ContentGenKeys, BusinessProfile, Automations, AIUsageStats                           |
| `whatsapp.ts`          | get/save configs (oficial + Uazapi)                                                                          |
| `whatsappHub.ts`       | CRUD atendentes, assignLead, autoAssign (round-robin)                                                        |
| `tracking.ts`          | getAttributionReport, generateUTMLink                                                                        |
| `accountPhase.ts`      | diagnoseAccountPhase, saveAccountPhase                                                                       |
| `onboarding.ts`        | isOnboardingComplete, saveOnboardingData                                                                     |
| `workflows.ts`         | CRUD workflows com steps                                                                                     |
| `story.ts`             | CRUD stories, pipeline de vídeo                                                                              |
| `vault.ts`             | CRUD assets, getAssetStats                                                                                   |
| `studioChat.ts`        | CRUD projetos, sendStudioMessage                                                                             |
| `lgpd.ts`              | exportLeadData, anonymizeLeadData, eraseLeadData, anonymizeOldLeads                                          |
| `account.ts`           | get/update nome, email, foto, senha; deleteAccount (cascade)                                                 |
| `campaignActions.ts`   | recordCampaignAction, getCampaignActions                                                                     |
| `googleBusiness.ts`    | get/save config, getGoogleBusinessData (Places API)                                                          |

---

## 10. PADRÕES ARQUITETURAIS

- **Multi-tenant** por `userId` (row-level isolation, sem RLS no Supabase)
- **Server Components** por padrão, `*Client.tsx` para interatividade
- **Nested Layouts** com tabs de navegação baseados em Link
- **Rate limiting in-memory** (sliding window, reseta no redeploy)
- **Non-blocking** para pixel events e workflow triggers (fire-and-forget)
- **Context window otimizado** para LLMs (10-20 mensagens max)
- **Cost tracking** em AiUsageLog para cada operação IA
- **Provider fallback chain** para geração de imagem/vídeo
- **Deduplicação** de mensagens (60s) e execuções de workflow (1h)
- **Validação Zod** nas bordas do sistema (API routes, server actions)
- **Mascaramento de chaves** na UI (mostra apenas últimos caracteres)
- **Optimistic updates** no chat (mensagem aparece antes da confirmação)
- **Middleware via proxy.ts** para sessões Supabase (não middleware.ts)

---

## 11. NÚMEROS DO PROJETO

| Métrica                  | Valor                      |
| ------------------------ | -------------------------- |
| Arquivos .tsx            | 125                        |
| Arquivos .ts             | 81                         |
| Total de arquivos        | ~209                       |
| Dependências npm         | 53                         |
| Modelos Prisma           | 37                         |
| Linhas do schema         | 747                        |
| Páginas (page.tsx)       | 27                         |
| Layouts (layout.tsx)     | 6                          |
| Componentes              | 90+                        |
| Serviços                 | 18                         |
| API Routes               | 19                         |
| Server Actions           | 25+ arquivos, 100+ funções |
| CRON jobs                | 6                          |
| Tools do Assistente IA   | 12                         |
| Agentes IA               | 5                          |
| Automações configuráveis | 16                         |
| Triggers de workflow     | 5                          |
| Ações de workflow        | 7                          |

---

## 12. VARIÁVEIS DE AMBIENTE

**Obrigatórias:**

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase
- `DATABASE_URL`, `DIRECT_URL` — PostgreSQL (connection pooling)
- `NEXT_PUBLIC_APP_URL` — URL da aplicação

**Produção:**

- `CRON_SECRET` — autenticação dos cron jobs
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob (auto-configurado)

**Opcionais (configuráveis via Settings UI):**

- `UAZAPI_SERVER_URL`, `UAZAPI_ADMIN_TOKEN` — WhatsApp Uazapi
- `ANTHROPIC_API_KEY` — Claude (assistente)
- OpenAI, Gemini, Replicate, Fal.ai, Meta Pixel, Meta Ads, Google Business — via AIConfig no banco

---

Agora você tem o contexto completo de cada mínima função, modelo, rota, componente, serviço e decisão arquitetural do LuxCRM. Pode discutir qualquer aspecto: melhorias, bugs, novas features, refatoração, escalabilidade, precificação, UX, segurança, performance, ou qualquer outro tema.
