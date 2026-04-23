import { z } from "zod";

/**
 * Zod schemas for Uazapi webhook payloads.
 *
 * Uazapi has TWO payload formats in production:
 *  1. New format (preferred): { EventType, message: {...}, chat: {...}, token, instanceName }
 *  2. Legacy flat format: { body, chatid, fromMe, instancetoken, ... }
 *
 * Both are validated leniently — unknown fields are allowed (passthrough)
 * because Uazapi adds new fields without notice.
 */

const messageObjectSchema = z
  .object({
    id: z.string().optional(),
    messageId: z.string().optional(),
    // `content` can be a string (plain text) OR an object (media: image/audio/video/location/contact/etc).
    // `text` has similar polymorphism across Uazapi message types. Accept anything and coerce downstream.
    content: z.unknown().optional(),
    text: z.unknown().optional(),
    fromMe: z.boolean().optional(),
    chatId: z.string().optional(),
    messageTimestamp: z.number().optional(),
    messageType: z.string().optional(),
    sender: z.string().optional(),
    senderName: z.string().optional(),
    isGroup: z.boolean().optional(),
    wasSentByApi: z.boolean().optional(),
  })
  .passthrough();

const chatObjectSchema = z
  .object({
    wa_chatid: z.string().optional(),
    wa_contactName: z.string().optional(),
    wa_isGroup: z.boolean().optional(),
  })
  .passthrough();

export const uazapiNewPayloadSchema = z
  .object({
    EventType: z.string().optional(),
    BaseUrl: z.string().optional(),
    instanceName: z.string().optional(),
    token: z.string().optional(),
    message: messageObjectSchema,
    chat: chatObjectSchema.optional(),
  })
  .passthrough();

export const uazapiLegacyPayloadSchema = z
  .object({
    body: z.string().optional(),
    chatid: z.string().optional(),
    fromMe: z.boolean().optional(),
    instancetoken: z.string().optional(),
    token: z.string().optional(),
    senderName: z.string().optional(),
    id: z.string().optional(),
  })
  .passthrough();

export const uazapiPayloadSchema = z.union([uazapiNewPayloadSchema, uazapiLegacyPayloadSchema]);

export type UazapiPayload = z.infer<typeof uazapiPayloadSchema>;
export type UazapiNewPayload = z.infer<typeof uazapiNewPayloadSchema>;
export type UazapiLegacyPayload = z.infer<typeof uazapiLegacyPayloadSchema>;

/**
 * Type guard: was this parsed as the new (message+chat) format?
 */
export function isNewFormat(p: UazapiPayload): p is UazapiNewPayload {
  return typeof p === "object" && p !== null && "message" in p && !!p.message;
}
