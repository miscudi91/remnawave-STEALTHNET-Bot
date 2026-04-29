/**
 * РЎРµСЂРІРёСЃ РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹С… РїРѕРґРїРёСЃРѕРє Рё РїРѕРґР°СЂРєРѕРІ (v2).
 *
 * Р‘РёР·РЅРµСЃ-Р»РѕРіРёРєР°:
 * 1. РџРѕРєСѓРїРєР° РґРѕРї. РїРѕРґРїРёСЃРєРё в†’ СЃРѕР·РґР°С‘С‚СЃСЏ SecondarySubscription + Remnawave-РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ СЃ СЃСѓС„С„РёРєСЃРѕРј _1, _2, ...
 * 2. РђРєС‚РёРІРёСЂРѕРІР°С‚СЊ СЃРµР±Рµ в†’ СЃРЅСЏС‚СЊ GIFT_RESERVED, РїРѕРґРїРёСЃРєР° РїРѕСЏРІР»СЏРµС‚СЃСЏ РЅР° РґР°С€Р±РѕСЂРґРµ РІР»Р°РґРµР»СЊС†Р°
 * 3. РџРѕРґР°СЂРёС‚СЊ в†’ РіРµРЅРµСЂРёСЂСѓРµС‚СЃСЏ 12-СЃРёРјРІРѕР»СЊРЅС‹Р№ РєРѕРґ XXXX-XXXX-XXXX, РїРѕРґРїРёСЃРєР° СЃРєСЂС‹РІР°РµС‚СЃСЏ (giftStatus = GIFT_RESERVED)
 * 4. РђРєС‚РёРІРёСЂРѕРІР°С‚СЊ РїРѕРґР°СЂРѕРє в†’ РїРѕРґРїРёСЃРєР° РїРµСЂРµРЅРѕСЃРёС‚СЃСЏ РЅР° РїРѕР»СѓС‡Р°С‚РµР»СЏ (ownerId в†’ recipient, giftedToClientId в†’ recipient)
 * 5. РћС‚РјРµРЅР° / СЌРєСЃРїРёСЂР°С†РёСЏ в†’ РїРѕРґРїРёСЃРєР° РІРѕР·РІСЂР°С‰Р°РµС‚СЃСЏ РґР°СЂРёС‚РµР»СЋ (giftStatus = null)
 * 6. РЈРґР°Р»РµРЅРёРµ РїРѕРґРїРёСЃРєРё в†’ remnaDeleteUser + hard delete SecondarySubscription
 *
 * Р’СЃРµ РјСѓС‚Р°С†РёРё Р»РѕРіРёСЂСѓСЋС‚СЃСЏ РІ GiftHistory.
 */

import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import { sendTelegramNotification } from "./telegram-notify.js";
import {
  remnaCreateUser,
  remnaUsernameFromClient,
  extractRemnaUuid,
  isRemnaConfigured,
  remnaDeleteUser,
  remnaGetUser,
  remnaUpdateUser,
} from "../remna/remna.client.js";
import { getSystemConfig } from "../client/client.service.js";

// в”Ђв”Ђв”Ђ Types в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

export type GiftResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

export type SecondarySubscriptionData = {
  id: string;
  ownerId: string;
  remnawaveUuid: string | null;
  subscriptionIndex: number;
  tariffId: string | null;
  giftStatus: string | null;
  giftedToClientId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// в”Ђв”Ђв”Ђ Helpers в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

/** Р“РµРЅРµСЂРёСЂСѓРµС‚ 12-СЃРёРјРІРѕР»СЊРЅС‹Р№ СѓРЅРёРєР°Р»СЊРЅС‹Р№ РєРѕРґ РІ С„РѕСЂРјР°С‚Рµ XXXX-XXXX-XXXX. */
function generateGiftCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Р±РµР· I/O/0/1 РґР»СЏ С‡РёС‚Р°РµРјРѕСЃС‚Рё
  let code = "";
  const bytes = randomBytes(12);
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

/** РќРѕСЂРјР°Р»РёР·СѓРµС‚ РІРІРѕРґ РєРѕРґР°: СѓР±РёСЂР°РµС‚ РїСЂРѕР±РµР»С‹/РґРµС„РёСЃС‹, РїСЂРёРІРѕРґРёС‚ Рє uppercase. */
function normalizeCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

/** РћРїСЂРµРґРµР»СЏРµС‚ СЃР»РµРґСѓСЋС‰РёР№ subscriptionIndex РґР»СЏ РґР°РЅРЅРѕРіРѕ РєР»РёРµРЅС‚Р°. */
async function getNextSubscriptionIndex(ownerId: string): Promise<number> {
  const last = await prisma.secondarySubscription.findFirst({
    where: { ownerId },
    orderBy: { subscriptionIndex: "desc" },
    select: { subscriptionIndex: true },
  });
  return (last?.subscriptionIndex ?? 0) + 1;
}

/** Р“РµРЅРµСЂРёСЂСѓРµС‚ Remnawave username РґР»СЏ РґРѕС‡РµСЂРЅРµР№ РїРѕРґРїРёСЃРєРё: {rootUsername}_{index}. */
function secondaryRemnaUsername(
  rootClient: { telegramUsername?: string | null; telegramId?: string | null; email?: string | null; id: string },
  index: number,
): string {
  const base = remnaUsernameFromClient({
    telegramUsername: rootClient.telegramUsername,
    telegramId: rootClient.telegramId,
    email: rootClient.email,
    clientIdFallback: rootClient.id,
  });
  const suffix = `_${index}`;
  return (base + suffix).slice(0, 36);
}

/** Р—Р°РїРёСЃР°С‚СЊ СЃРѕР±С‹С‚РёРµ РІ GiftHistory. */
async function logGiftEvent(
  clientId: string,
  eventType: string,
  secondarySubscriptionId?: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.giftHistory.create({
    data: {
      clientId,
      secondarySubscriptionId: secondarySubscriptionId ?? null,
      eventType,
      metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
    },
  });
}

function getFutureExpireAtFromRemna(data: unknown): Date | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const resp = (root.response ?? root.data ?? root) as Record<string, unknown>;
  const raw = resp?.expireAt;
  if (typeof raw !== "string") return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.getTime() > Date.now() ? d : null;
}

// в”Ђв”Ђв”Ђ Core Functions в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

