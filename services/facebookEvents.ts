import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

type SendEventParams = {
  userId: string;
  phone: string;
  eventName: string;
};

function hashPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, "");
  return createHash("sha256").update(normalized).digest("hex");
}

export async function sendFacebookEvent({
  userId,
  phone,
  eventName,
}: SendEventParams): Promise<void> {
  try {
    const pixel = await prisma.pixel.findUnique({ where: { userId } });
    if (!pixel?.pixelId || !pixel?.accessToken) return;

    const hashedPhone = hashPhone(phone);
    const eventTime = Math.floor(Date.now() / 1000);

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: eventTime,
          user_data: {
            ph: [hashedPhone],
          },
        },
      ],
    };

    const url = `https://graph.facebook.com/v18.0/${pixel.pixelId}/events?access_token=${pixel.accessToken}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Facebook Events] Erro:", err);
    }
  } catch (err) {
    console.error("[Facebook Events] Falha ao enviar evento:", err);
  }
}
