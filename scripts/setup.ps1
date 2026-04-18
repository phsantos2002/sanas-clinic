# Sanas Pulse - Setup completo (Windows PowerShell)
# Uso: .\scripts\setup.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Sanas Pulse - Setup Pos-Sprint" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar pasta correta
if (-not (Test-Path "package.json")) {
    Write-Host "ERRO: Execute na raiz do projeto (onde fica package.json)" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".env")) {
    Write-Host "ERRO: .env nao encontrado. Copie .env.example e preencha." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "PASSO 1/3 - npm install..." -ForegroundColor Cyan

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: npm install falhou" -ForegroundColor Red
    exit 1
}
Write-Host "OK - Dependencias instaladas" -ForegroundColor Green

if (Test-Path ".git") {
    # Husky v9+ nao usa mais "husky install" - ja e ativado pelo script prepare do npm install
    Write-Host "OK - Husky ativado (via prepare)" -ForegroundColor Green
}

Write-Host ""
Write-Host "PASSO 2/3 - Prisma migrate deploy..." -ForegroundColor Cyan

npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: prisma migrate deploy falhou" -ForegroundColor Red
    exit 1
}
Write-Host "OK - Migrations aplicadas" -ForegroundColor Green

npx prisma generate
Write-Host "OK - Prisma Client atualizado" -ForegroundColor Green

Write-Host ""
Write-Host "PASSO 3/3 - Configurando Vercel..." -ForegroundColor Cyan

$vercelAvailable = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelAvailable) {
    Write-Host "AVISO: Vercel CLI nao instalado." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Configure manualmente em: vercel.com -> Projeto -> Settings -> Environment Variables"
    Write-Host ""
    Write-Host "Variaveis obrigatorias:"
    Write-Host "  META_APP_SECRET  (App Secret do Meta for Developers)"
    Write-Host "  CRON_SECRET      (qualquer string aleatoria longa)"
    Write-Host ""
    Write-Host "Para instalar o Vercel CLI: npm i -g vercel"
} else {
    $envVars = @{}
    Get-Content ".env" | Where-Object { $_ -match "^[A-Z_]+=" } | ForEach-Object {
        $parts = $_ -split "=", 2
        if ($parts.Count -eq 2) {
            $envVars[$parts[0].Trim()] = $parts[1].Trim()
        }
    }

    if ($envVars["META_APP_SECRET"]) {
        $envVars["META_APP_SECRET"] | vercel env add META_APP_SECRET production --force 2>$null
        Write-Host "OK - META_APP_SECRET configurado" -ForegroundColor Green
    } else {
        Write-Host "AVISO: META_APP_SECRET nao esta no .env - configure manualmente no Vercel" -ForegroundColor Yellow
    }

    if ($envVars["CRON_SECRET"]) {
        $envVars["CRON_SECRET"] | vercel env add CRON_SECRET production --force 2>$null
        Write-Host "OK - CRON_SECRET configurado" -ForegroundColor Green
    } else {
        $bytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $generated = [System.BitConverter]::ToString($bytes).Replace("-", "").ToLower()
        $generated | vercel env add CRON_SECRET production --force 2>$null
        Write-Host "OK - CRON_SECRET gerado: $($generated.Substring(0,12))..." -ForegroundColor Green
        Add-Content ".env" "CRON_SECRET=$generated"
    }
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "  Setup concluido com sucesso!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:"
Write-Host "  npm run dev        iniciar servidor local"
Write-Host "  npm run typecheck  verificar tipos TypeScript"
Write-Host ""
