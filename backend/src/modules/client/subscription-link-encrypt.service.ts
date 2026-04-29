import { env } from "../../config/index.js";

const HAPP_API_URL = "https://crypto.happ.su/api-v2.php";
const HAPP_API_KEY = (env.HAPP_API_KEY ?? "").trim();
const CACHE_TTL_MS = 5 * 60 * 1000;

const linkCache = new Map<string, { value: string; ts: number }>();

function getCached(url: string): string | null {
  const cached = linkCache.get(url);
  if (!cached) return null;
  if (Date.now() - cached.ts > CACHE_TTL_MS) {
    linkCache.delete(url);
    return null;
  }
  return cached.value;
}

function setCached(url: string, value: string): void {
  linkCache.set(url, { value, ts: Date.now() });
}

function readEncryptedLink(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const fields = ["encrypted_link", "link", "crypto_link", "url"] as const;
  for (const f of fields) {
    const v = obj[f];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function normalizeEncryptedUrl(url: string): string {
  const trimmed = url.trim();
  if (/^happ:\/\/add\//i.test(trimmed)) {
    return trimmed.replace(/^happ:\/\/add\//i, "");
  }
  return trimmed;
}

export async function encryptSubscriptionLink(url: string): Promise<string> {
  const clean = url.trim();
  if (!clean) return url;
  const cached = getCached(clean);
  if (cached) return cached;

  try {
    const body: Record<string, unknown> = { url: clean };
    if (HAPP_API_KEY) body.key = HAPP_API_KEY;
    const res = await fetch(HAPP_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let encrypted: string | null = null;
    try {
      encrypted = readEncryptedLink(JSON.parse(text));
    } catch {
      if (typeof text === "string" && text.trim().length > 0) encrypted = text.trim();
    }
    if (encrypted) {
      encrypted = normalizeEncryptedUrl(encrypted);
      setCached(clean, encrypted);
      return encrypted;
    }
  } catch {
    // fallback below
  }
  return normalizeEncryptedUrl(clean);
}

async function encryptField(obj: Record<string, unknown>, key: "subscriptionUrl" | "subscription_url"): Promise<void> {
  const raw = obj[key];
  if (typeof raw !== "string" || raw.trim().length === 0) return;
  obj[key] = await encryptSubscriptionLink(raw);
}

/**
 * Rewrites Remna payload in-place (when possible) to hide origin domain in subscription URL.
 */
export async function obfuscateSubscriptionUrl(payload: unknown): Promise<unknown> {
  if (!payload || typeof payload !== "object") return payload;
  const obj = payload as Record<string, unknown>;

  await encryptField(obj, "subscriptionUrl");
  await encryptField(obj, "subscription_url");

  const response = obj.response;
  if (response && typeof response === "object") {
    const ro = response as Record<string, unknown>;
    await encryptField(ro, "subscriptionUrl");
    await encryptField(ro, "subscription_url");
  }

  const data = obj.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    await encryptField(d, "subscriptionUrl");
    await encryptField(d, "subscription_url");
    const dr = d.response;
    if (dr && typeof dr === "object") {
      const dro = dr as Record<string, unknown>;
      await encryptField(dro, "subscriptionUrl");
      await encryptField(dro, "subscription_url");
    }
  }

  return payload;
}
