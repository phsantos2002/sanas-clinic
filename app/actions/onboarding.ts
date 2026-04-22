"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { revalidatePath } from "next/cache";

const DEFAULT_SERVICES_BY_NICHE: Record<
  string,
  { name: string; duration: number; category?: string }[]
> = {
  clinica_estetica: [
    { name: "Botox", duration: 45, category: "Estetica" },
    { name: "Preenchimento", duration: 60, category: "Estetica" },
    { name: "Limpeza de Pele", duration: 60, category: "Estetica" },
    { name: "Harmonizacao Facial", duration: 90, category: "Estetica" },
  ],
  clinica_odontologica: [
    { name: "Avaliacao", duration: 30, category: "Odontologia" },
    { name: "Limpeza", duration: 45, category: "Odontologia" },
    { name: "Clareamento", duration: 60, category: "Odontologia" },
    { name: "Ortodontia (consulta)", duration: 45, category: "Odontologia" },
  ],
  saude: [
    { name: "Consulta", duration: 30, category: "Saude" },
    { name: "Retorno", duration: 20, category: "Saude" },
    { name: "Exame", duration: 30, category: "Saude" },
  ],
  academia: [
    { name: "Mensalidade", duration: 0, category: "Plano" },
    { name: "Personal (avulso)", duration: 60, category: "Personal" },
    { name: "Avaliacao Fisica", duration: 45, category: "Avaliacao" },
  ],
  restaurante: [
    { name: "Reserva de Mesa", duration: 90, category: "Reserva" },
    { name: "Evento Privado", duration: 180, category: "Evento" },
  ],
  imobiliaria: [
    { name: "Visita ao Imovel", duration: 60, category: "Visita" },
    { name: "Avaliacao de Imovel", duration: 45, category: "Avaliacao" },
  ],
  salao_beleza: [
    { name: "Corte", duration: 45, category: "Cabelo" },
    { name: "Coloracao", duration: 90, category: "Cabelo" },
    { name: "Escova", duration: 45, category: "Cabelo" },
    { name: "Manicure", duration: 45, category: "Unhas" },
  ],
  barbearia: [
    { name: "Corte", duration: 30, category: "Cabelo" },
    { name: "Barba", duration: 30, category: "Barba" },
    { name: "Corte + Barba", duration: 60, category: "Combo" },
  ],
  pet: [
    { name: "Banho e Tosa", duration: 90, category: "Estetica" },
    { name: "Consulta Veterinaria", duration: 30, category: "Saude" },
  ],
};

export async function isOnboardingComplete(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const config = await prisma.aIConfig.findUnique({
    where: { userId: user.id },
    select: { businessProfile: true },
  });

  if (!config?.businessProfile) return false;
  const profile = config.businessProfile as Record<string, string>;
  return !!(profile.name && profile.niche);
}

