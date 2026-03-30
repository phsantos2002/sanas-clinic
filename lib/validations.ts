import { z } from "zod";

// ── Lead ─────────────────────────────────────────────────────

export const createLeadSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").max(200),
  phone: z.string().min(10, "Telefone invalido").max(20),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  stageId: z.string().optional(),
});

export const updateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.string().email().nullable().optional(),
  cpf: z.string().max(14).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  stageId: z.string().nullable().optional(),
  aiEnabled: z.boolean().optional(),
});

// ── Social Post ──────────────────────────────────────────────

export const createSocialPostSchema = z.object({
  title: z.string().max(200).optional(),
  caption: z.string().max(5000).optional(),
  hashtags: z.array(z.string().max(100)).max(50).optional(),
  mediaUrls: z.array(z.string().url()).max(20).optional(),
  mediaType: z.enum(["image", "video", "carousel", "reels", "story"]).optional(),
  platforms: z.array(z.string()).max(10).optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(["draft", "scheduled"]).optional(),
  aiGenerated: z.boolean().optional(),
  aiCostEstimate: z.number().optional(),
});

// ── Messages ─────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  leadId: z.string().min(1),
  content: z.string().min(1, "Mensagem obrigatoria").max(10000),
});

// ── Brand Identity ───────────────────────────────────────────

export const brandIdentitySchema = z.object({
  logo_url: z.string().url().optional().or(z.literal("")),
  primary_color: z.string().max(20).optional(),
  secondary_color: z.string().max(20).optional(),
  font: z.string().max(50).optional(),
  business_type: z.string().max(50).optional(),
  default_tone: z.string().max(50).optional(),
  target_audience: z.string().max(1000).optional(),
});

// ── Pagination ───────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(200).default(50),
});

// ── Helpers ──────────────────────────────────────────────────

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
