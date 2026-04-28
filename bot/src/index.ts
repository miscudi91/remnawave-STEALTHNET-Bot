/**
 * STEALTHNET 3.2.7 РІР‚вЂќ Telegram-Р В±Р С•РЎвЂљ
 * Р СџР С•Р В»Р Р…РЎвЂ№Р в„– РЎвЂћРЎС“Р Р…Р С”РЎвЂ Р С‘Р С•Р Р…Р В°Р В» Р С”Р В°Р В±Р С‘Р Р…Р ВµРЎвЂљР В°: Р С–Р В»Р В°Р Р†Р Р…Р В°РЎРЏ, РЎвЂљР В°РЎР‚Р С‘РЎвЂћРЎвЂ№, Р С—РЎР‚Р С•РЎвЂћР С‘Р В»РЎРЉ, Р С—Р С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ, РЎвЂљРЎР‚Р С‘Р В°Р В», РЎР‚Р ВµРЎвЂћР ВµРЎР‚Р В°Р В»РЎРЉР Р…Р В°РЎРЏ РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р В°, VPN.
 * Р В¦Р Р†Р ВµРЎвЂљР Р…РЎвЂ№Р Вµ Р С”Р Р…Р С•Р С—Р С”Р С‘: style primary / success / danger (Telegram Bot API).
 */

import "dotenv/config";
import { Bot, InputFile } from "grammy";
import { ProxyAgent as UndiciProxyAgent } from "undici";
import { SocksProxyAgent } from "socks-proxy-agent";
import * as api from "./api.js";
import {
  mainMenu,
  backToMenu,
  supportSubMenu,
  topUpPresets,
  tariffPayButtons,
  tariffsOfCategoryButtons,
  tariffPaymentMethodButtons,
  proxyTariffPayButtons,
  proxyTariffsOfCategoryButtons,
  proxyCategoryButtons,
  proxyPaymentMethodButtons,
  singboxTariffPayButtons,
  singboxTariffsOfCategoryButtons,
  singboxPaymentMethodButtons,
  topupPaymentMethodButtons,
  payUrlMarkup,
  profileButtons,
  extraOptionsButtons,
  optionPaymentMethodButtons,
  langButtons,
  currencyButtons,
  trialConfirmButton,
  giftMenuButtons,
  giftSubscriptionButtons,
  giftCodeResultButtons,
  giftPostPurchaseButtons,
  giftCodesListButtons,
  giftTariffButtons,
  giftPaymentButtons,
  type InlineMarkup,
  type InnerEmojiIds,
} from "./keyboard.js";
import { t as _t, formatDays as _formatDays, setTranslations } from "./i18n.js";

function formatRuDays(n: number): string {
  return _formatDays(n, "ru");
}

const userLangCache = new Map<number, string>();

function setUserLang(userId: number, lang: string) {
  userLangCache.set(userId, lang);
}

function getUserLang(userId: number): string {
  return userLangCache.get(userId) ?? "ru";
}

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("Set BOT_TOKEN in .env");
  process.exit(1);
}