export async function saveOnboardingData(data: {
  businessName: string;
  niche: string;
  city?: string;
  services?: string;
  avgTicket?: string;
  targetAudience?: string;
  tone?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Nao autenticado" };

    const businessProfile = {
      name: data.businessName,
      niche: data.niche,
      city: data.city || "",
      services: data.services || "",
      avgTicket: data.avgTicket || "",
    };

    const brandIdentity = {
      business_type: data.niche,
      default_tone: data.tone || "profissional",
      target_audience: data.targetAudience || "",
    };

    await prisma.aIConfig.upsert({
      where: { userId: user.id },
      update: {
        clinicName: data.businessName,
        businessProfile: JSON.parse(JSON.stringify(businessProfile)),
        brandIdentity: JSON.parse(JSON.stringify(brandIdentity)),
      },
      create: {
        userId: user.id,
        clinicName: data.businessName,
        businessProfile: JSON.parse(JSON.stringify(businessProfile)),
        brandIdentity: JSON.parse(JSON.stringify(brandIdentity)),
      },
    });

    // Create default pipeline stages if none exist
    const stageCount = await prisma.stage.count({ where: { userId: user.id } });
    if (stageCount === 0) {
      const defaults = [
        { name: "Novo Lead", order: 1, eventName: "Lead" },
        { name: "Atendido", order: 2, eventName: "Contact" },
        { name: "Qualificado", order: 3, eventName: "QualifiedLead" },
        { name: "Agendado", order: 4, eventName: "Schedule" },
        { name: "Cliente", order: 5, eventName: "Purchase" },
      ];
      for (const stage of defaults) {
        await prisma.stage.create({ data: { ...stage, userId: user.id } }).catch(() => {
          // Ignore unique constraint - stage already exists
        });
      }
    }

    // Create default services by niche if user has none yet
    const serviceCount = await prisma.service.count({ where: { userId: user.id } });
    const defaultServices = DEFAULT_SERVICES_BY_NICHE[data.niche];
    if (serviceCount === 0 && defaultServices) {
      await prisma.service.createMany({
        data: defaultServices.map((s) => ({
          userId: user.id,
          name: s.name,
          duration: s.duration,
          category: s.category ?? null,
        })),
        skipDuplicates: true,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/onboarding");
    revalidatePath("/dashboard/pipeline");
    return { success: true };
  } catch (err) {
    console.error("[saveOnboardingData]", err);
    return { success: false, error: "Erro ao salvar dados" };
  }
}

// ── Setup Progress (7.2) ────────────────────────────────────

export async function getSetupProgress() {
  const user = await getCurrentUser();
  if (!user) return [];

  const [waConfig, pixel, aiConfig, templates, workflows] = await Promise.all([
    prisma.whatsAppConfig.findUnique({ where: { userId: user.id } }),
    prisma.pixel.findUnique({ where: { userId: user.id } }),
    prisma.aIConfig.findUnique({ where: { userId: user.id } }),
    prisma.messageTemplate.count({ where: { userId: user.id } }),
    prisma.workflow.count({ where: { userId: user.id, isActive: true } }),
  ]);

  const brand = aiConfig?.brandIdentity as Record<string, string> | null;
  const profile = aiConfig?.businessProfile as Record<string, string> | null;

  return [
    {
      id: "whatsapp",
      label: "WhatsApp conectado",
      completed: !!(waConfig?.uazapiInstanceToken || waConfig?.accessToken),
      weight: 20,
      href: "/dashboard/settings/integrations",
    },
    {
      id: "pixel",
      label: "Meta Pixel configurado",
      completed: !!pixel?.pixelId,
      weight: 15,
      href: "/dashboard/settings/integrations",
    },
    {
      id: "meta_ads",
      label: "Meta Ads conta vinculada",
      completed: !!pixel?.metaAdsToken,
      weight: 15,
      href: "/dashboard/settings/integrations",
    },
    {
      id: "brand",
      label: "Tom de voz configurado",
      completed: !!brand?.default_tone,
      weight: 15,
      href: "/dashboard/settings",
    },
    {
      id: "profile",
      label: "Perfil de negocio preenchido",
      completed: !!(profile?.name && profile?.niche),
      weight: 10,
      href: "/dashboard/settings",
    },
    {
      id: "templates",
      label: "Pelo menos 1 template criado",
      completed: templates > 0,
      weight: 10,
      href: "/dashboard/chat/templates",
    },
    {
      id: "automations",
      label: "Pelo menos 1 automacao ativa",
      completed: workflows > 0,
      weight: 10,
      href: "/dashboard/workflows",
    },
    {
      id: "prompt",
      label: "Prompt do assistente personalizado",
      completed: !!aiConfig?.systemPrompt,
      weight: 5,
      href: "/dashboard/settings/integrations",
    },
  ];
}

// ── Checklist Progress (7.5) ────────────────────────────────

export async function getChecklistProgress() {
  const user = await getCurrentUser();
  if (!user) return [];

  const [waConfig, leadCount, aiConfig] = await Promise.all([
    prisma.whatsAppConfig.findUnique({ where: { userId: user.id } }),
    prisma.lead.count({ where: { userId: user.id } }),
    prisma.aIConfig.findUnique({ where: { userId: user.id } }),
  ]);

  return [
    {
      id: "connect_wa",
      label: "Conecte seu WhatsApp",
      description: "Vincule seu numero para receber leads",
      completed: !!waConfig?.uazapiInstanceToken,
      href: "/dashboard/settings/integrations",
    },
    {
      id: "first_lead",
      label: "Crie seu primeiro lead",
      description: "Adicione um contato manualmente",
      completed: leadCount > 0,
      href: "/dashboard/pipeline",
    },
    {
      id: "configure_ai",
      label: "Configure a IA do WhatsApp",
      description: "Adicione a chave OpenAI e o tom de voz",
      completed: !!aiConfig?.apiKey,
      href: "/dashboard/settings/ai",
    },
  ];
}
