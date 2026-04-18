/**
 * Seed do banco de dados — Sanas Pulse
 *
 * Cria:
 *  - Usuário demo (email: demo@sanaspulse.com)
 *  - 5 stages padrão de pipeline
 *  - AIConfig com configurações sensatas
 *  - WhatsApp config placeholder
 *  - 3 leads de exemplo com mensagens
 *
 * Execução:
 *   npx prisma db seed
 *   # ou diretamente:
 *   npx ts-node --project tsconfig.json prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Dados do usuário demo ────────────────────────────────────────────────────

const DEMO_USER = {
  id:    "seed_user_demo_001",
  email: "demo@sanaspulse.com",
  name:  "Demo Sanas Pulse",
};

// ─── Stages padrão de pipeline ───────────────────────────────────────────────
// Meta Ads: eventName mapeia para eventos de conversão do Pixel Facebook

const DEFAULT_STAGES = [
  {
    order:     1,
    name:      "Lead",
    eventName: "Lead",
    stagnationDaysThreshold: 3,
  },
  {
    order:     2,
    name:      "Qualificado",
    eventName: "QualifiedLead",
    stagnationDaysThreshold: 5,
  },
  {
    order:     3,
    name:      "Proposta Enviada",
    eventName: "InitiateCheckout",
    stagnationDaysThreshold: 7,
  },
  {
    order:     4,
    name:      "Negociação",
    eventName: "AddPaymentInfo",
    stagnationDaysThreshold: 5,
  },
  {
    order:     5,
    name:      "Fechado",
    eventName: "Purchase",
    stagnationDaysThreshold: null,
  },
];

// ─── AIConfig padrão ─────────────────────────────────────────────────────────

const DEFAULT_AI_CONFIG = {
  clinicName:         "Sanas Pulse",
  systemPrompt:       "Você é um assistente comercial profissional e amigável da {clinicName}. Responda de forma clara, objetiva e humanizada. Foque em entender a necessidade do lead e conduzir a conversa para um agendamento ou venda.",
  provider:           "openai",
  model:              "gpt-4o-mini",
  capabilities:       "text",
  sendAudio:          false,
  keepUnread:         true,
  singleMessage:      true,
  cancelOnNewMsg:     true,
  pauseAfterManual:   true,
  humanIntervention:  true,
  humanPauseHours:    2,
  waitBeforeReply:    7,
  delayPerChar:       120,
  delayMax:           10000,
  ignoreGroups:       true,
  followUpEnabled:    false,
  followUpMessages:   1,
  followUpCheckMins:  10,
  followUpIntervalH:  25,
  followUpUseAI:      true,
  followUpRespectBH:  false,
  audioVoice:         "alloy",
  audioMinChars:      50,
  audioAutoReply:     false,
  audioReplaceText:   false,
  whitelist:          [] as string[],
  blacklist:          [] as string[],
};

// ─── Leads de exemplo ─────────────────────────────────────────────────────────

const SAMPLE_LEADS = [
  {
    name:   "Maria Silva",
    phone:  "5511987000001",
    email:  "maria.silva@exemplo.com",
    source: "meta",
    medium: "cpc",
    score:  72,
    scoreLabel: "quente",
    tags:   ["instagram", "cpc"],
    messages: [
      { role: "user",      content: "Olá, gostaria de saber mais sobre os serviços de vocês!" },
      { role: "assistant", content: "Olá Maria! Seja bem-vinda! Fico feliz com seu interesse. O que você está procurando exatamente?" },
      { role: "user",      content: "Quero agendar uma consulta, como funciona?" },
    ],
  },
  {
    name:   "João Ferreira",
    phone:  "5511987000002",
    email:  "joao.ferreira@exemplo.com",
    source: "whatsapp",
    medium: "organic",
    score:  45,
    scoreLabel: "morno",
    tags:   ["indicacao"],
    messages: [
      { role: "user",      content: "Boa tarde! Me passaram o número de vocês, podem me ajudar?" },
      { role: "assistant", content: "Boa tarde, João! Claro, com prazer! Como posso te ajudar?" },
    ],
  },
  {
    name:   "Ana Costa",
    phone:  "5511987000003",
    email:  null,
    source: "google",
    medium: "cpc",
    score:  20,
    scoreLabel: "frio",
    tags:   ["google"],
    messages: [
      { role: "user", content: "Oi, qual o preço?" },
    ],
  },
];

// ─── Seed principal ───────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  // 1. Usuário demo
  const user = await prisma.user.upsert({
    where:  { email: DEMO_USER.email },
    update: { name: DEMO_USER.name },
    create: {
      id:    DEMO_USER.id,
      email: DEMO_USER.email,
      name:  DEMO_USER.name,
    },
  });
  console.log(`✅ Usuário: ${user.email} (${user.id})`);

  // 2. AIConfig
  const aiConfig = await prisma.aIConfig.upsert({
    where:  { userId: user.id },
    update: DEFAULT_AI_CONFIG,
    create: { ...DEFAULT_AI_CONFIG, userId: user.id },
  });
  console.log(`✅ AIConfig: provider=${aiConfig.provider}, model=${aiConfig.model}`);

  // 3. WhatsApp config placeholder
  await prisma.whatsAppConfig.upsert({
    where:  { userId: user.id },
    update: {},
    create: {
      userId:      user.id,
      provider:    "official",
      phoneNumberId: "",
      accessToken:   "",
      verifyToken:   "sanas_verify_token_change_me",
    },
  });
  console.log("✅ WhatsAppConfig: placeholder criado");

  // 4. Stages — deletar os existentes e recriar para evitar conflito de order
  const existingStages = await prisma.stage.findMany({ where: { userId: user.id } });
  if (existingStages.length === 0) {
    const stages = await prisma.stage.createMany({
      data: DEFAULT_STAGES.map((s) => ({ ...s, userId: user.id })),
    });
    console.log(`✅ Stages: ${stages.count} criados`);
  } else {
    console.log(`⏭️  Stages: já existem ${existingStages.length} stages, pulando`);
  }

  // Buscar stages para associar leads
  const stages = await prisma.stage.findMany({
    where:   { userId: user.id },
    orderBy: { order: "asc" },
  });

  // 5. Leads de exemplo
  for (const [i, leadData] of SAMPLE_LEADS.entries()) {
    const { messages, ...lead } = leadData;
    const stage = stages[Math.min(i, stages.length - 1)];

    const existingLead = await prisma.lead.findFirst({
      where: { userId: user.id, phone: lead.phone },
    });

    if (existingLead) {
      console.log(`⏭️  Lead "${lead.name}": já existe, pulando`);
      continue;
    }

    const createdLead = await prisma.lead.create({
      data: {
        ...lead,
        email: lead.email ?? undefined,
        userId:  user.id,
        stageId: stage?.id,
        lastInteractionAt: new Date(),
        messages: {
          create: messages.map((m) => ({
            role:    m.role,
            content: m.content,
          })),
        },
      },
    });
    console.log(`✅ Lead: ${createdLead.name} (${createdLead.phone}) → stage "${stage?.name}"`);
  }

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log(`\nAcesse com: demo@sanaspulse.com`);
}

main()
  .catch((err) => {
    console.error("❌ Seed falhou:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
