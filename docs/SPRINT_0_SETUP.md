# Sprint 0 — Ativação da Infraestrutura

## O que foi feito (já está no projeto)

| Arquivo                            | Descrição                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `lib/logger.ts`                    | Logger estruturado (JSON em prod, colorido em dev). Sem dependências externas.      |
| `lib/errors.ts`                    | Hierarquia de erros tipados (`ValidationError`, `AuthError`, `NotFoundError`, etc.) |
| `lib/apiHandler.ts`                | Wrapper para rotas API com try/catch, logging e status correto automático           |
| `prisma/seed.ts`                   | Seed com usuário demo, 5 stages padrão, AIConfig, leads de exemplo                  |
| `vitest.config.ts`                 | Configuração do Vitest com coverage V8                                              |
| `vitest.setup.ts`                  | Setup de variáveis de ambiente para testes                                          |
| `tsconfig.test.json`               | tsconfig separado para os arquivos de teste                                         |
| `__tests__/lib/errors.test.ts`     | 30+ testes unitários para lib/errors                                                |
| `__tests__/lib/logger.test.ts`     | Testes do logger estruturado                                                        |
| `__tests__/lib/apiHandler.test.ts` | Testes da lógica de classificação de erros                                          |
| `__tests__/lib/rateLimit.test.ts`  | Testes do rate limiter                                                              |
| `.github/workflows/ci.yml`         | Pipeline CI: typecheck → lint → test → build                                        |
| `.husky/pre-commit`                | Hook: typecheck + lint-staged antes de cada commit                                  |
| `.husky/commit-msg`                | Valida Conventional Commits                                                         |
| `.lintstagedrc.json`               | Lint + prettier só nos arquivos staged                                              |
| `.prettierrc.json`                 | Configuração do Prettier                                                            |
| `eslint.config.mjs`                | ESLint com Next.js + regras customizadas                                            |

## Passos para ativar (rodar no terminal do projeto)

### 1. Instalar as novas dependências de dev

```bash
npm install --save-dev \
  vitest \
  @vitejs/plugin-react \
  @vitest/coverage-v8 \
  @vitest/ui \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
  husky \
  lint-staged \
  prettier \
  @eslint/eslintrc
```

### 2. Instalar `nanoid` como dependência de produção (usada em apiHandler)

```bash
npm install nanoid
```

> Nota: `nanoid` já estava listada como dependência no `package.json`. Verificar se está no `node_modules`.

### 3. Ativar o Husky

```bash
npx husky install
chmod +x .husky/pre-commit .husky/commit-msg
```

### 4. Rodar o seed (opcional — banco de dev/staging)

```bash
npx prisma db seed
```

## Comandos disponíveis após instalação

```bash
# Verificar TypeScript (funciona hoje)
npm run typecheck

# Rodar testes
npm test

# Testes com cobertura
npm run test:coverage

# Watch mode
npm run test:watch

# UI visual dos testes
npm run test:ui

# Lint
npm run lint

# Formatar código
npm run format

# Seed do banco
npm run db:seed

# Prisma Studio (GUI do banco)
npm run db:studio
```

## Cobertura mínima configurada

| Métrica    | Threshold atual | Meta Sprint 5+ |
| ---------- | --------------- | -------------- |
| Lines      | 40%             | 60%            |
| Functions  | 40%             | 60%            |
| Branches   | 30%             | 50%            |
| Statements | 40%             | 60%            |

## Conventional Commits (obrigatório após ativar Husky)

```
feat: adicionar scoring no kanban
fix(webhook): prevenir mensagens duplicadas
chore(deps): atualizar prisma para 5.23
refactor(analytics): usar count ao invés de findMany
test: adicionar testes para workflowEngine
docs: atualizar README com novos comandos
```
