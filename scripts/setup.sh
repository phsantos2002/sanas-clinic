#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════
# Sanas Pulse — Setup completo pós-sprint
# Executa: npm install → prisma migrate → Vercel env vars
#
# Uso:
#   cd projeto-lux
#   chmod +x scripts/setup.sh
#   ./scripts/setup.sh
# ══════════════════════════════════════════════════════════

set -e  # Para em qualquer erro

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_step() { echo -e "\n${BLUE}▶ $1${NC}"; }
log_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
log_err()  { echo -e "${RED}✗ $1${NC}"; }

echo -e "${BLUE}"
echo "══════════════════════════════════════"
echo "  Sanas Pulse — Setup Pós-Sprint"
echo "══════════════════════════════════════"
echo -e "${NC}"

# ── Verificar se estamos na raiz do projeto ──────────────
if [ ! -f "package.json" ] || [ ! -f "prisma/schema.prisma" ]; then
  log_err "Execute este script na raiz do projeto (onde fica o package.json)"
  exit 1
fi

# ── Verificar .env ────────────────────────────────────────
if [ ! -f ".env" ]; then
  log_err ".env não encontrado. Copie .env.example e preencha as variáveis."
  echo "  cp .env.example .env"
  exit 1
fi

# ── PASSO 1: npm install ──────────────────────────────────
log_step "PASSO 1/3 — Instalando dependências (npm install)"

npm install
log_ok "Dependências instaladas"

# ── Ativar Husky (git hooks) ──────────────────────────────
if [ -d ".git" ]; then
  npx husky install 2>/dev/null || true
  log_ok "Husky ativado (commit hooks)"
else
  log_warn "Não é um repositório git — Husky não ativado"
fi

# ── PASSO 2: Prisma migrate deploy ───────────────────────
log_step "PASSO 2/3 — Aplicando migrations do banco de dados"

echo "Verificando status das migrations..."
npx prisma migrate status 2>/dev/null || true

echo ""
echo "Aplicando migrations pendentes..."
npx prisma migrate deploy
log_ok "Migrations aplicadas"

echo ""
echo "Regenerando Prisma Client..."
npx prisma generate
log_ok "Prisma Client atualizado"

# ── PASSO 3: Vercel env vars ──────────────────────────────
log_step "PASSO 3/3 — Configurando variáveis de ambiente no Vercel"

# Checar se Vercel CLI está disponível
if ! command -v vercel &>/dev/null; then
  log_warn "Vercel CLI não instalado. Pulando configuração automática."
  echo ""
  echo "  Para configurar manualmente acesse:"
  echo "  https://vercel.com/dashboard → Projeto → Settings → Environment Variables"
  echo ""
  echo "  Variáveis obrigatórias:"
  echo "  • META_APP_SECRET  — App Secret do Meta for Developers"
  echo "  • CRON_SECRET      — String aleatória para proteger os crons"
  echo ""
  echo "  Para instalar o Vercel CLI: npm i -g vercel"
else
  # Carregar valores do .env local
  source .env 2>/dev/null || true

  echo "Configurando variáveis no Vercel (ambiente: production)..."

  # META_APP_SECRET
  if [ -n "$META_APP_SECRET" ]; then
    echo "$META_APP_SECRET" | vercel env add META_APP_SECRET production --force 2>/dev/null && \
      log_ok "META_APP_SECRET configurado" || \
      log_warn "Falha ao configurar META_APP_SECRET (verifique login: vercel login)"
  else
    log_warn "META_APP_SECRET não encontrado no .env — configure manualmente no Vercel"
  fi

  # CRON_SECRET
  if [ -n "$CRON_SECRET" ]; then
    echo "$CRON_SECRET" | vercel env add CRON_SECRET production --force 2>/dev/null && \
      log_ok "CRON_SECRET configurado" || \
      log_warn "Falha ao configurar CRON_SECRET (verifique login: vercel login)"
  else
    # Gerar um secret seguro se não existir
    GENERATED_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    log_warn "CRON_SECRET não encontrado no .env — gerando automaticamente..."
    echo "$GENERATED_SECRET" | vercel env add CRON_SECRET production --force 2>/dev/null && \
      log_ok "CRON_SECRET gerado e configurado: ${GENERATED_SECRET:0:8}..." || \
      log_warn "Falha ao configurar CRON_SECRET"

    # Salvar no .env local também
    echo "CRON_SECRET=$GENERATED_SECRET" >> .env
    log_ok "CRON_SECRET salvo no .env local"
  fi

  echo ""
  log_ok "Variáveis de ambiente configuradas no Vercel"
fi

# ── Resumo final ──────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Setup concluído com sucesso!${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""
echo "Próximos passos:"
echo "  npm run dev       — Iniciar servidor local"
echo "  npm run typecheck — Verificar tipos TypeScript"
echo "  npm run test      — Rodar testes"
echo ""
echo "Após o próximo deploy na Vercel, os crons estarão ativos:"
echo "  • run-workflows   → a cada 5 minutos"
echo "  • collect-metrics → a cada hora"
echo "  • score-leads     → diário às 6h"
echo "  • publish-posts   → diário às 8h"
echo "  • reactivate-leads→ diário às 9h"
echo "  • suggest-content → toda segunda às 10h"
echo ""