/**
 * РЎРѕР·РґР°С‘С‚ РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅСѓСЋ РїРѕРґРїРёСЃРєСѓ (SecondarySubscription + Remnawave user).
 * Р’С‹Р·С‹РІР°РµС‚СЃСЏ РџРћРЎР›Р• СѓСЃРїРµС€РЅРѕР№ РѕРїР»Р°С‚С‹ С‚Р°СЂРёС„Р° (РёР· webhook / РѕРїР»Р°С‚Р° Р±Р°Р»Р°РЅСЃРѕРј).
 */
export async function createAdditionalSubscription(
  rootClientId: string,
  tariff: {
    id?: string;
    name?: string;
    price?: number;
    durationDays: number;
    trafficLimitBytes: bigint | null;
    deviceLimit: number | null;
    internalSquadUuids: string[];
    trafficResetMode?: string;
  },
): Promise<GiftResult<{ secondarySubscriptionId: string; subscriptionIndex: number }>> {
  if (!isRemnaConfigured()) {
    return { ok: false, error: "РЎРµСЂРІРёСЃ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРµРЅ", status: 503 };
  }

  const config = await getSystemConfig();
  if (!config.giftSubscriptionsEnabled) {
    return { ok: false, error: "Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Рµ РїРѕРґРїРёСЃРєРё РѕС‚РєР»СЋС‡РµРЅС‹", status: 403 };
  }

  const rootClient = await prisma.client.findUnique({
    where: { id: rootClientId },
    select: {
      id: true,
      email: true,
      telegramId: true,
      telegramUsername: true,
    },
  });
  if (!rootClient) {
    return { ok: false, error: "РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ", status: 404 };
  }

  // РџСЂРѕРІРµСЂСЏРµРј Р»РёРјРёС‚
  const existingCount = await prisma.secondarySubscription.count({
    where: { ownerId: rootClientId },
  });
  if (existingCount >= config.maxAdditionalSubscriptions) {
    return {
      ok: false,
      error: `РњР°РєСЃРёРјСѓРј ${config.maxAdditionalSubscriptions} РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹С… РїРѕРґРїРёСЃРѕРє`,
      status: 400,
    };
  }

  let index = await getNextSubscriptionIndex(rootClientId);

  // РЎРѕР·РґР°С‘Рј РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РІ Remnawave
  const trafficLimitBytes = tariff.trafficLimitBytes != null ? Number(tariff.trafficLimitBytes) : 0;
  const expireAt = new Date(Date.now() + tariff.durationDays * 24 * 60 * 60 * 1000).toISOString();

  const trafficResetMode = tariff.trafficResetMode || "no_reset";
  const trafficLimitStrategy =
    trafficResetMode === "monthly" ? "MONTH" : trafficResetMode === "monthly_rolling" ? "MONTH_ROLLING" : "NO_RESET";

  // Retry СЃ РёРЅРєСЂРµРјРµРЅС‚РѕРј РёРЅРґРµРєСЃР° вЂ” РµСЃР»Рё username СѓР¶Рµ Р·Р°РЅСЏС‚ РІ Remnawave
  const MAX_ATTEMPTS = 5;
  let remnaUuid: string | undefined;
  let username = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    username = secondaryRemnaUsername(rootClient, index);

    const createRes = await remnaCreateUser({
      username,
      trafficLimitBytes,
      trafficLimitStrategy,
      expireAt,
      hwidDeviceLimit: tariff.deviceLimit ?? undefined,
      activeInternalSquads: tariff.internalSquadUuids,
    });

    remnaUuid = extractRemnaUuid(createRes.data) ?? undefined;
    if (remnaUuid) break;

    const isUsernameTaken =
      createRes.status === 400 &&
      typeof createRes.error === "string" &&
      createRes.error.toLowerCase().includes("already exists");

    if (isUsernameTaken) {
      console.warn(`[gift] Username "${username}" already exists in Remnawave, retrying with index ${index + 1}`);
      index++;
      continue;
    }

    console.error("[gift] Remna createUser failed for secondary:", createRes.error, createRes.status);
    return { ok: false, error: "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ VPN-РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ", status: 502 };
  }

  if (!remnaUuid) {
    console.error(`[gift] Failed to create Remnawave user after ${MAX_ATTEMPTS} attempts for root ${rootClientId}`);
    return { ok: false, error: "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ VPN-РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ (РІСЃРµ РёРјРµРЅР° Р·Р°РЅСЏС‚С‹)", status: 502 };
  }

  // РЎРѕР·РґР°С‘Рј Р·Р°РїРёСЃСЊ SecondarySubscription
  const subscription = await prisma.secondarySubscription.create({
    data: {
      ownerId: rootClientId,
      subscriptionIndex: index,
      remnawaveUuid: remnaUuid,
      tariffId: tariff.id ?? null,
    },
  });

  // Р›РѕРіРёСЂСѓРµРј
  await logGiftEvent(rootClientId, "PURCHASED", subscription.id, {
    tariffName: tariff.name ?? null,
    price: tariff.price ?? null,
    subscriptionIndex: index,
  });

  return {
    ok: true,
    data: { secondarySubscriptionId: subscription.id, subscriptionIndex: index },
  };
}

/**
 * РђРєС‚РёРІРёСЂСѓРµС‚ РїРѕРґРїРёСЃРєСѓ РЅР° СЃРµР±СЏ: СЃРЅРёРјР°РµС‚ GIFT_RESERVED, РїРѕРґРїРёСЃРєР° РїРѕСЏРІР»СЏРµС‚СЃСЏ РЅР° РґР°С€Р±РѕСЂРґРµ.
 * Р”Р»СЏ РїРѕРґРїРёСЃРєРё, РєРѕС‚РѕСЂСѓСЋ РєР»РёРµРЅС‚ РєСѓРїРёР» Рё РµС‰С‘ РЅРµ РїРѕРґР°СЂРёР» вЂ” РїСЂРѕСЃС‚Рѕ В«РѕСЃС‚Р°РІРёС‚СЊ СЃРµР±РµВ».
 */
