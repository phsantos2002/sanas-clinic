# Arquitetura — Sanas Pulse

## Visão Geral

```
Browser ──── Next.js App Router ──── Supabase Auth
                     │
            ┌────────┼────────┐
            │        │        │
        Server    API      Actions
        Pages    Routes    (Server)
            │        │        │
            └────────┼────────┘
                     │
                  Prisma ORM
                     │
               PostgreSQL (Supabase)
```

## Fluxo de Mensagem WhatsApp

```
WhatsApp/Uazapi ──POST──► /api/webhook/whatsapp (ou /evolution)
                                │
                   HMAC verify (META_APP_SECRET)
                                │
                      webhookQueue.enqueue()
                           [returns 200]
                                │
                   ┌────────────▼────────────┐
                   │   processIncomingMessage  │
                   │  (webhookProcessor.ts)    │
                   └────────────┬────────────┘
                                │
                   ┌────────────▼────────────┐
                   │  Idempotency check        │
                   │  1. externalMessageId      │
                   │  2. content+60s fallback   │
                   └────────────┬────────────┘
                                │
                   ┌────────────▼────────────┐
                   │  Find/Create Lead         │
                   │  (normalizePhone match)    │
                   └────────────┬────────────┘
                                │
                   ┌────────────▼────────────┐
                   │  Save Message (DB)        │
                   │  externalId → unique idx  │
                   └────────────┬────────────┘
                                │
                   ┌────────────▼────────────┐
                   │  AI Config check          │
                   │  (whitelist/blacklist)    │
                   │  (human pause check)      │
                   └────────────┬────────────┘
                                │
                   ┌────────────▼────────────┐
                   │  generateAIReply()        │
                   │  (OpenAI/Gemini/Claude)   │
                   └────────────┬────────────┘
                                │
                   ┌────────────▼────────────┐
                   │  sendReply() + stage move │
                   │  + fireTrigger() workflows│
                   └─────────────────────────┘
```

## Fluxo de Webhook Meta Ads

```
Meta Platform ──POST──► /api/webhook/whatsapp
                              │
                   X-Hub-Signature-256
                   timingSafeEqual verify
                              │
                   Zod schema parse (MetaWebhookPayloadSchema)
                              │
                   ┌──────────▼──────────┐
                   │  per-message loop    │
                   │  webhookQueue.enqueue│
                   └─────────────────────┘
```

## Fluxo de Workflow

```
Trigger Event (new_lead / stage_change / inactivity / tag_added / score_change)
      │
fireTrigger(userId, type, leadId)
      │
  findMany workflows WHERE isActive=true
      │
  match trigger config (stageId / tag / score threshold)
      │
  dedup check: no execution in last 60min
      │
  create WorkflowExecution (status: running)
      │
executeWorkflow(executionId)
      │
  loop steps (max 50 guards infinite loops)
      │
  ┌───┴────────────────────────────────┐
  │ condition → evaluate → skip/continue│
  │ action    → executeAction()         │
  │ delay     → save progress, cron resume│
  └────────────────────────────────────┘
      │
  status: completed / skipped / failed
```

## Multi-Tenancy

Todos os modelos têm `userId` como chave de isolamento. Não existe tenant global.
O campo `userId` é indexado em todas as queries de lista.

Proteção via:

- `getCurrentUser()` em Server Actions (Supabase Auth session)
- `ensureOwnership(model, resourceId)` para operações em recursos específicos
- Row-level validation explícita (`pixel.userId === userId`) em rotas públicas

## Rate Limiting

In-memory, sliding window. Resets em redeploy.

| Contexto         | Limite      | Chave                            |
| ---------------- | ----------- | -------------------------------- |
| AI generation    | 20 req/min  | `ai:{userId}`                    |
| Lead capture API | 120 req/min | `leads:{ip}`                     |
| Webhook          | 300 req/min | (sem RL — gerenciado pela queue) |
| General API      | 60 req/min  | configurável                     |

Para produção com escala, trocar store `Map` por Vercel KV ou Upstash Redis.

## Queue (lib/queue.ts)

In-process queue com concorrência controlada e retry exponencial.

| Queue   | Concorrência | Retries | Backoff |
| ------- | ------------ | ------- | ------- |
| webhook | 5            | 3       | 1s base |
| ai      | 3            | 2       | 2s base |

Para escala horizontal, substituir `enqueue()` por BullMQ (Redis) ou QStash (HTTP).

## Workflow Versioning

Cada save de workflow gera um `WorkflowVersion` com snapshot do canvas+steps.
Versões são imutáveis. Rollback cria uma nova versão apontando para o snapshot antigo.

Schema:

```
WorkflowVersion {
  id, workflowId, version (auto-increment por workflow),
  canvas (JSONB), steps (JSONB), label, createdBy, createdAt
}
```

## Structured Logging (lib/logger.ts)

- Formato: JSON em produção, ANSI colorido em desenvolvimento
- Níveis: debug < info < warn < error
- `logger.child({ requestId, userId })` para contexto
- Sem dependências externas (zero-dep)

## Error Handling

Hierarquia `AppError` em `lib/errors.ts`:

- `ValidationError` (400) — input inválido
- `AuthError` (401) — não autenticado
- `ForbiddenError` (403) — sem permissão
- `NotFoundError` (404) — recurso não encontrado
- `ConflictError` (409) — duplicata
- `RateLimitError` (429) — limite excedido
- `ExternalServiceError` (502) — falha em API externa
- `InternalError` (500) — erro interno

`apiHandler()` captura automaticamente e serializa para JSON com `requestId`.
