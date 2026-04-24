import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/avatar/[phone]
 *
 * Proxies a WhatsApp contact/group avatar through our domain so the browser
 * can cache it durably (immutable-style Cache-Control) and so we stop
 * depending on Meta's short-lived signed URLs (`?oe=...` expires in ~1h,
 * then every <img> retry 403s).
 *
 * Lookup path:
 *   1. Check our WhatsAppAvatarCache for a known URL.
 *   2. If no URL, ask Uazapi /chat/details for one.
 *   3. Fetch the bytes from Meta, return them with long Cache-Control.
 *   4. On 403/404 (URL expired) we refresh once from Uazapi and retry.
 *
 * Response is always an image (or a 1x1 transparent fallback on miss) so
 * <img> can render without JS-side coordination — the front uses this route
 * directly as `src`, and the browser takes care of caching and retries.
 */

const TRANSPARENT_PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

function transparentResponse() {
  return new Response(TRANSPARENT_PX, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      // Short cache on miss so we retry from upstream relatively soon.
      "Cache-Control": "public, max-age=600",
    },
  });
}

function imageResponse(bytes: ArrayBuffer, contentType: string) {
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType || "image/jpeg",
      // 1 day browser cache: avatars rarely change, and the hash of the
      // signed URL gets bumped by WhatsApp when they do.
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

async function fetchMeta(url: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0) return null;
    return { bytes, type };
  } catch {
    return null;
  }
}

async function uazapiProfilePic(
  serverUrl: string,
  token: string,
  phone: string
): Promise<{ imagePreview: string; image: string }> {
  try {
    const res = await fetch(`${serverUrl}/chat/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ number: phone, preview: true }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { imagePreview: "", image: "" };
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      imagePreview: (data.imagePreview as string) || "",
      image: (data.image as string) || "",
    };
  } catch {
    return { imagePreview: "", image: "" };
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ phone: string }> }) {
  const { phone: rawPhone } = await ctx.params;
  const phone = rawPhone.replace(/\D/g, "").slice(0, 20);
  if (!phone) return transparentResponse();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return transparentResponse();

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  if (!dbUser) return transparentResponse();

  const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
  if (!config?.uazapiServerUrl || !config?.uazapiInstanceToken) return transparentResponse();
  const serverUrl = config.uazapiServerUrl.replace(/\/+$/, "");
  const token = config.uazapiInstanceToken.trim();

  // 1) Grab whatever URL we already know for this phone.
  const cached = await prisma.whatsAppAvatarCache.findUnique({
    where: { userId_phone: { userId: dbUser.id, phone } },
  });
  let url = cached?.imagePreview || cached?.image || "";

  // 2) If the URL is missing or expired, refresh it from Uazapi.
  let bytes: ArrayBuffer | null = null;
  let contentType = "image/jpeg";

  if (url) {
    const attempt = await fetchMeta(url);
    if (attempt) {
      bytes = attempt.bytes;
      contentType = attempt.type;
    }
  }

  if (!bytes) {
    const fresh = await uazapiProfilePic(serverUrl, token, phone);
    url = fresh.imagePreview || fresh.image;
    if (url) {
      const attempt = await fetchMeta(url);
      if (attempt) {
        bytes = attempt.bytes;
        contentType = attempt.type;
      }
    }
    // Always persist the latest known URL (even empty) so subsequent requests
    // skip the Uazapi roundtrip for 6h-7d via the existing TTL policy.
    await prisma.whatsAppAvatarCache
      .upsert({
        where: { userId_phone: { userId: dbUser.id, phone } },
        create: {
          userId: dbUser.id,
          phone,
          imagePreview: fresh.imagePreview,
          image: fresh.image,
        },
        update: {
          imagePreview: fresh.imagePreview,
          image: fresh.image,
          fetchedAt: new Date(),
        },
      })
      .catch(() => {});
  }

  if (!bytes) return transparentResponse();
  return imageResponse(bytes, contentType);
}