export async function activateForSelf(
  ownerId: string,
  subscriptionId: string,
): Promise<GiftResult<{ subscriptionId: string }>> {
  const sub = await prisma.secondarySubscription.findUnique({
    where: { id: subscriptionId },
    include: { tariff: { select: { name: true } } },
  });

  if (!sub || sub.ownerId !== ownerId) {
    return { ok: false, error: "РџРѕРґРїРёСЃРєР° РЅРµ РЅР°Р№РґРµРЅР°", status: 404 };
  }

  if (sub.giftStatus === "ACTIVATED_SELF") {
    // РЈР¶Рµ Р°РєС‚РёРІРЅР° РЅР° СЃРµР±СЏ
    return { ok: true, data: { subscriptionId } };
  }

  if (sub.giftStatus === "GIFTED") {
    return { ok: false, error: "РџРѕРґРїРёСЃРєР° СѓР¶Рµ РїРѕРґР°СЂРµРЅР°", status: 400 };
  }

  // Р•СЃР»Рё РµСЃС‚СЊ Р°РєС‚РёРІРЅС‹Р№ РєРѕРґ вЂ” РѕС‚РјРµРЅСЏРµРј РµРіРѕ
  if (sub.giftStatus === "GIFT_RESERVED") {
    await prisma.giftCode.updateMany({
      where: { secondarySubscriptionId: subscriptionId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
  }

  await prisma.secondarySubscription.update({
    where: { id: subscriptionId },
    data: { giftStatus: "ACTIVATED_SELF" },
  });

  await logGiftEvent(ownerId, "ACTIVATED_SELF", subscriptionId, {
    tariffName: sub.tariff?.name ?? null,
  });

  return { ok: true, data: { subscriptionId } };
}

/**
 * РЈРґР°Р»РёС‚СЊ РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅСѓСЋ РїРѕРґРїРёСЃРєСѓ: РѕС‚РјРµРЅРёС‚СЊ РєРѕРґС‹ + remnaDeleteUser + hard delete.
 */
export async function deleteSubscription(
  ownerId: string,
  subscriptionId: string,
): Promise<GiftResult> {
  const sub = await prisma.secondarySubscription.findUnique({
    where: { id: subscriptionId },
    include: { tariff: { select: { name: true } } },
  });

  if (!sub || sub.ownerId !== ownerId) {
    return { ok: false, error: "РџРѕРґРїРёСЃРєР° РЅРµ РЅР°Р№РґРµРЅР°", status: 404 };
  }

  // РќРµР»СЊР·СЏ СѓРґР°Р»РёС‚СЊ РїРѕРґР°СЂС‘РЅРЅСѓСЋ РїРѕРґРїРёСЃРєСѓ (РѕРЅР° СѓР¶Рµ Сѓ РїРѕР»СѓС‡Р°С‚РµР»СЏ)
  if (sub.giftStatus === "GIFTED" && sub.giftedToClientId) {
    return { ok: false, error: "РќРµР»СЊР·СЏ СѓРґР°Р»РёС‚СЊ РїРѕРґР°СЂС‘РЅРЅСѓСЋ РїРѕРґРїРёСЃРєСѓ", status: 400 };
  }

  // РќРµР»СЊР·СЏ СѓРґР°Р»РёС‚СЊ Р°РєС‚РёРІРёСЂРѕРІР°РЅРЅСѓСЋ РЅР° СЃРµР±СЏ РїРѕРґРїРёСЃРєСѓ С‡РµСЂРµР· СЂР°Р·РґРµР» РїРѕРґР°СЂРєРѕРІ
  if (sub.giftStatus === "ACTIVATED_SELF") {
    return { ok: false, error: "РџРѕРґРїРёСЃРєР° Р°РєС‚РёРІРёСЂРѕРІР°РЅР° РЅР° СЃРµР±СЏ Рё РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ СѓРґР°Р»РµРЅР° РёР· РїРѕРґР°СЂРєРѕРІ", status: 400 };
  }

  // РћС‚РјРµРЅСЏРµРј РІСЃРµ Р°РєС‚РёРІРЅС‹Рµ РєРѕРґС‹
  await prisma.giftCode.updateMany({
    where: { secondarySubscriptionId: subscriptionId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  // РЈРґР°Р»СЏРµРј РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РёР· Remnawave
  if (sub.remnawaveUuid) {
    const deleteRes = await remnaDeleteUser(sub.remnawaveUuid);
    if (deleteRes.status >= 400 && deleteRes.status !== 404) {
      console.warn(`[gift] Failed to delete Remnawave user ${sub.remnawaveUuid}:`, deleteRes.error);
      // РџСЂРѕРґРѕР»Р¶Р°РµРј СѓРґР°Р»РµРЅРёРµ вЂ” РЅРµ Р±Р»РѕРєРёСЂСѓРµРј
    }
  }

  // Р›РѕРіРёСЂСѓРµРј Р”Рћ СѓРґР°Р»РµРЅРёСЏ (РїРѕСЃР»Рµ СѓРґР°Р»РµРЅРёСЏ FK СѓР¶Рµ РЅРµ СЃСѓС‰РµСЃС‚РІСѓРµС‚)
  await logGiftEvent(ownerId, "DELETED", subscriptionId, {
    tariffName: sub.tariff?.name ?? null,
    subscriptionIndex: sub.subscriptionIndex,
  });

  // Hard delete
  await prisma.secondarySubscription.delete({
    where: { id: subscriptionId },
  });

  return { ok: true, data: undefined };
}

export async function renewAdditionalSubscription(
  rootClientId: string,
  subscriptionId: string,
): Promise<GiftResult<{ subscriptionId: string }>> {
  const sub = await prisma.secondarySubscription.findUnique({
    where: { id: subscriptionId },
    include: { tariff: true },
  });
  if (!sub || sub.ownerId !== rootClientId) {
    return { ok: false, error: "РџРѕРґРїРёСЃРєР° РЅРµ РЅР°Р№РґРµРЅР°", status: 404 };
  }
  if (!sub.remnawaveUuid) {
    return { ok: false, error: "РЈ РїРѕРґРїРёСЃРєРё РЅРµС‚ UUID Remna", status: 400 };
  }
  if (!sub.tariff) {
    return { ok: false, error: "Р”Р»СЏ РїРѕРґРїРёСЃРєРё РЅРµ РЅР°Р№РґРµРЅ С‚Р°СЂРёС„", status: 400 };
  }

  const client = await prisma.client.findUnique({
    where: { id: rootClientId },
    select: { balance: true },
  });
  if (!client) return { ok: false, error: "РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ", status: 404 };

  const price = Number(sub.tariff.price ?? 0);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "РќРµРєРѕСЂСЂРµРєС‚РЅР°СЏ С†РµРЅР° С‚Р°СЂРёС„Р°", status: 400 };
  }
  if (client.balance < price) {
    return { ok: false, error: "РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ СЃСЂРµРґСЃС‚РІ РЅР° Р±Р°Р»Р°РЅСЃРµ", status: 400 };
  }

  const remnaUser = await remnaGetUser(sub.remnawaveUuid);
  if (remnaUser.status >= 400) {
    return { ok: false, error: remnaUser.error || "РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ Remna", status: remnaUser.status || 502 };
  }

  const currentExpire = getFutureExpireAtFromRemna(remnaUser.data);
  const baseTs = currentExpire?.getTime() ?? Date.now();
  const nextExpireAt = new Date(baseTs + sub.tariff.durationDays * 24 * 60 * 60 * 1000).toISOString();

  const patchRes = await remnaUpdateUser({
    uuid: sub.remnawaveUuid,
    expireAt: nextExpireAt,
  });
  if (patchRes.status >= 400) {
    return { ok: false, error: patchRes.error || "РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕРґР»РёС‚СЊ РїРѕРґРїРёСЃРєСѓ", status: patchRes.status || 502 };
  }

  await prisma.$transaction([
    prisma.client.update({
      where: { id: rootClientId },
      data: { balance: { decrement: price } },
    }),
    prisma.payment.create({
      data: {
        clientId: rootClientId,
        orderId: `gift-renew-${subscriptionId}-${Date.now()}`,
        tariffId: sub.tariff.id,
        amount: price,
        currency: sub.tariff.currency.toUpperCase(),
        status: "COMPLETED",
        provider: "BALANCE",
        paidAt: new Date(),
      },
    }),
  ]);

  await logGiftEvent(rootClientId, "RENEWED", subscriptionId, {
    tariffName: sub.tariff.name,
    durationDays: sub.tariff.durationDays,
    expireAt: nextExpireAt,
    amount: price,
    currency: sub.tariff.currency,
  });

  return { ok: true, data: { subscriptionId } };
}

/**
 * РЎРїРёСЃРѕРє РІСЃРµС… РїРѕРґРїРёСЃРѕРє РєР»РёРµРЅС‚Р° (РѕСЃРЅРѕРІРЅР°СЏ + РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Рµ).
 * РЎРєСЂС‹С‚С‹Рµ (giftStatus = GIFT_RESERVED) РЅРµ РІРєР»СЋС‡Р°СЋС‚СЃСЏ.
 * РџРѕРґР°СЂРµРЅРЅС‹Рµ Рё СѓР¶Рµ Р°РєС‚РёРІРёСЂРѕРІР°РЅРЅС‹Рµ Сѓ С‚РµРєСѓС‰РµРіРѕ РєР»РёРµРЅС‚Р° (giftStatus = GIFTED) вЂ” РїРѕРєР°Р·С‹РІР°СЋС‚СЃСЏ.
 */
export async function listClientSubscriptions(
  rootClientId: string,
): Promise<GiftResult<SecondarySubscriptionData[]>> {
  const secondaries = await prisma.secondarySubscription.findMany({
    where: {
      ownerId: rootClientId,
      OR: [
        { giftStatus: null },
        { giftStatus: "" },
        { giftStatus: "ACTIVATED_SELF" },
        { giftStatus: "GIFTED" },
      ], // РЅРµ РїРѕРєР°Р·С‹РІР°РµРј С‚РѕР»СЊРєРѕ Р·Р°СЂРµР·РµСЂРІРёСЂРѕРІР°РЅРЅС‹Рµ РїРѕРґ РїРѕРґР°СЂРѕРє
    },
    orderBy: { subscriptionIndex: "asc" },
  });
  return { ok: true, data: secondaries };
}

/**
 * РЎРїРёСЃРѕРє Р’РЎР•РҐ РїРѕРґРїРёСЃРѕРє РєР»РёРµРЅС‚Р° РІРєР»СЋС‡Р°СЏ GIFT_RESERVED Рё ACTIVATED_SELF (РґР»СЏ СЃС‚СЂР°РЅРёС†С‹ СѓРїСЂР°РІР»РµРЅРёСЏ РїРѕРґР°СЂРєР°РјРё).
 * ACTIVATED_SELF РїРѕРєР°Р·С‹РІР°СЋС‚СЃСЏ РєР°Рє В«Р°РєС‚РёРІРёСЂРѕРІР°РЅР° РЅР° СЃРµР±СЏВ» (Р±РµР· РєРЅРѕРїРѕРє РґРµР№СЃС‚РІРёР№).
 * GIFTED РІРєР»СЋС‡Р°СЋС‚СЃСЏ вЂ” РїРѕРєР°Р·С‹РІР°СЋС‚СЃСЏ РєР°Рє В«РїРѕРґР°СЂРµРЅР° РІР°РјВ» (ownerId РїРµСЂРµР·Р°РїРёСЃР°РЅ РЅР° РїРѕР»СѓС‡Р°С‚РµР»СЏ).
 */
export async function listAllClientSubscriptions(
  rootClientId: string,
): Promise<GiftResult<SecondarySubscriptionData[]>> {
  const secondaries = await prisma.secondarySubscription.findMany({
    where: {
      ownerId: rootClientId,
      OR: [
        { giftStatus: null },
        { giftStatus: "" },
        { giftStatus: "GIFT_RESERVED" },
        { giftStatus: "GIFTED" },
        { giftStatus: "ACTIVATED_SELF" },
      ],
    },
    orderBy: { subscriptionIndex: "asc" },
  });
  return { ok: true, data: secondaries };
}

/**
 * РЎРѕР·РґР°С‘С‚ РєРѕРґ РїРѕРґР°СЂРєР° РґР»СЏ РєРѕРЅРєСЂРµС‚РЅРѕР№ РґРѕС‡РµСЂРЅРµР№ РїРѕРґРїРёСЃРєРё.
 * РџРѕРјРµС‡Р°РµС‚ РїРѕРґРїРёСЃРєСѓ РєР°Рє GIFT_RESERVED (СЃРєСЂС‹РІР°РµС‚ РёР· UI РґР°СЂРёС‚РµР»СЏ).
 */
export async function createGiftCode(
  rootClientId: string,
  secondarySubscriptionId: string,
  giftMessage?: string,
): Promise<GiftResult<{ code: string; expiresAt: Date; tariffName: string | null }>> {
  const config = await getSystemConfig();
  if (!config.giftSubscriptionsEnabled) {
    return { ok: false, error: "РџРѕРґР°СЂРєРё РѕС‚РєР»СЋС‡РµРЅС‹", status: 403 };
  }

  const sub = await prisma.secondarySubscription.findUnique({
    where: { id: secondarySubscriptionId },
    include: { tariff: { select: { name: true } } },
  });
  if (!sub || sub.ownerId !== rootClientId) {
    return { ok: false, error: "РџРѕРґРїРёСЃРєР° РЅРµ РЅР°Р№РґРµРЅР°", status: 404 };
  }
  if (sub.giftStatus === "GIFT_RESERVED") {
    return { ok: false, error: "Р”Р»СЏ СЌС‚РѕР№ РїРѕРґРїРёСЃРєРё СѓР¶Рµ СЃРѕР·РґР°РЅ РїРѕРґР°СЂРѕРє", status: 409 };
  }
  if (sub.giftStatus === "GIFTED") {
    return { ok: false, error: "РџРѕРґРїРёСЃРєР° СѓР¶Рµ РїРѕРґР°СЂРµРЅР°", status: 400 };
  }
  if (sub.giftStatus === "ACTIVATED_SELF") {
    return { ok: false, error: "РџРѕРґРїРёСЃРєР° Р°РєС‚РёРІРёСЂРѕРІР°РЅР° РЅР° СЃРµР±СЏ Рё РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїРѕРґР°СЂРµРЅР°", status: 400 };
  }

  // РџСЂРѕРІРµСЂСЏРµРј, РЅРµС‚ Р»Рё Р°РєС‚РёРІРЅРѕРіРѕ РєРѕРґР° РґР»СЏ СЌС‚РѕР№ РїРѕРґРїРёСЃРєРё
  const existingCode = await prisma.giftCode.findFirst({
    where: {
      secondarySubscriptionId,
      status: "ACTIVE",
    },
  });
  if (existingCode) {
    return { ok: false, error: "РђРєС‚РёРІРЅС‹Р№ РєРѕРґ РґР»СЏ СЌС‚РѕР№ РїРѕРґРїРёСЃРєРё СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚", status: 409 };
  }

  // Р“РµРЅРµСЂРёСЂСѓРµРј СѓРЅРёРєР°Р»СЊРЅС‹Р№ РєРѕРґ
  let code = generateGiftCode();
  let attempts = 0;
  while (attempts < 10) {
    const normalized = normalizeCode(code);
    const exists = await prisma.giftCode.findFirst({
      where: { code: { in: [code, normalized] } },
    });
    if (!exists) break;
    code = generateGiftCode();
    attempts++;
  }
  if (attempts >= 10) {
    return { ok: false, error: "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ СѓРЅРёРєР°Р»СЊРЅС‹Р№ РєРѕРґ", status: 500 };
  }

  const expiresAt = new Date(Date.now() + config.giftCodeExpiryHours * 60 * 60 * 1000);

  // РћР±СЂРµР·Р°РµРј СЃРѕРѕР±С‰РµРЅРёРµ РґРѕ 200 СЃРёРјРІРѕР»РѕРІ
  const trimmedMessage = giftMessage?.trim().slice(0, 200) || null;

  // РўСЂР°РЅР·Р°РєС†РёСЏ: СЃРѕР·РґР°С‘Рј РєРѕРґ + РїРѕРјРµС‡Р°РµРј РїРѕРґРїРёСЃРєСѓ РєР°Рє Р·Р°СЂРµР·РµСЂРІРёСЂРѕРІР°РЅРЅСѓСЋ
  await prisma.$transaction([
    prisma.giftCode.create({
      data: {
        code,
        creatorId: rootClientId,
        secondarySubscriptionId,
        status: "ACTIVE",
        expiresAt,
        giftMessage: trimmedMessage,
      },
    }),
    prisma.secondarySubscription.update({
      where: { id: secondarySubscriptionId },
      data: { giftStatus: "GIFT_RESERVED" },
    }),
  ]);

  await logGiftEvent(rootClientId, "CODE_CREATED", secondarySubscriptionId, {
    code,
    tariffName: sub.tariff?.name ?? null,
    giftMessage: trimmedMessage,
  });

  return { ok: true, data: { code, expiresAt, tariffName: sub.tariff?.name ?? null } };
}

/**
 * РђРєС‚РёРІРёСЂСѓРµС‚ РїРѕРґР°СЂРѕРє: РїРµСЂРµРЅРѕСЃРёС‚ РїРѕРґРїРёСЃРєСѓ РЅР° РїРѕР»СѓС‡Р°С‚РµР»СЏ.
 * РЎРѕР·РґР°С‘С‚ РЅРѕРІСѓСЋ SecondarySubscription Сѓ РїРѕР»СѓС‡Р°С‚РµР»СЏ, РѕР±РЅРѕРІР»СЏРµС‚ giftedToClientId.
 */
export async function redeemGiftCode(
  recipientRootClientId: string,
  rawCode: string,
): Promise<GiftResult<{ secondarySubscriptionId: string; subscriptionIndex: number; giftMessage: string | null; creatorTelegramId: string | null; tariffName: string | null }>> {
  const config = await getSystemConfig();
  if (!config.giftSubscriptionsEnabled) {
    return { ok: false, error: "РџРѕРґР°СЂРєРё РѕС‚РєР»СЋС‡РµРЅС‹", status: 403 };
  }

  // РќР°С…РѕРґРёРј РєРѕРґ (РїРѕРґРґРµСЂР¶РєР° Рё СЃ РґРµС„РёСЃР°РјРё, Рё Р±РµР·)
  const normalized = normalizeCode(rawCode);
  const giftCode = await prisma.giftCode.findFirst({
    where: {
      OR: [
        { code: rawCode.trim().toUpperCase() },
        { code: { contains: normalized } },
      ],
      status: "ACTIVE",
    },
    include: {
      secondarySubscription: {
        include: { tariff: { select: { id: true, name: true } } },
      },
    },
  });

  if (!giftCode) {
    // РџСЂРѕРІРµСЂСЏРµРј, СЃСѓС‰РµСЃС‚РІСѓРµС‚ Р»Рё РєРѕРґ РІРѕРѕР±С‰Рµ (РґР»СЏ Р»СѓС‡С€РёС… СЃРѕРѕР±С‰РµРЅРёР№ РѕР± РѕС€РёР±РєРµ)
    const anyCode = await prisma.giftCode.findFirst({
      where: {
        OR: [
          { code: rawCode.trim().toUpperCase() },
          { code: { contains: normalized } },
        ],
      },
    });
    if (anyCode) {
      const statusMsg: Record<string, string> = {
        REDEEMED: "РљРѕРґ СѓР¶Рµ РёСЃРїРѕР»СЊР·РѕРІР°РЅ",
        EXPIRED: "РљРѕРґ РёСЃС‚С‘Рє",
        CANCELLED: "РљРѕРґ РѕС‚РјРµРЅС‘РЅ",
      };
      return { ok: false, error: statusMsg[anyCode.status] ?? "РљРѕРґ РЅРµРґРµР№СЃС‚РІРёС‚РµР»РµРЅ", status: 400 };
    }
    return { ok: false, error: "РљРѕРґ РЅРµ РЅР°Р№РґРµРЅ", status: 404 };
  }

  // Lazy expiration check
  if (giftCode.expiresAt < new Date()) {
    await expireGiftCode(giftCode.id, giftCode.secondarySubscriptionId);
    return { ok: false, error: "РљРѕРґ РёСЃС‚С‘Рє", status: 400 };
  }

  // РќРµР»СЊР·СЏ РїРѕРґР°СЂРёС‚СЊ СЃР°РјРѕРјСѓ СЃРµР±Рµ
  if (giftCode.creatorId === recipientRootClientId) {
    return { ok: false, error: "РќРµР»СЊР·СЏ РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ СЃРІРѕР№ СЃРѕР±СЃС‚РІРµРЅРЅС‹Р№ РїРѕРґР°СЂРѕС‡РЅС‹Р№ РєРѕРґ", status: 400 };
  }

  // РџСЂРѕРІРµСЂСЏРµРј РїРѕР»СѓС‡Р°С‚РµР»СЏ
  const recipient = await prisma.client.findUnique({
    where: { id: recipientRootClientId },
    select: { id: true },
  });
  if (!recipient) {
    return { ok: false, error: "РџРѕР»СѓС‡Р°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ", status: 404 };
  }

  // РџСЂРѕРІРµСЂСЏРµРј Р»РёРјРёС‚ Сѓ РїРѕР»СѓС‡Р°С‚РµР»СЏ
  const recipientSubCount = await prisma.secondarySubscription.count({
    where: { ownerId: recipientRootClientId },
  });
  if (recipientSubCount >= config.maxAdditionalSubscriptions) {
    return {
      ok: false,
      error: `РЈ РїРѕР»СѓС‡Р°С‚РµР»СЏ СѓР¶Рµ РјР°РєСЃРёРјСѓРј РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹С… РїРѕРґРїРёСЃРѕРє (${config.maxAdditionalSubscriptions})`,
      status: 400,
    };
  }

  // РџСЂРѕРІРµСЂРєР° РґСѓР±Р»РёСЂРѕРІР°РЅРёСЏ: РµСЃР»Рё Сѓ РїРѕР»СѓС‡Р°С‚РµР»СЏ СѓР¶Рµ РµСЃС‚СЊ РїРѕРґРїРёСЃРєР° РЅР° СЌС‚РѕС‚ С‚Р°СЂРёС„
  const sub = giftCode.secondarySubscription;
  if (sub.tariffId) {
    const existingDupe = await prisma.secondarySubscription.findFirst({
      where: {
        ownerId: recipientRootClientId,
        tariffId: sub.tariffId,
      },
    });
    if (existingDupe) {
      return {
        ok: false,
        error: "РЈ РїРѕР»СѓС‡Р°С‚РµР»СЏ СѓР¶Рµ РµСЃС‚СЊ РїРѕРґРїРёСЃРєР° РЅР° СЌС‚РѕС‚ С‚Р°СЂРёС„",
        status: 409,
      };
    }
  }

  // РћРїСЂРµРґРµР»СЏРµРј РЅРѕРІС‹Р№ РёРЅРґРµРєСЃ Сѓ РїРѕР»СѓС‡Р°С‚РµР»СЏ
  const newIndex = await getNextSubscriptionIndex(recipientRootClientId);

  // РўСЂР°РЅР·Р°РєС†РёСЏ: Р°РєС‚РёРІРёСЂСѓРµРј РєРѕРґ + РїРµСЂРµРїСЂРёРІСЏР·С‹РІР°РµРј РїРѕРґРїРёСЃРєСѓ
  await prisma.$transaction([
    prisma.giftCode.update({
      where: { id: giftCode.id },
      data: {
        status: "REDEEMED",
        redeemedById: recipientRootClientId,
        redeemedAt: new Date(),
      },
    }),
    prisma.secondarySubscription.update({
      where: { id: giftCode.secondarySubscriptionId },
      data: {
        ownerId: recipientRootClientId,
        subscriptionIndex: newIndex,
        giftStatus: "GIFTED",
        giftedToClientId: recipientRootClientId,
      },
    }),
  ]);

  // Р›РѕРіРёСЂСѓРµРј РґР»СЏ РѕР±РµРёС… СЃС‚РѕСЂРѕРЅ
  await logGiftEvent(giftCode.creatorId, "GIFT_SENT", giftCode.secondarySubscriptionId, {
    code: giftCode.code,
    recipientId: recipientRootClientId,
    tariffName: sub.tariff?.name ?? null,
  });
  await logGiftEvent(recipientRootClientId, "GIFT_RECEIVED", giftCode.secondarySubscriptionId, {
    code: giftCode.code,
    senderId: giftCode.creatorId,
    tariffName: sub.tariff?.name ?? null,
    giftMessage: giftCode.giftMessage ?? null,
  });

  // Referral integration: РµСЃР»Рё Сѓ РїРѕР»СѓС‡Р°С‚РµР»СЏ РЅРµС‚ СЂРµС„РµСЂРµСЂР° Рё РїРѕРґР°СЂРѕС‡РЅС‹Р№ СЂРµС„РµСЂР°Р» РІРєР»СЋС‡С‘РЅ
  if (config.giftReferralEnabled) {
    const recipientData = await prisma.client.findUnique({
      where: { id: recipientRootClientId },
      select: { referrerId: true },
    });
    if (recipientData && !recipientData.referrerId && giftCode.creatorId !== recipientRootClientId) {
      await prisma.client.update({
        where: { id: recipientRootClientId },
        data: { referrerId: giftCode.creatorId },
      });
    }
  }

  // Р—Р°РіСЂСѓР¶Р°РµРј РґР°РЅРЅС‹Рµ РґР°СЂРёС‚РµР»СЏ РґР»СЏ СѓРІРµРґРѕРјР»РµРЅРёР№
  const creator = await prisma.client.findUnique({
    where: { id: giftCode.creatorId },
    select: { telegramId: true },
  });

  // РЈРІРµРґРѕРјР»СЏРµРј РґР°СЂРёС‚РµР»СЏ Рѕ С‚РѕРј, С‡С‚Рѕ РїРѕРґР°СЂРѕРє Р°РєС‚РёРІРёСЂРѕРІР°РЅ (fire-and-forget)
  if (creator?.telegramId) {
    const recipientInfo = await prisma.client.findUnique({
      where: { id: recipientRootClientId },
      select: { telegramUsername: true, email: true },
    });
    const recipientName = recipientInfo?.telegramUsername
      ? `@${recipientInfo.telegramUsername}`
      : recipientInfo?.email?.split("@")[0] ?? "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ";
    const tariffLabel = sub.tariff?.name ? ` (${sub.tariff.name})` : "";
    sendTelegramNotification(
      creator.telegramId,
      `рџЋЃ Р’Р°С€ РїРѕРґР°СЂРѕРє Р°РєС‚РёРІРёСЂРѕРІР°РЅ!\n\n${recipientName} РїСЂРёРЅСЏР»(Р°) РІР°С€ РїРѕРґР°СЂРѕРє${tariffLabel}.`,
    );
  }

  return {
    ok: true,
    data: {
      secondarySubscriptionId: giftCode.secondarySubscriptionId,
      subscriptionIndex: newIndex,
      giftMessage: giftCode.giftMessage ?? null,
      creatorTelegramId: creator?.telegramId ?? null,
      tariffName: sub.tariff?.name ?? null,
    },
  };
}

/**
 * РћС‚РјРµРЅСЏРµС‚ РїРѕРґР°СЂРѕС‡РЅС‹Р№ РєРѕРґ: СЃРЅРёРјР°РµС‚ СЂРµР·РµСЂРІ, РІРѕР·РІСЂР°С‰Р°РµС‚ РїРѕРґРїРёСЃРєСѓ РґР°СЂРёС‚РµР»СЋ.
 */
export async function cancelGiftCode(
  rootClientId: string,
  codeOrId: string,
): Promise<GiftResult> {
  const normalized = normalizeCode(codeOrId);
  const giftCode = await prisma.giftCode.findFirst({
    where: {
      OR: [
        { code: codeOrId.toUpperCase() },
        { code: { contains: normalized } },
        { id: codeOrId },
      ],
      creatorId: rootClientId,
      status: "ACTIVE",
    },
  });
  if (!giftCode) {
    return { ok: false, error: "РђРєС‚РёРІРЅС‹Р№ РєРѕРґ РЅРµ РЅР°Р№РґРµРЅ", status: 404 };
  }

  await prisma.$transaction([
    prisma.giftCode.update({
      where: { id: giftCode.id },
      data: { status: "CANCELLED" },
    }),
    prisma.secondarySubscription.update({
      where: { id: giftCode.secondarySubscriptionId },
      data: { giftStatus: null },
    }),
  ]);

  await logGiftEvent(rootClientId, "CODE_CANCELLED", giftCode.secondarySubscriptionId, {
    code: giftCode.code,
  });

  return { ok: true, data: undefined };
}

/**
 * РџРѕРјРµС‡Р°РµС‚ РєРѕРґ РєР°Рє РёСЃС‚С‘РєС€РёР№ Рё СЃРЅРёРјР°РµС‚ СЂРµР·РµСЂРІ СЃ РїРѕРґРїРёСЃРєРё.
 * Р’С‹Р·С‹РІР°РµС‚СЃСЏ РїСЂРё lazy check (РїРѕРїС‹С‚РєР° РёСЃРїРѕР»СЊР·РѕРІР°РЅРёСЏ РїСЂРѕСЃСЂРѕС‡РµРЅРЅРѕРіРѕ РєРѕРґР°).
 */
async function expireGiftCode(giftCodeId: string, secondarySubscriptionId: string): Promise<void> {
  await prisma.$transaction([
    prisma.giftCode.update({
      where: { id: giftCodeId },
      data: { status: "EXPIRED" },
    }),
    prisma.secondarySubscription.update({
      where: { id: secondarySubscriptionId },
      data: { giftStatus: null },
    }),
  ]);

  const gc = await prisma.giftCode.findUnique({
    where: { id: giftCodeId },
    select: { creatorId: true, code: true },
  });
  if (gc) {
    await logGiftEvent(gc.creatorId, "CODE_EXPIRED", secondarySubscriptionId, {
      code: gc.code,
    });
  }
}

/**
 * Lazy expiration: РѕР±СЂР°Р±Р°С‚С‹РІР°РµС‚ РІСЃРµ РїСЂРѕСЃСЂРѕС‡РµРЅРЅС‹Рµ Р°РєС‚РёРІРЅС‹Рµ РєРѕРґС‹.
 * Р’С‹Р·С‹РІР°РµС‚СЃСЏ РїРµСЂРёРѕРґРёС‡РµСЃРєРё (РёР»Рё РїСЂРё РєР°Р¶РґРѕРј Р·Р°РїСЂРѕСЃРµ Рє СЃРїРёСЃРєСѓ РєРѕРґРѕРІ).
 */
export async function expireOldGiftCodes(): Promise<number> {
  const expiredCodes = await prisma.giftCode.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: new Date() },
    },
    select: { id: true, secondarySubscriptionId: true },
  });

  for (const gc of expiredCodes) {
    await expireGiftCode(gc.id, gc.secondarySubscriptionId);
  }

  if (expiredCodes.length > 0) {
    console.log(`[gift] Expired ${expiredCodes.length} gift codes`);
  }

  return expiredCodes.length;
}

