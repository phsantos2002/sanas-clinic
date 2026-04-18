/**
 * Setup global dos testes Vitest.
 * Executado antes de cada arquivo de teste.
 */

// Variáveis de ambiente mínimas para os testes
// NODE_ENV é somente-leitura nos tipos do Next.js — usar cast para definir em testes
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.LOG_LEVEL = "error"; // silencia logs durante testes
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.DIRECT_URL = "postgresql://test:test@localhost:5432/test";
process.env.CRON_SECRET = "test-cron-secret";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
