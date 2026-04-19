# Runbooks — Sanas Pulse

Procedimentos operacionais para incidentes e manutenção em produção.

---

## RB-01: Webhook WhatsApp não está processando mensagens

**Sintomas:** Mensagens chegam no WhatsApp mas não aparecem no sistema; leads não são criados.

**Diagnóstico:**

```bash
# 1. Verificar logs do webhook (requer CRON_SECRET)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://app.sanaspulse.com/api/debug/webhook-log

# 2. Verificar se a assinatura HMAC está sendo rejeitada
# Procurar por: meta_webhook_invalid_signature
```

**Causas comuns:**

| Causa                               | Solução                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `META_APP_SECRET` não configurado   | Adicionar no painel Vercel → Environment Variables                 |
| Token de verificação errado no Meta | Verificar `WhatsAppConfig.verifyToken` no banco                    |
| Timeout da Vercel (>10s)            | Mensagem foi processada mas Meta reenvio — idempotência cobre isso |
| Instância Uazapi desconectada       | Reconectar em Config > WhatsApp                                    |

**Resolução:**

1. Conferir variável `META_APP_SECRET` no Vercel
2. Reconectar instância Uazapi se necessário
3. Limpar log de debug: `DELETE /api/debug/webhook-log` com CRON_SECRET

---

## RB-02: IA não está respondendo leads

**Sintomas:** Mensagens chegam e são salvas, mas nenhuma resposta automática é enviada.

**Diagnóstico:**

1. Verificar se `lead.aiEnabled = true` no Prisma Studio
2. Verificar se `lead.humanPausedUntil` está no futuro
3. Verificar se `AIConfig.apiKey` está preenchida (Config > IA)
4. Verificar logs por `webhook_ai_no_api_key` ou `webhook_ai_disabled`

**Causas comuns:**

| Log                       | Causa                        |
| ------------------------- | ---------------------------- |
| `webhook_ai_no_api_key`   | Chave de API não configurada |
| `webhook_ai_human_paused` | Intervenção humana ativa     |
| `webhook_ai_disabled`     | `aiEnabled=false` no lead    |
| `webhook_blacklist_skip`  | Telefone na blacklist        |

---

## RB-03: CRON jobs não estão executando

**Sintomas:** Lead scoring desatualizado; posts não publicados; reativações não disparadas.

**Diagnóstico:**

```bash
# Verificar configuração no vercel.json
cat vercel.json | grep -A 3 '"crons"'

# Testar manualmente
curl -X GET https://app.sanaspulse.com/api/cron/score-leads \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Checklist:**

- [ ] `CRON_SECRET` configurado no Vercel
- [ ] Projeto no plano Vercel Pro ou superior (Hobby não suporta crons personalizados)
- [ ] `vercel.json` deployado (confirmar em último deploy)

---

## RB-04: Erro 500 em rota de API

**Sintomas:** Usuários reportam erros ao usar o sistema; logs mostram 500.

**Diagnóstico:**

```bash
# Vercel logs (produção)
vercel logs --prod --filter=500

# Ou via dashboard Vercel → Functions → Logs
```

**Processo de análise:**

1. Identificar `requestId` nos logs de erro
2. Buscar o requestId no log completo para contexto
3. Se `code: "DB_ERROR"` → verificar conexão Supabase
4. Se `code: "EXTERNAL_SERVICE_ERROR"` → verificar API externa (Meta, OpenAI)

---

## RB-05: Banco de dados lento / timeout

**Sintomas:** Requisições demorando >5s; timeouts esporádicos.

**Diagnóstico:**

```bash
# Verificar health check
curl https://app.sanaspulse.com/api/health

# Resposta esperada:
# { "status": "ok", "checks": { "db": "ok" }, ... }
```

**Ações imediatas:**

1. Verificar Supabase Dashboard → Database → Performance
2. Verificar se há queries longas rodando (`pg_stat_activity`)
3. Verificar se pool do PgBouncer está esgotado (limite do plano)

**Query de diagnóstico no Supabase SQL Editor:**

```sql
-- Ver queries ativas
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds';

-- Índices mais usados
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC LIMIT 20;
```

---

## RB-06: Rollback de workflow para versão anterior

**Situação:** Usuário editou workflow e quer reverter para versão anterior.

**Via API (futuro endpoint):**

```typescript
import { restoreWorkflowVersion } from "@/services/workflowEngine";

// Listar versões disponíveis
const versions = await prisma.workflowVersion.findMany({
  where: { workflowId: "wf_xxx" },
  orderBy: { version: "desc" },
  take: 10,
});

// Restaurar versão específica
await restoreWorkflowVersion(versions[2].id, userId);
```

**Via Prisma Studio:**

1. Abrir `WorkflowVersion` e localizar a versão desejada
2. Copiar `canvas` e `steps` JSON
3. Colar em `Workflow.canvas` e recriar `WorkflowStep` manualmente

---

## RB-07: Limpar logs de debug em produção

```bash
# Requer CRON_SECRET
curl -X DELETE https://app.sanaspulse.com/api/debug/webhook-log \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## RB-08: Forçar recálculo de lead scoring manualmente

```bash
curl -X GET https://app.sanaspulse.com/api/cron/score-leads \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Contatos de Suporte Externo

| Serviço             | Suporte                                 |
| ------------------- | --------------------------------------- |
| Supabase            | https://supabase.com/support            |
| Vercel              | https://vercel.com/help                 |
| Meta for Developers | https://developers.facebook.com/support |
| Uazapi              | Suporte via WhatsApp do fornecedor      |