/**
 * РЎРїРёСЃРѕРє РїРѕРґР°СЂРѕС‡РЅС‹С… РєРѕРґРѕРІ, СЃРѕР·РґР°РЅРЅС‹С… РєР»РёРµРЅС‚РѕРј.
 */
export async function listGiftCodes(
  rootClientId: string,
): Promise<GiftResult<Array<{
  id: string;
  code: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  redeemedAt: Date | null;
  giftMessage: string | null;
  secondarySubscriptionId: string;
}>>> {
  // Lazy expire РїРµСЂРµРґ РІС‹РґР°С‡РµР№ СЃРїРёСЃРєР°
  await expireOldGiftCodes();

  const codes = await prisma.giftCode.findMany({
    where: { creatorId: rootClientId },
    select: {
      id: true,
      code: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      redeemedAt: true,
      giftMessage: true,
      secondarySubscriptionId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { ok: true, data: codes };
}

/**
 * РџРѕР»СѓС‡Р°РµС‚ Remnawave subscription URL РґР»СЏ РєРѕРЅРєСЂРµС‚РЅРѕР№ РїРѕРґРїРёСЃРєРё.
 */
export async function getSubscriptionUrl(
  subscriptionId: string,
  rootClientId: string,
): Promise<GiftResult<{ uuid: string }>> {
  const sub = await prisma.secondarySubscription.findUnique({
    where: { id: subscriptionId },
    select: { ownerId: true, remnawaveUuid: true, giftStatus: true },
  });

  if (!sub || sub.ownerId !== rootClientId) {
    return { ok: false, error: "РџРѕРґРїРёСЃРєР° РЅРµ РЅР°Р№РґРµРЅР°", status: 404 };
  }
  if (sub.giftStatus === "GIFT_RESERVED") {
    return { ok: false, error: "РџРѕРґРїРёСЃРєР° Р·Р°СЂРµР·РµСЂРІРёСЂРѕРІР°РЅР° РєР°Рє РїРѕРґР°СЂРѕРє", status: 400 };
  }
  if (!sub.remnawaveUuid) {
    return { ok: false, error: "VPN-РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ СЃРѕР·РґР°РЅ", status: 400 };
  }

  return { ok: true, data: { uuid: sub.remnawaveUuid } };
}

/**
 * РџРѕР»СѓС‡РёС‚СЊ РёСЃС‚РѕСЂРёСЋ РїРѕРґР°СЂРѕС‡РЅС‹С… СЃРѕР±С‹С‚РёР№ РєР»РёРµРЅС‚Р° (СЃ РїР°РіРёРЅР°С†РёРµР№).
 */
export async function getGiftHistory(
  clientId: string,
  page: number = 1,
  limit: number = 20,
): Promise<GiftResult<{ items: Array<{
  id: string;
  eventType: string;
  metadata: unknown;
  createdAt: Date;
  secondarySubscriptionId: string | null;
}>; total: number; page: number; limit: number }>> {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.giftHistory.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        eventType: true,
        metadata: true,
        createdAt: true,
        secondarySubscriptionId: true,
      },
    }),
    prisma.giftHistory.count({ where: { clientId } }),
  ]);

  return { ok: true, data: { items, total, page, limit } };
}