async function waitForApi(maxRetries = 10, delayMs = 3000): Promise<Awaited<ReturnType<typeof api.getPublicConfig>>> {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      return await api.getPublicConfig();
    } catch {
      if (i < maxRetries) {
        console.log(`[Bot] API Р Р…Р ВµР Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р ВµР Р…, Р С—Р С•Р Р†РЎвЂљР С•РЎР‚ РЎвЂЎР ВµРЎР‚Р ВµР В· ${delayMs / 1000}РЎРѓ (${i}/${maxRetries})РІР‚В¦`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  return null;
}

async function createBotWithProxy(token: string): Promise<Bot> {
  try {
    const cfg = await waitForApi();
    if (cfg?.proxyEnabled && cfg?.proxyTelegram && cfg?.proxyUrl?.trim()) {
      const url = cfg.proxyUrl.trim();
      const lower = url.toLowerCase();
      if (lower.startsWith("http://") || lower.startsWith("https://")) {
        console.log("[Proxy] Telegram Bot API РЎвЂЎР ВµРЎР‚Р ВµР В· HTTP Р С—РЎР‚Р С•Р С”РЎРѓР С‘");
        return new Bot(token, {
          client: { baseFetchConfig: { dispatcher: new UndiciProxyAgent(url) } as any },
        });
      }
      if (lower.startsWith("socks5://") || lower.startsWith("socks4://") || lower.startsWith("socks://")) {
        console.log("[Proxy] Telegram Bot API РЎвЂЎР ВµРЎР‚Р ВµР В· SOCKS Р С—РЎР‚Р С•Р С”РЎРѓР С‘");
        const agent = new SocksProxyAgent(url);
        return new Bot(token, {
          client: { baseFetchConfig: { agent } as any },
        });
      }
      console.warn(`[Proxy] Р СњР ВµР С‘Р В·Р Р†Р ВµРЎРѓРЎвЂљР Р…РЎвЂ№Р в„– Р С—РЎР‚Р С•РЎвЂљР С•Р С”Р С•Р В» Р С—РЎР‚Р С•Р С”РЎРѓР С‘: ${url}, Р В·Р В°Р С—РЎС“РЎРѓР С” Р В±Р ВµР В· Р С—РЎР‚Р С•Р С”РЎРѓР С‘`);
    }
  } catch {
    console.warn("[Bot] Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—Р С•Р В»РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉ Р С”Р С•Р Р…РЎвЂћР С‘Р С–, Р В·Р В°Р С—РЎС“РЎРѓР С” Р В±Р ВµР В· Р С—РЎР‚Р С•Р С”РЎРѓР С‘");
  }
  return new Bot(token);
}

const bot = await createBotWithProxy(BOT_TOKEN);

let BOT_USERNAME = "";

// РІР‚вЂќРІР‚вЂќРІР‚вЂќ Р СџРЎР‚Р С‘Р Р…РЎС“Р Т‘Р С‘РЎвЂљР ВµР В»РЎРЉР Р…Р В°РЎРЏ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”Р В° Р Р…Р В° Р С”Р В°Р Р…Р В°Р В» РІР‚вЂќРІР‚вЂќРІР‚вЂќ

type SubscriptionCheckState = "subscribed" | "not_subscribed" | "cannot_verify";

type ForceChannelTarget = {
  chatId: string | null;
  joinUrl: string | null;
};

function parseForceChannelTarget(channelInput: string): ForceChannelTarget {
  const raw = channelInput.trim();
  if (!raw) return { chatId: null, joinUrl: null };

  const looksLikeUrl = /^https?:\/\//i.test(raw) || /^t\.me\//i.test(raw);
  if (looksLikeUrl) {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const u = new URL(candidate);
      const hostOk = u.hostname === "t.me" || u.hostname.endsWith(".t.me");
      const path = u.pathname.replace(/^\/+|\/+$/g, "");
      if (hostOk && path) {
        if (path.startsWith("c/")) {
          const idPart = path.slice(2).split("/")[0];
          if (/^\d+$/.test(idPart)) {
            return { chatId: `-100${idPart}`, joinUrl: candidate };
          }
        }
        if (path.startsWith("+") || path.startsWith("joinchat/")) {
          return { chatId: null, joinUrl: candidate };
        }
        const uname = path.split("/")[0];
        if (/^[a-zA-Z0-9_]{5,}$/.test(uname)) {
          return { chatId: `@${uname}`, joinUrl: `https://t.me/${uname}` };
        }
      }
    } catch {
      // fallthrough
    }
  }

  if (raw.startsWith("@")) {
    const uname = raw.slice(1);
    if (/^[a-zA-Z0-9_]{5,}$/.test(uname)) {
      return { chatId: `@${uname}`, joinUrl: `https://t.me/${uname}` };
    }
  }

  if (/^[a-zA-Z0-9_]{5,}$/.test(raw)) {
    return { chatId: `@${raw}`, joinUrl: `https://t.me/${raw}` };
  }

  if (/^-?\d+$/.test(raw)) {
    const joinUrl = raw.startsWith("-100") ? `https://t.me/c/${raw.slice(4)}` : null;
    return { chatId: raw, joinUrl };
  }

  return { chatId: null, joinUrl: null };
}

/** Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµРЎвЂљ, Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР В°Р Р… Р В»Р С‘ Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЉ Р Р…Р В° РЎС“Р С”Р В°Р В·Р В°Р Р…Р Р…РЎвЂ№Р в„– Р С”Р В°Р Р…Р В°Р В»/Р С–РЎР‚РЎС“Р С—Р С—РЎС“. */
async function checkUserSubscription(userId: number, channelInput: string): Promise<{ state: SubscriptionCheckState; target: ForceChannelTarget; error?: string }> {
  const target = parseForceChannelTarget(channelInput);
  if (!target.chatId) {
    return { state: "cannot_verify", target, error: "invalid_channel_id" };
  }
  try {
    const member = await bot.api.getChatMember(target.chatId, userId);
    const subscribed = ["member", "administrator", "creator", "restricted"].includes(member.status);
    return { state: subscribed ? "subscribed" : "not_subscribed", target };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("getChatMember error:", msg, { channelInput, parsedChatId: target.chatId });
    return { state: "cannot_verify", target, error: msg };
  }
}

function subscribeKeyboard(channelInput: string, lang = "ru"): InlineMarkup {
  const target = parseForceChannelTarget(channelInput);
  const rows: InlineMarkup["inline_keyboard"] = [];
  if (target.joinUrl) {
    rows.push([{ text: _t("subscribe.channel_button", lang), url: target.joinUrl }]);
  }
  rows.push([{ text: _t("subscribe.check_button", lang), callback_data: "check_subscribe" }]);
  return { inline_keyboard: rows };
}

/**
 * Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµРЎвЂљ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”РЎС“ Р С‘, Р ВµРЎРѓР В»Р С‘ Р Р…Р Вµ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР В°Р Р…, Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р В»РЎРЏР ВµРЎвЂљ/РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚РЎС“Р ВµРЎвЂљ РЎРѓР С•Р С•Р В±РЎвЂ°Р ВµР Р…Р С‘Р Вµ.
 * Р вЂ™Р С•Р В·Р Р†РЎР‚Р В°РЎвЂ°Р В°Р ВµРЎвЂљ true Р ВµРЎРѓР В»Р С‘ Р СњР вЂў Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР В°Р Р… (Р Р…РЎС“Р В¶Р Р…Р С• Р С—РЎР‚Р ВµРЎР‚Р Р†Р В°РЎвЂљРЎРЉ Р С•Р В±РЎР‚Р В°Р В±Р С•РЎвЂљР С”РЎС“).
 */
async function enforceSubscription(
  ctx: {
    from?: { id: number };
    reply: (text: string, opts?: { reply_markup?: InlineMarkup }) => Promise<unknown>;
  },
  config: Awaited<ReturnType<typeof api.getPublicConfig>>,
): Promise<boolean> {
  if (!config?.forceSubscribeEnabled) return false;
  const channelId = config.forceSubscribeChannelId?.trim();
  if (!channelId) return false;
  const userId = ctx.from?.id;
  if (!userId) return false;
  const lang = getUserLang(userId);
  const result = await checkUserSubscription(userId, channelId);
  if (result.state === "subscribed") return false;
  const msg = config.forceSubscribeMessage?.trim() || _t("subscribe.default_message", lang);
  if (result.state === "cannot_verify") {
    await ctx.reply(
      `РІС™В РїС‘РЏ ${msg}\n\n${_t("subscribe.cannot_verify", lang)}`,
      { reply_markup: subscribeKeyboard(channelId, lang) }
    );
    return true;
  }
  await ctx.reply(`РІС™В РїС‘РЏ ${msg}`, { reply_markup: subscribeKeyboard(channelId, lang) });
  return true;
}

type TariffItem = {
  id: string;
  name: string;
  description?: string | null;
  durationDays: number;
  trafficLimitBytes?: number | null;
  trafficResetMode?: string;
  deviceLimit?: number | null;
  price: number;
  currency: string;
};
type TariffCategory = { id: string; name: string; emoji?: string; emojiKey?: string | null; tariffs: TariffItem[] };

// Р СћР С•Р С”Р ВµР Р…РЎвЂ№ Р С—Р С• telegram_id (Р Р† Р С—Р В°Р СРЎРЏРЎвЂљР С‘; Р В°Р Р†РЎвЂљР С•Р СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р В°РЎРЏ Р С—Р ВµРЎР‚Р ВµР В°Р Р†РЎвЂљР С•РЎР‚Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р С—РЎР‚Р С‘ Р С—Р С•РЎвЂљР ВµРЎР‚Р Вµ)
const tokenStore = new Map<number, string>();

function getToken(userId: number): string | undefined {
  return tokenStore.get(userId);
}

function setToken(userId: number, token: string): void {
  tokenStore.set(userId, token);
}

/**
 * Р СџР С•Р В»РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉ РЎвЂљР С•Р С”Р ВµР Р… Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЏ. Р вЂўРЎРѓР В»Р С‘ РЎвЂљР С•Р С”Р ВµР Р… Р С•РЎвЂљРЎРѓРЎС“РЎвЂљРЎРѓРЎвЂљР Р†РЎС“Р ВµРЎвЂљ (РЎР‚Р ВµРЎРѓРЎвЂљР В°РЎР‚РЎвЂљ Р В±Р С•РЎвЂљР В°, Р С—РЎР‚Р С•РЎвЂљРЎС“РЎвЂ¦ Р С‘ РЎвЂљ.Р Т‘.),
 * Р В°Р Р†РЎвЂљР С•Р СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘ Р С—Р ВµРЎР‚Р ВµР В°Р Р†РЎвЂљР С•РЎР‚Р С‘Р В·РЎС“Р ВµРЎвЂљ РЎвЂЎР ВµРЎР‚Р ВµР В· registerByTelegram Р С‘ Р Р†Р С•Р В·Р Р†РЎР‚Р В°РЎвЂ°Р В°Р ВµРЎвЂљ РЎРѓР Р†Р ВµР В¶Р С‘Р в„– РЎвЂљР С•Р С”Р ВµР Р….
 */
async function getOrRestoreToken(userId: number, username?: string): Promise<string | null> {
  const existing = tokenStore.get(userId);
  if (existing) return existing;
  try {
    const config = await api.getPublicConfig();
    if (config?.translations) setTranslations(config.translations);
    const auth = await api.registerByTelegram({
      telegramId: String(userId),
      telegramUsername: username,
      preferredLang: config?.defaultLanguage ?? "ru",
      preferredCurrency: config?.defaultCurrency ?? "usd",
    });
    tokenStore.set(userId, auth.token);
    if (auth.client?.preferredLang) setUserLang(userId, auth.client.preferredLang);
    return auth.token;
  } catch {
    return null;
  }
}

// Р СџР С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»Р С‘, Р С•Р В¶Р С‘Р Т‘Р В°РЎР‹РЎвЂ°Р С‘Р Вµ Р Р†Р Р†Р С•Р Т‘Р В° Р С—РЎР‚Р С•Р СР С•Р С”Р С•Р Т‘Р В°
const awaitingPromoCode = new Set<number>();
// Р С’Р С”РЎвЂљР С‘Р Р†Р Р…РЎвЂ№Р в„– Р С—РЎР‚Р С•Р СР С•Р С”Р С•Р Т‘ Р Р…Р В° РЎРѓР С”Р С‘Р Т‘Р С”РЎС“ (РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРѓРЎРЏ Р Т‘Р С• Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№)
type DiscountInfo = { code: string; discountPercent?: number | null; discountFixed?: number | null };
const activeDiscountCode = new Map<number, DiscountInfo>();
// Р С›Р В¶Р С‘Р Т‘Р В°Р Р…Р С‘Р Вµ Р Р†Р Р†Р С•Р Т‘Р В° Р С—Р С•Р Т‘Р В°РЎР‚Р С•РЎвЂЎР Р…Р С•Р С–Р С• Р С”Р С•Р Т‘Р В°
const awaitingGiftCode = new Set<number>();

// Р С’Р Т‘Р СР С‘Р Р…: Р С•Р В¶Р С‘Р Т‘Р В°Р Р…Р С‘Р Вµ Р Р†Р Р†Р С•Р Т‘Р В° Р С—Р С•Р С‘РЎРѓР С”Р В°; Р С—Р С•РЎРѓР В»Р ВµР Т‘Р Р…Р С‘Р в„– Р С—Р С•Р С‘РЎРѓР С” Р С—Р С• userId Р Т‘Р В»РЎРЏ Р С—Р В°Р С–Р С‘Р Р…Р В°РЎвЂ Р С‘Р С‘
const awaitingAdminSearch = new Set<number>();
const lastAdminSearch = new Map<number, string>();
// Р С’Р Т‘Р СР С‘Р Р…: Р С—Р С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р В±Р В°Р В»Р В°Р Р…РЎРѓР В° Р С”Р В»Р С‘Р ВµР Р…РЎвЂљР В° РІР‚вЂќ Р С•Р В¶Р С‘Р Т‘Р В°Р ВµР С РЎвЂЎР С‘РЎРѓР В»Р С•
const awaitingAdminBalance = new Map<number, string>();
// Р С’Р Т‘Р СР С‘Р Р…: РЎР‚Р В°РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р В° РІР‚вЂќ Р С•Р В¶Р С‘Р Т‘Р В°Р ВµР С РЎвЂљР ВµР С”РЎРѓРЎвЂљ Р С‘Р В»Р С‘ РЎвЂћР С•РЎвЂљР С•+Р С—Р С•Р Т‘Р С—Р С‘РЎРѓРЎРЉ, Р В·Р В°РЎвЂљР ВµР С Р С”Р В°Р Р…Р В°Р В»
const awaitingBroadcastMessage = new Set<number>();
type BroadcastPayload = { text: string; photoFileId?: string; buttonText?: string; buttonUrl?: string };
const lastBroadcastMessage = new Map<number, string | BroadcastPayload>();
// Р С’Р Т‘Р СР С‘Р Р…: РЎРѓР С”Р Р†Р В°Р Т‘РЎвЂ№ РІР‚вЂќ РЎРѓР С—Р С‘РЎРѓР С•Р С” Р Т‘Р В»РЎРЏ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р С‘РЎРЏ/РЎС“Р Т‘Р В°Р В»Р ВµР Р…Р С‘РЎРЏ (clientId + items РЎРѓ uuid/name)
const lastSquadsForAdd = new Map<number, { clientId: string; items: { uuid: string; name: string }[] }>();
const lastSquadsForRemove = new Map<number, { clientId: string; items: { uuid: string; name: string }[] }>();
// Р Р€РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†Р В° (HWID): РЎРѓР С—Р С‘РЎРѓР С•Р С” Р Т‘Р В»РЎРЏ РЎРЊР С”РЎР‚Р В°Р Р…Р В° Р’В«Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†Р С•Р’В» (Р С‘Р Р…Р Т‘Р ВµР С”РЎРѓ Р Р† callback)
const lastDevicesList = new Map<number, { devices: { hwid: string; platform?: string; deviceModel?: string }[] }>();

/** Р вЂќР С•РЎРѓРЎвЂљР В°РЎвЂР С subscriptionUrl Р С‘Р В· Р С•РЎвЂљР Р†Р ВµРЎвЂљР В° Remna */
function getSubscriptionUrl(sub: unknown): string | null {
  if (!sub || typeof sub !== "object") return null;
  const o = sub as Record<string, unknown>;
  const resp = o.response ?? o.data;
  if (resp && typeof resp === "object") {
    const r = resp as Record<string, unknown>;
    const url = r.subscriptionUrl ?? r.subscription_url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  if (typeof o.subscriptionUrl === "string" && o.subscriptionUrl.trim()) return o.subscriptionUrl.trim();
  return null;
}

/** Р вЂќР С•РЎРѓРЎвЂљР В°РЎвЂР С Р С•Р В±РЎР‰Р ВµР С”РЎвЂљ Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЏ Р С‘Р В· Р С•РЎвЂљР Р†Р ВµРЎвЂљР В° Remna (response Р С‘Р В»Р С‘ data Р С‘Р В»Р С‘ РЎРѓР В°Р С Р С•Р В±РЎР‰Р ВµР С”РЎвЂљ) */
function getSubUser(sub: unknown): Record<string, unknown> | null {
  if (!sub || typeof sub !== "object") return null;
  const o = sub as Record<string, unknown>;
  const resp = o.response ?? o.data ?? o;
  const r = typeof resp === "object" && resp !== null ? (resp as Record<string, unknown>) : null;
  if (r && (r.user != null || r.expireAt != null || r.subscriptionUrl != null)) {
    const user = r.user;
    return (typeof user === "object" && user !== null ? user : r) as Record<string, unknown>;
  }
  return r;
}

function bytesToGb(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(2);
}

/** Р СџРЎР‚Р С•Р С–РЎР‚Р ВµРЎРѓРЎРѓ-Р В±Р В°РЎР‚ Р С‘Р В· РЎРѓР С‘Р СР Р†Р С•Р В»Р С•Р Р† (0..1), Р Т‘Р В»Р С‘Р Р…Р В° barLen */
function progressBar(pct: number, barLen: number): string {
  const filled = Math.round(Math.max(0, Math.min(1, pct)) * barLen);
  return "РІвЂ“в‚¬".repeat(filled) + "РІвЂ“вЂ".repeat(barLen - filled);
}

const DEFAULT_MENU_TEXTS: Record<string, string> = {
  welcomeTitlePrefix: "СЂСџвЂєРЋ ",
  welcomeGreeting: "СЂСџвЂвЂ№ Р вЂќР С•Р В±РЎР‚Р С• Р С—Р С•Р В¶Р В°Р В»Р С•Р Р†Р В°РЎвЂљРЎРЉ Р Р† ",
  balancePrefix: "СЂСџвЂ™В° Р вЂР В°Р В»Р В°Р Р…РЎРѓ: ",
  tariffPrefix: "СЂСџвЂ™Р‹ Р вЂ™Р В°РЎв‚¬ РЎвЂљР В°РЎР‚Р С‘РЎвЂћ : ",
  subscriptionPrefix: "{{CHART}} Р РЋРЎвЂљР В°РЎвЂљРЎС“РЎРѓ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”Р С‘ РІР‚вЂќ ",
  statusInactive: "{{STATUS_INACTIVE}} Р ВРЎРѓРЎвЂљР ВµР С”Р В»Р В°",
  statusActive: "{{STATUS_ACTIVE}} Р С’Р С”РЎвЂљР С‘Р Р†Р Р…Р В°",
  statusExpired: "{{STATUS_EXPIRED}} Р ВРЎРѓРЎвЂљР ВµР С”Р В»Р В°",
  statusLimited: "{{STATUS_LIMITED}} Р С›Р С–РЎР‚Р В°Р Р…Р С‘РЎвЂЎР ВµР Р…Р В°",
  statusDisabled: "{{STATUS_DISABLED}} Р С›РЎвЂљР С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р В°",
  expirePrefix: "СЂСџвЂњвЂ¦ Р Т‘Р С• ",
  daysLeftPrefix: "РІРЏВ° Р С•РЎРѓРЎвЂљР В°Р В»Р С•РЎРѓРЎРЉ ",
  devicesLabel: "СЂСџвЂњВ± Р Р€РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†: ",
  devicesAvailable: " Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р Р…Р С•",
  trafficPrefix: "СЂСџвЂњв‚¬ Р СћРЎР‚Р В°РЎвЂћР С‘Р С” РІР‚вЂќ ",
  linkLabel: "СЂСџвЂќвЂ” Р РЋРЎРѓРЎвЂ№Р В»Р С”Р В° Р С—Р С•Р Т‘Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С‘РЎРЏ:",
  chooseAction: "Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ Р Т‘Р ВµР в„–РЎРѓРЎвЂљР Р†Р С‘Р Вµ:",
};

const DEFAULT_TARIFFS_TEXT = "Р СћР В°РЎР‚Р С‘РЎвЂћРЎвЂ№\n\n{{CATEGORY}}\n{{TARIFFS}}\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎвЂљР В°РЎР‚Р С‘РЎвЂћ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:";
const DEFAULT_PAYMENT_TEXT = "Р С›Р С—Р В»Р В°РЎвЂљР В°: {{NAME}} РІР‚вЂќ {{PRICE}}\n\n{{ACTION}}";

type BotTariffLineFields = {
  name?: boolean;
  durationDays?: boolean;
  price?: boolean;
  currency?: boolean;
  trafficLimit?: boolean;
  trafficResetMode?: boolean;
  deviceLimit?: boolean;
};

const DEFAULT_TARIFF_LINE_FIELDS: Required<BotTariffLineFields> = {
  name: true,
  durationDays: false,
  price: true,
  currency: true,
  trafficLimit: false,
  trafficResetMode: false,
  deviceLimit: false,
};

function formatDaysRu(days: number): string {
  const full = _formatDays(days, "ru");
  return full.replace(/^\d+\s*/, "");
}

const RESET_MODE_LABELS: Record<string, string> = {
  no_reset: "",
  on_purchase: "РЎРѓР В±РЎР‚Р С•РЎРѓ Р С—РЎР‚Р С‘ Р С—Р С•Р С”РЎС“Р С—Р С”Р Вµ",
  monthly: "РЎРѓР В±РЎР‚Р С•РЎРѓ Р ВµР В¶Р ВµР СР ВµРЎРѓРЎРЏРЎвЂЎР Р…Р С•",
  monthly_rolling: "РЎРѓР С”Р С•Р В»РЎРЉР В·РЎРЏРЎвЂ°Р С‘Р в„– Р СР ВµРЎРѓРЎРЏРЎвЂ ",
};

function formatTariffLine(tariff: TariffItem, fields: Required<BotTariffLineFields>): string {
  const parts: string[] = [];
  if (fields.name) parts.push(tariff.name);
  if (fields.durationDays) parts.push(`${tariff.durationDays} ${formatDaysRu(tariff.durationDays)}`);
  if (fields.price) {
    const pricePart = fields.currency ? `${tariff.price} ${tariff.currency}` : `${tariff.price}`;
    parts.push(pricePart);
  } else if (fields.currency) {
    parts.push(`${tariff.currency}`);
  }
  if (fields.trafficLimit) {
    const limit = tariff.trafficLimitBytes;
    parts.push(limit == null ? "РЎвЂљРЎР‚Р В°РЎвЂћР С‘Р С” Р В±Р ВµР В· Р В»Р С‘Р СР С‘РЎвЂљР В°" : `РЎвЂљРЎР‚Р В°РЎвЂћР С‘Р С” ${bytesToGb(limit)} GB`);
  }
  if (fields.trafficResetMode) {
    const label = RESET_MODE_LABELS[tariff.trafficResetMode ?? "no_reset"];
    if (label) parts.push(label);
  }
  if (fields.deviceLimit) {
    const limit = tariff.deviceLimit;
    parts.push(limit == null ? "РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†Р В° Р В±Р ВµР В· Р В»Р С‘Р СР С‘РЎвЂљР В°" : `РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†Р В° ${limit}`);
  }
  if (!parts.length) return `РІР‚Сћ ${tariff.name}`;
  return `РІР‚Сћ ${parts.join(" РІР‚вЂќ ")}`;
}

function renderTariffsText(template: string, category: string, tariffLines: string): string {
  return template
    .split("{{CATEGORY}}").join(category)
    .split("{{TARIFFS}}").join(tariffLines);
}

function renderPaymentText(
  template: string,
  vars: { name: string; price: string; amount: string; currency: string; action: string }
): string {
  return template
    .split("{{NAME}}").join(vars.name)
    .split("{{PRICE}}").join(vars.price)
    .split("{{AMOUNT}}").join(vars.amount)
    .split("{{CURRENCY}}").join(vars.currency)
    .split("{{ACTION}}").join(vars.action);
}

function buildPaymentMessage(
  config: Awaited<ReturnType<typeof api.getPublicConfig>> | null | undefined,
  vars: { name: string; price: string; amount: string; currency: string; action: string },
  discount?: { originalPrice: string; discountedPrice: string }
): { text: string; entities: CustomEmojiEntity[] } {
  const priceDisplay = discount
    ? `${discount.originalPrice} РІвЂ вЂ™ ${discount.discountedPrice}`
    : vars.price;
  const template = (config?.botPaymentText ?? "").trim() || DEFAULT_PAYMENT_TEXT;
  const base = renderPaymentText(template, { ...vars, price: priceDisplay });
  const result = applyCustomEmojiPlaceholders(base, config?.botEmojis);
  if (discount) {
    const pos = result.text.indexOf(priceDisplay);
    if (pos >= 0) {
      result.entities.push(
        { type: "strikethrough", offset: pos, length: discount.originalPrice.length },
        { type: "bold", offset: pos + discount.originalPrice.length + 3, length: discount.discountedPrice.length },
      );
    }
  }
  return result;
}

function t(texts: Record<string, string> | null | undefined, key: string): string {
  return (texts?.[key] ?? DEFAULT_MENU_TEXTS[key]) || "";
}

type CustomEmojiEntity =
  | { type: "custom_emoji"; offset: number; length: number; custom_emoji_id: string }
  | { type: "strikethrough"; offset: number; length: number }
  | { type: "bold"; offset: number; length: number };

/** Р вЂќР В»Р С‘Р Р…Р В° Р С—Р ВµРЎР‚Р Р†Р С•Р С–Р С• РЎРѓР С‘Р СР Р†Р С•Р В»Р В° Р Р† UTF-16 (Р Т‘Р В»РЎРЏ entity) */
function firstCharLengthUtf16(s: string): number {
  if (!s.length) return 0;
  const cp = s.codePointAt(0);
  return cp != null && cp > 0xffff ? 2 : 1;
}

const DEFAULT_EMOJI_UNICODE: Record<string, string> = {
  PACKAGE: "СЂСџвЂњВ¦", TARIFFS: "СЂСџвЂњВ¦", CARD: "СЂСџвЂ™С–", LINK: "СЂСџвЂќвЂ”", PUZZLE: "СЂСџвЂВ¤", PROFILE: "СЂСџвЂВ¤",
  TRIAL: "СЂСџР‹Рѓ", SERVERS: "СЂСџРЉС’", CONNECT: "СЂСџРЉС’",
  CHART: "СЂСџвЂњР‰",
  STATUS_ACTIVE: "СЂСџСџРЋ", STATUS_EXPIRED: "СЂСџвЂќТ‘", STATUS_INACTIVE: "СЂСџвЂќТ‘",
  STATUS_LIMITED: "СЂСџСџРЋ", STATUS_DISABLED: "СЂСџвЂќТ‘",
};
const DEFAULT_CUSTOM_EMOJI_CHAR = "СЂСџв„ўвЂљ";

const DEFAULT_MENU_EMOJI_KEY_BY_ID: Record<string, string> = {
  tariffs: "PACKAGE",
  proxy: "SERVERS",
  my_proxy: "SERVERS",
  singbox: "SERVERS",
  my_singbox: "SERVERS",
  profile: "PUZZLE",
  devices: "DEVICES",
  topup: "CARD",
  referral: "LINK",
  trial: "TRIAL",
  vpn: "SERVERS",
  cabinet: "SERVERS",
  support: "NOTE",
  tickets: "NOTE",
  promocode: "STAR",
  extra_options: "PACKAGE",
};

function getMenuEmojiKey(
  config: Awaited<ReturnType<typeof api.getPublicConfig>> | null | undefined,
  menuId: string
): string | null | undefined {
  const btn = config?.botButtons?.find((b) => b.id === menuId);
  if (btn && btn.emojiKey === "") return null;
  return btn?.emojiKey || DEFAULT_MENU_EMOJI_KEY_BY_ID[menuId];
}

/** Р вЂ”Р В°Р С–Р С•Р В»Р С•Р Р†Р С•Р С” РЎРѓ РЎРЊР СР С•Р Т‘Р В·Р С‘: Р ВµРЎРѓР В»Р С‘ Р Р† botEmojis Р ВµРЎРѓРЎвЂљРЎРЉ tgEmojiId Р Т‘Р В»РЎРЏ Р С”Р В»РЎР‹РЎвЂЎР В° РІР‚вЂќ Р Т‘Р С•Р В±Р В°Р Р†Р В»РЎРЏР ВµР С entity (Р С—РЎР‚Р ВµР СР С‘РЎС“Р С-РЎРЊР СР С•Р Т‘Р В·Р С‘ Р Р† РЎвЂљР ВµР С”РЎРѓРЎвЂљР Вµ). */
function titleWithEmoji(
  emojiKey: string,
  rest: string,
  botEmojis?: Record<string, { unicode?: string; tgEmojiId?: string }> | null
): { text: string; entities: CustomEmojiEntity[] } {
  const entry = botEmojis?.[emojiKey];
  const unicode = entry?.unicode?.trim() || DEFAULT_EMOJI_UNICODE[emojiKey] || "РІР‚Сћ";
  const space = rest.startsWith("\n") ? "" : " ";
  const text = unicode + space + rest;
  const entities: CustomEmojiEntity[] = [];
  if (entry?.tgEmojiId) {
    const len = firstCharLengthUtf16(unicode);
    if (len > 0) entities.push({ type: "custom_emoji", offset: 0, length: len, custom_emoji_id: entry.tgEmojiId });
  }
  return { text, entities };
}

function applyCustomEmojiPlaceholders(
  text: string,
  botEmojis?: Record<string, { unicode?: string; tgEmojiId?: string }> | null
): { text: string; entities: CustomEmojiEntity[] } {
  if (!text) return { text, entities: [] };
  const entities: CustomEmojiEntity[] = [];
  const re = /\{\{([A-Z0-9_]+)\}\}/g;
  let out = "";
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const key = match[1]!;
    out += text.slice(lastIdx, match.index);
    const entry = botEmojis?.[key];
    const fallbackUnicode = DEFAULT_EMOJI_UNICODE[key];
    const unicode = entry?.unicode?.trim() || (entry?.tgEmojiId ? DEFAULT_CUSTOM_EMOJI_CHAR : "") || fallbackUnicode || "";
    if (unicode) {
      const offset = out.length;
      out += unicode;
      if (entry?.tgEmojiId) {
        entities.push({ type: "custom_emoji", offset, length: unicode.length, custom_emoji_id: entry.tgEmojiId });
      }
    } else {
      out += match[0];
    }
    lastIdx = match.index + match[0].length;
  }
  out += text.slice(lastIdx);
  return { text: out, entities };
}

function titleWithEmojiAndCustomEmojis(
  emojiKey: string,
  rest: string,
  botEmojis?: Record<string, { unicode?: string; tgEmojiId?: string }> | null
): { text: string; entities: CustomEmojiEntity[] } {
  const entry = botEmojis?.[emojiKey];
  const unicode = entry?.unicode?.trim() || DEFAULT_EMOJI_UNICODE[emojiKey] || "РІР‚Сћ";
  const space = rest.startsWith("\n") ? "" : " ";
  const leading = unicode + space;
  const { text: restText, entities: restEntities } = applyCustomEmojiPlaceholders(rest, botEmojis);
  const entities: CustomEmojiEntity[] = [];
  if (entry?.tgEmojiId) {
    const len = firstCharLengthUtf16(unicode);
    if (len > 0) entities.push({ type: "custom_emoji", offset: 0, length: len, custom_emoji_id: entry.tgEmojiId });
  }
  for (const e of restEntities) {
    entities.push({ ...e, offset: e.offset + leading.length });
  }
  return { text: leading + restText, entities };
}

function titleWithOptionalEmoji(
  emojiKey: string | null | undefined,
  rest: string,
  botEmojis?: Record<string, { unicode?: string; tgEmojiId?: string }> | null
): { text: string; entities: CustomEmojiEntity[] } {
  if (!emojiKey) return applyCustomEmojiPlaceholders(rest, botEmojis);
  return titleWithEmojiAndCustomEmojis(emojiKey, rest, botEmojis);
}

/** Р СџР С•Р В»Р Р…РЎвЂ№Р в„– РЎвЂљР ВµР С”РЎРѓРЎвЂљ Р С–Р В»Р В°Р Р†Р Р…Р С•Р С–Р С• Р СР ВµР Р…РЎР‹ + entities Р Т‘Р В»РЎРЏ Р С—РЎР‚Р ВµР СР С‘РЎС“Р С-РЎРЊР СР С•Р Т‘Р В·Р С‘ Р Р† РЎвЂљР ВµР С”РЎРѓРЎвЂљР Вµ (Р Р†Р В»Р В°Р Т‘Р ВµР В»Р ВµРЎвЂ  Р В±Р С•РЎвЂљР В° Р Т‘Р С•Р В»Р В¶Р ВµР Р… Р С‘Р СР ВµРЎвЂљРЎРЉ Telegram Premium). */
function buildMainMenuText(opts: {
  serviceName: string;
  balance: number;
  currency: string;
  subscription: unknown;
  /** Р С›РЎвЂљР С•Р В±РЎР‚Р В°Р В¶Р В°Р ВµР СР С•Р Вµ Р С‘Р СРЎРЏ РЎвЂљР В°РЎР‚Р С‘РЎвЂћР В° РЎРѓ Р В±РЎРЊР С”Р ВµР Р…Р Т‘Р В°: Р СћРЎР‚Р С‘Р В°Р В», Р Р…Р В°Р В·Р Р†Р В°Р Р…Р С‘Р Вµ РЎРѓ РЎРѓР В°Р в„–РЎвЂљР В° Р С‘Р В»Р С‘ Р’В«Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р†РЎвЂ№Р В±РЎР‚Р В°Р Р…Р’В» */
  tariffDisplayName?: string | null;
  menuTexts?: Record<string, string> | null;
  menuLineVisibility?: Record<string, boolean> | null;
  menuTextCustomEmojiIds?: Record<string, string> | null;
  botEmojis?: Record<string, { unicode?: string; tgEmojiId?: string }> | null;
}): { text: string; entities: CustomEmojiEntity[] } {
  const { serviceName, balance, currency, subscription, tariffDisplayName, menuTexts, menuLineVisibility, menuTextCustomEmojiIds, botEmojis } = opts;
  const name = serviceName.trim() || "Р С™Р В°Р В±Р С‘Р Р…Р ВµРЎвЂљ";
  const balanceStr = formatMoney(balance, currency);
  const lines: string[] = [];
  const lineStartKeys: (string | null)[] = [];
  const lineEntitiesByIndex: CustomEmojiEntity[][] = [];
  const shouldShow = (key: string) => menuLineVisibility?.[key] !== false;
  const pushLine = (key: string, text: string) => {
    if (!shouldShow(key)) return;
    const { text: processed, entities } = applyCustomEmojiPlaceholders(text, botEmojis);
    lines.push(processed);
    lineStartKeys.push(key);
    lineEntitiesByIndex.push(entities);
  };

  pushLine("welcomeGreeting", t(menuTexts, "welcomeGreeting"));
  pushLine("welcomeTitlePrefix", t(menuTexts, "welcomeTitlePrefix") + name);
  pushLine("balancePrefix", t(menuTexts, "balancePrefix") + balanceStr);

  const user = getSubUser(subscription);
  const url = getSubscriptionUrl(subscription);
  const tariffName = (tariffDisplayName && tariffDisplayName.trim()) || "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р†РЎвЂ№Р В±РЎР‚Р В°Р Р…";
  pushLine("tariffPrefix", t(menuTexts, "tariffPrefix") + tariffName);

  if (!user && !url) {
    pushLine("subscriptionPrefix", t(menuTexts, "subscriptionPrefix") + t(menuTexts, "statusInactive"));
    pushLine("trafficPrefix", t(menuTexts, "trafficPrefix") + " 0.00 GB");
    pushLine("chooseAction", t(menuTexts, "chooseAction"));
  } else {
    const expireAt = user?.expireAt ?? user?.expirationDate ?? user?.expire_at;
    let expireDate: Date | null = null;
    if (expireAt != null) {
      const d = typeof expireAt === "number" ? new Date(expireAt * 1000) : new Date(String(expireAt));
      if (!Number.isNaN(d.getTime())) expireDate = d;
    }
    const status = (user?.status ?? user?.userStatus ?? "ACTIVE") as string;
    const statusLabel =
      status === "ACTIVE" ? t(menuTexts, "statusActive")
      : status === "EXPIRED" ? t(menuTexts, "statusExpired")
      : status === "LIMITED" ? t(menuTexts, "statusLimited")
      : status === "DISABLED" ? t(menuTexts, "statusDisabled")
      : `СЂСџСџРЋ ${status}`;
    const expireStr = expireDate
      ? expireDate.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "РІР‚вЂќ";
    const daysLeft =
      expireDate && expireDate > new Date()
        ? Math.max(0, Math.ceil((expireDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
        : null;

    pushLine("subscriptionPrefix", t(menuTexts, "subscriptionPrefix") + statusLabel);
    pushLine("expirePrefix", t(menuTexts, "expirePrefix") + expireStr);
    if (daysLeft != null) {
      pushLine("daysLeftPrefix", t(menuTexts, "daysLeftPrefix") + `${daysLeft} ${daysLeft === 1 ? "Р Т‘Р ВµР Р…РЎРЉ" : daysLeft < 5 ? "Р Т‘Р Р…РЎРЏ" : "Р Т‘Р Р…Р ВµР в„–"}`);
    }
    const deviceLimit = user?.hwidDeviceLimit ?? user?.deviceLimit ?? user?.device_limit;
    const devicesUsed = user?.devicesUsed ?? user?.devices_used;
    if (deviceLimit != null && typeof deviceLimit === "number") {
      const available = devicesUsed != null ? Math.max(0, deviceLimit - Number(devicesUsed)) : deviceLimit;
      pushLine("devicesLabel", t(menuTexts, "devicesLabel") + available + t(menuTexts, "devicesAvailable"));
    }
    const trafficUsedBytes =
      (user?.userTraffic as { usedTrafficBytes?: number } | undefined)?.usedTrafficBytes ??
      user?.trafficUsedBytes ??
      user?.usedTrafficBytes ??
      user?.traffic_used_bytes;
    const trafficLimitBytes = user?.trafficLimitBytes ?? user?.traffic_limit_bytes;
    const usedNum = typeof trafficUsedBytes === "string" ? parseFloat(trafficUsedBytes) : Number(trafficUsedBytes);
    const limitNum = typeof trafficLimitBytes === "string" ? parseFloat(trafficLimitBytes) : Number(trafficLimitBytes);
    if (Number.isFinite(usedNum) && Number.isFinite(limitNum) && limitNum > 0) {
      const pct = usedNum / limitNum;
      const usedGb = bytesToGb(usedNum);
      const limitGb = bytesToGb(limitNum);
      const pctInt = Math.round(Math.min(100, pct * 100));
      pushLine("trafficPrefix", t(menuTexts, "trafficPrefix") + `СЂСџСџСћ ${progressBar(pct, 14)} ${pctInt}% (${usedGb} / ${limitGb} GB)`);
    } else if (Number.isFinite(usedNum)) {
      pushLine("trafficPrefix", t(menuTexts, "trafficPrefix") + ` ${bytesToGb(usedNum)} GB`);
    } else {
      pushLine("trafficPrefix", t(menuTexts, "trafficPrefix") + " 0.00 GB");
    }
    if (url) {
      if (shouldShow("linkLabel")) {
        const { text: label, entities } = applyCustomEmojiPlaceholders(t(menuTexts, "linkLabel"), botEmojis);
        lines.push(label, url);
        lineStartKeys.push("linkLabel", null);
        lineEntitiesByIndex.push(entities, []);
      }
    }
    pushLine("chooseAction", t(menuTexts, "chooseAction"));
  }

  const text = lines.join("\n");
  const entities: CustomEmojiEntity[] = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineEntities = lineEntitiesByIndex[i] ?? [];
    for (const e of lineEntities) {
      entities.push({ ...e, offset: e.offset + offset });
    }
    const key = lineStartKeys[i];
    if (key && menuTextCustomEmojiIds?.[key] && !lineEntities.some((e) => e.offset === 0)) {
      const line = lines[i]!;
      const firstLen = firstCharLengthUtf16(line);
      if (firstLen > 0) entities.push({ type: "custom_emoji", offset, length: firstLen, custom_emoji_id: menuTextCustomEmojiIds[key]! });
    }
    offset += lines[i]!.length + 1;
  }
  return { text, entities };
}

const TELEGRAM_CAPTION_MAX = 1024;

/** Р вЂєР С•Р С–Р С•РЎвЂљР С‘Р С— Р С‘Р В· Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р ВµР С”: data URL Р С‘Р В»Р С‘ URL РІвЂ вЂ™ Р С‘РЎРѓРЎвЂљР С•РЎвЂЎР Р…Р С‘Р С” Р Т‘Р В»РЎРЏ sendPhoto/sendAnimation Р С‘ Р С—РЎР‚Р С‘Р В·Р Р…Р В°Р С” GIF */
function logoToMediaSource(logo: string | null | undefined): { source: InputFile | string; isGif: boolean } | null {
  if (!logo || !logo.trim()) return null;
  const s = logo.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    const isGif = /\.gif(\?|$)/i.test(s);
    return { source: s, isGif };
  }
  const base64Match = /^data:image\/([a-z]+);base64,(.+)$/i.exec(s);
  if (base64Match) {
    try {
      const subtype = (base64Match[1] ?? "").toLowerCase();
      const buf = Buffer.from(base64Match[2]!, "base64");
      if (buf.length > 0) {
        const isGif = subtype === "gif";
        const name = isGif ? "logo.gif" : "logo.png";
        return { source: new InputFile(buf, name), isGif };
      }
    } catch {
      return null;
    }
  }
  try {
    const buf = Buffer.from(s, "base64");
    if (buf.length > 0) return { source: new InputFile(buf, "logo.png"), isGif: false };
  } catch {
    // ignore
  }
  return null;
}

/** Р В Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ РЎРѓР С•Р С•Р В±РЎвЂ°Р ВµР Р…Р С‘Р Вµ: РЎвЂљР ВµР С”РЎРѓРЎвЂљ Р С‘ Р С”Р В»Р В°Р Р†Р С‘Р В°РЎвЂљРЎС“РЎР‚Р В° (Р ВµРЎРѓР В»Р С‘ РЎРѓ РЎвЂћР С•РЎвЂљР С•/Р В°Р Р…Р С‘Р СР В°РЎвЂ Р С‘Р ВµР в„– РІР‚вЂќ caption, Р С‘Р Р…Р В°РЎвЂЎР Вµ text) */
async function editMessageContent(ctx: {
  editMessageCaption: (opts: { caption: string; caption_entities?: CustomEmojiEntity[]; reply_markup?: InlineMarkup }) => Promise<unknown>;
  editMessageText: (text: string, opts?: { entities?: CustomEmojiEntity[]; reply_markup?: InlineMarkup }) => Promise<unknown>;
  deleteMessage: () => Promise<unknown>;
  chat?: { id: number };
  callbackQuery?: { message?: { photo?: unknown[]; animation?: unknown; video?: unknown } };
}, text: string, reply_markup: InlineMarkup, entities?: CustomEmojiEntity[]): Promise<unknown> {
  const msg = ctx.callbackQuery?.message;
  const hasPhoto = msg && typeof msg === "object" && "photo" in msg && Array.isArray((msg as { photo: unknown[] }).photo) && (msg as { photo: unknown[] }).photo.length > 0;
  const hasAnimation = msg && typeof msg === "object" && "animation" in msg && (msg as { animation: unknown }).animation != null;
  const hasVideo = msg && typeof msg === "object" && "video" in msg && (msg as { video: unknown }).video != null;
  if (hasVideo && ctx.chat?.id) {
    await ctx.deleteMessage().catch(() => {});
    return bot.api.sendMessage(ctx.chat.id, text, { entities: entities?.length ? entities : undefined, reply_markup });
  }
  const hasMediaWithCaption = hasPhoto || hasAnimation;
  const caption = text.length > TELEGRAM_CAPTION_MAX ? text.slice(0, TELEGRAM_CAPTION_MAX - 3) + "..." : text;
  const truncatedEntities = text.length > TELEGRAM_CAPTION_MAX && entities ? entities.filter((e) => e.offset + e.length <= TELEGRAM_CAPTION_MAX - 3) : entities;
  if (hasMediaWithCaption) return ctx.editMessageCaption({ caption, caption_entities: truncatedEntities?.length ? truncatedEntities : undefined, reply_markup });
  return ctx.editMessageText(text, { entities: entities?.length ? entities : undefined, reply_markup });
}

function formatMoney(amount: number, currency: string): string {
  const c = currency.toUpperCase();
  const sym = c === "RUB" ? "РІвЂљР…" : c === "USD" ? "$" : "РІвЂљТ‘";
  return `${amount} ${sym}`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Р В Р В°РЎРѓРЎРѓРЎвЂЎР С‘РЎвЂљР В°РЎвЂљРЎРЉ РЎвЂ Р ВµР Р…РЎС“ РЎРѓР С• РЎРѓР С”Р С‘Р Т‘Р С”Р С•Р в„– */
function getDiscountedPrice(price: number, discount: DiscountInfo): number {
  let final = price;
  if (discount.discountPercent && discount.discountPercent > 0) final -= final * discount.discountPercent / 100;
  if (discount.discountFixed && discount.discountFixed > 0) final -= discount.discountFixed;
  return Math.max(0, Math.round(final * 100) / 100);
}

/**
 * Парсинг start-параметра.
 * Новый формат (через __): ref_CODE__s_SOURCE__m_MEDIUM__k_CAMPAIGN__n_CONTENT__t_TERM
 * Старый формат (через _c_): ref_CODE_c_SOURCE_CAMPAIGN
 */
function parseStartPayload(payload: string): {
  refCode?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
} {
  const out: ReturnType<typeof parseStartPayload> = {};

  if (payload.includes("__")) {
    const segments = payload.split("__");
    for (const seg of segments) {
      if (seg.startsWith("ref_")) out.refCode = seg.slice(4);
      else if (seg.startsWith("s_")) out.utm_source = seg.slice(2);
      else if (seg.startsWith("m_")) out.utm_medium = seg.slice(2);
      else if (seg.startsWith("k_")) out.utm_campaign = seg.slice(2);
      else if (seg.startsWith("n_")) out.utm_content = seg.slice(2);
      else if (seg.startsWith("t_")) out.utm_term = seg.slice(2);
    }
    return out;
  }

  const cIdx = payload.indexOf("_c_");
  const refPart = cIdx >= 0 ? payload.slice(0, cIdx) : payload;
  const campaignPart = cIdx >= 0 ? payload.slice(cIdx + 3) : "";
  if (refPart && /^ref_?/i.test(refPart)) {
    const code = refPart.replace(/^ref_?/i, "").trim();
    if (code) out.refCode = code;
  }
  if (campaignPart) {
    const parts = campaignPart.split("_").filter(Boolean);
    if (parts.length >= 2) {
      out.utm_source = parts[0];
      out.utm_campaign = parts.length === 2 ? parts[1] : parts[parts.length - 1];
      if (parts.length >= 3) out.utm_medium = parts.slice(1, -1).join("_");
    }
  }
  return out;
}

// РІР‚вЂќРІР‚вЂќРІР‚вЂќ /start РЎРѓ РЎР‚Р ВµРЎвЂћР ВµРЎР‚Р В°Р В»РЎРЉР Р…РЎвЂ№Р С Р С”Р С•Р Т‘Р С•Р С (Р Р…Р В°Р С—РЎР‚Р С‘Р СР ВµРЎР‚ /start ref_ABC123) Р С‘Р В»Р С‘ Р С—РЎР‚Р С•Р СР С• (/start promo_XXXX) Р С‘Р В»Р С‘ Р С”Р В°Р СР С—Р В°Р Р…Р С‘РЎРЏ (/start c_facebook_summer)
bot.command("start", async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  const telegramId = String(from.id);
  const telegramUsername = from.username ?? undefined;
  const payload = ctx.match?.trim() || "";

  // Р РЋР В±РЎР‚Р В°РЎРѓРЎвЂ№Р Р†Р В°Р ВµР С РЎРѓР С•РЎРѓРЎвЂљР С•РЎРЏР Р…Р С‘Р Вµ РЎР‚Р В°РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р С‘, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р В±Р В°Р Р…Р Р…Р ВµРЎР‚/РЎвЂћР С•РЎвЂљР С• Р Р…Р Вµ Р’В«Р В·Р В°Р В»Р С‘Р С—Р В°Р В»Р С•Р’В»
  lastBroadcastMessage.delete(from.id);
  awaitingBroadcastMessage.delete(from.id);

  // Deep-link Р В°Р Р†РЎвЂљР С•РЎР‚Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р Р…Р В° РЎРѓР В°Р в„–РЎвЂљР Вµ: /start auth_TOKEN
  if (/^auth_/i.test(payload)) {
    const lang = getUserLang(from.id);
    const authToken = payload.replace(/^auth_/i, "");
    if (!authToken) {
      await ctx.reply(_t("auth.invalid_link", lang));
      return;
    }
    try {
      await api.confirmTelegramAuth(authToken, from.id, telegramUsername);
      await ctx.reply(_t("auth.confirmed", lang));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : _t("unknown_error", lang);
      console.error("[/start auth_] confirm error:", msg);
      if (msg.includes("expired") || msg.includes("410")) {
        await ctx.reply(_t("auth.expired", lang));
      } else if (msg.includes("already confirmed") || msg.includes("409")) {
        await ctx.reply(_t("auth.already_used", lang));
      } else {
        await ctx.reply(_t("auth_error_start", lang));
      }
    }
    return;
  }

  // Р С›Р С—РЎР‚Р ВµР Т‘Р ВµР В»РЎРЏР ВµР С РЎвЂљР С‘Р С— deeplink
  const isPromo = /^promo_/i.test(payload);
  const promoCode = isPromo ? payload.replace(/^promo_/i, "") : undefined;
  const parsed = parseStartPayload(payload);
  const refCode = !isPromo ? (parsed.refCode ?? (payload.replace(/^ref_?/i, "").trim() || undefined)) : undefined;

  try {
    const config = await api.getPublicConfig();
    if (config?.translations) setTranslations(config.translations);
    const name = config?.serviceName?.trim() || "Р С™Р В°Р В±Р С‘Р Р…Р ВµРЎвЂљ";

    const auth = await api.registerByTelegram({
      telegramId,
      telegramUsername,
      preferredLang: config?.defaultLanguage ?? "ru",
      preferredCurrency: config?.defaultCurrency ?? "usd",
      referralCode: refCode,
      utm_source: parsed.utm_source,
      utm_medium: parsed.utm_medium,
      utm_campaign: parsed.utm_campaign,
      utm_content: parsed.utm_content,
      utm_term: parsed.utm_term,
    });

    setToken(from.id, auth.token);
    const client = auth.client;
    if (client?.preferredLang) setUserLang(from.id, client.preferredLang);

    // Р вЂўРЎРѓР В»Р С‘ РЎРЊРЎвЂљР С• Р С—РЎР‚Р С•Р СР С•-РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р В° РІР‚вЂќ Р В°Р С”РЎвЂљР С‘Р Р†Р С‘РЎР‚РЎС“Р ВµР С Р С—РЎР‚Р С•Р СР С•Р С”Р С•Р Т‘
    if (promoCode) {
      try {
        const result = await api.activatePromo(auth.token, promoCode);
        await ctx.reply(`РІСљвЂ¦ ${result.message}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ /start РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С•РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Р СР ВµР Р…РЎР‹.`);
        return;
      } catch (promoErr: unknown) {
        const promoMsg = promoErr instanceof Error ? promoErr.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р В°Р С”РЎвЂљР С‘Р Р†Р В°РЎвЂ Р С‘Р С‘ Р С—РЎР‚Р С•Р СР С•Р С”Р С•Р Т‘Р В°";
        await ctx.reply(`РІСњРЉ ${promoMsg}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ /start РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С•РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Р СР ВµР Р…РЎР‹.`);
        return;
      }
    }

    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”Р С‘ Р Р…Р В° Р С”Р В°Р Р…Р В°Р В»
    if (await enforceSubscription(ctx, config)) return;

    const [subRes, proxyRes, singboxRes] = await Promise.all([
      api.getSubscription(auth.token).catch(() => ({ subscription: null })),
      api.getPublicProxyTariffs().catch(() => ({ items: [] })),
      api.getPublicSingboxTariffs().catch(() => ({ items: [] })),
    ]);
    const vpnUrl = getSubscriptionUrl(subRes.subscription);
    const showTrial = Boolean(config?.trialEnabled && !client?.trialUsed);
    const showProxy = proxyRes.items?.some((c: { tariffs: unknown[] }) => c.tariffs?.length > 0) ?? false;
    const showSingbox = singboxRes.items?.some((c: { tariffs: unknown[] }) => c.tariffs?.length > 0) ?? false;
    const appUrl = config?.publicAppUrl?.replace(/\/$/, "") ?? null;

    const { text, entities } = buildMainMenuText({
      serviceName: name,
      balance: client?.balance ?? 0,
      currency: client?.preferredCurrency ?? config?.defaultCurrency ?? "usd",
      subscription: subRes.subscription,
      tariffDisplayName: (subRes as { tariffDisplayName?: string | null }).tariffDisplayName ?? null,
      menuTexts: config?.botMenuTexts ?? config?.resolvedBotMenuTexts ?? null,
      menuLineVisibility: config?.botMenuLineVisibility ?? null,
      menuTextCustomEmojiIds: config?.menuTextCustomEmojiIds ?? null,
      botEmojis: config?.botEmojis ?? null,
    });
    const caption = text.length > TELEGRAM_CAPTION_MAX ? text.slice(0, TELEGRAM_CAPTION_MAX - 3) + "..." : text;
    const captionEntities = text.length > TELEGRAM_CAPTION_MAX && entities.length ? entities.filter((e) => e.offset + e.length <= TELEGRAM_CAPTION_MAX - 3) : entities;
    const hasVideoInstructions = config?.videoInstructionsEnabled && (config?.videoInstructions?.length ?? 0) > 0;
    const hasSupportLinks = !!(config?.supportLink || config?.agreementLink || config?.offerLink || config?.instructionsLink || hasVideoInstructions);
    const markup = mainMenu({
      showTrial,
      showVpn: Boolean(vpnUrl),
      showProxy,
      showSingbox,
      showGift: config?.giftSubscriptionsEnabled === true,
      appUrl,
      botButtons: config?.botButtons ?? null,
      botBackLabel: config?.botBackLabel ?? null,
      hasSupportLinks,
      showTickets: config?.ticketsEnabled === true,
      showExtraOptions: config?.sellOptionsEnabled === true && (config?.sellOptions?.length ?? 0) > 0,
      buttonsPerRow: config?.botButtonsPerRow ?? 1,
      remnaSubscriptionUrl: config?.useRemnaSubscriptionPage ? vpnUrl : null,
    });
    const isBotAdmin = config?.botAdminTelegramIds?.includes(String(from.id)) ?? false;
    if (isBotAdmin) {
      markup.inline_keyboard.push([{ text: "РІС™в„ўРїС‘РЏ Р СџР В°Р Р…Р ВµР В»РЎРЉ Р В°Р Т‘Р СР С‘Р Р…Р В°", callback_data: "admin:menu" }]);
    }

    const media = logoToMediaSource(config?.logoBot);
    if (media) {
      const opts = { caption, caption_entities: captionEntities.length ? captionEntities : undefined, reply_markup: markup };
      if (media.isGif) {
        await ctx.replyWithAnimation(media.source, opts);
      } else {
        await ctx.replyWithPhoto(media.source, opts);
      }
    } else {
      await ctx.reply(text, { entities: entities.length ? entities : undefined, reply_markup: markup });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р Р†РЎвЂ¦Р С•Р Т‘Р В°";
    await ctx.reply(`РІСњРЉ ${msg}`);
  }
});

// РІР‚вЂќРІР‚вЂќРІР‚вЂќ /link Р С™Р С›Р вЂќ РІР‚вЂќ Р С—РЎР‚Р С‘Р Р†РЎРЏР В·Р С”Р В° Telegram Р С” Р В°Р С”Р С”Р В°РЎС“Р Р…РЎвЂљРЎС“ (Р С”Р С•Р Т‘ Р С‘Р В· Р С”Р В°Р В±Р С‘Р Р…Р ВµРЎвЂљР В° Р Р…Р В° РЎРѓР В°Р в„–РЎвЂљР Вµ)
bot.command("link", async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  const lang = getUserLang(from.id);
  const code = (ctx.match?.trim() || "").replace(/\s+/g, " ");
  if (!code) {
    await ctx.reply(_t("link.prompt", lang));
    return;
  }
  try {
    await api.linkTelegramFromBot(code, from.id, from.username ?? undefined);
    await ctx.reply(_t("link.success", lang));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : _t("error_generic", lang);
    await ctx.reply(`РІСњРЉ ${msg}`);
  }
});

// РІР‚вЂќРІР‚вЂќРІР‚вЂќ Callback: Р СР ВµР Р…РЎР‹ Р С‘ Р Т‘Р ВµР в„–РЎРѓРЎвЂљР Р†Р С‘РЎРЏ
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  if (!userId) return;
  await ctx.answerCallbackQuery().catch(() => {});

  // Р С’Р Т‘Р СР С‘Р Р…-Р С—Р В°Р Р…Р ВµР В»РЎРЉ Р Р† Р В±Р С•РЎвЂљР Вµ (Р Р…Р Вµ РЎвЂљРЎР‚Р ВµР В±РЎС“Р ВµРЎвЂљ РЎвЂљР С•Р С”Р ВµР Р…Р В° Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЏ)
  if (data.startsWith("admin:")) {
    const config = await api.getPublicConfig();
    if (!config?.botAdminTelegramIds?.includes(String(userId))) {
      await ctx.answerCallbackQuery({ text: "Р вЂќР С•РЎРѓРЎвЂљРЎС“Р С— Р В·Р В°Р С—РЎР‚Р ВµРЎвЂ°РЎвЂР Р…", show_alert: true }).catch(() => {});
      return;
    }
    if (data === "admin:menu") {
      lastAdminSearch.delete(userId);
      awaitingAdminSearch.delete(userId);
      awaitingAdminBalance.delete(userId);
      awaitingBroadcastMessage.delete(userId);
      lastBroadcastMessage.delete(userId);
      lastSquadsForAdd.delete(userId);
      lastSquadsForRemove.delete(userId);
      const markup: InlineMarkup = {
        inline_keyboard: [
          [{ text: "СЂСџвЂњР‰ Р РЋРЎвЂљР В°РЎвЂљР С‘РЎРѓРЎвЂљР С‘Р С”Р В°", callback_data: "admin:stats" }],
          [{ text: "СЂСџвЂќвЂќ Р Р€Р Р†Р ВµР Т‘Р С•Р СР В»Р ВµР Р…Р С‘РЎРЏ", callback_data: "admin:notifications" }],
          [{ text: "СЂСџвЂТђ Р С™Р В»Р С‘Р ВµР Р…РЎвЂљРЎвЂ№", callback_data: "admin:clients:1" }],
          [{ text: "СЂСџвЂќРЊ Р СџР С•Р С‘РЎРѓР С” Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЏ", callback_data: "admin:search" }],
          [
            { text: "СЂСџвЂ™С– Р С›Р В¶Р С‘Р Т‘Р В°РЎР‹РЎвЂљ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№", callback_data: "admin:payments:pending:1" },
            { text: "СЂСџвЂ™В° Р СџР С•РЎРѓР В»Р ВµР Т‘Р Р…Р С‘Р Вµ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р С‘", callback_data: "admin:payments:paid:1" },
          ],
          [{ text: "СЂСџвЂњСћ Р В Р В°РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р В°", callback_data: "admin:broadcast" }],
          [{ text: "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р СР ВµР Р…РЎР‹", callback_data: "menu:main" }],
        ],
      };
      await editMessageContent(ctx, "РІС™в„ўРїС‘РЏ Р СџР В°Р Р…Р ВµР В»РЎРЉ Р В°Р Т‘Р СР С‘Р Р…Р В°\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎР‚Р В°Р В·Р Т‘Р ВµР В»:", markup);
      return;
    }
    if (data === "admin:notifications") {
      const settings = await api.getBotAdminNotificationSettings(userId);
      const s = settings;
      const yesNo = (v: boolean) => (v ? "Р вЂ™Р С”Р В»" : "Р вЂ™РЎвЂ№Р С”Р В»");
      const text =
        "СЂСџвЂќвЂќ Р СњР В°РЎРѓРЎвЂљРЎР‚Р С•Р в„–Р С”Р С‘ РЎС“Р Р†Р ВµР Т‘Р С•Р СР В»Р ВµР Р…Р С‘Р в„–\n\n" +
        `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р В±Р В°Р В»Р В°Р Р…РЎРѓР В°: ${yesNo(s.notifyBalanceTopup)}\n` +
        `Р С›Р С—Р В»Р В°РЎвЂљР В° РЎвЂљР В°РЎР‚Р С‘РЎвЂћР С•Р Р†: ${yesNo(s.notifyTariffPayment)}\n` +
        `Р СњР С•Р Р†РЎвЂ№Р Вµ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎвЂ№: ${yesNo(s.notifyNewClient)}\n` +
        `Р СњР С•Р Р†РЎвЂ№Р Вµ РЎвЂљР С‘Р С”Р ВµРЎвЂљРЎвЂ№: ${yesNo(s.notifyNewTicket)}\n\n` +
        "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р Р…Р В° Р С—РЎС“Р Р…Р С”РЎвЂљ Р Р…Р С‘Р В¶Р Вµ, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉ.";
      const markup: InlineMarkup = {
        inline_keyboard: [
          [{ text: `СЂСџвЂ™В° Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р В±Р В°Р В»Р В°Р Р…РЎРѓР В°: ${yesNo(s.notifyBalanceTopup)}`, callback_data: "admin:notif:balance" }],
          [{ text: `СЂСџвЂњВ¦ Р С›Р С—Р В»Р В°РЎвЂљР В° РЎвЂљР В°РЎР‚Р С‘РЎвЂћР С•Р Р†: ${yesNo(s.notifyTariffPayment)}`, callback_data: "admin:notif:tariff" }],
          [{ text: `СЂСџвЂВ¤ Р СњР С•Р Р†РЎвЂ№Р Вµ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎвЂ№: ${yesNo(s.notifyNewClient)}`, callback_data: "admin:notif:newclient" }],
          [{ text: `СЂСџР‹В« Р СњР С•Р Р†РЎвЂ№Р Вµ РЎвЂљР С‘Р С”Р ВµРЎвЂљРЎвЂ№: ${yesNo(s.notifyNewTicket)}`, callback_data: "admin:notif:newticket" }],
          [{ text: "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р В°Р Т‘Р СР С‘Р Р…Р С”РЎС“", callback_data: "admin:menu" }],
        ],
      };
      await editMessageContent(ctx, text, markup);
      return;
    }
    if (data.startsWith("admin:notif:")) {
      const kind = data.slice("admin:notif:".length);
      const current = await api.getBotAdminNotificationSettings(userId);
      const payload: Partial<api.BotAdminNotificationSettings> = {};
      if (kind === "balance") {
        payload.notifyBalanceTopup = !current.notifyBalanceTopup;
      } else if (kind === "tariff") {
        payload.notifyTariffPayment = !current.notifyTariffPayment;
      } else if (kind === "newclient") {
        payload.notifyNewClient = !current.notifyNewClient;
      } else if (kind === "newticket") {
        payload.notifyNewTicket = !current.notifyNewTicket;
      }
      const updated = await api.patchBotAdminNotificationSettings(userId, payload);
      const s = updated;
      const yesNo = (v: boolean) => (v ? "Р вЂ™Р С”Р В»" : "Р вЂ™РЎвЂ№Р С”Р В»");
      const text =
        "СЂСџвЂќвЂќ Р СњР В°РЎРѓРЎвЂљРЎР‚Р С•Р в„–Р С”Р С‘ РЎС“Р Р†Р ВµР Т‘Р С•Р СР В»Р ВµР Р…Р С‘Р в„–\n\n" +
        `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р В±Р В°Р В»Р В°Р Р…РЎРѓР В°: ${yesNo(s.notifyBalanceTopup)}\n` +
        `Р С›Р С—Р В»Р В°РЎвЂљР В° РЎвЂљР В°РЎР‚Р С‘РЎвЂћР С•Р Р†: ${yesNo(s.notifyTariffPayment)}\n` +
        `Р СњР С•Р Р†РЎвЂ№Р Вµ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎвЂ№: ${yesNo(s.notifyNewClient)}\n` +
        `Р СњР С•Р Р†РЎвЂ№Р Вµ РЎвЂљР С‘Р С”Р ВµРЎвЂљРЎвЂ№: ${yesNo(s.notifyNewTicket)}\n\n` +
        "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р Р…Р В° Р С—РЎС“Р Р…Р С”РЎвЂљ Р Р…Р С‘Р В¶Р Вµ, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉ.";
      const markup: InlineMarkup = {
        inline_keyboard: [
          [{ text: `СЂСџвЂ™В° Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р В±Р В°Р В»Р В°Р Р…РЎРѓР В°: ${yesNo(s.notifyBalanceTopup)}`, callback_data: "admin:notif:balance" }],
          [{ text: `СЂСџвЂњВ¦ Р С›Р С—Р В»Р В°РЎвЂљР В° РЎвЂљР В°РЎР‚Р С‘РЎвЂћР С•Р Р†: ${yesNo(s.notifyTariffPayment)}`, callback_data: "admin:notif:tariff" }],
          [{ text: `СЂСџвЂВ¤ Р СњР С•Р Р†РЎвЂ№Р Вµ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎвЂ№: ${yesNo(s.notifyNewClient)}`, callback_data: "admin:notif:newclient" }],
          [{ text: `СЂСџР‹В« Р СњР С•Р Р†РЎвЂ№Р Вµ РЎвЂљР С‘Р С”Р ВµРЎвЂљРЎвЂ№: ${yesNo(s.notifyNewTicket)}`, callback_data: "admin:notif:newticket" }],
          [{ text: "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р В°Р Т‘Р СР С‘Р Р…Р С”РЎС“", callback_data: "admin:menu" }],
        ],
      };
      await editMessageContent(ctx, text, markup);
      return;
    }
    if (data === "admin:search") {
      awaitingAdminSearch.add(userId);
      await editMessageContent(
        ctx,
        "СЂСџвЂќРЊ Р СџР С•Р С‘РЎРѓР С” Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЏ\n\nР вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ Telegram ID, @username Р С‘Р В»Р С‘ email:",
        { inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С›РЎвЂљР СР ВµР Р…Р В°", callback_data: "admin:menu" }]] }
      );
      return;
    }
    if (data === "admin:stats") {
      const stats = await api.getBotAdminStats(userId);
      const u = stats.users;
      const s = stats.sales;
      const text =
        `СЂСџвЂњР‰ Р РЋРЎвЂљР В°РЎвЂљР С‘РЎРѓРЎвЂљР С‘Р С”Р В°\n\nСЂСџвЂТђ Р СџР С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»Р С‘: ${u.total}\nР РЋ Remna: ${u.withRemna}\nР СњР С•Р Р†РЎвЂ№РЎвЂ¦ Р В·Р В° 7 Р Т‘Р Р….: ${u.newLast7Days}\nР СњР С•Р Р†РЎвЂ№РЎвЂ¦ Р В·Р В° 30 Р Т‘Р Р….: ${u.newLast30Days}\n\n` +
        `СЂСџвЂ™В° Р СџРЎР‚Р С•Р Т‘Р В°Р В¶Р С‘ (Р Р†РЎРѓР ВµР С–Р С•): ${s.totalAmount} РІвЂљР… (${s.totalCount})\nР вЂ”Р В° 7 Р Т‘Р Р….: ${s.last7DaysAmount} РІвЂљР… (${s.last7DaysCount})\nР вЂ”Р В° 30 Р Т‘Р Р….: ${s.last30DaysAmount} РІвЂљР… (${s.last30DaysCount})`;
      const back: InlineMarkup = { inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р В°Р Т‘Р СР С‘Р Р…Р С”РЎС“", callback_data: "admin:menu" }]] };
      await editMessageContent(ctx, text, back);
      return;
    }
    if (data.startsWith("admin:clients:")) {
      const suffix = data.slice("admin:clients:".length);
      if (suffix === "clear") {
        lastAdminSearch.delete(userId);
        // Р СџР С•Р С”Р В°Р В·Р В°РЎвЂљРЎРЉ Р С—Р ВµРЎР‚Р Р†РЎС“РЎР‹ РЎРѓРЎвЂљРЎР‚Р В°Р Р…Р С‘РЎвЂ РЎС“ Р В±Р ВµР В· Р С—Р С•Р С‘РЎРѓР С”Р В°
        const { items, total, limit } = await api.getBotAdminClients(userId, 1);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        let msg = `СЂСџвЂТђ Р С™Р В»Р С‘Р ВµР Р…РЎвЂљРЎвЂ№ (${total})\n\n`;
        items.forEach((c, i) => {
          const label = c.email || c.telegramUsername || c.telegramId || c.id.slice(0, 8);
          msg += `${i + 1}. ${label} ${c.isBlocked ? "СЂСџС™В«" : ""}\n`;
        });
        msg += `\nР РЋРЎвЂљРЎР‚. 1/${totalPages}`;
        const rows: InlineMarkup["inline_keyboard"] = [];
        items.forEach((c) => {
          rows.push([
            {
              text: `${c.email || c.telegramUsername || c.telegramId || c.id.slice(0, 8)} ${c.isBlocked ? "СЂСџС™В«" : ""}`,
              callback_data: `admin:client:${c.id}`,
            },
          ]);
        });
        const nav: InlineMarkup["inline_keyboard"][0] = [];
        nav.push({ text: "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р В°Р Т‘Р СР С‘Р Р…Р С”РЎС“", callback_data: "admin:menu" });
        if (totalPages > 1) nav.push({ text: "Р вЂ™Р С—Р ВµРЎР‚РЎвЂР Т‘ РІвЂ“В¶", callback_data: "admin:clients:2" });
        rows.push(nav);
        await editMessageContent(ctx, msg, { inline_keyboard: rows });
        return;
      }
      const page = parseInt(suffix, 10) || 1;
      const search = lastAdminSearch.get(userId);
      const { items, total, limit } = await api.getBotAdminClients(userId, page, search);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      let msg = search ? `СЂСџвЂТђ Р СџР С•Р С‘РЎРѓР С” Р’В«${search}Р’В» (${total})\n\n` : `СЂСџвЂТђ Р С™Р В»Р С‘Р ВµР Р…РЎвЂљРЎвЂ№ (${total})\n\n`;
      items.forEach((c, i) => {
        const label = c.email || c.telegramUsername || c.telegramId || c.id.slice(0, 8);
        msg += `${(page - 1) * limit + i + 1}. ${label} ${c.isBlocked ? "СЂСџС™В«" : ""}\n`;
      });
      msg += `\nР РЋРЎвЂљРЎР‚. ${page}/${totalPages}`;
      const rows: InlineMarkup["inline_keyboard"] = [];
      items.forEach((c) => {
        rows.push([
          {
            text: `${c.email || c.telegramUsername || c.telegramId || c.id.slice(0, 8)} ${c.isBlocked ? "СЂСџС™В«" : ""}`,
            callback_data: `admin:client:${c.id}`,
          },
        ]);
      });
      const nav: InlineMarkup["inline_keyboard"][0] = [];
      if (page > 1) nav.push({ text: "РІвЂ”Р‚ Р СњР В°Р В·Р В°Р Т‘", callback_data: `admin:clients:${page - 1}` });
      nav.push({ text: "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р В°Р Т‘Р СР С‘Р Р…Р С”РЎС“", callback_data: "admin:menu" });
      if (search) nav.push({ text: "РІСљвЂ“ Р РЋР В±РЎР‚Р С•РЎРѓР С‘РЎвЂљРЎРЉ Р С—Р С•Р С‘РЎРѓР С”", callback_data: "admin:clients:clear" });
      if (page < totalPages) nav.push({ text: "Р вЂ™Р С—Р ВµРЎР‚РЎвЂР Т‘ РІвЂ“В¶", callback_data: `admin:clients:${page + 1}` });
      rows.push(nav);
      await editMessageContent(ctx, msg, { inline_keyboard: rows });
      return;
    }
    if (data.startsWith("admin:client:")) {
      const clientId = data.slice("admin:client:".length);
      if (!clientId) return;
      const client = await api.getBotAdminClient(userId, clientId);
      const created = client.createdAt ? new Date(client.createdAt).toLocaleString("ru-RU") : "РІР‚вЂќ";
      let text = `СЂСџвЂВ¤ ${client.email || client.telegramUsername || client.telegramId || client.id}\n\n`;
      text += `ID: ${client.id}\nР вЂР В°Р В»Р В°Р Р…РЎРѓ: ${client.balance}\nР В Р ВµРЎвЂћР ВµРЎР‚Р В°Р В»Р С•Р Р†: ${client._count?.referrals ?? 0}\nР РЋР С•Р В·Р Т‘Р В°Р Р…: ${created}\n`;
      if (client.isBlocked) text += `\nСЂСџС™В« Р вЂ”Р В°Р В±Р В»Р С•Р С”Р С‘РЎР‚Р С•Р Р†Р В°Р Р…${client.blockReason ? `: ${client.blockReason}` : ""}`;
      const kb: InlineMarkup["inline_keyboard"] = [];
      if (client.isBlocked) {
        kb.push([{ text: "РІСљвЂ¦ Р В Р В°Р В·Р В±Р В»Р С•Р С”Р С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ", callback_data: `admin:unblock:${client.id}` }]);
      } else {
        kb.push([{ text: "СЂСџС™В« Р вЂ”Р В°Р В±Р В»Р С•Р С”Р С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ", callback_data: `admin:block:${client.id}` }]);
      }
      kb.push([{ text: "СЂСџвЂ™Вµ Р СџР С•Р С—Р С•Р В»Р Р…Р С‘РЎвЂљРЎРЉ Р В±Р В°Р В»Р В°Р Р…РЎРѓ", callback_data: `admin:balance:${client.id}` }]);
      if (client.remnawaveUuid) {
        kb.push(
          [
            { text: "СЂСџвЂќвЂћ Р С›РЎвЂљР С•Р В·Р Р†Р В°РЎвЂљРЎРЉ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”РЎС“", callback_data: `admin:remna:revoke:${client.id}` },
            { text: "РІРЏС‘ Р С›РЎвЂљР С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉ Remna", callback_data: `admin:remna:disable:${client.id}` },
          ],
          [
            { text: "РІвЂ“В¶ Р вЂ™Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉ Remna", callback_data: `admin:remna:enable:${client.id}` },
            { text: "СЂСџвЂњР‰ Р РЋР В±РЎР‚Р С•РЎРѓР С‘РЎвЂљРЎРЉ РЎвЂљРЎР‚Р В°РЎвЂћР С‘Р С”", callback_data: `admin:remna:reset:${client.id}` },
          ],
          [
            { text: "РІС›вЂў Р вЂќР С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ РЎРѓР С”Р Р†Р В°Р Т‘", callback_data: `admin:squad:add:${client.id}` },
            { text: "РІС›вЂ“ Р Р€Р В±РЎР‚Р В°РЎвЂљРЎРЉ РЎРѓР С”Р Р†Р В°Р Т‘", callback_data: `admin:squad:remove:${client.id}` },
          ]
        );
      }
      kb.push([{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ РЎРѓР С—Р С‘РЎРѓР С”РЎС“", callback_data: "admin:clients:1" }]);
      await editMessageContent(ctx, text, { inline_keyboard: kb });
      return;
    }
    if (data.startsWith("admin:balance:")) {
      const clientId = data.slice("admin:balance:".length);
      if (!clientId) return;
      awaitingAdminBalance.set(userId, clientId);
      await editMessageContent(
        ctx,
        "СЂСџвЂ™Вµ Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р В±Р В°Р В»Р В°Р Р…РЎРѓР В°\n\nР вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ РЎРѓРЎС“Р СР СРЎС“ (РЎвЂЎР С‘РЎРѓР В»Р С•):",
        { inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С›РЎвЂљР СР ВµР Р…Р В°", callback_data: "admin:menu" }]] }
      );
      return;
    }
    if (data.startsWith("admin:remna:revoke:")) {
      const clientId = data.slice("admin:remna:revoke:".length);
      if (!clientId) return;
      try {
        await api.postBotAdminClientRemnaRevoke(userId, clientId);
        await editMessageContent(ctx, `РІСљвЂ¦ Р СџР С•Р Т‘Р С—Р С‘РЎРѓР С”Р В° Remna Р С•РЎвЂљР С•Р В·Р Р†Р В°Р Р…Р В° Р Т‘Р В»РЎРЏ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљР В°.`, {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]],
        });
      } catch (e: unknown) {
        await editMessageContent(ctx, `РІСњРЉ ${e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°"}`, {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р СњР В°Р В·Р В°Р Т‘", callback_data: `admin:client:${clientId}` }]],
        });
      }
      return;
    }
    if (data.startsWith("admin:remna:disable:")) {
      const clientId = data.slice("admin:remna:disable:".length);
      if (!clientId) return;
      try {
        await api.postBotAdminClientRemnaDisable(userId, clientId);
        await editMessageContent(ctx, "РІСљвЂ¦ Р СџР С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЉ Р С•РЎвЂљР С”Р В»РЎР‹РЎвЂЎРЎвЂР Р… Р Р† Remna.", {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]],
        });
      } catch (e: unknown) {
        await editMessageContent(ctx, `РІСњРЉ ${e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°"}`, {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р СњР В°Р В·Р В°Р Т‘", callback_data: `admin:client:${clientId}` }]],
        });
      }
      return;
    }
    if (data.startsWith("admin:remna:enable:")) {
      const clientId = data.slice("admin:remna:enable:".length);
      if (!clientId) return;
      try {
        await api.postBotAdminClientRemnaEnable(userId, clientId);
        await editMessageContent(ctx, "РІСљвЂ¦ Р СџР С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЉ Р Р†Р С”Р В»РЎР‹РЎвЂЎРЎвЂР Р… Р Р† Remna.", {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]],
        });
      } catch (e: unknown) {
        await editMessageContent(ctx, `РІСњРЉ ${e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°"}`, {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р СњР В°Р В·Р В°Р Т‘", callback_data: `admin:client:${clientId}` }]],
        });
      }
      return;
    }
    if (data.startsWith("admin:remna:reset:")) {
      const clientId = data.slice("admin:remna:reset:".length);
      if (!clientId) return;
      try {
        await api.postBotAdminClientRemnaResetTraffic(userId, clientId);
        await editMessageContent(ctx, "РІСљвЂ¦ Р СћРЎР‚Р В°РЎвЂћР С‘Р С” РЎРѓР В±РЎР‚Р С•РЎв‚¬Р ВµР Р….", {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]],
        });
      } catch (e: unknown) {
        await editMessageContent(ctx, `РІСњРЉ ${e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°"}`, {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р СњР В°Р В·Р В°Р Т‘", callback_data: `admin:client:${clientId}` }]],
        });
      }
      return;
    }
    if (data.startsWith("admin:squad:add:")) {
      const rest = data.slice("admin:squad:add:".length);
      const parts = rest.split(":");
      const clientId = parts[0];
      const indexStr = parts[1];
      if (!clientId) return;
      if (indexStr !== undefined) {
        const index = parseInt(indexStr, 10);
        const stored = lastSquadsForAdd.get(userId);
        if (!stored || index < 0 || index >= stored.items.length) {
          await editMessageContent(ctx, "Р РЋР ВµРЎРѓРЎРѓР С‘РЎРЏ Р С‘РЎРѓРЎвЂљР ВµР С”Р В»Р В° Р С‘Р В»Р С‘ РЎРѓР С”Р Р†Р В°Р Т‘ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…. Р вЂ™Р ВµРЎР‚Р Р…Р С‘РЎвЂљР ВµРЎРѓРЎРЉ Р С” Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“.", {
            inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]],
          });
          return;
        }
        const squadUuid = stored.items[index]!.uuid;
        try {
          await api.postBotAdminClientRemnaSquadAdd(userId, clientId, squadUuid);
          lastSquadsForAdd.delete(userId);
          await editMessageContent(ctx, `РІСљвЂ¦ Р РЋР С”Р Р†Р В°Р Т‘ Р’В«${stored.items[index]!.name}Р’В» Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р….`, {
            inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]],
          });
        } catch (e: unknown) {
          await editMessageContent(ctx, `РІСњРЉ ${e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°"}`, {
            inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р СњР В°Р В·Р В°Р Т‘", callback_data: `admin:squad:add:${clientId}` }]],
          });
        }
        return;
      }
      try {
        const { items } = await api.getBotAdminRemnaSquadsInternal(userId);
        if (!items.length) {
          await editMessageContent(ctx, "Р СњР ВµРЎвЂљ Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р Р…РЎвЂ№РЎвЂ¦ РЎРѓР С”Р Р†Р В°Р Т‘Р С•Р Р† Р Р† Remna.", {
            inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]],
          });
          return;
        }
        lastSquadsForAdd.set(userId, { clientId, items });
        const rows: InlineMarkup["inline_keyboard"] = items.slice(0, 15).map((s, i) => [
          { text: `РІС›вЂў ${s.name || s.uuid.slice(0, 8)}`, callback_data: `admin:squad:add:${clientId}:${i}` },
        ]);
        rows.push([{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]);
        await editMessageContent(ctx, "Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎРѓР С”Р Р†Р В°Р Т‘ Р Т‘Р В»РЎРЏ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р С‘РЎРЏ:", { inline_keyboard: rows });
      } catch (e: unknown) {
        await editMessageContent(ctx, `РІСњРЉ ${e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°"}`, {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]],
        });
      }
      return;
    }
    if (data.startsWith("admin:squad:remove:")) {
      const rest = data.slice("admin:squad:remove:".length);
      const parts = rest.split(":");
      const clientId = parts[0];
      const indexStr = parts[1];
      if (!clientId) return;
      if (indexStr !== undefined) {
        const index = parseInt(indexStr, 10);
        const stored = lastSquadsForRemove.get(userId);
        if (!stored || index < 0 || index >= stored.items.length) {
          await editMessageContent(ctx, "Р РЋР ВµРЎРѓРЎРѓР С‘РЎРЏ Р С‘РЎРѓРЎвЂљР ВµР С”Р В»Р В° Р С‘Р В»Р С‘ РЎРѓР С”Р Р†Р В°Р Т‘ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…. Р вЂ™Р ВµРЎР‚Р Р…Р С‘РЎвЂљР ВµРЎРѓРЎРЉ Р С” Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“.", {
            inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]],
          });
          return;
        }
        const squadUuid = stored.items[index]!.uuid;
        try {
          await api.postBotAdminClientRemnaSquadRemove(userId, clientId, squadUuid);
          lastSquadsForRemove.delete(userId);
          await editMessageContent(ctx, `РІСљвЂ¦ Р РЋР С”Р Р†Р В°Р Т‘ Р’В«${stored.items[index]!.name}Р’В» РЎС“Р В±РЎР‚Р В°Р Р….`, {
            inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]],
          });
        } catch (e: unknown) {
          await editMessageContent(ctx, `РІСњРЉ ${e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°"}`, {
            inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р СњР В°Р В·Р В°Р Т‘", callback_data: `admin:squad:remove:${clientId}` }]],
          });
        }
        return;
      }
      try {
        const remna = await api.getBotAdminClientRemna(userId, clientId);
        const allSquads = await api.getBotAdminRemnaSquadsInternal(userId);
        const uuidToName = new Map(allSquads.items.map((s) => [s.uuid, s.name || s.uuid.slice(0, 8)]));
        const current = remna.activeInternalSquads.map((uuid) => ({ uuid, name: uuidToName.get(uuid) ?? uuid.slice(0, 8) }));
        if (!current.length) {
          await editMessageContent(ctx, "Р Р€ Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЏ Р Р…Р ВµРЎвЂљ РЎРѓР С”Р Р†Р В°Р Т‘Р С•Р Р†.", {
            inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]],
          });
          return;
        }
        lastSquadsForRemove.set(userId, { clientId, items: current });
        const rows: InlineMarkup["inline_keyboard"] = current.slice(0, 15).map((s, i) => [
          { text: `РІС›вЂ“ ${s.name}`, callback_data: `admin:squad:remove:${clientId}:${i}` },
        ]);
        rows.push([{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]);
        await editMessageContent(ctx, "Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎРѓР С”Р Р†Р В°Р Т‘ Р Т‘Р В»РЎРЏ РЎС“Р Т‘Р В°Р В»Р ВµР Р…Р С‘РЎРЏ РЎС“ Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЏ:", { inline_keyboard: rows });
      } catch (e: unknown) {
        await editMessageContent(ctx, `РІСњРЉ ${e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°"}`, {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљРЎС“", callback_data: `admin:client:${clientId}` }]],
        });
      }
      return;
    }
    if (data.startsWith("admin:payments:")) {
      const rest = data.slice("admin:payments:".length);
      const [status, pageStr] = rest.split(":");
      const page = parseInt(pageStr ?? "1", 10) || 1;
      const isPending = status === "pending";
      const { items, total, limit } = await api.getBotAdminPayments(userId, isPending ? "PENDING" : "PAID", page);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const title = isPending ? `СЂСџвЂ™С– Р С›Р В¶Р С‘Р Т‘Р В°РЎР‹РЎвЂљ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ (${total})` : `СЂСџвЂ™В° Р СџР С•РЎРѓР В»Р ВµР Т‘Р Р…Р С‘Р Вµ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р С‘ (${total})`;
      let msg = `${title}\n\n`;
      const rows: InlineMarkup["inline_keyboard"] = [];
      items.forEach((p, i) => {
        const label = `${p.amount} ${p.currency} РІР‚вЂќ ${p.clientTelegramUsername || p.clientEmail || p.clientTelegramId || "РІР‚вЂќ"}`;
        msg += `${(page - 1) * limit + i + 1}. ${label}\n`;
        if (isPending) {
          rows.push([{ text: `РІСљвЂ¦ ${p.amount} ${p.currency} РІР‚вЂќ Р С•РЎвЂљР СР ВµРЎвЂљР С‘РЎвЂљРЎРЉ Р С•Р С—Р В»Р В°РЎвЂЎР ВµР Р…Р Р…РЎвЂ№Р С`, callback_data: `admin:pay:${p.id}` }]);
        }
      });
      msg += `\nР РЋРЎвЂљРЎР‚. ${page}/${totalPages}`;
      const nav: InlineMarkup["inline_keyboard"][0] = [];
      if (page > 1) nav.push({ text: "РІвЂ”Р‚ Р СњР В°Р В·Р В°Р Т‘", callback_data: `admin:payments:${status}:${page - 1}` });
      nav.push({ text: "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р В°Р Т‘Р СР С‘Р Р…Р С”РЎС“", callback_data: "admin:menu" });
      if (page < totalPages) nav.push({ text: "Р вЂ™Р С—Р ВµРЎР‚РЎвЂР Т‘ РІвЂ“В¶", callback_data: `admin:payments:${status}:${page + 1}` });
      rows.push(nav);
      await editMessageContent(ctx, msg, { inline_keyboard: rows });
      return;
    }
    if (data.startsWith("admin:pay:")) {
      const paymentId = data.slice("admin:pay:".length);
      if (!paymentId) return;
      try {
        await api.patchBotAdminPaymentMarkPaid(userId, paymentId);
        await editMessageContent(ctx, "РІСљвЂ¦ Р СџР В»Р В°РЎвЂљРЎвЂР В¶ Р С•РЎвЂљР СР ВµРЎвЂЎР ВµР Р… Р С”Р В°Р С” Р С•Р С—Р В»Р В°РЎвЂЎР ВµР Р…Р Р…РЎвЂ№Р в„–.", {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В°Р С", callback_data: "admin:payments:pending:1" }]],
        });
      } catch (e: unknown) {
        await editMessageContent(ctx, `РІСњРЉ ${e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°"}`, {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р СњР В°Р В·Р В°Р Т‘", callback_data: "admin:payments:pending:1" }]],
        });
      }
      return;
    }
    if (data === "admin:broadcast") {
      const counts = await api.getBotAdminBroadcastCount(userId);
      awaitingBroadcastMessage.add(userId);
      await editMessageContent(
        ctx,
        `СЂСџвЂњСћ Р В Р В°РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р В°\n\nР РЋР ВµР в„–РЎвЂЎР В°РЎРѓ: Telegram ${counts.withTelegram}, Email ${counts.withEmail}\n\nР С›РЎвЂљР С—РЎР‚Р В°Р Р†РЎРЉРЎвЂљР Вµ РЎвЂљР ВµР С”РЎРѓРЎвЂљ РЎРѓР С•Р С•Р В±РЎвЂ°Р ВµР Р…Р С‘РЎРЏ Р С‘Р В»Р С‘ РЎвЂћР С•РЎвЂљР С• РЎРѓ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓРЎРЉРЎР‹ (caption):`,
        { inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р С›РЎвЂљР СР ВµР Р…Р В°", callback_data: "admin:menu" }]] }
      );
      return;
    }
    if (data.startsWith("admin:bc:")) {
      const channel = data.slice("admin:bc:".length) as "tg" | "email" | "both";
      const raw = lastBroadcastMessage.get(userId);
      if (raw == null) {
        await editMessageContent(ctx, "Р СћР ВµР С”РЎРѓРЎвЂљ РЎР‚Р В°РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р С‘ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…. Р СњР В°РЎвЂЎР Р…Р С‘РЎвЂљР Вµ Р В·Р В°Р Р…Р С•Р Р†Р С•.", {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р В°Р Т‘Р СР С‘Р Р…Р С”РЎС“", callback_data: "admin:menu" }]],
        });
        return;
      }
      const msg: BroadcastPayload = typeof raw === "string" ? { text: raw } : raw;
      const ch: "telegram" | "email" | "both" = channel === "tg" ? "telegram" : channel === "email" ? "email" : "both";
      const channelLabel = ch === "telegram" ? "Telegram" : ch === "email" ? "Email" : "Telegram Р С‘ Email";
      // Р РЋРЎР‚Р В°Р В·РЎС“ Р С—Р С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С, РЎвЂЎРЎвЂљР С• РЎР‚Р В°РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р В° Р В·Р В°Р С—РЎС“РЎвЂ°Р ВµР Р…Р В°, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р В±РЎвЂ№Р В»Р С• Р С—Р С•Р Р…РЎРЏРЎвЂљР Р…Р С• Р С‘ Р Р…Р Вµ Р Р…Р В°Р В¶Р С‘Р СР В°Р В»Р С‘ Р С—Р С•Р Р†РЎвЂљР С•РЎР‚Р Р…Р С•
      await editMessageContent(ctx, `СЂСџвЂњСћ Р В Р В°РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р В° Р С—Р С• Р С”Р В°Р Р…Р В°Р В»РЎС“ Р’В«${channelLabel}Р’В» Р В·Р В°Р С—РЎС“РЎвЂ°Р ВµР Р…Р В°, Р С—Р С•Р Т‘Р С•Р В¶Р Т‘Р С‘РЎвЂљР ВµРІР‚В¦`, {
        inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р В°Р Т‘Р СР С‘Р Р…Р С”РЎС“", callback_data: "admin:menu" }]],
      });
      lastBroadcastMessage.delete(userId);
      try {
        const result = await api.postBotAdminBroadcast(userId, msg.text, ch, msg.photoFileId, msg.buttonText, msg.buttonUrl);
        const text = `РІСљвЂ¦ Р В Р В°РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р В° Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р В°.\n\nTelegram: Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р С• ${result.sentTelegram}, Р С•РЎв‚¬Р С‘Р В±Р С•Р С” ${result.failedTelegram}\nEmail: Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р С• ${result.sentEmail}, Р С•РЎв‚¬Р С‘Р В±Р С•Р С” ${result.failedEmail}${result.errors?.length ? "\n\nР С›РЎв‚¬Р С‘Р В±Р С”Р С‘: " + result.errors.slice(0, 3).join("; ") : ""}`;
        await editMessageContent(ctx, text, {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р В°Р Т‘Р СР С‘Р Р…Р С”РЎС“", callback_data: "admin:menu" }]],
        });
      } catch (e: unknown) {
        await editMessageContent(ctx, `РІСњРЉ ${e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°"}`, {
          inline_keyboard: [[{ text: "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р В°Р Т‘Р СР С‘Р Р…Р С”РЎС“", callback_data: "admin:menu" }]],
        });
      }
      return;
    }
    if (data.startsWith("admin:block:")) {
      const clientId = data.slice("admin:block:".length);
      if (!clientId) return;
      await api.patchBotAdminClientBlock(userId, clientId, true);
      const client = await api.getBotAdminClient(userId, clientId);
      const created = client.createdAt ? new Date(client.createdAt).toLocaleString("ru-RU") : "РІР‚вЂќ";
      let text = `СЂСџвЂВ¤ ${client.email || client.telegramUsername || client.telegramId || client.id}\n\nID: ${client.id}\nР вЂР В°Р В»Р В°Р Р…РЎРѓ: ${client.balance}\nР В Р ВµРЎвЂћР ВµРЎР‚Р В°Р В»Р С•Р Р†: ${client._count?.referrals ?? 0}\nР РЋР С•Р В·Р Т‘Р В°Р Р…: ${created}\n\nСЂСџС™В« Р вЂ”Р В°Р В±Р В»Р С•Р С”Р С‘РЎР‚Р С•Р Р†Р В°Р Р…`;
      const kb: InlineMarkup["inline_keyboard"] = [
        [{ text: "РІСљвЂ¦ Р В Р В°Р В·Р В±Р В»Р С•Р С”Р С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ", callback_data: `admin:unblock:${client.id}` }],
        [{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ РЎРѓР С—Р С‘РЎРѓР С”РЎС“", callback_data: "admin:clients:1" }],
      ];
      await editMessageContent(ctx, text, { inline_keyboard: kb });
      return;
    }
    if (data.startsWith("admin:unblock:")) {
      const clientId = data.slice("admin:unblock:".length);
      if (!clientId) return;
      await api.patchBotAdminClientBlock(userId, clientId, false);
      const client = await api.getBotAdminClient(userId, clientId);
      const created = client.createdAt ? new Date(client.createdAt).toLocaleString("ru-RU") : "РІР‚вЂќ";
      let text = `СЂСџвЂВ¤ ${client.email || client.telegramUsername || client.telegramId || client.id}\n\nID: ${client.id}\nР вЂР В°Р В»Р В°Р Р…РЎРѓ: ${client.balance}\nР В Р ВµРЎвЂћР ВµРЎР‚Р В°Р В»Р С•Р Р†: ${client._count?.referrals ?? 0}\nР РЋР С•Р В·Р Т‘Р В°Р Р…: ${created}`;
      const kb: InlineMarkup["inline_keyboard"] = [
        [{ text: "СЂСџС™В« Р вЂ”Р В°Р В±Р В»Р С•Р С”Р С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ", callback_data: `admin:block:${client.id}` }],
        [{ text: "РІвЂ”Р‚РїС‘РЏ Р С™ РЎРѓР С—Р С‘РЎРѓР С”РЎС“", callback_data: "admin:clients:1" }],
      ];
      await editMessageContent(ctx, text, { inline_keyboard: kb });
      return;
    }
    return;
  }

  const token = await getOrRestoreToken(userId, ctx.from?.username);
  if (!token) {
    await ctx.reply(_t("auth_failed", getUserLang(userId)));
    return;
  }

  try {
    const config = await api.getPublicConfig();
    if (config?.translations) setTranslations(config.translations);

    // Р С›Р В±РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р В° Р С”Р Р…Р С•Р С—Р С”Р С‘ Р’В«Р Р‡ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР В°Р В»РЎРѓРЎРЏР’В»
    if (data === "check_subscribe") {
      const lang = getUserLang(userId);
      const channelId = config?.forceSubscribeChannelId?.trim();
      if (channelId && config?.forceSubscribeEnabled) {
        const result = await checkUserSubscription(userId, channelId);
        if (result.state === "cannot_verify") {
          await ctx.answerCallbackQuery({
            text: _t("subscribe.cannot_verify", lang).slice(0, 200),
            show_alert: true,
          }).catch(() => {});
          await editMessageContent(
            ctx,
            `РІС™В РїС‘РЏ ${_t("subscribe.cannot_verify", lang)}`,
            subscribeKeyboard(channelId, lang)
          );
          return;
        }
        if (result.state !== "subscribed") {
          await ctx.answerCallbackQuery({ text: _t("subscribe.not_subscribed", lang), show_alert: true }).catch(() => {});
          return;
        }
      }
      await ctx.answerCallbackQuery({ text: _t("subscribe.confirmed", lang) }).catch(() => {});
      await ctx.reply(_t("subscribe.send_start", lang));
      return;
    }

    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”Р С‘ Р Р…Р В° Р С”Р В°Р Р…Р В°Р В» Р Т‘Р В»РЎРЏ Р Р†РЎРѓР ВµРЎвЂ¦ Р Т‘Р ВµР в„–РЎРѓРЎвЂљР Р†Р С‘Р в„–
    if (config?.forceSubscribeEnabled && config.forceSubscribeChannelId?.trim()) {
      const lang = getUserLang(userId);
      const channelId = config.forceSubscribeChannelId.trim();
      const result = await checkUserSubscription(userId, channelId);
      if (result.state !== "subscribed") {
        const msg = config.forceSubscribeMessage?.trim() || _t("subscribe.default_message", lang);
        const details = result.state === "cannot_verify"
          ? `\n\n${_t("subscribe.cannot_verify", lang)}`
          : "";
        await editMessageContent(ctx, `РІС™В РїС‘РЏ ${msg}${details}`, subscribeKeyboard(channelId, lang));
        return;
      }
    }

    const appUrl = config?.publicAppUrl?.replace(/\/$/, "") ?? null;
    const rawStyles = config?.botInnerButtonStyles;
    const innerStyles = {
      tariffPay: rawStyles?.tariffPay !== undefined ? rawStyles.tariffPay : "success",
      topup: rawStyles?.topup !== undefined ? rawStyles.topup : "primary",
      back: rawStyles?.back !== undefined ? rawStyles.back : "danger",
      profile: rawStyles?.profile !== undefined ? rawStyles.profile : "primary",
      trialConfirm: rawStyles?.trialConfirm !== undefined ? rawStyles.trialConfirm : "success",
      lang: rawStyles?.lang !== undefined ? rawStyles.lang : "primary",
      currency: rawStyles?.currency !== undefined ? rawStyles.currency : "primary",
    };
    const botEmojis = config?.botEmojis;
    const innerEmojiIds: InnerEmojiIds | undefined = botEmojis
      ? {
          back: botEmojis.BACK?.tgEmojiId,
          card: botEmojis.CARD?.tgEmojiId,
          tariff: botEmojis.PACKAGE?.tgEmojiId || botEmojis.TARIFFS?.tgEmojiId,
          trial: botEmojis.TRIAL?.tgEmojiId,
          profile: botEmojis.PUZZLE?.tgEmojiId || botEmojis.PROFILE?.tgEmojiId,
          connect: botEmojis.SERVERS?.tgEmojiId || botEmojis.CONNECT?.tgEmojiId,
        }
      : undefined;

    if (data === "menu:main") {
      const [client, subRes, proxyRes, singboxRes] = await Promise.all([
        api.getMe(token),
        api.getSubscription(token).catch(() => ({ subscription: null })),
        api.getPublicProxyTariffs().catch(() => ({ items: [] })),
        api.getPublicSingboxTariffs().catch(() => ({ items: [] })),
      ]);
      if (client?.preferredLang) setUserLang(userId, client.preferredLang);
      const vpnUrl = getSubscriptionUrl(subRes.subscription);
      const showTrial = Boolean(config?.trialEnabled && !client?.trialUsed);
      const showProxy = proxyRes.items?.some((c: { tariffs: unknown[] }) => c.tariffs?.length > 0) ?? false;
      const showSingbox = singboxRes.items?.some((c: { tariffs: unknown[] }) => c.tariffs?.length > 0) ?? false;
      const name = config?.serviceName?.trim() || "Р С™Р В°Р В±Р С‘Р Р…Р ВµРЎвЂљ";
      const { text, entities } = buildMainMenuText({
        serviceName: name,
        balance: client?.balance ?? 0,
        currency: client?.preferredCurrency ?? config?.defaultCurrency ?? "usd",
        subscription: subRes.subscription,
        tariffDisplayName: (subRes as { tariffDisplayName?: string | null }).tariffDisplayName ?? null,
        menuTexts: config?.botMenuTexts ?? config?.resolvedBotMenuTexts ?? null,
        menuLineVisibility: config?.botMenuLineVisibility ?? null,
        menuTextCustomEmojiIds: config?.menuTextCustomEmojiIds ?? null,
        botEmojis: config?.botEmojis ?? null,
      });
      const hasVideoInstructionsCb = config?.videoInstructionsEnabled && (config?.videoInstructions?.length ?? 0) > 0;
      const hasSupportLinks = !!(config?.supportLink || config?.agreementLink || config?.offerLink || config?.instructionsLink || hasVideoInstructionsCb);
      const backMarkup = mainMenu({
        showTrial,
        showVpn: Boolean(vpnUrl),
        showProxy,
        showSingbox,
        showGift: config?.giftSubscriptionsEnabled === true,
        appUrl,
        botButtons: config?.botButtons ?? null,
        botBackLabel: config?.botBackLabel ?? null,
        hasSupportLinks,
        showTickets: config?.ticketsEnabled === true,
        showExtraOptions: config?.sellOptionsEnabled === true && (config?.sellOptions?.length ?? 0) > 0,
        buttonsPerRow: config?.botButtonsPerRow ?? 1,
        remnaSubscriptionUrl: config?.useRemnaSubscriptionPage ? vpnUrl : null,
      });
      if (config?.botAdminTelegramIds?.includes(String(userId))) {
        backMarkup.inline_keyboard.push([{ text: "РІС™в„ўРїС‘РЏ Р СџР В°Р Р…Р ВµР В»РЎРЉ Р В°Р Т‘Р СР С‘Р Р…Р В°", callback_data: "admin:menu" }]);
      }
      await editMessageContent(ctx, text, backMarkup, entities);
      return;
    }

    if (data === "menu:support") {
      const lang = getUserLang(userId);
      const hasVideoInstr = config?.videoInstructionsEnabled && (config?.videoInstructions?.length ?? 0) > 0;
      const hasAny = config?.supportLink || config?.agreementLink || config?.offerLink || config?.instructionsLink || hasVideoInstr;
      if (!hasAny) {
        await editMessageContent(ctx, _t("support.not_configured", lang), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      await editMessageContent(
        ctx,
        _t("support.title", lang),
        supportSubMenu(
          {
            support: config?.supportLink,
            agreement: config?.agreementLink,
            offer: config?.offerLink,
            instructions: config?.instructionsLink,
            hasVideoInstructions: hasVideoInstr,
          },
          config?.botBackLabel ?? null,
          innerStyles?.back,
          innerEmojiIds,
          lang
        )
      );
      return;
    }

    if (data === "menu:video_instructions") {
      const vItems = config?.videoInstructions ?? [];
      if (!vItems.length) {
        await editMessageContent(ctx, "Р ВР Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘Р С‘ Р С—Р С•Р С”Р В° Р Р…Р Вµ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…РЎвЂ№.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const backLabel = (config?.botBackLabel && config.botBackLabel.trim()) || "Р’В« Р СњР В°Р В·Р В°Р Т‘";
      const rows: { text: string; callback_data: string }[][] = vItems
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((v) => [{ text: `СЂСџвЂњв„– ${v.title}`, callback_data: `vinstr:${v.id}` }]);
      rows.push([{ text: backLabel, callback_data: "menu:support" }]);
      await editMessageContent(ctx, "СЂСџвЂњв„– Р вЂ™Р С‘Р Т‘Р ВµР С•-Р С‘Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘Р С‘\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ Р С‘Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘РЎР‹:", { inline_keyboard: rows });
      return;
    }

    if (data.startsWith("vinstr:")) {
      const instrId = data.slice(7);
      const vItems = config?.videoInstructions ?? [];
      const instr = vItems.find((v) => v.id === instrId);
      if (!instr) {
        await editMessageContent(ctx, "Р ВР Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const backLabel = (config?.botBackLabel && config.botBackLabel.trim()) || "Р’В« Р СњР В°Р В·Р В°Р Т‘";
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      try {
        await ctx.deleteMessage().catch(() => {});
      } catch { /* ignore */ }
      try {
        await ctx.api.sendVideo(chatId, instr.telegramFileId, {
          caption: `СЂСџвЂњв„– ${instr.title}`,
          reply_markup: {
            inline_keyboard: [
              [{ text: "Р’В« Р СњР В°Р В·Р В°Р Т‘ Р С” Р С‘Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘РЎРЏР С", callback_data: "menu:video_instructions_fresh" }],
              [{ text: "СЂСџРЏВ  Р вЂњР В»Р В°Р Р†Р Р…Р С•Р Вµ Р СР ВµР Р…РЎР‹", callback_data: "menu:main" }],
            ],
          },
        });
      } catch (e) {
        await ctx.api.sendMessage(chatId, "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С‘РЎвЂљРЎРЉ Р Р†Р С‘Р Т‘Р ВµР С•. Р СџР С•Р С—РЎР‚Р С•Р В±РЎС“Р в„–РЎвЂљР Вµ Р С—Р С•Р В·Р В¶Р Вµ.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Р’В« Р СњР В°Р В·Р В°Р Т‘ Р С” Р С‘Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘РЎРЏР С", callback_data: "menu:video_instructions_fresh" }],
              [{ text: "СЂСџРЏВ  Р вЂњР В»Р В°Р Р†Р Р…Р С•Р Вµ Р СР ВµР Р…РЎР‹", callback_data: "menu:main" }],
            ],
          },
        });
      }
      return;
    }

    if (data === "menu:video_instructions_fresh") {
      const vItems = config?.videoInstructions ?? [];
      if (!vItems.length) {
        await ctx.api.sendMessage(ctx.chat!.id, "Р ВР Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘Р С‘ Р С—Р С•Р С”Р В° Р Р…Р Вµ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…РЎвЂ№.", {
          reply_markup: backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds),
        });
        return;
      }
      const backLabel = (config?.botBackLabel && config.botBackLabel.trim()) || "Р’В« Р СњР В°Р В·Р В°Р Т‘";
      const rows: { text: string; callback_data: string }[][] = vItems
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((v) => [{ text: `СЂСџвЂњв„– ${v.title}`, callback_data: `vinstr:${v.id}` }]);
      rows.push([{ text: backLabel, callback_data: "menu:support" }]);
      try {
        await ctx.deleteMessage().catch(() => {});
      } catch { /* ignore */ }
      await ctx.api.sendMessage(ctx.chat!.id, "СЂСџвЂњв„– Р вЂ™Р С‘Р Т‘Р ВµР С•-Р С‘Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘Р С‘\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ Р С‘Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘РЎР‹:", {
        reply_markup: { inline_keyboard: rows },
      });
      return;
    }

    if (data === "menu:tariffs") {
      const { items } = await api.getPublicTariffs();
      if (!items?.length) {
        await editMessageContent(ctx, _t("tariffs.not_configured", getUserLang(userId)), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const tariffsEmojiKey = getMenuEmojiKey(config, "tariffs");
      const tariffsEmojiEntry = tariffsEmojiKey ? config?.botEmojis?.[tariffsEmojiKey] : undefined;
      const tariffsEmojiUnicode = tariffsEmojiKey && !tariffsEmojiEntry?.tgEmojiId
        ? (tariffsEmojiEntry?.unicode?.trim() || DEFAULT_EMOJI_UNICODE[tariffsEmojiKey])
        : undefined;
      const tariffsEmojiIds = innerEmojiIds && tariffsEmojiEntry?.tgEmojiId
        ? { ...innerEmojiIds, tariff: tariffsEmojiEntry.tgEmojiId }
        : innerEmojiIds;
      if (items.length > 1) {
        const { text, entities } = titleWithOptionalEmoji(tariffsEmojiKey, "Р СћР В°РЎР‚Р С‘РЎвЂћРЎвЂ№\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘РЎР‹:", config?.botEmojis);
        await editMessageContent(ctx, text, tariffPayButtons(items, config?.botBackLabel ?? null, innerStyles, tariffsEmojiIds, tariffsEmojiUnicode), entities);
        return;
      }
      const cat = items[0]!;
      const nameOnly = (cat.name || "").replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, "").trim() || cat.name || "";
      const head = (cat.emoji && cat.emoji.trim() ? cat.emoji + " " : "") + nameOnly;
      const tariffFields = { ...DEFAULT_TARIFF_LINE_FIELDS, ...(config?.botTariffsFields ?? {}) };
      const template = (config?.botTariffsText ?? "").trim() || DEFAULT_TARIFFS_TEXT;
      const tariffLines = cat.tariffs.map((t: TariffItem) => formatTariffLine(t, tariffFields)).join("\n");
      const body = renderTariffsText(template, head, tariffLines);
      const { text, entities } = titleWithOptionalEmoji(tariffsEmojiKey, body, config?.botEmojis);
      await editMessageContent(ctx, text, tariffPayButtons(items, config?.botBackLabel ?? null, innerStyles, tariffsEmojiIds, tariffsEmojiUnicode), entities);
      return;
    }

    if (data.startsWith("cat_tariffs:")) {
      const categoryId = data.slice("cat_tariffs:".length);
      const { items } = await api.getPublicTariffs();
      const category = items?.find((c: TariffCategory) => c.id === categoryId);
      if (!category?.tariffs?.length) {
        await editMessageContent(ctx, "Р С™Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const nameOnly = (category.name || "").replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, "").trim() || category.name || "";
      const head = (category.emoji && category.emoji.trim() ? category.emoji + " " : "") + nameOnly;
      const tariffsEmojiKey = getMenuEmojiKey(config, "tariffs");
      const tariffsEmojiEntry = tariffsEmojiKey ? config?.botEmojis?.[tariffsEmojiKey] : undefined;
      const tariffsEmojiUnicode = tariffsEmojiKey && !tariffsEmojiEntry?.tgEmojiId
        ? (tariffsEmojiEntry?.unicode?.trim() || DEFAULT_EMOJI_UNICODE[tariffsEmojiKey])
        : undefined;
      const tariffsEmojiIds = innerEmojiIds && tariffsEmojiEntry?.tgEmojiId
        ? { ...innerEmojiIds, tariff: tariffsEmojiEntry.tgEmojiId }
        : innerEmojiIds;
      const tariffFields = { ...DEFAULT_TARIFF_LINE_FIELDS, ...(config?.botTariffsFields ?? {}) };
      const template = (config?.botTariffsText ?? "").trim() || DEFAULT_TARIFFS_TEXT;
      const tariffLines = category.tariffs.map((t: TariffItem) => formatTariffLine(t, tariffFields)).join("\n");
      const body = renderTariffsText(template, head, tariffLines);
      const { text, entities } = titleWithOptionalEmoji(tariffsEmojiKey, body, config?.botEmojis);
      await editMessageContent(ctx, text, tariffsOfCategoryButtons(category, config?.botBackLabel ?? null, innerStyles, "menu:tariffs", tariffsEmojiIds, tariffsEmojiUnicode), entities);
      return;
    }

    if (data === "menu:proxy") {
      const { items } = await api.getPublicProxyTariffs();
      if (!items?.length || items.every((c: { tariffs: unknown[] }) => !c.tariffs?.length)) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћРЎвЂ№ Р С—РЎР‚Р С•Р С”РЎРѓР С‘ Р С—Р С•Р С”Р В° Р Р…Р Вµ Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р ВµР Р…РЎвЂ№.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const cats = items.filter((c: { tariffs: unknown[] }) => c.tariffs?.length > 0);
      if (cats.length === 1 && cats[0]!.tariffs.length <= 5) {
        const head = cats[0]!.name;
        const lines = cats[0]!.tariffs.map((t: { name: string; price: number; currency: string }) => `РІР‚Сћ ${t.name} РІР‚вЂќ ${t.price} ${t.currency}`).join("\n");
        await editMessageContent(ctx, `СЂСџРЉС’ Р СџРЎР‚Р С•Р С”РЎРѓР С‘\n\n${head}\n${lines}\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎвЂљР В°РЎР‚Р С‘РЎвЂћ:`, proxyTariffPayButtons(cats, config?.botBackLabel ?? null, innerStyles, innerEmojiIds));
      } else {
        await editMessageContent(ctx, "СЂСџРЉС’ Р СџРЎР‚Р С•Р С”РЎРѓР С‘\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘РЎР‹:", proxyTariffPayButtons(cats, config?.botBackLabel ?? null, innerStyles, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("cat_proxy:")) {
      const categoryId = data.slice("cat_proxy:".length);
      const { items } = await api.getPublicProxyTariffs();
      const category = items?.find((c: { id: string }) => c.id === categoryId);
      if (!category?.tariffs?.length) {
        await editMessageContent(ctx, "Р С™Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const head = category.name;
      const lines = category.tariffs.map((t: { name: string; price: number; currency: string }) => `РІР‚Сћ ${t.name} РІР‚вЂќ ${t.price} ${t.currency}`).join("\n");
      await editMessageContent(ctx, `СЂСџРЉС’ ${head}\n\n${lines}\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎвЂљР В°РЎР‚Р С‘РЎвЂћ:`, proxyTariffsOfCategoryButtons(category, config?.botBackLabel ?? null, innerStyles, "menu:proxy", innerEmojiIds));
      return;
    }

    if (data === "menu:singbox") {
      const { items } = await api.getPublicSingboxTariffs();
      if (!items?.length || items.every((c: { tariffs: unknown[] }) => !c.tariffs?.length)) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћРЎвЂ№ Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р С•Р Р† Р С—Р С•Р С”Р В° Р Р…Р Вµ Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р ВµР Р…РЎвЂ№.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const cats = items.filter((c: { tariffs: unknown[] }) => c.tariffs?.length > 0);
      if (cats.length === 1 && cats[0]!.tariffs.length <= 5) {
        const head = cats[0]!.name;
        const lines = cats[0]!.tariffs.map((t: { name: string; price: number; currency: string }) => `РІР‚Сћ ${t.name} РІР‚вЂќ ${t.price} ${t.currency}`).join("\n");
        await editMessageContent(ctx, `СЂСџвЂќвЂ Р вЂќР С•РЎРѓРЎвЂљРЎС“Р С—РЎвЂ№\n\n${head}\n${lines}\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎвЂљР В°РЎР‚Р С‘РЎвЂћ:`, singboxTariffPayButtons(cats, config?.botBackLabel ?? null, innerStyles, innerEmojiIds));
      } else {
        await editMessageContent(ctx, "СЂСџвЂќвЂ Р вЂќР С•РЎРѓРЎвЂљРЎС“Р С—РЎвЂ№\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘РЎР‹:", singboxTariffPayButtons(cats, config?.botBackLabel ?? null, innerStyles, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("cat_singbox:")) {
      const categoryId = data.slice("cat_singbox:".length);
      const { items } = await api.getPublicSingboxTariffs();
      const category = items?.find((c: { id: string }) => c.id === categoryId);
      if (!category?.tariffs?.length) {
        await editMessageContent(ctx, "Р С™Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const head = category.name;
      const lines = category.tariffs.map((t: { name: string; price: number; currency: string }) => `РІР‚Сћ ${t.name} РІР‚вЂќ ${t.price} ${t.currency}`).join("\n");
      await editMessageContent(ctx, `СЂСџвЂќвЂ ${head}\n\n${lines}\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎвЂљР В°РЎР‚Р С‘РЎвЂћ:`, singboxTariffsOfCategoryButtons(category, config?.botBackLabel ?? null, innerStyles, "menu:singbox", innerEmojiIds));
      return;
    }

    if (data === "menu:my_singbox") {
      const slotsRes = await api.getSingboxSlots(token);
      const slots = slotsRes.slots ?? [];
      if (slots.length === 0) {
        await editMessageContent(ctx, "Р Р€ Р Р†Р В°РЎРѓ Р С—Р С•Р С”Р В° Р Р…Р ВµРЎвЂљ Р В°Р С”РЎвЂљР С‘Р Р†Р Р…РЎвЂ№РЎвЂ¦ Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р С•Р Р†. Р С™РЎС“Р С—Р С‘РЎвЂљР Вµ РЎвЂљР В°РЎР‚Р С‘РЎвЂћ Р Р† РЎР‚Р В°Р В·Р Т‘Р ВµР В»Р Вµ Р’В«Р вЂќР С•РЎРѓРЎвЂљРЎС“Р С—РЎвЂ№Р’В».", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const lines = slots.map((s: { subscriptionLink: string; expiresAt: string; protocol: string }) => {
        const exp = new Date(s.expiresAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
        return `${s.protocol} РІР‚вЂќ Р Т‘Р С• ${exp}\n${s.subscriptionLink}`;
      }).join("\n\n");
      const msg = `СЂСџвЂњвЂ№ Р СљР С•Р С‘ Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—РЎвЂ№ (${slots.length})\n\nР РЋР С”Р С•Р С—Р С‘РЎР‚РЎС“Р в„–РЎвЂљР Вµ РЎРѓРЎРѓРЎвЂ№Р В»Р С”РЎС“ Р Р† Р С—РЎР‚Р С‘Р В»Р С•Р В¶Р ВµР Р…Р С‘Р Вµ (v2rayN, Nekoray Р С‘ Р Т‘РЎР‚.):\n\n${lines}`;
      await editMessageContent(ctx, msg.slice(0, 4096), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      return;
    }

    if (data === "menu:my_proxy") {
      const { slots } = await api.getProxySlots(token);
      if (!slots?.length) {
        await editMessageContent(ctx, "СЂСџвЂњвЂ№ Р СљР С•Р С‘ Р С—РЎР‚Р С•Р С”РЎРѓР С‘\n\nР Р€ Р Р†Р В°РЎРѓ Р С—Р С•Р С”Р В° Р Р…Р ВµРЎвЂљ Р В°Р С”РЎвЂљР С‘Р Р†Р Р…РЎвЂ№РЎвЂ¦ Р С—РЎР‚Р С•Р С”РЎРѓР С‘. Р С™РЎС“Р С—Р С‘РЎвЂљР Вµ РЎвЂљР В°РЎР‚Р С‘РЎвЂћ Р Р† РЎР‚Р В°Р В·Р Т‘Р ВµР В»Р Вµ Р’В«Р СџРЎР‚Р С•Р С”РЎРѓР С‘Р’В».", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      let text = "СЂСџвЂњвЂ№ Р СљР С•Р С‘ Р С—РЎР‚Р С•Р С”РЎРѓР С‘\n\n";
      for (const s of slots) {
        text += `РІР‚Сћ SOCKS5: \`socks5://${s.login}:${s.password}@${s.host}:${s.socksPort}\`\n`;
        text += `РІР‚Сћ HTTP: \`http://${s.login}:${s.password}@${s.host}:${s.httpPort}\`\n`;
        text += `  Р вЂќР С•: ${new Date(s.expiresAt).toLocaleString("ru-RU")}\n\n`;
      }
      text += "Р РЋР С”Р С•Р С—Р С‘РЎР‚РЎС“Р в„–РЎвЂљР Вµ РЎРѓРЎвЂљРЎР‚Р С•Р С”РЎС“ Р Р† Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р в„–Р С”Р С‘ Р С—РЎР‚Р С•Р С”РЎРѓР С‘ Р С—РЎР‚Р С‘Р В»Р С•Р В¶Р ВµР Р…Р С‘РЎРЏ.";
      await editMessageContent(ctx, text.slice(0, 4096), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      return;
    }

    if (data.startsWith("pay_proxy_balance:")) {
      const proxyTariffId = data.slice("pay_proxy_balance:".length);
      try {
        const result = await api.payByBalance(token, { proxyTariffId });
        await editMessageContent(ctx, `РІСљвЂ¦ ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_proxy_yoomoney:")) {
      const proxyTariffId = data.slice("pay_proxy_yoomoney:".length);
      const { items } = await api.getPublicProxyTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === proxyTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYoomoneyPayment(token, { amount: tariff.price, paymentType: "AC", proxyTariffId });
        const msg = buildPaymentMessage(config, {
          name: tariff.name,
          price: formatMoney(tariff.price, tariff.currency),
          amount: String(tariff.price),
          currency: tariff.currency,
          action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Money:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В°";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_proxy_yookassa:")) {
      const proxyTariffId = data.slice("pay_proxy_yookassa:".length);
      const { items } = await api.getPublicProxyTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === proxyTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (tariff.currency.toUpperCase() !== "RUB") {
        await editMessageContent(ctx, "Р В®Kassa Р С—РЎР‚Р С‘Р Р…Р С‘Р СР В°Р ВµРЎвЂљ РЎвЂљР С•Р В»РЎРЉР С”Р С• РЎР‚РЎС“Р В±Р В»Р С‘ (RUB).", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYookassaPayment(token, { amount: tariff.price, currency: "RUB", proxyTariffId });
        const msg = buildPaymentMessage(config, {
          name: tariff.name,
          price: formatMoney(tariff.price, tariff.currency),
          amount: String(tariff.price),
          currency: tariff.currency,
          action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Kassa:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В°";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_proxy_cryptopay:")) {
      const proxyTariffId = data.slice("pay_proxy_cryptopay:".length);
      const { items } = await api.getPublicProxyTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === proxyTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createCryptopayPayment(token, { amount: tariff.price, currency: tariff.currency, proxyTariffId });
        const msg = buildPaymentMessage(config, { name: tariff.name, price: formatMoney(tariff.price, tariff.currency), amount: String(tariff.price), currency: tariff.currency, action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Crypto Bot:" });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.payUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В°";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_proxy:")) {
      const rest = data.slice("pay_proxy:".length);
      const parts = rest.split(":");
      const proxyTariffId = parts[0];
      const methodIdFromBtn = parts.length >= 2 ? Number(parts[1]) : null;
      const { items } = await api.getPublicProxyTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === proxyTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const methods = config?.plategaMethods ?? [];
      const client = await api.getMe(token);
      const balanceLabel = client && client.balance >= tariff.price ? `СЂСџвЂ™В° Р С›Р С—Р В»Р В°РЎвЂљР С‘РЎвЂљРЎРЉ Р В±Р В°Р В»Р В°Р Р…РЎРѓР С•Р С (${formatMoney(client.balance, client.preferredCurrency ?? "RUB")})` : null;
      const discountInfoProxy = activeDiscountCode.get(userId);
      const promoCodeProxy = discountInfoProxy?.code;
      const discountArgProxy = discountInfoProxy ? {
        originalPrice: formatMoney(tariff.price, tariff.currency),
        discountedPrice: formatMoney(getDiscountedPrice(tariff.price, discountInfoProxy), tariff.currency),
      } : undefined;
      if (methodIdFromBtn != null && Number.isFinite(methodIdFromBtn)) {
        try {
          const payment = await api.createPlategaPayment(token, {
            amount: tariff.price,
            currency: tariff.currency,
            paymentMethod: methodIdFromBtn,
            description: `Р СџРЎР‚Р С•Р С”РЎРѓР С‘: ${tariff.name}`,
            proxyTariffId: tariff.id,
            promoCode: promoCodeProxy,
          });
          if (promoCodeProxy) activeDiscountCode.delete(userId);
          const msg = buildPaymentMessage(config, {
            name: tariff.name,
            price: formatMoney(tariff.price, tariff.currency),
            amount: String(tariff.price),
            currency: tariff.currency,
            action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:",
          }, discountArgProxy);
          await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°";
          await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        }
        return;
      }
      const markup = proxyPaymentMethodButtons(
        proxyTariffId,
        methods,
        config?.botBackLabel ?? null,
        innerStyles?.back,
        innerEmojiIds,
        balanceLabel,
        !!config?.yoomoneyEnabled,
        !!config?.yookassaEnabled,
        !!config?.cryptopayEnabled,
        tariff.currency,
      );
      const msg = buildPaymentMessage(config, {
        name: tariff.name,
        price: formatMoney(tariff.price, tariff.currency),
        amount: String(tariff.price),
        currency: tariff.currency,
        action: "Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎРѓР С—Р С•РЎРѓР С•Р В± Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:",
      }, discountArgProxy);
      await editMessageContent(ctx, msg.text, markup, msg.entities);
      return;
    }

    if (data.startsWith("pay_singbox_balance:")) {
      const singboxTariffId = data.slice("pay_singbox_balance:".length);
      try {
        const result = await api.payByBalance(token, { singboxTariffId });
        await editMessageContent(ctx, `РІСљвЂ¦ ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_singbox_yoomoney:")) {
      const singboxTariffId = data.slice("pay_singbox_yoomoney:".length);
      const { items } = await api.getPublicSingboxTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === singboxTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYoomoneyPayment(token, { amount: tariff.price, paymentType: "AC", singboxTariffId });
        const msg = buildPaymentMessage(config, {
          name: tariff.name,
          price: formatMoney(tariff.price, tariff.currency),
          amount: String(tariff.price),
          currency: tariff.currency,
          action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Money:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В°";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_singbox_yookassa:")) {
      const singboxTariffId = data.slice("pay_singbox_yookassa:".length);
      const { items } = await api.getPublicSingboxTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === singboxTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (tariff.currency.toUpperCase() !== "RUB") {
        await editMessageContent(ctx, "Р В®Kassa Р С—РЎР‚Р С‘Р Р…Р С‘Р СР В°Р ВµРЎвЂљ РЎвЂљР С•Р В»РЎРЉР С”Р С• РЎР‚РЎС“Р В±Р В»Р С‘ (RUB).", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYookassaPayment(token, { amount: tariff.price, currency: "RUB", singboxTariffId });
        const msg = buildPaymentMessage(config, {
          name: tariff.name,
          price: formatMoney(tariff.price, tariff.currency),
          amount: String(tariff.price),
          currency: tariff.currency,
          action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Kassa:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В°";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_singbox_cryptopay:")) {
      const singboxTariffId = data.slice("pay_singbox_cryptopay:".length);
      const { items } = await api.getPublicSingboxTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === singboxTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createCryptopayPayment(token, { amount: tariff.price, currency: tariff.currency, singboxTariffId });
        const msg = buildPaymentMessage(config, { name: tariff.name, price: formatMoney(tariff.price, tariff.currency), amount: String(tariff.price), currency: tariff.currency, action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Crypto Bot:" });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.payUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В°";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_singbox:")) {
      const rest = data.slice("pay_singbox:".length);
      const parts = rest.split(":");
      const singboxTariffId = parts[0];
      const methodIdFromBtn = parts.length >= 2 ? Number(parts[1]) : null;
      const { items } = await api.getPublicSingboxTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === singboxTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const methods = config?.plategaMethods ?? [];
      const client = await api.getMe(token);
      const balanceLabel = client && client.balance >= tariff.price ? `СЂСџвЂ™В° Р С›Р С—Р В»Р В°РЎвЂљР С‘РЎвЂљРЎРЉ Р В±Р В°Р В»Р В°Р Р…РЎРѓР С•Р С (${formatMoney(client.balance, client.preferredCurrency ?? "RUB")})` : null;
      const discountInfoSingbox = activeDiscountCode.get(userId);
      const promoCodeSingbox = discountInfoSingbox?.code;
      const discountArgSingbox = discountInfoSingbox ? {
        originalPrice: formatMoney(tariff.price, tariff.currency),
        discountedPrice: formatMoney(getDiscountedPrice(tariff.price, discountInfoSingbox), tariff.currency),
      } : undefined;
      if (methodIdFromBtn != null && Number.isFinite(methodIdFromBtn)) {
        try {
          const payment = await api.createPlategaPayment(token, {
            amount: tariff.price,
            currency: tariff.currency,
            paymentMethod: methodIdFromBtn,
            description: `Р вЂќР С•РЎРѓРЎвЂљРЎС“Р С—РЎвЂ№: ${tariff.name}`,
            singboxTariffId: tariff.id,
            promoCode: promoCodeSingbox,
          });
          if (promoCodeSingbox) activeDiscountCode.delete(userId);
          const msg = buildPaymentMessage(config, {
            name: tariff.name,
            price: formatMoney(tariff.price, tariff.currency),
            amount: String(tariff.price),
            currency: tariff.currency,
            action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:",
          }, discountArgSingbox);
          await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°";
          await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        }
        return;
      }
      const markup = singboxPaymentMethodButtons(
        singboxTariffId,
        methods,
        config?.botBackLabel ?? null,
        innerStyles?.back,
        innerEmojiIds,
        balanceLabel,
        !!config?.yoomoneyEnabled,
        !!config?.yookassaEnabled,
        !!config?.cryptopayEnabled,
        tariff.currency,
      );
      const msg = buildPaymentMessage(config, {
        name: tariff.name,
        price: formatMoney(tariff.price, tariff.currency),
        amount: String(tariff.price),
        currency: tariff.currency,
        action: "Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎРѓР С—Р С•РЎРѓР С•Р В± Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:",
      }, discountArgSingbox);
      await editMessageContent(ctx, msg.text, markup, msg.entities);
      return;
    }

    if (data.startsWith("pay_tariff_balance:")) {
      const tariffId = data.slice("pay_tariff_balance:".length);
      try {
        const discountInfoBal = activeDiscountCode.get(userId);
        const promoCode = discountInfoBal?.code;
        const result = await api.payByBalance(token, { tariffId, promoCode });
        if (promoCode) activeDiscountCode.delete(userId);
        await editMessageContent(ctx, `РІСљвЂ¦ ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_tariff_yoomoney:")) {
      const tariffId = data.slice("pay_tariff_yoomoney:".length);
      const { items } = await api.getPublicTariffs();
      const tariff = items?.flatMap((c: TariffCategory) => c.tariffs).find((t: TariffItem) => t.id === tariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const discountInfoYm = activeDiscountCode.get(userId);
        const promoCode = discountInfoYm?.code;
        const payment = await api.createYoomoneyPayment(token, {
          amount: tariff.price,
          paymentType: "AC",
          tariffId: tariff.id,
          promoCode,
        });
        if (promoCode) activeDiscountCode.delete(userId);
        const discountArgYm = discountInfoYm ? {
          originalPrice: formatMoney(tariff.price, tariff.currency),
          discountedPrice: formatMoney(getDiscountedPrice(tariff.price, discountInfoYm), tariff.currency),
        } : undefined;
        const msg = buildPaymentMessage(config, {
          name: tariff.name,
          price: formatMoney(tariff.price, tariff.currency),
          amount: String(tariff.price),
          currency: tariff.currency,
          action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Money:",
        }, discountArgYm);
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В° Р В®Money";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_tariff_yookassa:")) {
      const tariffId = data.slice("pay_tariff_yookassa:".length);
      const { items } = await api.getPublicTariffs();
      const tariff = items?.flatMap((c: TariffCategory) => c.tariffs).find((t: TariffItem) => t.id === tariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (tariff.currency.toUpperCase() !== "RUB") {
        await editMessageContent(ctx, "Р В®Kassa Р С—РЎР‚Р С‘Р Р…Р С‘Р СР В°Р ВµРЎвЂљ РЎвЂљР С•Р В»РЎРЉР С”Р С• РЎР‚РЎС“Р В±Р В»Р С‘ (RUB).", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const discountInfoYk = activeDiscountCode.get(userId);
        const promoCode = discountInfoYk?.code;
        const payment = await api.createYookassaPayment(token, {
          amount: tariff.price,
          currency: "RUB",
          tariffId: tariff.id,
          promoCode,
        });
        if (promoCode) activeDiscountCode.delete(userId);
        const discountArgYk = discountInfoYk ? {
          originalPrice: formatMoney(tariff.price, tariff.currency),
          discountedPrice: formatMoney(getDiscountedPrice(tariff.price, discountInfoYk), tariff.currency),
        } : undefined;
        const msg = buildPaymentMessage(config, {
          name: tariff.name,
          price: formatMoney(tariff.price, tariff.currency),
          amount: String(tariff.price),
          currency: tariff.currency,
          action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Kassa:",
        }, discountArgYk);
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В° Р В®Kassa";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_tariff_cryptopay:")) {
      const tariffId = data.slice("pay_tariff_cryptopay:".length);
      const { items } = await api.getPublicTariffs();
      const tariff = items?.flatMap((c: TariffCategory) => c.tariffs).find((t: TariffItem) => t.id === tariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const discountInfoCp = activeDiscountCode.get(userId);
        const promoCode = discountInfoCp?.code;
        const payment = await api.createCryptopayPayment(token, { amount: tariff.price, currency: tariff.currency, tariffId: tariff.id, promoCode });
        if (promoCode) activeDiscountCode.delete(userId);
        const discountArgCp = discountInfoCp ? {
          originalPrice: formatMoney(tariff.price, tariff.currency),
          discountedPrice: formatMoney(getDiscountedPrice(tariff.price, discountInfoCp), tariff.currency),
        } : undefined;
        const msg = buildPaymentMessage(config, { name: tariff.name, price: formatMoney(tariff.price, tariff.currency), amount: String(tariff.price), currency: tariff.currency, action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Crypto Bot:" }, discountArgCp);
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.payUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В°";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data === "menu:extra_options") {
      const options = config?.sellOptions ?? [];
      if (!options.length) {
        await editMessageContent(ctx, "Р вЂќР С•Р С—. Р С•Р С—РЎвЂ Р С‘Р С‘ Р С—Р С•Р С”Р В° Р Р…Р Вµ Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р Р…РЎвЂ№. Р С›РЎвЂћР С•РЎР‚Р СР С‘РЎвЂљР Вµ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”РЎС“ Р Р† РЎР‚Р В°Р В·Р Т‘Р ВµР В»Р Вµ Р’В«Р СћР В°РЎР‚Р С‘РЎвЂћРЎвЂ№Р’В».", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const { text, entities } = titleWithEmoji("PACKAGE", "Р вЂќР С•Р С—. Р С•Р С—РЎвЂ Р С‘Р С‘\n\nР СћРЎР‚Р В°РЎвЂћР С‘Р С”, РЎС“РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†Р В° Р С‘Р В»Р С‘ РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚РЎвЂ№ РІР‚вЂќ Р Т‘Р С•Р С”РЎС“Р С—Р С”Р В° Р С” Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”Р Вµ. Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ Р С•Р С—РЎвЂ Р С‘РЎР‹:", config?.botEmojis);
      await editMessageContent(ctx, text, extraOptionsButtons(options, config?.botBackLabel ?? null, innerStyles, innerEmojiIds), entities);
      return;
    }

    if (data.startsWith("pay_option_balance:")) {
      const parts = data.split(":");
      const kind = (parts[1] ?? "") as "traffic" | "devices" | "servers";
      const productId = parts.length > 2 ? parts.slice(2).join(":") : "";
      const options = config?.sellOptions ?? [];
      const option = options.find((o) => o.kind === kind && o.id === productId);
      if (!option) {
        await editMessageContent(ctx, "Р С›Р С—РЎвЂ Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const result = await api.payOptionByBalance(token, { kind: option.kind, productId: option.id });
        await editMessageContent(ctx, `РІСљвЂ¦ ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_option_yookassa:")) {
      const parts = data.split(":");
      const kind = (parts[1] ?? "") as "traffic" | "devices" | "servers";
      const productId = parts.length > 2 ? parts.slice(2).join(":") : "";
      const options = config?.sellOptions ?? [];
      const option = options.find((o) => o.kind === kind && o.id === productId);
      if (!option) {
        await editMessageContent(ctx, "Р С›Р С—РЎвЂ Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYookassaPayment(token, {
          extraOption: { kind: option.kind, productId: option.id },
        });
        const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} Р вЂњР вЂ` : option.kind === "devices" ? `+${option.deviceCount} РЎС“РЎРѓРЎвЂљРЎР‚.` : "Р РЋР ВµРЎР‚Р Р†Р ВµРЎР‚");
        const msg = buildPaymentMessage(config, {
          name: optName,
          price: formatMoney(option.price, option.currency),
          amount: String(option.price),
          currency: option.currency,
          action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Kassa:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В°";
        const isAuthError = /401|unauthorized|Р С‘РЎРѓРЎвЂљР ВµР С”|Р В°Р Р†РЎвЂљР С•РЎР‚Р С‘Р В·|РЎвЂљР С•Р С”Р ВµР Р…/i.test(msg);
        if (isAuthError) {
          tokenStore.delete(userId);
          const freshToken = await getOrRestoreToken(userId, ctx.from?.username);
          if (freshToken) {
            await editMessageContent(ctx, "СЂСџвЂќвЂћ Р СџР С•Р Р†РЎвЂљР С•РЎР‚Р С‘РЎвЂљР Вµ Р Т‘Р ВµР в„–РЎРѓРЎвЂљР Р†Р С‘Р Вµ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
          } else {
            await editMessageContent(ctx, "РІСњРЉ Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р В°Р Р†РЎвЂљР С•РЎР‚Р С‘Р В·Р В°РЎвЂ Р С‘Р С‘. Р С›РЎвЂљР С—РЎР‚Р В°Р Р†РЎРЉРЎвЂљР Вµ /start", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
          }
        } else {
          await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        }
      }
      return;
    }

    if (data.startsWith("pay_option_cryptopay:")) {
      const parts = data.split(":");
      const kind = (parts[1] ?? "") as "traffic" | "devices" | "servers";
      const productId = parts.length > 2 ? parts.slice(2).join(":") : "";
      const options = config?.sellOptions ?? [];
      const option = options.find((o) => o.kind === kind && o.id === productId);
      if (!option) {
        await editMessageContent(ctx, "Р С›Р С—РЎвЂ Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createCryptopayPayment(token, { extraOption: { kind: option.kind, productId: option.id } });
        const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} Р вЂњР вЂ` : option.kind === "devices" ? `+${option.deviceCount} РЎС“РЎРѓРЎвЂљРЎР‚.` : "Р РЋР ВµРЎР‚Р Р†Р ВµРЎР‚");
        const msg = buildPaymentMessage(config, { name: optName, price: formatMoney(option.price, option.currency), amount: String(option.price), currency: option.currency, action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Crypto Bot:" });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.payUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В°";
        const isAuthError = /401|unauthorized|Р С‘РЎРѓРЎвЂљР ВµР С”|Р В°Р Р†РЎвЂљР С•РЎР‚Р С‘Р В·|РЎвЂљР С•Р С”Р ВµР Р…/i.test(msg);
        if (isAuthError) {
          tokenStore.delete(userId);
          const freshToken = await getOrRestoreToken(userId, ctx.from?.username);
          if (freshToken) {
            await editMessageContent(ctx, "СЂСџвЂќвЂћ Р СџР С•Р Р†РЎвЂљР С•РЎР‚Р С‘РЎвЂљР Вµ Р Т‘Р ВµР в„–РЎРѓРЎвЂљР Р†Р С‘Р Вµ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
          } else {
            await editMessageContent(ctx, "РІСњРЉ Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р В°Р Р†РЎвЂљР С•РЎР‚Р С‘Р В·Р В°РЎвЂ Р С‘Р С‘. Р С›РЎвЂљР С—РЎР‚Р В°Р Р†РЎРЉРЎвЂљР Вµ /start", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
          }
        } else {
          await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        }
      }
      return;
    }

    if (data.startsWith("pay_option_yoomoney:")) {
      const parts = data.split(":");
      const kind = (parts[1] ?? "") as "traffic" | "devices" | "servers";
      const productId = parts.length > 2 ? parts.slice(2).join(":") : "";
      const options = config?.sellOptions ?? [];
      const option = options.find((o) => o.kind === kind && o.id === productId);
      if (!option) {
        await editMessageContent(ctx, "Р С›Р С—РЎвЂ Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYoomoneyPayment(token, {
          amount: option.price,
          paymentType: "AC",
          extraOption: { kind: option.kind, productId: option.id },
        });
        const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} Р вЂњР вЂ` : option.kind === "devices" ? `+${option.deviceCount} РЎС“РЎРѓРЎвЂљРЎР‚.` : "Р РЋР ВµРЎР‚Р Р†Р ВµРЎР‚");
        const msg = buildPaymentMessage(config, {
          name: optName,
          price: formatMoney(option.price, option.currency),
          amount: String(option.price),
          currency: option.currency,
          action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Money:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В° Р В®Money";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_option_platega:")) {
      const parts = data.split(":");
      const kind = (parts[1] ?? "") as "traffic" | "devices" | "servers";
      const productId = parts.length > 3 ? parts.slice(2, -1).join(":") : parts[2] ?? "";
      const methodId = parts.length >= 4 ? Number(parts[parts.length - 1]) : Number(parts[2]);
      const options = config?.sellOptions ?? [];
      const option = options.find((o) => o.kind === kind && o.id === productId);
      if (!option) {
        await editMessageContent(ctx, "Р С›Р С—РЎвЂ Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (!Number.isFinite(methodId)) {
        await editMessageContent(ctx, "Р СњР ВµР Р†Р ВµРЎР‚Р Р…РЎвЂ№Р в„– РЎРѓР С—Р С•РЎРѓР С•Р В± Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createPlategaPayment(token, {
          amount: option.price,
          currency: option.currency,
          paymentMethod: methodId,
          description: option.name || `${option.kind} ${option.id}`,
          extraOption: { kind: option.kind, productId: option.id },
        });
        const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} Р вЂњР вЂ` : option.kind === "devices" ? `+${option.deviceCount} РЎС“РЎРѓРЎвЂљРЎР‚.` : "Р РЋР ВµРЎР‚Р Р†Р ВµРЎР‚");
        const msg = buildPaymentMessage(config, {
          name: optName,
          price: formatMoney(option.price, option.currency),
          amount: String(option.price),
          currency: option.currency,
          action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В°";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_option:")) {
      const parts = data.split(":");
      const kind = (parts[1] ?? "") as "traffic" | "devices" | "servers";
      const productId = parts.length > 2 ? parts.slice(2).join(":") : "";
      const options = config?.sellOptions ?? [];
      const option = options.find((o) => o.kind === kind && o.id === productId);
      if (!option) {
        await editMessageContent(ctx, "Р С›Р С—РЎвЂ Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°. Р С›Р В±Р Р…Р С•Р Р†Р С‘РЎвЂљР Вµ Р СР ВµР Р…РЎР‹ (/start) Р С‘ Р С—Р С•Р С—РЎР‚Р С•Р В±РЎС“Р в„–РЎвЂљР Вµ РЎРѓР Р…Р С•Р Р†Р В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (option.currency.toUpperCase() !== "RUB") {
        await editMessageContent(ctx, "Р С›Р С—Р В»Р В°РЎвЂљР В° Р Р† Р В±Р С•РЎвЂљР Вµ Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р Р…Р В° РЎвЂљР С•Р В»РЎРЉР С”Р С• Р Р† РЎР‚РЎС“Р В±Р В»РЎРЏРЎвЂ¦ (RUB).", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} Р вЂњР вЂ` : option.kind === "devices" ? `+${option.deviceCount} РЎС“РЎРѓРЎвЂљРЎР‚.` : "Р РЋР ВµРЎР‚Р Р†Р ВµРЎР‚");
      const choiceText = buildPaymentMessage(config, {
        name: optName,
        price: formatMoney(option.price, option.currency),
        amount: String(option.price),
        currency: option.currency,
        action: "Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎРѓР С—Р С•РЎРѓР С•Р В± Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:",
      });
      const markup = optionPaymentMethodButtons(
        option,
        client?.balance ?? 0,
        config?.botBackLabel ?? null,
        innerStyles,
        innerEmojiIds,
        config?.plategaMethods ?? [],
        !!config?.yoomoneyEnabled,
        !!config?.yookassaEnabled,
        !!config?.cryptopayEnabled
      );
      await editMessageContent(ctx, choiceText.text, markup, choiceText.entities);
      return;
    }

    if (data.startsWith("pay_tariff:")) {
      const rest = data.slice("pay_tariff:".length);
      const parts = rest.split(":");
      const tariffId = parts[0];
      const methodIdFromBtn = parts.length >= 2 ? Number(parts[1]) : null;
      const { items } = await api.getPublicTariffs();
      const tariff = items?.flatMap((c: TariffCategory) => c.tariffs).find((t: TariffItem) => t.id === tariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const methods = config?.plategaMethods ?? [];
      const client = await api.getMe(token);
      const balanceLabel = client && client.balance >= tariff.price ? `СЂСџвЂ™В° Р С›Р С—Р В»Р В°РЎвЂљР С‘РЎвЂљРЎРЉ Р В±Р В°Р В»Р В°Р Р…РЎРѓР С•Р С (${formatMoney(client.balance, client.preferredCurrency ?? "RUB")})` : null;

      const discountInfoTariff = activeDiscountCode.get(userId);
      const discountArgTariff = discountInfoTariff ? {
        originalPrice: formatMoney(tariff.price, tariff.currency),
        discountedPrice: formatMoney(getDiscountedPrice(tariff.price, discountInfoTariff), tariff.currency),
      } : undefined;

      if (methodIdFromBtn != null && Number.isFinite(methodIdFromBtn)) {
        const promoCode = discountInfoTariff?.code;
        const payment = await api.createPlategaPayment(token, {
          amount: tariff.price,
          currency: tariff.currency,
          paymentMethod: methodIdFromBtn,
          description: `Р СћР В°РЎР‚Р С‘РЎвЂћ: ${tariff.name}`,
          tariffId: tariff.id,
          promoCode,
        });
        if (promoCode) activeDiscountCode.delete(userId);
        const msg = buildPaymentMessage(config, {
          name: tariff.name,
          price: formatMoney(tariff.price, tariff.currency),
          amount: String(tariff.price),
          currency: tariff.currency,
          action: "Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:",
        }, discountArgTariff);
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
        return;
      }
      // Р СџР С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С РЎРѓР С—Р С•РЎРѓР С•Р В±РЎвЂ№ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ (Р Р†РЎРѓР ВµР С–Р Т‘Р В°, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р В±РЎвЂ№Р В»Р В° Р С”Р Р…Р С•Р С—Р С”Р В° Р В±Р В°Р В»Р В°Р Р…РЎРѓР В°)
      const pay2 = buildPaymentMessage(config, {
        name: tariff.name,
        price: formatMoney(tariff.price, tariff.currency),
        amount: String(tariff.price),
        currency: tariff.currency,
        action: "Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎРѓР С—Р С•РЎРѓР С•Р В± Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:",
      }, discountArgTariff);
      await editMessageContent(ctx, pay2.text, tariffPaymentMethodButtons(tariffId, methods, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds, balanceLabel, !!config?.yoomoneyEnabled, !!config?.yookassaEnabled, !!config?.cryptopayEnabled, tariff.currency), pay2.entities);
      return;
    }

    if (data === "menu:profile") {
      const client = await api.getMe(token);
      if (client?.preferredLang) setUserLang(userId, client.preferredLang);
      const lang = getUserLang(userId);
      const langs = config?.activeLanguages?.length ? config.activeLanguages : ["ru", "en"];
      const currencies = config?.activeCurrencies?.length ? config.activeCurrencies : ["usd", "rub"];
      const autoRenewStr = client?.autoRenewEnabled ? _t("profile.autorenew_on", lang) : _t("profile.autorenew_off", lang);
      const { text, entities } = titleWithEmoji(
        "PROFILE",
        `${_t("profile.title", lang)}\n\n${_t("profile.balance", lang)}${formatMoney(client?.balance ?? 0, client?.preferredCurrency ?? "usd")}\n${_t("profile.lang", lang)}${client?.preferredLang ?? "ru"}\n${_t("profile.currency", lang)}${client?.preferredCurrency ?? "usd"}\n${_t("profile.autorenew", lang)}${autoRenewStr}\n\n${_t("profile.change", lang)}`,
        config?.botEmojis
      );
      await editMessageContent(ctx, text, profileButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds, client?.autoRenewEnabled, lang), entities);
      return;
    }

    if (data === "menu:devices") {
      const lang = getUserLang(userId);
      try {
        const { total, devices } = await api.getClientDevices(token);
        lastDevicesList.set(userId, { devices });
        if (devices.length === 0) {
          await editMessageContent(
            ctx,
            _t("devices.no_devices", lang),
            { inline_keyboard: [[{ text: config?.botBackLabel ?? _t("back_to_menu", lang), callback_data: "menu:main" }]] }
          );
          return;
        }
        const lines = [_t("devices.delete_hint", lang) + "\n"];
        const rows: InlineMarkup["inline_keyboard"] = [];
        devices.slice(0, 15).forEach((d, i) => {
          const label = [d.platform, d.deviceModel].filter(Boolean).join(" Р’В· ") || d.hwid.slice(0, 12) + "РІР‚В¦";
          lines.push(`${i + 1}. ${label}`);
          rows.push([{ text: `СЂСџвЂ”вЂ Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ: ${label.slice(0, 25)}`, callback_data: `devices:delete:${i}` }]);
        });
        rows.push([{ text: config?.botBackLabel ?? "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р СР ВµР Р…РЎР‹", callback_data: "menu:main" }]);
        await editMessageContent(ctx, lines.join("\n"), { inline_keyboard: rows });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°";
        await editMessageContent(ctx, `СЂСџвЂњВ± Р Р€РЎРѓРЎвЂљРЎР‚Р С•Р в„–РЎРѓРЎвЂљР Р†Р В°\n\nРІСњРЉ ${msg}`, {
          inline_keyboard: [[{ text: config?.botBackLabel ?? "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р СР ВµР Р…РЎР‹", callback_data: "menu:main" }]],
        });
      }
      return;
    }

    if (data.startsWith("devices:delete:")) {
      const lang = getUserLang(userId);
      const indexStr = data.slice("devices:delete:".length);
      const index = parseInt(indexStr, 10);
      const stored = lastDevicesList.get(userId);
      if (!stored || index < 0 || index >= stored.devices.length) {
        await editMessageContent(ctx, _t("devices.session_expired", lang), {
          inline_keyboard: [[{ text: config?.botBackLabel ?? _t("back_to_menu", lang), callback_data: "menu:main" }]],
        });
        return;
      }
      const hwid = stored.devices[index]!.hwid;
      try {
        await api.postClientDeviceDelete(token, hwid);
        const nextDevices = stored.devices.filter((_, i) => i !== index);
        lastDevicesList.set(userId, { devices: nextDevices });
        if (nextDevices.length === 0) {
          await editMessageContent(
            ctx,
            _t("devices.deleted", lang),
            { inline_keyboard: [[{ text: config?.botBackLabel ?? _t("back_to_menu", lang), callback_data: "menu:main" }]] }
          );
        } else {
          const lines = [_t("devices.deleted", lang) + "\n"];
          const rows: InlineMarkup["inline_keyboard"] = [];
          nextDevices.slice(0, 15).forEach((d, i) => {
            const label = [d.platform, d.deviceModel].filter(Boolean).join(" Р’В· ") || d.hwid.slice(0, 12) + "РІР‚В¦";
            lines.push(`${i + 1}. ${label}`);
            rows.push([{ text: `СЂСџвЂ”вЂ Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ: ${label.slice(0, 25)}`, callback_data: `devices:delete:${i}` }]);
          });
          rows.push([{ text: config?.botBackLabel ?? "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р СР ВµР Р…РЎР‹", callback_data: "menu:main" }]);
          await editMessageContent(ctx, lines.join("\n"), { inline_keyboard: rows });
        }
      } catch (e: unknown) {
        await editMessageContent(ctx, `РІСњРЉ ${e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°"}`, {
          inline_keyboard: [[{ text: config?.botBackLabel ?? "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р СР ВµР Р…РЎР‹", callback_data: "menu:devices" }]],
        });
      }
      return;
    }

    if (data === "profile:lang") {
      const lang = getUserLang(userId);
      const langs = config?.activeLanguages?.length ? config.activeLanguages : ["ru", "en"];
      await editMessageContent(ctx, _t("profile.choose_lang", lang), langButtons(langs, innerStyles, innerEmojiIds, lang));
      return;
    }

    if (data.startsWith("set_lang:")) {
      const lang = data.slice("set_lang:".length);
      await api.updateProfile(token, { preferredLang: lang });
      setUserLang(userId, lang);
      await editMessageContent(ctx, _t("profile.lang_changed", lang, { lang: lang.toUpperCase() }), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      return;
    }

    if (data === "profile:currency") {
      const lang = getUserLang(userId);
      const currencies = config?.activeCurrencies?.length ? config.activeCurrencies : ["usd", "rub"];
      await editMessageContent(ctx, _t("profile.choose_currency", lang), currencyButtons(currencies, innerStyles, innerEmojiIds, lang));
      return;
    }

    if (data.startsWith("set_currency:")) {
      const lang = getUserLang(userId);
      const currency = data.slice("set_currency:".length);
      await api.updateProfile(token, { preferredCurrency: currency });
      await editMessageContent(ctx, _t("profile.currency_changed", lang, { currency: currency.toUpperCase() }), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      return;
    }

    if (data.startsWith("profile:autorenew:")) {
      const enabled = data === "profile:autorenew:on";
      try {
        await api.toggleAutoRenew(token, enabled);
        const client = await api.getMe(token);
        if (client?.preferredLang) setUserLang(userId, client.preferredLang);
        const lang = getUserLang(userId);
        const autoRenewStr = client?.autoRenewEnabled ? _t("profile.autorenew_on", lang) : _t("profile.autorenew_off", lang);
        const { text, entities } = titleWithEmoji(
          "PROFILE",
          `${_t("profile.title", lang)}\n\n${_t("profile.balance", lang)}${formatMoney(client?.balance ?? 0, client?.preferredCurrency ?? "usd")}\n${_t("profile.lang", lang)}${client?.preferredLang ?? "ru"}\n${_t("profile.currency", lang)}${client?.preferredCurrency ?? "usd"}\n${_t("profile.autorenew", lang)}${autoRenewStr}\n\n${_t("profile.change", lang)}`,
          config?.botEmojis
        );
        await editMessageContent(ctx, text, profileButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds, client?.autoRenewEnabled, lang), entities);
      } catch (err: any) {
        await ctx.answerCallbackQuery({ text: err.message || "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°", show_alert: true });
      }
      return;
    }

    if (data === "menu:topup") {
      const lang = getUserLang(userId);
      const client = await api.getMe(token);
      if (client?.preferredLang) setUserLang(userId, client.preferredLang);
      const methods = config?.plategaMethods ?? [];
      const yooEnabled = !!config?.yoomoneyEnabled;
      const yookassaEnabledTopup = !!config?.yookassaEnabled;
      if (!methods.length && !yooEnabled && !yookassaEnabledTopup) {
        await editMessageContent(ctx, _t("topup.unavailable", lang), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const topupTitle = titleWithEmoji("CARD", "Р СџР С•Р С—Р С•Р В»Р Р…Р С‘РЎвЂљРЎРЉ Р В±Р В°Р В»Р В°Р Р…РЎРѓ\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎРѓРЎС“Р СР СРЎС“ Р С‘Р В»Р С‘ Р Р†Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ РЎРѓР Р†Р С•РЎР‹ (РЎвЂЎР С‘РЎРѓР В»Р С•Р С):", config?.botEmojis);
      await editMessageContent(ctx, topupTitle.text, topUpPresets(client.preferredCurrency, config?.botBackLabel ?? null, innerStyles, innerEmojiIds), topupTitle.entities);
      return;
    }

    if (data.startsWith("topup_yoomoney:")) {
      const amountStr = data.slice("topup_yoomoney:".length);
      const amount = Number(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) {
        await editMessageContent(ctx, "Р СњР ВµР Р†Р ВµРЎР‚Р Р…Р В°РЎРЏ РЎРѓРЎС“Р СР СР В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      try {
        const payment = await api.createYoomoneyPayment(token, {
          amount,
          paymentType: "AC",
        });
        const yooTopup = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(amount, client.preferredCurrency)}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Money:`, config?.botEmojis);
        await editMessageContent(ctx, yooTopup.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTopup.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В° Р В®Money";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("topup_yookassa:")) {
      const amountStr = data.slice("topup_yookassa:".length);
      const amount = Number(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) {
        await editMessageContent(ctx, "Р СњР ВµР Р†Р ВµРЎР‚Р Р…Р В°РЎРЏ РЎРѓРЎС“Р СР СР В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      try {
        const payment = await api.createYookassaPayment(token, { amount, currency: "RUB" });
        const yooTopup = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(amount, "RUB")}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Kassa:`, config?.botEmojis);
        await editMessageContent(ctx, yooTopup.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTopup.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В° Р В®Kassa";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("topup_cryptopay:")) {
      const amountStr = data.slice("topup_cryptopay:".length);
      const amount = Number(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) {
        await editMessageContent(ctx, "Р СњР ВµР Р†Р ВµРЎР‚Р Р…Р В°РЎРЏ РЎРѓРЎС“Р СР СР В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      try {
        const payment = await api.createCryptopayPayment(token, { amount, currency: client.preferredCurrency ?? "RUB" });
        const cpTopup = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(amount, client.preferredCurrency ?? "RUB")}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Crypto Bot:`, config?.botEmojis);
        await editMessageContent(ctx, cpTopup.text, payUrlMarkup(payment.payUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), cpTopup.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В° Crypto Bot";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("topup:")) {
      const rest = data.slice("topup:".length);
      const parts = rest.split(":");
      const amountStr = parts[0];
      const amount = Number(amountStr);
      const methodIdFromBtn = parts.length >= 2 ? Number(parts[1]) : null;
      if (!Number.isFinite(amount) || amount <= 0) {
        await editMessageContent(ctx, "Р СњР ВµР Р†Р ВµРЎР‚Р Р…Р В°РЎРЏ РЎРѓРЎС“Р СР СР В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      const methods = config?.plategaMethods ?? [];
      if (methodIdFromBtn != null && Number.isFinite(methodIdFromBtn)) {
        const payment = await api.createPlategaPayment(token, {
          amount,
          currency: client.preferredCurrency,
          paymentMethod: methodIdFromBtn,
          description: "Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р В±Р В°Р В»Р В°Р Р…РЎРѓР В°",
        });
        const topupPay1 = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(amount, client.preferredCurrency)}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:`, config?.botEmojis);
        await editMessageContent(ctx, topupPay1.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), topupPay1.entities);
        return;
      }
      const yooEnabled = !!config?.yoomoneyEnabled;
      const yookassaEnabled = !!config?.yookassaEnabled;
      const cryptopayEnabled = !!config?.cryptopayEnabled;
      if (methods.length > 1 || (methods.length >= 1 && (yooEnabled || yookassaEnabled || cryptopayEnabled)) || (methods.length === 0 && ((yooEnabled && yookassaEnabled) || (yooEnabled && cryptopayEnabled) || (yookassaEnabled && cryptopayEnabled)))) {
        const topupPay2 = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(amount, client.preferredCurrency)}\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎРѓР С—Р С•РЎРѓР С•Р В± Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:`, config?.botEmojis);
        await editMessageContent(ctx, topupPay2.text, topupPaymentMethodButtons(amountStr, methods, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds, yooEnabled, yookassaEnabled, cryptopayEnabled), topupPay2.entities);
        return;
      }
      // Р вЂўРЎРѓР В»Р С‘ Р В®Money Р ВµР Т‘Р С‘Р Р…РЎРѓРЎвЂљР Р†Р ВµР Р…Р Р…РЎвЂ№Р в„– РЎРѓР С—Р С•РЎРѓР С•Р В± (Р Р…Р ВµРЎвЂљ platega, Р Р…Р ВµРЎвЂљ Р В®Kassa) РІР‚вЂќ РЎРѓРЎР‚Р В°Р В·РЎС“ РЎРѓР С•Р В·Р Т‘Р В°РЎвЂР С Р С—Р В»Р В°РЎвЂљРЎвЂР В¶ Р В®Money
      if (methods.length === 0 && yooEnabled && !yookassaEnabled) {
        try {
          const payment = await api.createYoomoneyPayment(token, { amount, paymentType: "AC" });
          const yooTopup = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(amount, client.preferredCurrency)}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Money:`, config?.botEmojis);
          await editMessageContent(ctx, yooTopup.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTopup.entities);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В° Р В®Money";
          await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        }
        return;
      }
      // Р вЂўРЎРѓР В»Р С‘ РЎвЂљР С•Р В»РЎРЉР С”Р С• Р В®Kassa РІР‚вЂќ РЎРѓРЎР‚Р В°Р В·РЎС“ РЎРѓР С•Р В·Р Т‘Р В°РЎвЂР С Р С—Р В»Р В°РЎвЂљРЎвЂР В¶ Р В®Kassa
      if (methods.length === 0 && yookassaEnabled) {
        try {
          const payment = await api.createYookassaPayment(token, { amount, currency: "RUB" });
          const yooTopup = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(amount, "RUB")}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Kassa:`, config?.botEmojis);
          await editMessageContent(ctx, yooTopup.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTopup.entities);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р В»Р В°РЎвЂљР ВµР В¶Р В° Р В®Kassa";
          await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        }
        return;
      }
      const methodId = methods[0]?.id ?? 2;
      const payment = await api.createPlategaPayment(token, {
        amount,
        currency: client.preferredCurrency,
        paymentMethod: methodId,
        description: "Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р В±Р В°Р В»Р В°Р Р…РЎРѓР В°",
      });
      const topupPay3 = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(amount, client.preferredCurrency)}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:`, config?.botEmojis);
      await editMessageContent(ctx, topupPay3.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), topupPay3.entities);
      return;
    }

    if (data === "menu:referral") {
      const lang = getUserLang(userId);
      const client = await api.getMe(token);
      if (client?.preferredLang) setUserLang(userId, client.preferredLang);
      if (!client.referralCode) {
        await editMessageContent(ctx, _t("referral.link_unavailable", lang), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const linkSite = appUrl ? `${appUrl}/cabinet/register?ref=${encodeURIComponent(client.referralCode)}` : null;
      const linkBot = `https://t.me/${BOT_USERNAME || "bot"}?start=ref_${client.referralCode}`;
      // Р СџР С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С РЎвЂћР В°Р С”РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘Р в„– Р С—Р ВµРЎР‚РЎРѓР С•Р Р…Р В°Р В»РЎРЉР Р…РЎвЂ№Р в„– Р С—РЎР‚Р С•РЎвЂ Р ВµР Р…РЎвЂљ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљР В°.
      // Р В¤Р С•Р В»Р В±РЎРЊР С” Р Р…Р В° Р Т‘Р ВµРЎвЂћР С•Р В»РЎвЂљ РЎвЂљР С•Р В»РЎРЉР С”Р С• Р ВµРЎРѓР В»Р С‘ Р С—Р ВµРЎР‚РЎРѓР С•Р Р…Р В°Р В»РЎРЉР Р…РЎвЂ№Р в„– Р Р…Р Вµ Р В·Р В°Р Т‘Р В°Р Р… (null/undefined).
      const p1 = client.referralPercent ?? (config?.defaultReferralPercent ?? 0);
      const p2 = config?.referralPercentLevel2 ?? 0;
      const p3 = config?.referralPercentLevel3 ?? 0;
      let rest = `${_t("referral.title", lang)}\n\n${_t("referral.description", lang)}\n\n`;
      rest += `${_t("referral.how_it_works", lang)}\n`;
      rest += `РІР‚Сћ ${_t("referral.level1", lang, { percent: String(p1) })}\n`;
      rest += `РІР‚Сћ ${_t("referral.level2", lang, { percent: String(p2) })}\n`;
      rest += `РІР‚Сћ ${_t("referral.level3", lang, { percent: String(p3) })}\n`;
      rest += `\n${_t("referral.earnings_info", lang)}`;
      rest += `\n\n${_t("referral.your_links", lang)}`;
      if (linkSite) rest += `\n\n${_t("referral.site", lang)}\n` + linkSite;
      rest += `\n\n${_t("referral.bot", lang)}\n` + linkBot;
      const { text: refText, entities: refEntities } = titleWithEmoji("LINK", rest, config?.botEmojis);
      await editMessageContent(ctx, refText, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), refEntities);
      return;
    }

    if (data === "menu:promocode") {
      const lang = getUserLang(userId);
      awaitingPromoCode.add(userId);
      await editMessageContent(
        ctx,
        _t("promo.enter_title", lang),
        backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds),
      );
      return;
    }

    if (data === "menu:trial" || data === "trial:confirm") {
      try {
        const result = await api.activateTrial(token);
        await editMessageContent(ctx, `РІСљвЂ¦ ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р В°Р С”РЎвЂљР С‘Р Р†Р В°РЎвЂ Р С‘Р С‘";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }
    if (data === "menu:vpn") {
      const lang = getUserLang(userId);
      const subRes = await api.getSubscription(token);
      const vpnUrl = getSubscriptionUrl(subRes.subscription);
      if (!vpnUrl) {
        await editMessageContent(ctx, _t("vpn.link_unavailable", lang), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const vpnTitle = titleWithEmoji("SERVERS", "VPN ссылка готова. Нажмите кнопку ниже, чтобы скопировать.", config?.botEmojis);
      await editMessageContent(ctx, vpnTitle.text, {
        inline_keyboard: [
          [{ text: "📋 Скопировать ссылку", callback_data: "vpn:copy" }],
          [{ text: config?.botBackLabel ?? "◀️ В меню", callback_data: "menu:main" }],
        ],
      }, vpnTitle.entities);
      return;
    }

    // РІР‚вЂќРІР‚вЂќРІР‚вЂќ Gift / Secondary Subscriptions handlers РІР‚вЂќРІР‚вЂќРІР‚вЂќ

    if (data === "vpn:copy") {
      const lang = getUserLang(userId);
      const subRes = await api.getSubscription(token);
      const vpnUrl = getSubscriptionUrl(subRes.subscription);
      if (!vpnUrl) {
        await ctx.answerCallbackQuery({ text: _t("vpn.link_unavailable", lang), show_alert: true }).catch(() => {});
        return;
      }
      await ctx.reply(`СЂСџвЂњвЂ№ Р РЋРЎРѓРЎвЂ№Р В»Р С”Р В° Р Т‘Р В»РЎРЏ Р С”Р С•Р С—Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ:\n<code>${escapeHtml(vpnUrl)}</code>`, { parse_mode: "HTML" });
      await ctx.answerCallbackQuery({ text: "Р РЋРЎРѓРЎвЂ№Р В»Р С”Р В° Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р В°", show_alert: false }).catch(() => {});
      return;
    }

    if (data === "menu:gift") {
      if (!config?.giftSubscriptionsEnabled) {
        await editMessageContent(ctx, "Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ Р С—Р С•Р Т‘Р В°РЎР‚Р С”Р С•Р Р† Р Р…Р ВµР Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р Р…Р В°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      await editMessageContent(
        ctx,
        "СЂСџР‹Рѓ Р СџР С•Р Т‘Р В°РЎР‚Р С”Р С‘ Р С‘ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”Р С‘\n\nР вЂ”Р Т‘Р ВµРЎРѓРЎРЉ Р Р†РЎвЂ№ Р СР С•Р В¶Р ВµРЎвЂљР Вµ Р С”РЎС“Р С—Р С‘РЎвЂљРЎРЉ Р Т‘Р С•Р С—Р С•Р В»Р Р…Р С‘РЎвЂљР ВµР В»РЎРЉР Р…РЎвЂ№Р Вµ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”Р С‘, Р С—Р С•Р Т‘Р В°РЎР‚Р С‘РЎвЂљРЎРЉ Р С‘РЎвЂ¦ Р С‘Р В»Р С‘ Р В°Р С”РЎвЂљР С‘Р Р†Р С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ Р С—Р С•Р Т‘Р В°РЎР‚Р С•Р С”.",
        giftMenuButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
      );
      return;
    }

    if (data === "gift:buy") {
      const { items } = await api.getPublicTariffs();
      if (!items?.length) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћРЎвЂ№ Р Р…Р Вµ Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р ВµР Р…РЎвЂ№.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      await editMessageContent(
        ctx,
        "СЂСџвЂєвЂ™ Р С™РЎС“Р С—Р С‘РЎвЂљРЎРЉ Р Т‘Р С•Р С—. Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”РЎС“\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎвЂљР В°РЎР‚Р С‘РЎвЂћ:",
        giftTariffButtons(items, config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
      );
      return;
    }

    if (data.startsWith("gift_tariff:")) {
      const tariffId = data.slice("gift_tariff:".length);
      const { items } = await api.getPublicTariffs();
      const tariff = items?.flatMap((c: TariffCategory) => c.tariffs).find((t: TariffItem) => t.id === tariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Р СћР В°РЎР‚Р С‘РЎвЂћ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      const balanceLabel = `СЂСџвЂ™В° Р С›Р С—Р В»Р В°РЎвЂљР С‘РЎвЂљРЎРЉ Р В±Р В°Р В»Р В°Р Р…РЎРѓР С•Р С (${formatMoney(client?.balance ?? 0, client?.preferredCurrency ?? "RUB")})`;
      await editMessageContent(
        ctx,
        `СЂСџвЂєвЂ™ ${tariff.name}\n\nР РЋРЎвЂљР С•Р С‘Р СР С•РЎРѓРЎвЂљРЎРЉ: ${formatMoney(tariff.price, tariff.currency)}\n\nР СџР С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р Т‘Р С‘РЎвЂљР Вµ Р С•Р С—Р В»Р В°РЎвЂљРЎС“:`,
        giftPaymentButtons(tariffId, balanceLabel, config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
      );
      return;
    }

    if (data.startsWith("gift_pay_balance:")) {
      const tariffId = data.slice("gift_pay_balance:".length);
      try {
        const result = await api.buyGiftSubscription(token, { tariffId });
        await editMessageContent(
          ctx,
          `РІСљвЂ¦ Р вЂќР С•Р С—Р С•Р В»Р Р…Р С‘РЎвЂљР ВµР В»РЎРЉР Р…Р В°РЎРЏ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р В°!\n\nР СџР С•Р Т‘Р С—Р С‘РЎРѓР С”Р В° #${result.subscriptionIndex}\n\nР вЂ™РЎвЂ№ Р СР С•Р В¶Р ВµРЎвЂљР Вµ Р В°Р С”РЎвЂљР С‘Р Р†Р С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ Р ВµРЎвЂ Р Р…Р В° РЎРѓР Р†Р С•РЎвЂР С Р В°Р С”Р С”Р В°РЎС“Р Р…РЎвЂљР Вµ Р С‘Р В»Р С‘ Р С—Р С•Р Т‘Р В°РЎР‚Р С‘РЎвЂљРЎРЉ Р Т‘РЎР‚РЎС“Р С–РЎС“.`,
          giftPostPurchaseButtons(result.secondarySubscriptionId, result.subscriptionIndex, config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data === "gift:subscriptions") {
      try {
        const result = await api.getAllSubscriptions(token);
        const items = (result.items ?? []).filter((i) => typeof i.remnawaveUuid === "string" && i.remnawaveUuid.length > 0);
        if (!items.length) {
          await editMessageContent(
            ctx,
            "📋 Мои подписки\n\nУ вас пока нет подписок.",
            giftCodeResultButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
          );
          return;
        }
        const rows: InlineMarkup["inline_keyboard"] = [];
        for (const it of items) {
          const idx = it.subscriptionIndex ?? 0;
          const label = it.type === "root" ? `📋 Основная — ${it.tariffDisplayName || "Тариф"}` : `📋 #${idx} — ${it.tariffDisplayName || "Тариф"}`;
          rows.push([{ text: label.slice(0, 64), callback_data: `sub:copy_uuid:${it.remnawaveUuid}` }]);
        }
        rows.push([{ text: config?.botBackLabel ?? "◀️ Назад", callback_data: "menu:gift" }]);
        await editMessageContent(
          ctx,
          `📋 Мои подписки\n\nНайдено: ${items.length}\nВыберите подписку для копирования ссылки:`,
          { inline_keyboard: rows },
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка загрузки";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("sub:copy_uuid:")) {
      const uuid = data.slice("sub:copy_uuid:".length);
      try {
        const byUuid = await api.getSubscriptionByUuid(token, uuid);
        const link = getSubscriptionUrl(byUuid.subscription);
        if (!link) {
          await ctx.answerCallbackQuery({ text: "Ссылка не найдена", show_alert: true }).catch(() => {});
          return;
        }
        await ctx.reply(`Ссылка для копирования:\n<code>${escapeHtml(link)}</code>`, { parse_mode: "HTML" });
        await ctx.answerCallbackQuery({ text: "Ссылка отправлена", show_alert: false }).catch(() => {});
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка получения ссылки";
        await ctx.answerCallbackQuery({ text: msg.slice(0, 180), show_alert: true }).catch(() => {});
      }
      return;
    }
    if (data.startsWith("gift:connect:")) {
      const subscriptionId = data.slice("gift:connect:".length);
      try {
        // Р РЋР Р…Р В°РЎвЂЎР В°Р В»Р В° Р В°Р С”РЎвЂљР С‘Р Р†Р С‘РЎР‚РЎС“Р ВµР С Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”РЎС“ (РЎРѓР Р…Р С‘Р СР В°Р ВµР С GIFT_RESERVED, Р ВµРЎРѓР В»Р С‘ Р ВµРЎРѓРЎвЂљРЎРЉ)
        await api.activateGiftForSelf(token, subscriptionId).catch(() => {});
        // Р СџР С•РЎвЂљР С•Р С Р С—Р С•Р В»РЎС“РЎвЂЎР В°Р ВµР С URL
        const result = await api.getGiftSubscriptionUrl(token, subscriptionId);
        const appUrl2 = config?.publicAppUrl?.replace(/\/$/, "") ?? null;

        // Р вЂўРЎРѓР В»Р С‘ Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р В° Remna-РЎРѓРЎвЂљРЎР‚Р В°Р Р…Р С‘РЎвЂ Р В° Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”Р С‘ РІР‚вЂќ Р С•РЎвЂљР Т‘Р В°РЎвЂР С remna subscriptionUrl.
        if (config?.useRemnaSubscriptionPage) {
          const byUuid = await api.getSubscriptionByUuid(token, result.uuid);
          const remnaUrl = getSubscriptionUrl(byUuid.subscription);
          if (!remnaUrl) {
            await editMessageContent(
              ctx,
              "РІСњРЉ Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—Р С•Р В»РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉ РЎРѓРЎРѓРЎвЂ№Р В»Р С”РЎС“ Remna Р Т‘Р В»РЎРЏ РЎРЊРЎвЂљР С•Р в„– Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”Р С‘.",
              backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds),
            );
            return;
          }
          await editMessageContent(
            ctx,
            "РџРѕРґРєР»СЋС‡РµРЅРёРµ РіРѕС‚РѕРІРѕ. Р’С‹Р±РµСЂРёС‚Рµ РґРµР№СЃС‚РІРёРµ:",
            {
              inline_keyboard: [
                [{ text: "СЂСџвЂњР† Р СџР С•Р Т‘Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉРЎРѓРЎРЏ Р С” VPN", url: remnaUrl }],
                [{ text: "СЂСџвЂњвЂ№ Р РЋР С”Р С•Р С—Р С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ РЎРѓРЎРѓРЎвЂ№Р В»Р С”РЎС“", callback_data: `gift:copy:${subscriptionId}` }],
                [{ text: config?.botBackLabel ?? "РІвЂ”Р‚РїС‘РЏ Р СњР В°Р В·Р В°Р Т‘", callback_data: "menu:gift" }],
              ],
            },
          );
          return;
        }

        // Р ВР Р…Р В°РЎвЂЎР Вµ Р С—Р С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С РЎРѓРЎРѓРЎвЂ№Р В»Р С”РЎС“ + Р С”Р Р…Р С•Р С—Р С”РЎС“ "Р СџР С•Р Т‘Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉРЎРѓРЎРЏ" Р Р† Р СР С‘Р Р…Р С‘-Р В°Р С—Р С— Р Р…Р В° Р Р…Р В°РЎв‚¬РЎС“ РЎРѓРЎвЂљРЎР‚Р В°Р Р…Р С‘РЎвЂ РЎС“
        // Р С—Р С•Р Т‘Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С‘РЎРЏ Р Т‘Р В»РЎРЏ Р С”Р С•Р Р…Р С”РЎР‚Р ВµРЎвЂљР Р…Р С•Р в„– secondary-Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”Р С‘.
        const webUrl = appUrl2 ? `${appUrl2}/cabinet/subscribe?uuid=${encodeURIComponent(result.uuid)}` : null;
        const buttons = webUrl
          ? {
              inline_keyboard: [
                [{ text: "СЂСџвЂњР† Р СџР С•Р Т‘Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉРЎРѓРЎРЏ", web_app: { url: webUrl } }],
                [{ text: config?.botBackLabel ?? "РІвЂ С’ Р СњР В°Р В·Р В°Р Т‘", callback_data: "menu:gift" }],
              ],
            }
          : giftCodeResultButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds);
        await editMessageContent(
          ctx,
          `СЂСџвЂњР† Р РЋРЎРѓРЎвЂ№Р В»Р С”Р В° Р Р…Р В° Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”РЎС“:\n\n${webUrl ?? `Р СџР С•Р Т‘Р С—Р С‘РЎРѓР С”Р В° UUID: ${result.uuid}`}`,
          buttons,
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С—Р С•Р В»РЎС“РЎвЂЎР ВµР Р…Р С‘РЎРЏ РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р С‘";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("gift:copy:")) {
      const subscriptionId = data.slice("gift:copy:".length);
      try {
        await api.activateGiftForSelf(token, subscriptionId).catch(() => {});
        const result = await api.getGiftSubscriptionUrl(token, subscriptionId);
        const byUuid = await api.getSubscriptionByUuid(token, result.uuid);
        const remnaUrl = getSubscriptionUrl(byUuid.subscription);
        if (!remnaUrl) {
          await ctx.answerCallbackQuery({ text: "Р РЋРЎРѓРЎвЂ№Р В»Р С”Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°", show_alert: true }).catch(() => {});
          return;
        }
        await ctx.reply(`Р РЋРЎРѓРЎвЂ№Р В»Р С”Р В° Р Т‘Р В»РЎРЏ Р С”Р С•Р С—Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ:\n<code>${escapeHtml(remnaUrl)}</code>`, { parse_mode: "HTML" });
        await ctx.answerCallbackQuery({ text: "Р РЋРЎРѓРЎвЂ№Р В»Р С”Р В° Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р В°", show_alert: false }).catch(() => {});
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С—Р С•Р В»РЎС“РЎвЂЎР ВµР Р…Р С‘РЎРЏ РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р С‘";
        await ctx.answerCallbackQuery({ text: msg.slice(0, 180), show_alert: true }).catch(() => {});
      }
      return;
    }

    if (data.startsWith("gift:give:")) {
      const subscriptionId = data.slice("gift:give:".length);
      try {
        const result = await api.createGiftCode(token, { secondarySubscriptionId: subscriptionId });
        const expiresAt = new Date(result.expiresAt).toLocaleDateString("ru-RU");
        const tariffLabel = result.tariffName ? `\nР СћР В°РЎР‚Р С‘РЎвЂћ: ${result.tariffName}` : "";

        // Р В¤Р С•РЎР‚Р СР С‘РЎР‚РЎС“Р ВµР С РЎРѓРЎРѓРЎвЂ№Р В»Р С”РЎС“ Р Р…Р В° Р С—Р С•Р Т‘Р В°РЎР‚Р С•Р С” Р С‘ Р С”Р Р…Р С•Р С—Р С”РЎС“ "Р СџР С•Р Т‘Р ВµР В»Р С‘РЎвЂљРЎРЉРЎРѓРЎРЏ"
        const appUrl = config?.publicAppUrl?.replace(/\/$/, "") ?? "";
        const giftUrl = appUrl ? `${appUrl}/gift/${result.code}` : "";
        const shareText = `СЂСџР‹Рѓ Р Р‡ Р Т‘Р В°РЎР‚РЎР‹ РЎвЂљР ВµР В±Р Вµ VPN-Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С”РЎС“ STEALTHNET${result.tariffName ? ` (${result.tariffName})` : ""}! Р С’Р С”РЎвЂљР С‘Р Р†Р С‘РЎР‚РЎС“Р в„– Р С—Р С• РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р Вµ:`;
        const shareUrl = giftUrl
          ? `https://t.me/share/url?url=${encodeURIComponent(giftUrl)}&text=${encodeURIComponent(shareText)}`
          : "";

        const buttons: (({ text: string; callback_data: string } | { text: string; url: string })[])[] = [];
        if (shareUrl) {
          buttons.push([{ text: "СЂСџвЂњВ¤ Р СџР С•Р Т‘Р ВµР В»Р С‘РЎвЂљРЎРЉРЎРѓРЎРЏ Р Р† Telegram", url: shareUrl }]);
        }
        if (giftUrl) {
          buttons.push([{ text: "СЂСџвЂќвЂ” Р РЋРЎРѓРЎвЂ№Р В»Р С”Р В° Р Р…Р В° Р С—Р С•Р Т‘Р В°РЎР‚Р С•Р С”", url: giftUrl }]);
        }
        buttons.push([{ text: config?.botBackLabel ?? "РІвЂ С’ Р СњР В°Р В·Р В°Р Т‘", callback_data: "menu:gift" }]);

        await editMessageContent(
          ctx,
          `СЂСџР‹Рѓ Р СџР С•Р Т‘Р В°РЎР‚Р С•РЎвЂЎР Р…РЎвЂ№Р в„– Р С”Р С•Р Т‘ РЎРѓР С•Р В·Р Т‘Р В°Р Р…!\n\nР С™Р С•Р Т‘: \`${result.code}\`${tariffLabel}\n\nР С›РЎвЂљР С—РЎР‚Р В°Р Р†РЎРЉРЎвЂљР Вµ РЎРЊРЎвЂљР С•РЎвЂљ Р С”Р С•Р Т‘ Р С—Р С•Р В»РЎС“РЎвЂЎР В°РЎвЂљР ВµР В»РЎР‹ Р С‘Р В»Р С‘ Р С—Р С•Р Т‘Р ВµР В»Р С‘РЎвЂљР ВµРЎРѓРЎРЉ РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р С•Р в„–. Р С™Р С•Р Т‘ Р Т‘Р ВµР в„–РЎРѓРЎвЂљР Р†Р С‘РЎвЂљР ВµР В»Р ВµР Р… Р Т‘Р С• ${expiresAt}.`,
          { inline_keyboard: buttons },
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С”Р С•Р Т‘Р В°";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("gift:delete:")) {
      const subscriptionId = data.slice("gift:delete:".length);
      try {
        const result = await api.deleteGiftSubscription(token, subscriptionId);
        await editMessageContent(
          ctx,
          `РІСљвЂ¦ ${result.message || "Р СџР С•Р Т‘Р С—Р С‘РЎРѓР С”Р В° РЎС“Р Т‘Р В°Р В»Р ВµР Р…Р В°"}`,
          giftCodeResultButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° РЎС“Р Т‘Р В°Р В»Р ВµР Р…Р С‘РЎРЏ";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data === "gift:redeem") {
      awaitingGiftCode.add(userId);
      await editMessageContent(
        ctx,
        "СЂСџР‹Рѓ Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ Р С—Р С•Р Т‘Р В°РЎР‚Р С•РЎвЂЎР Р…РЎвЂ№Р в„– Р С”Р С•Р Т‘:",
        backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds),
      );
      return;
    }

    if (data === "gift:codes") {
      try {
        const result = await api.getGiftCodes(token);
        if (!result.codes?.length) {
          await editMessageContent(
            ctx,
            "СЂСџР‹СџРїС‘РЏ Р СљР С•Р С‘ Р С—Р С•Р Т‘Р В°РЎР‚Р С”Р С‘\n\nР Р€ Р Р†Р В°РЎРѓ Р С—Р С•Р С”Р В° Р Р…Р ВµРЎвЂљ Р С—Р С•Р Т‘Р В°РЎР‚Р С•РЎвЂЎР Р…РЎвЂ№РЎвЂ¦ Р С”Р С•Р Т‘Р С•Р Р†.",
            giftCodeResultButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
          );
          return;
        }
        const lines = result.codes.map((c) => {
          const statusLabel = c.status === "ACTIVE" ? "РІСљвЂ¦ Р С’Р С”РЎвЂљР С‘Р Р†Р ВµР Р…" : c.status === "REDEEMED" ? "СЂСџР‹Рѓ Р ВРЎРѓР С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°Р Р…" : "РІСњРЉ Р С›РЎвЂљР СР ВµР Р…РЎвЂР Р…";
          return `${c.code} РІР‚вЂќ ${statusLabel}`;
        }).join("\n");
        await editMessageContent(
          ctx,
          `СЂСџР‹СџРїС‘РЏ Р СљР С•Р С‘ Р С—Р С•Р Т‘Р В°РЎР‚Р С”Р С‘\n\n${lines}`,
          giftCodesListButtons(result.codes, config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р В·Р В°Р С–РЎР‚РЎС“Р В·Р С”Р С‘";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("gift:cancel_code:")) {
      const codeOrId = data.slice("gift:cancel_code:".length);
      try {
        const result = await api.cancelGiftCode(token, codeOrId);
        await editMessageContent(
          ctx,
          `РІСљвЂ¦ ${result.message}`,
          giftCodeResultButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С•РЎвЂљР СР ВµР Р…РЎвЂ№";
        await editMessageContent(ctx, `РІСњРЉ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    await ctx.answerCallbackQuery({ text: "Р СњР ВµР С‘Р В·Р Р†Р ВµРЎРѓРЎвЂљР Р…Р С•Р Вµ Р Т‘Р ВµР в„–РЎРѓРЎвЂљР Р†Р С‘Р Вµ" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°";
    await ctx.reply(`РІСњРЉ ${msg}`).catch(() => {});
  }
});

// Р вЂ™Р С‘Р Т‘Р ВµР С• Р С•РЎвЂљ Р В°Р Т‘Р СР С‘Р Р…Р В° РІвЂ вЂ™ Р Р†Р С•Р В·Р Р†РЎР‚Р В°РЎвЂ°Р В°Р ВµР С file_id Р Т‘Р В»РЎРЏ Р Р†Р С‘Р Т‘Р ВµР С•-Р С‘Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘Р в„–
bot.on("message:video", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const config = await api.getPublicConfig();
  const isAdmin = config?.botAdminTelegramIds?.includes(String(userId)) ?? false;
  if (!isAdmin) return;
  const fileId = ctx.message.video.file_id;
  await ctx.reply(
    `СЂСџвЂњв„– <b>file_id Р Р†Р С‘Р Т‘Р ВµР С•:</b>\n<code>${fileId}</code>\n\nР РЋР С”Р С•Р С—Р С‘РЎР‚РЎС“Р в„–РЎвЂљР Вµ Р С‘ Р Р†РЎРѓРЎвЂљР В°Р Р†РЎРЉРЎвЂљР Вµ Р Р† Р В°Р Т‘Р СР С‘Р Р…Р С”РЎС“ Р С—РЎР‚Р С‘ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р С‘Р С‘ Р Р†Р С‘Р Т‘Р ВµР С•-Р С‘Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂ Р С‘Р С‘.`,
    { parse_mode: "HTML" }
  );
});

// Р РЋР С•Р С•Р В±РЎвЂ°Р ВµР Р…Р С‘РЎРЏ РЎРѓ РЎвЂћР С•РЎвЂљР С• РІР‚вЂќ Р В°Р Т‘Р СР С‘Р Р… Р СР С•Р В¶Р ВµРЎвЂљ Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С‘РЎвЂљРЎРЉ РЎвЂћР С•РЎвЂљР С• РЎРѓ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓРЎРЉРЎР‹ Р Т‘Р В»РЎРЏ РЎР‚Р В°РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р С‘
bot.on("message:photo", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  if (!awaitingBroadcastMessage.has(userId)) return;
  awaitingBroadcastMessage.delete(userId);
  const config = await api.getPublicConfig();
  if (!config?.botAdminTelegramIds?.includes(String(userId))) {
    await ctx.reply("Р вЂќР С•РЎРѓРЎвЂљРЎС“Р С— Р В·Р В°Р С—РЎР‚Р ВµРЎвЂ°РЎвЂР Р….");
    return;
  }
  const photos = ctx.message.photo;
  if (!photos?.length) {
    await ctx.reply("Р В¤Р С•РЎвЂљР С• Р Р…Р Вµ Р С—Р С•Р В»РЎС“РЎвЂЎР ВµР Р…Р С•. Р С›РЎвЂљР С—РЎР‚Р В°Р Р†РЎРЉРЎвЂљР Вµ РЎвЂћР С•РЎвЂљР С• РЎРѓ Р С—Р С•Р Т‘Р С—Р С‘РЎРѓРЎРЉРЎР‹ Р С‘Р В»Р С‘ РЎвЂљР ВµР С”РЎРѓРЎвЂљ.");
    return;
  }
  const largest = photos[photos.length - 1];
  const caption = ctx.message.caption?.trim() ?? "";
  // Р СџР В°РЎР‚РЎРѓР С‘Р С Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р†Р С‘Р Т‘Р В° [Р СћР ВµР С”РЎРѓРЎвЂљ Р С”Р Р…Р С•Р С—Р С”Р С‘](URL) Р С‘Р В· Р С—Р С•Р Т‘Р С—Р С‘РЎРѓР С‘
  const btnMatch = caption.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
  const buttonText = btnMatch?.[1];
  const buttonUrl = btnMatch?.[2];
  const cleanCaption = btnMatch ? caption.replace(btnMatch[0], "").trim() : caption;
  lastBroadcastMessage.set(userId, { text: cleanCaption || caption, photoFileId: largest.file_id, buttonText, buttonUrl });
  await ctx.reply("Р С™Р С•Р СРЎС“ Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С‘РЎвЂљРЎРЉ?", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "СЂСџвЂњВ± Р СћР С•Р В»РЎРЉР С”Р С• Telegram", callback_data: "admin:bc:tg" },
          { text: "СЂСџвЂњВ§ Р СћР С•Р В»РЎРЉР С”Р С• Email", callback_data: "admin:bc:email" },
        ],
        [{ text: "СЂСџвЂњВ±+СЂСџвЂњВ§ Telegram Р С‘ Email", callback_data: "admin:bc:both" }],
        [{ text: "РІвЂ”Р‚РїС‘РЏ Р С›РЎвЂљР СР ВµР Р…Р В°", callback_data: "admin:menu" }],
      ],
    },
  });
});

// Р РЋР С•Р С•Р В±РЎвЂ°Р ВµР Р…Р С‘РЎРЏ РЎРѓ РЎвЂљР ВµР С”РЎРѓРЎвЂљР С•Р С РІР‚вЂќ Р С—РЎР‚Р С•Р СР С•Р С”Р С•Р Т‘ Р С‘Р В»Р С‘ РЎвЂЎР С‘РЎРѓР В»Р С• Р Т‘Р В»РЎРЏ Р С—Р С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘РЎРЏ
bot.on("message:text", async (ctx) => {
  if (ctx.message.text?.startsWith("/")) return;
  const userId = ctx.from?.id;
  if (!userId) return;

  // Р С’Р Т‘Р СР С‘Р Р…: Р Р†Р Р†Р С•Р Т‘ РЎвЂљР ВµР С”РЎРѓРЎвЂљР В° РЎР‚Р В°РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р С‘
  if (awaitingBroadcastMessage.has(userId)) {
    awaitingBroadcastMessage.delete(userId);
    const config = await api.getPublicConfig();
    if (!config?.botAdminTelegramIds?.includes(String(userId))) {
      await ctx.reply("Р вЂќР С•РЎРѓРЎвЂљРЎС“Р С— Р В·Р В°Р С—РЎР‚Р ВµРЎвЂ°РЎвЂР Р….");
      return;
    }
    const text = ctx.message.text?.trim() ?? "";
    if (!text) {
      await ctx.reply("Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ Р Р…Р ВµР С—РЎС“РЎРѓРЎвЂљР С•Р в„– РЎвЂљР ВµР С”РЎРѓРЎвЂљ РЎРѓР С•Р С•Р В±РЎвЂ°Р ВµР Р…Р С‘РЎРЏ.");
      return;
    }
    // Р СџР В°РЎР‚РЎРѓР С‘Р С Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р†Р С‘Р Т‘Р В° [Р СћР ВµР С”РЎРѓРЎвЂљ Р С”Р Р…Р С•Р С—Р С”Р С‘](URL) Р С‘Р В· РЎвЂљР ВµР С”РЎРѓРЎвЂљР В°
    const btnMatch = text.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    const buttonText = btnMatch?.[1];
    const buttonUrl = btnMatch?.[2];
    const cleanText = btnMatch ? text.replace(btnMatch[0], "").trim() : text;
    lastBroadcastMessage.set(userId, { text: cleanText || text, buttonText, buttonUrl });
    await ctx.reply("Р С™Р С•Р СРЎС“ Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С‘РЎвЂљРЎРЉ?", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "СЂСџвЂњВ± Р СћР С•Р В»РЎРЉР С”Р С• Telegram", callback_data: "admin:bc:tg" },
            { text: "СЂСџвЂњВ§ Р СћР С•Р В»РЎРЉР С”Р С• Email", callback_data: "admin:bc:email" },
          ],
          [{ text: "СЂСџвЂњВ±+СЂСџвЂњВ§ Telegram Р С‘ Email", callback_data: "admin:bc:both" }],
          [{ text: "РІвЂ”Р‚РїС‘РЏ Р С›РЎвЂљР СР ВµР Р…Р В°", callback_data: "admin:menu" }],
        ],
      },
    });
    return;
  }

  // Р С’Р Т‘Р СР С‘Р Р…: Р Р†Р Р†Р С•Р Т‘ РЎРѓРЎС“Р СР СРЎвЂ№ Р С—Р С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘РЎРЏ Р В±Р В°Р В»Р В°Р Р…РЎРѓР В°
  if (awaitingAdminBalance.has(userId)) {
    const clientId = awaitingAdminBalance.get(userId);
    awaitingAdminBalance.delete(userId);
    const config = await api.getPublicConfig();
    if (!config?.botAdminTelegramIds?.includes(String(userId)) || !clientId) {
      await ctx.reply("Р вЂќР С•РЎРѓРЎвЂљРЎС“Р С— Р В·Р В°Р С—РЎР‚Р ВµРЎвЂ°РЎвЂР Р… Р С‘Р В»Р С‘ РЎРѓР ВµРЎРѓРЎРѓР С‘РЎРЏ Р С‘РЎРѓРЎвЂљР ВµР С”Р В»Р В°.");
      return;
    }
    const num = Number(ctx.message.text?.replace(/,/, "."));
    if (!Number.isFinite(num) || num <= 0 || num > 1000000) {
      await ctx.reply("Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ Р С—Р С•Р В»Р С•Р В¶Р С‘РЎвЂљР ВµР В»РЎРЉР Р…Р С•Р Вµ РЎвЂЎР С‘РЎРѓР В»Р С• (Р Т‘Р С• 1 000 000).");
      return;
    }
    try {
      const result = await api.patchBotAdminClientBalance(userId, clientId, num);
      await ctx.reply(`РІСљвЂ¦ Р вЂР В°Р В»Р В°Р Р…РЎРѓ Р С—Р С•Р С—Р С•Р В»Р Р…Р ВµР Р…. Р СњР С•Р Р†РЎвЂ№Р в„– Р В±Р В°Р В»Р В°Р Р…РЎРѓ: ${result.newBalance}`);
    } catch (e: unknown) {
      await ctx.reply(`РІСњРЉ ${e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В°"}`);
    }
    return;
  }

  // Р С’Р Т‘Р СР С‘Р Р…: Р Р†Р Р†Р С•Р Т‘ Р С—Р С•Р С‘РЎРѓР С”Р В° (Telegram ID, @username, email)
  if (awaitingAdminSearch.has(userId)) {
    awaitingAdminSearch.delete(userId);
    const config = await api.getPublicConfig();
    if (!config?.botAdminTelegramIds?.includes(String(userId))) {
      await ctx.reply("Р вЂќР С•РЎРѓРЎвЂљРЎС“Р С— Р В·Р В°Р С—РЎР‚Р ВµРЎвЂ°РЎвЂР Р….");
      return;
    }
    const searchQuery = ctx.message.text?.trim() ?? "";
    lastAdminSearch.set(userId, searchQuery);
    try {
      const { items, total, limit } = await api.getBotAdminClients(userId, 1, searchQuery || undefined);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const msg =
        (searchQuery ? `СЂСџвЂТђ Р СџР С•Р С‘РЎРѓР С” Р’В«${searchQuery}Р’В» (${total})\n\n` : `СЂСџвЂТђ Р С™Р В»Р С‘Р ВµР Р…РЎвЂљРЎвЂ№ (${total})\n\n`) +
        items
          .map(
            (c, i) =>
              `${i + 1}. ${c.email || c.telegramUsername || c.telegramId || c.id.slice(0, 8)} ${c.isBlocked ? "СЂСџС™В«" : ""}`
          )
          .join("\n") +
        `\n\nР РЋРЎвЂљРЎР‚. 1/${totalPages}`;
      const rows: InlineMarkup["inline_keyboard"] = items.map((c) => [
        {
          text: `${c.email || c.telegramUsername || c.telegramId || c.id.slice(0, 8)} ${c.isBlocked ? "СЂСџС™В«" : ""}`,
          callback_data: `admin:client:${c.id}`,
        },
      ]);
      const nav: InlineMarkup["inline_keyboard"][0] = [
        { text: "РІвЂ”Р‚РїС‘РЏ Р вЂ™ Р В°Р Т‘Р СР С‘Р Р…Р С”РЎС“", callback_data: "admin:menu" },
      ];
      if (searchQuery) nav.push({ text: "РІСљвЂ“ Р РЋР В±РЎР‚Р С•РЎРѓР С‘РЎвЂљРЎРЉ Р С—Р С•Р С‘РЎРѓР С”", callback_data: "admin:clients:clear" });
      if (totalPages > 1) nav.push({ text: "Р вЂ™Р С—Р ВµРЎР‚РЎвЂР Т‘ РІвЂ“В¶", callback_data: "admin:clients:2" });
      rows.push(nav);
      await ctx.reply(msg, { reply_markup: { inline_keyboard: rows } });
    } catch (e: unknown) {
      lastAdminSearch.delete(userId);
      const errMsg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С—Р С•Р С‘РЎРѓР С”Р В°";
      await ctx.reply(`РІСњРЉ ${errMsg}`);
    }
    return;
  }

  const token = await getOrRestoreToken(userId, ctx.from?.username);
  if (!token) return;
  const publicConfig = await api.getPublicConfig().catch(() => null);
  if (await enforceSubscription(ctx, publicConfig)) return;

  // Р вЂўРЎРѓР В»Р С‘ Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЉ Р С•Р В¶Р С‘Р Т‘Р В°Р ВµРЎвЂљ Р Р†Р Р†Р С•Р Т‘ Р С—Р С•Р Т‘Р В°РЎР‚Р С•РЎвЂЎР Р…Р С•Р С–Р С• Р С”Р С•Р Т‘Р В°
  if (awaitingGiftCode.has(userId)) {
    awaitingGiftCode.delete(userId);
    const code = ctx.message.text.trim().toUpperCase();
    const menuKb = { reply_markup: { inline_keyboard: [[{ text: publicConfig?.botBackLabel ?? "РІвЂ С’ Р СњР В°Р В·Р В°Р Т‘", callback_data: "menu:gift" }]] } };
    if (!code) {
      await ctx.reply("Р С™Р С•Р Т‘ Р Р…Р Вµ Р СР С•Р В¶Р ВµРЎвЂљ Р В±РЎвЂ№РЎвЂљРЎРЉ Р С—РЎС“РЎРѓРЎвЂљРЎвЂ№Р С.", menuKb);
      return;
    }
    try {
      const result = await api.redeemGiftCode(token, code);
      let text = `РІСљвЂ¦ Р СџР С•Р Т‘Р В°РЎР‚Р С•Р С” Р В°Р С”РЎвЂљР С‘Р Р†Р С‘РЎР‚Р С•Р Р†Р В°Р Р…!\n\nР СџР С•Р Т‘Р С—Р С‘РЎРѓР С”Р В° #${result.subscriptionIndex} Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р В° Р Р† Р Р†Р В°РЎв‚¬ Р В°Р С”Р С”Р В°РЎС“Р Р…РЎвЂљ!`;
      if (result.tariffName) {
        text += `\nР СћР В°РЎР‚Р С‘РЎвЂћ: ${result.tariffName}`;
      }
      if (result.giftMessage) {
        text += `\n\nСЂСџвЂ™РЉ Р РЋР С•Р С•Р В±РЎвЂ°Р ВµР Р…Р С‘Р Вµ Р С•РЎвЂљ Р Т‘Р В°РЎР‚Р С‘РЎвЂљР ВµР В»РЎРЏ:\nР’В«${result.giftMessage}Р’В»`;
      }
      await ctx.reply(text, menuKb);

      // Р Р€Р Р†Р ВµР Т‘Р С•Р СР В»РЎРЏР ВµР С Р Т‘Р В°РЎР‚Р С‘РЎвЂљР ВµР В»РЎРЏ Р С• РЎвЂљР С•Р С, РЎвЂЎРЎвЂљР С• Р С—Р С•Р Т‘Р В°РЎР‚Р С•Р С” Р В°Р С”РЎвЂљР С‘Р Р†Р С‘РЎР‚Р С•Р Р†Р В°Р Р…
      if (result.creatorTelegramId) {
        const recipientName = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name ?? "Р СџР С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЉ";
        const notifyText = `СЂСџР‹Рѓ Р вЂ™Р В°РЎв‚¬ Р С—Р С•Р Т‘Р В°РЎР‚Р С•Р С” Р В°Р С”РЎвЂљР С‘Р Р†Р С‘РЎР‚Р С•Р Р†Р В°Р Р…!\n\n${recipientName} Р С—РЎР‚Р С‘Р Р…РЎРЏР В»(Р В°) Р Р†Р В°РЎв‚¬ Р С—Р С•Р Т‘Р В°РЎР‚Р С•Р С”${result.tariffName ? ` (${result.tariffName})` : ""}.`;
        bot.api.sendMessage(result.creatorTelegramId, notifyText).catch(() => {});
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р В°Р С”РЎвЂљР С‘Р Р†Р В°РЎвЂ Р С‘Р С‘ Р С—Р С•Р Т‘Р В°РЎР‚Р С”Р В°";
      await ctx.reply(`РІСњРЉ ${msg}`, menuKb);
    }
    return;
  }

  // Р вЂўРЎРѓР В»Р С‘ Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЉ Р С•Р В¶Р С‘Р Т‘Р В°Р ВµРЎвЂљ Р Р†Р Р†Р С•Р Т‘ Р С—РЎР‚Р С•Р СР С•Р С”Р С•Р Т‘Р В°
  if (awaitingPromoCode.has(userId)) {
    awaitingPromoCode.delete(userId);
    const lang = getUserLang(userId);
    const code = ctx.message.text.trim();
    const menuKb = { reply_markup: { inline_keyboard: [[{ text: publicConfig?.botBackLabel ?? _t("back_to_menu", lang), callback_data: "menu:main" }]] } };
    if (!code) {
      await ctx.reply(_t("promo.empty_code", lang), menuKb);
      return;
    }
    try {
      const checkResult = await api.checkPromoCode(token, code);
      if (checkResult.type === "FREE_DAYS") {
        const activateResult = await api.activatePromoCode(token, code);
        await ctx.reply(`РІСљвЂ¦ ${activateResult.message}`, menuKb);
      } else if (checkResult.type === "DISCOUNT") {
        const desc = checkResult.discountPercent
          ? `РЎРѓР С”Р С‘Р Т‘Р С”Р В° ${checkResult.discountPercent}%`
          : checkResult.discountFixed
            ? `РЎРѓР С”Р С‘Р Т‘Р С”Р В° ${checkResult.discountFixed}`
            : "РЎРѓР С”Р С‘Р Т‘Р С”Р В°";
        activeDiscountCode.set(userId, { code, discountPercent: checkResult.discountPercent, discountFixed: checkResult.discountFixed });
        await ctx.reply(`РІСљвЂ¦ Р СџРЎР‚Р С•Р СР С•Р С”Р С•Р Т‘ Р’В«${checkResult.name}Р’В» Р С—РЎР‚Р С‘Р Р…РЎРЏРЎвЂљ! ${desc}.\n\n${_t("promo.discount_applied", lang)}`, menuKb);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : _t("error_generic", lang);
      await ctx.reply(`РІСњРЉ ${msg}`, menuKb);
    }
    return;
  }

  const num = Number(ctx.message.text.replace(/,/, "."));
  if (!Number.isFinite(num) || num < 1 || num > 1000000) return;

  try {
    const config = publicConfig ?? await api.getPublicConfig();
    const methods = config?.plategaMethods ?? [];
    const yooEnabled = !!config?.yoomoneyEnabled;
    const yookassaEnabledMsg = !!config?.yookassaEnabled;
    const cryptopayEnabledMsg = !!config?.cryptopayEnabled;
    if (!methods.length && !yooEnabled && !yookassaEnabledMsg && !cryptopayEnabledMsg) {
      await ctx.reply("Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р†РЎР‚Р ВµР СР ВµР Р…Р Р…Р С• Р Р…Р ВµР Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р Р…Р С•.");
      return;
    }
    const client = await api.getMe(token);
    const rawStyles = config?.botInnerButtonStyles;
    const backStyle = rawStyles?.back !== undefined ? rawStyles.back : "danger";
    const botEmojis = config?.botEmojis;
    const msgEmojiIds: InnerEmojiIds | undefined = botEmojis
      ? {
          back: botEmojis.BACK?.tgEmojiId,
          card: botEmojis.CARD?.tgEmojiId,
          tariff: botEmojis.PACKAGE?.tgEmojiId || botEmojis.TARIFFS?.tgEmojiId,
          trial: botEmojis.TRIAL?.tgEmojiId,
          profile: botEmojis.PUZZLE?.tgEmojiId || botEmojis.PROFILE?.tgEmojiId,
          connect: botEmojis.SERVERS?.tgEmojiId || botEmojis.CONNECT?.tgEmojiId,
        }
      : undefined;
    if (methods.length > 1 || (methods.length >= 1 && (yooEnabled || yookassaEnabledMsg || cryptopayEnabledMsg)) || (methods.length === 0 && ((yooEnabled && yookassaEnabledMsg) || (yooEnabled && cryptopayEnabledMsg) || (yookassaEnabledMsg && cryptopayEnabledMsg)))) {
      const topupMsg1 = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(num, client.preferredCurrency)}\n\nР вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎРѓР С—Р С•РЎРѓР С•Р В± Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:`, config?.botEmojis);
      await ctx.reply(topupMsg1.text, {
        entities: topupMsg1.entities.length ? topupMsg1.entities : undefined,
        reply_markup: topupPaymentMethodButtons(String(num), methods, config?.botBackLabel ?? null, backStyle, msgEmojiIds, yooEnabled, yookassaEnabledMsg, cryptopayEnabledMsg),
      });
      return;
    }
    // Р вЂўРЎРѓР В»Р С‘ РЎвЂљР С•Р В»РЎРЉР С”Р С• Р В®Money (Р Р…Р ВµРЎвЂљ platega, Р Р…Р ВµРЎвЂљ Р В®Kassa) РІР‚вЂќ РЎРѓРЎР‚Р В°Р В·РЎС“ РЎРѓР С•Р В·Р Т‘Р В°РЎвЂР С
    if (methods.length === 0 && yooEnabled) {
      const payment = await api.createYoomoneyPayment(token, { amount: num, paymentType: "AC" });
      const topupMsgYoo = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(num, client.preferredCurrency)}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Money:`, config?.botEmojis);
      await ctx.reply(topupMsgYoo.text, {
        entities: topupMsgYoo.entities.length ? topupMsgYoo.entities : undefined,
        reply_markup: payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, backStyle, msgEmojiIds),
      });
      return;
    }
    // Р вЂўРЎРѓР В»Р С‘ РЎвЂљР С•Р В»РЎРЉР С”Р С• Р В®Kassa
    if (methods.length === 0 && yookassaEnabledMsg) {
      const payment = await api.createYookassaPayment(token, { amount: num, currency: "RUB" });
      const topupMsgYoo = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(num, "RUB")}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Р В®Kassa:`, config?.botEmojis);
      await ctx.reply(topupMsgYoo.text, {
        entities: topupMsgYoo.entities.length ? topupMsgYoo.entities : undefined,
        reply_markup: payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, backStyle, msgEmojiIds),
      });
      return;
    }
    // Р вЂўРЎРѓР В»Р С‘ РЎвЂљР С•Р В»РЎРЉР С”Р С• Crypto Pay
    if (methods.length === 0 && cryptopayEnabledMsg) {
      const payment = await api.createCryptopayPayment(token, { amount: num, currency: client.preferredCurrency });
      const topupMsgCp = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(num, client.preferredCurrency)}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№ РЎвЂЎР ВµРЎР‚Р ВµР В· Crypto Bot:`, config?.botEmojis);
      await ctx.reply(topupMsgCp.text, {
        entities: topupMsgCp.entities.length ? topupMsgCp.entities : undefined,
        reply_markup: payUrlMarkup(payment.payUrl, config?.botBackLabel ?? null, backStyle, msgEmojiIds),
      });
      return;
    }
    const payment = await api.createPlategaPayment(token, {
      amount: num,
      currency: client.preferredCurrency,
      paymentMethod: methods[0].id,
      description: "Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р В±Р В°Р В»Р В°Р Р…РЎРѓР В°",
    });
    const topupMsg2 = titleWithEmoji("CARD", `Р СџР С•Р С—Р С•Р В»Р Р…Р ВµР Р…Р С‘Р Вµ Р Р…Р В° ${formatMoney(num, client.preferredCurrency)}\n\nР СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р С”Р Р…Р С•Р С—Р С”РЎС“ Р Р…Р С‘Р В¶Р Вµ Р Т‘Р В»РЎРЏ Р С•Р С—Р В»Р В°РЎвЂљРЎвЂ№:`, config?.botEmojis);
    await ctx.reply(topupMsg2.text, {
      entities: topupMsg2.entities.length ? topupMsg2.entities : undefined,
      reply_markup: payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, backStyle, msgEmojiIds),
    });
  } catch {
    // Р Р…Р Вµ РЎвЂЎР С‘РЎРѓР В»Р С• Р С‘Р В»Р С‘ Р С•РЎв‚¬Р С‘Р В±Р С”Р В° РІР‚вЂќ Р С‘Р С–Р Р…Р С•РЎР‚Р С‘РЎР‚РЎС“Р ВµР С
  }
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start({
  onStart: async (info) => {
    BOT_USERNAME = info.username || "";
    console.log(`Bot @${BOT_USERNAME} started`);
    try {
      const cfg = await api.getPublicConfig();
      if (cfg?.translations) setTranslations(cfg.translations);
    } catch { /* ignore */ }
  },
});

