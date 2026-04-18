/**
 * lib/schemas/webhook.ts — Zod schemas for incoming webhook payloads.
 *
 * Benefits:
 * - Replaces `payload: any` with validated, typed data
 * - Runtime validation catches malformed payloads early (returns 200 safely)
 * - Type inference eliminates all downstream `as any` casts for these payloads
 */

import { z } from "zod";

// ── Meta WhatsApp Cloud API ────────────────────────────────────────────────────

const MetaAdsContextSchema = z.object({
  ad_title: z.string().optional(),
  adset_id: z.string().optional(),
  campaign_id: z.string().optional(),
});

const MetaReferralSchema = z.object({
  source_url: z.string().optional(),
  source_type: z.string().optional(),
  source_id: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().optional(),
  ad_id: z.string().optional(),
  ads_context_metadata: MetaAdsContextSchema.optional(),
});

const MetaMessageSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  referral: MetaReferralSchema.optional(),
});

const MetaContactSchema = z.object({
  profile: z.object({ name: z.string() }),
  wa_id: z.string(),
});

const MetaValueSchema = z.object({
  messaging_product: z.string(),
  metadata: z.object({
    display_phone_number: z.string(),
    phone_number_id: z.string(),
  }),
  contacts: z.array(MetaContactSchema).optional(),
  messages: z.array(MetaMessageSchema).optional(),
  statuses: z.array(z.unknown()).optional(),
});

const MetaChangeSchema = z.object({
  value: MetaValueSchema,
  field: z.string(),
});

const MetaEntrySchema = z.object({
  id: z.string(),
  changes: z.array(MetaChangeSchema),
});

export const MetaWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(MetaEntrySchema),
});

export type MetaWebhookPayload = z.infer<typeof MetaWebhookPayloadSchema>;
export type MetaMessage = z.infer<typeof MetaMessageSchema>;
export type MetaReferral = z.infer<typeof MetaReferralSchema>;

// ── Uazapi Webhook ─────────────────────────────────────────────────────────────

/** New Uazapi format: EventType + message + chat objects */
const UazapiMessageNewSchema = z.object({
  content: z.string().optional(),
  text: z.string().optional(),
  fromMe: z.boolean().optional(),
  chatId: z.string().optional(),
  messageTimestamp: z.number().optional(),
  messageType: z.string().optional(),
  sender: z.string().optional(),
  senderName: z.string().optional(),
  wasSentByApi: z.boolean().optional(),
  isGroup: z.boolean().optional(),
  id: z.string().optional(),
  messageId: z.string().optional(),
});

const UazapiChatSchema = z.object({
  wa_chatid: z.string().optional(),
  wa_contactName: z.string().optional(),
  wa_isGroup: z.boolean().optional(),
});

export const UazapiPayloadNewSchema = z.object({
  EventType: z.string().optional(),
  message: UazapiMessageNewSchema,
  chat: UazapiChatSchema,
  instanceName: z.string().optional(),
  token: z.string().optional(),
  BaseUrl: z.string().optional(),
});

/** Old Uazapi format: flat structure */
export const UazapiPayloadOldSchema = z.object({
  body: z.string(),
  chatid: z.string(),
  fromMe: z.boolean().optional(),
  senderName: z.string().optional(),
  instancetoken: z.string().optional(),
  token: z.string().optional(),
  id: z.string().optional(),
});

/** Union: try new format first, fall back to old */
export const UazapiPayloadSchema = z.union([
  UazapiPayloadNewSchema,
  UazapiPayloadOldSchema,
  z.record(z.string(), z.unknown()), // accept anything else gracefully (pass-through)
]);

export type UazapiPayloadNew = z.infer<typeof UazapiPayloadNewSchema>;
export type UazapiPayloadOld = z.infer<typeof UazapiPayloadOldSchema>;