/**
 * РџСѓР±Р»РёС‡РЅР°СЏ РёРЅС„РѕСЂРјР°С†РёСЏ Рѕ РїРѕРґР°СЂРѕС‡РЅРѕРј РєРѕРґРµ (РґР»СЏ СЃС‚СЂР°РЅРёС†С‹ /gift/:code).
 * РќРµ С‚СЂРµР±СѓРµС‚ Р°РІС‚РѕСЂРёР·Р°С†РёРё.
 */
export async function getPublicGiftCodeInfo(
  rawCode: string,
): Promise<GiftResult<{
  code: string;
  status: string;
  giftMessage: string | null;
  expiresAt: Date;
  createdAt: Date;
  tariffName: string | null;
  isExpired: boolean;
}>> {
  const normalized = normalizeCode(rawCode);
  const gc = await prisma.giftCode.findFirst({
    where: {
      OR: [
        { code: rawCode.trim().toUpperCase() },
        { code: { contains: normalized } },
      ],
    },
    include: {
      secondarySubscription: {
        include: { tariff: { select: { name: true } } },
      },
    },
  });

  if (!gc) {
    return { ok: false, error: "РљРѕРґ РЅРµ РЅР°Р№РґРµРЅ", status: 404 };
  }

  // Lazy expire
  const isExpired = gc.status === "ACTIVE" && gc.expiresAt < new Date();
  if (isExpired) {
    await expireGiftCode(gc.id, gc.secondarySubscriptionId);
  }

  return {
    ok: true,
    data: {
      code: gc.code,
      status: isExpired ? "EXPIRED" : gc.status,
      giftMessage: gc.giftMessage,
      expiresAt: gc.expiresAt,
      createdAt: gc.createdAt,
      tariffName: gc.secondarySubscription?.tariff?.name ?? null,
      isExpired: isExpired || gc.status === "EXPIRED",
    },
  };
}

/**
 * РЎРѕР·РґР°РЅРёРµ РїРѕРґР°СЂРѕС‡РЅРѕРіРѕ РєРѕРґР° РѕС‚ Р»РёС†Р° Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°.
 * РЎРѕР·РґР°С‘С‚ SecondarySubscription Сѓ СѓРєР°Р·Р°РЅРЅРѕРіРѕ РєР»РёРµРЅС‚Р° + РіРµРЅРµСЂРёСЂСѓРµС‚ РєРѕРґ.
 */
export async function adminCreateGiftCode(
  ownerClientId: string,
  tariffId: string,
  giftMessage?: string,
): Promise<GiftResult<{ code: string; expiresAt: Date; secondarySubscriptionId: string }>> {
  // РќР°С…РѕРґРёРј С‚Р°СЂРёС„
  const tariff = await prisma.tariff.findUnique({
    where: { id: tariffId },
  });
  if (!tariff) {
    return { ok: false, error: "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ", status: 404 };
  }

  // РЎРѕР·РґР°С‘Рј РїРѕРґРїРёСЃРєСѓ
  const subResult = await createAdditionalSubscription(ownerClientId, {
    id: tariff.id,
    name: tariff.name,
    price: 0, // admin-created, no cost
    durationDays: tariff.durationDays,
    trafficLimitBytes: tariff.trafficLimitBytes,
    deviceLimit: tariff.deviceLimit,
    internalSquadUuids: tariff.internalSquadUuids ?? [],
    trafficResetMode: tariff.trafficResetMode ?? undefined,
  });
  if (!subResult.ok) {
    return subResult;
  }

  // РЎРѕР·РґР°С‘Рј РїРѕРґР°СЂРѕС‡РЅС‹Р№ РєРѕРґ
  const codeResult = await createGiftCode(
    ownerClientId,
    subResult.data.secondarySubscriptionId,
    giftMessage,
  );
  if (!codeResult.ok) {
    return codeResult;
  }

  // Р›РѕРіРёСЂСѓРµРј РєР°Рє ADMIN_CREATED
  await logGiftEvent(ownerClientId, "ADMIN_CREATED", subResult.data.secondarySubscriptionId, {
    tariffName: tariff.name,
    code: codeResult.data.code,
    giftMessage: giftMessage?.trim().slice(0, 200) || null,
    createdByAdmin: true,
  });

  return {
    ok: true,
    data: {
      code: codeResult.data.code,
      expiresAt: codeResult.data.expiresAt,
      secondarySubscriptionId: subResult.data.secondarySubscriptionId,
    },
  };
}

