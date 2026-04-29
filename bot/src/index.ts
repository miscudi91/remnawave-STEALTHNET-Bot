/**
 * STEALTHNET 3.2.7 вЂ” Telegram-Р±РѕС‚
 * РџРѕР»РЅС‹Р№ С„СѓРЅРєС†РёРѕРЅР°Р» РєР°Р±РёРЅРµС‚Р°: РіР»Р°РІРЅР°СЏ, С‚Р°СЂРёС„С‹, РїСЂРѕС„РёР»СЊ, РїРѕРїРѕР»РЅРµРЅРёРµ, С‚СЂРёР°Р», СЂРµС„РµСЂР°Р»СЊРЅР°СЏ СЃСЃС‹Р»РєР°, VPN.
 * Р¦РІРµС‚РЅС‹Рµ РєРЅРѕРїРєРё: style primary / success / danger (Telegram Bot API).
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
        console.log(`[Bot] API РЅРµРґРѕСЃС‚СѓРїРµРЅ, РїРѕРІС‚РѕСЂ С‡РµСЂРµР· ${delayMs / 1000}СЃ (${i}/${maxRetries})вЂ¦`);
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
        console.log("[Proxy] Telegram Bot API С‡РµСЂРµР· HTTP РїСЂРѕРєСЃРё");
        return new Bot(token, {
          client: { baseFetchConfig: { dispatcher: new UndiciProxyAgent(url) } as any },
        });
      }
      if (lower.startsWith("socks5://") || lower.startsWith("socks4://") || lower.startsWith("socks://")) {
        console.log("[Proxy] Telegram Bot API С‡РµСЂРµР· SOCKS РїСЂРѕРєСЃРё");
        const agent = new SocksProxyAgent(url);
        return new Bot(token, {
          client: { baseFetchConfig: { agent } as any },
        });
      }
      console.warn(`[Proxy] РќРµРёР·РІРµСЃС‚РЅС‹Р№ РїСЂРѕС‚РѕРєРѕР» РїСЂРѕРєСЃРё: ${url}, Р·Р°РїСѓСЃРє Р±РµР· РїСЂРѕРєСЃРё`);
    }
  } catch {
    console.warn("[Bot] РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РєРѕРЅС„РёРі, Р·Р°РїСѓСЃРє Р±РµР· РїСЂРѕРєСЃРё");
  }
  return new Bot(token);
}

const bot = await createBotWithProxy(BOT_TOKEN);

let BOT_USERNAME = "";

// вЂ”вЂ”вЂ” РџСЂРёРЅСѓРґРёС‚РµР»СЊРЅР°СЏ РїРѕРґРїРёСЃРєР° РЅР° РєР°РЅР°Р» вЂ”вЂ”вЂ”

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

/** РџСЂРѕРІРµСЂСЏРµС‚, РїРѕРґРїРёСЃР°РЅ Р»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅР° СѓРєР°Р·Р°РЅРЅС‹Р№ РєР°РЅР°Р»/РіСЂСѓРїРїСѓ. */
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
 * РџСЂРѕРІРµСЂСЏРµС‚ РїРѕРґРїРёСЃРєСѓ Рё, РµСЃР»Рё РЅРµ РїРѕРґРїРёСЃР°РЅ, РѕС‚РїСЂР°РІР»СЏРµС‚/СЂРµРґР°РєС‚РёСЂСѓРµС‚ СЃРѕРѕР±С‰РµРЅРёРµ.
 * Р’РѕР·РІСЂР°С‰Р°РµС‚ true РµСЃР»Рё РќР• РїРѕРґРїРёСЃР°РЅ (РЅСѓР¶РЅРѕ РїСЂРµСЂРІР°С‚СЊ РѕР±СЂР°Р±РѕС‚РєСѓ).
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
      `вљ пёЏ ${msg}\n\n${_t("subscribe.cannot_verify", lang)}`,
      { reply_markup: subscribeKeyboard(channelId, lang) }
    );
    return true;
  }
  await ctx.reply(`вљ пёЏ ${msg}`, { reply_markup: subscribeKeyboard(channelId, lang) });
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

// РўРѕРєРµРЅС‹ РїРѕ telegram_id (РІ РїР°РјСЏС‚Рё; Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєР°СЏ РїРµСЂРµР°РІС‚РѕСЂРёР·Р°С†РёСЏ РїСЂРё РїРѕС‚РµСЂРµ)
const tokenStore = new Map<number, string>();

function getToken(userId: number): string | undefined {
  return tokenStore.get(userId);
}

function setToken(userId: number, token: string): void {
  tokenStore.set(userId, token);
}

/**
 * РџРѕР»СѓС‡РёС‚СЊ С‚РѕРєРµРЅ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ. Р•СЃР»Рё С‚РѕРєРµРЅ РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚ (СЂРµСЃС‚Р°СЂС‚ Р±РѕС‚Р°, РїСЂРѕС‚СѓС… Рё С‚.Рґ.),
 * Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РїРµСЂРµР°РІС‚РѕСЂРёР·СѓРµС‚ С‡РµСЂРµР· registerByTelegram Рё РІРѕР·РІСЂР°С‰Р°РµС‚ СЃРІРµР¶РёР№ С‚РѕРєРµРЅ.
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

// РџРѕР»СЊР·РѕРІР°С‚РµР»Рё, РѕР¶РёРґР°СЋС‰РёРµ РІРІРѕРґР° РїСЂРѕРјРѕРєРѕРґР°
const awaitingPromoCode = new Set<number>();
// РђРєС‚РёРІРЅС‹Р№ РїСЂРѕРјРѕРєРѕРґ РЅР° СЃРєРёРґРєСѓ (С…СЂР°РЅРёС‚СЃСЏ РґРѕ РѕРїР»Р°С‚С‹)
type DiscountInfo = { code: string; discountPercent?: number | null; discountFixed?: number | null };
const activeDiscountCode = new Map<number, DiscountInfo>();
// РћР¶РёРґР°РЅРёРµ РІРІРѕРґР° РїРѕРґР°СЂРѕС‡РЅРѕРіРѕ РєРѕРґР°
const awaitingGiftCode = new Set<number>();

// РђРґРјРёРЅ: РѕР¶РёРґР°РЅРёРµ РІРІРѕРґР° РїРѕРёСЃРєР°; РїРѕСЃР»РµРґРЅРёР№ РїРѕРёСЃРє РїРѕ userId РґР»СЏ РїР°РіРёРЅР°С†РёРё
const awaitingAdminSearch = new Set<number>();
const lastAdminSearch = new Map<number, string>();
// РђРґРјРёРЅ: РїРѕРїРѕР»РЅРµРЅРёРµ Р±Р°Р»Р°РЅСЃР° РєР»РёРµРЅС‚Р° вЂ” РѕР¶РёРґР°РµРј С‡РёСЃР»Рѕ
const awaitingAdminBalance = new Map<number, string>();
// РђРґРјРёРЅ: СЂР°СЃСЃС‹Р»РєР° вЂ” РѕР¶РёРґР°РµРј С‚РµРєСЃС‚ РёР»Рё С„РѕС‚Рѕ+РїРѕРґРїРёСЃСЊ, Р·Р°С‚РµРј РєР°РЅР°Р»
const awaitingBroadcastMessage = new Set<number>();
type BroadcastPayload = { text: string; photoFileId?: string; buttonText?: string; buttonUrl?: string };
const lastBroadcastMessage = new Map<number, string | BroadcastPayload>();
// РђРґРјРёРЅ: СЃРєРІР°РґС‹ вЂ” СЃРїРёСЃРѕРє РґР»СЏ РґРѕР±Р°РІР»РµРЅРёСЏ/СѓРґР°Р»РµРЅРёСЏ (clientId + items СЃ uuid/name)
const lastSquadsForAdd = new Map<number, { clientId: string; items: { uuid: string; name: string }[] }>();
const lastSquadsForRemove = new Map<number, { clientId: string; items: { uuid: string; name: string }[] }>();
// РЈСЃС‚СЂРѕР№СЃС‚РІР° (HWID): СЃРїРёСЃРѕРє РґР»СЏ СЌРєСЂР°РЅР° В«РЈРґР°Р»РёС‚СЊ СѓСЃС‚СЂРѕР№СЃС‚РІРѕВ» (РёРЅРґРµРєСЃ РІ callback)
const lastDevicesList = new Map<number, { devices: { hwid: string; platform?: string; deviceModel?: string }[] }>();

/** Р”РѕСЃС‚Р°РЎРІР‚?Рј subscriptionUrl РёР· РѕС‚РІРµС‚Р° Remna */
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

/** Р”РѕСЃС‚Р°РЎРІР‚?Рј РѕР±СЉРµРєС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РёР· РѕС‚РІРµС‚Р° Remna (response РёР»Рё data РёР»Рё СЃР°Рј РѕР±СЉРµРєС‚) */
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

/** РџСЂРѕРіСЂРµСЃСЃ-Р±Р°СЂ РёР· СЃРёРјРІРѕР»РѕРІ (0..1), РґР»РёРЅР° barLen */
function progressBar(pct: number, barLen: number): string {
  const filled = Math.round(Math.max(0, Math.min(1, pct)) * barLen);
  return "в–€".repeat(filled) + "в–€".repeat(barLen - filled);
}

const DEFAULT_MENU_TEXTS: Record<string, string> = {
  welcomeTitlePrefix: "рџ›Ў ",
  welcomeGreeting: "СЂСџРІР‚?вЂ№ Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ РІ ",
  balancePrefix: "рџ’° Р РІР‚?Р°Р»Р°РЅСЃ: ",
  tariffPrefix: "рџ’Ћ Р’Р°С€ С‚Р°СЂРёС„ : ",
  subscriptionPrefix: "{{CHART}} РЎС‚Р°С‚СѓСЃ РїРѕРґРїРёСЃРєРё вЂ” ",
  statusInactive: "{{STATUS_INACTIVE}} РСЃС‚РµРєР»Р°",
  statusActive: "{{STATUS_ACTIVE}} РђРєС‚РёРІРЅР°",
  statusExpired: "{{STATUS_EXPIRED}} РСЃС‚РµРєР»Р°",
  statusLimited: "{{STATUS_LIMITED}} РћРіСЂР°РЅРёС‡РµРЅР°",
  statusDisabled: "{{STATUS_DISABLED}} РћС‚РєР»СЋС‡РµРЅР°",
  expirePrefix: "рџ“… РґРѕ ",
  daysLeftPrefix: "вЏ° РѕСЃС‚Р°Р»РѕСЃСЊ ",
  devicesLabel: "рџ“± РЈСЃС‚СЂРѕР№СЃС‚РІ: ",
  devicesAvailable: " РґРѕСЃС‚СѓРїРЅРѕ",
  trafficPrefix: "рџ“€ РўСЂР°С„РёРє вЂ” ",
  linkLabel: "рџ”— РЎСЃС‹Р»РєР° РїРѕРґРєР»СЋС‡РµРЅРёСЏ:",
  chooseAction: "Р’С‹Р±РµСЂРёС‚Рµ РґРµР№СЃС‚РІРёРµ:",
};

const DEFAULT_TARIFFS_TEXT = "РўР°СЂРёС„С‹\n\n{{CATEGORY}}\n{{TARIFFS}}\n\nР’С‹Р±РµСЂРёС‚Рµ С‚Р°СЂРёС„ РґР»СЏ РѕРїР»Р°С‚С‹:";
const DEFAULT_PAYMENT_TEXT = "РћРїР»Р°С‚Р°: {{NAME}} вЂ” {{PRICE}}\n\n{{ACTION}}";

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
  on_purchase: "СЃР±СЂРѕСЃ РїСЂРё РїРѕРєСѓРїРєРµ",
  monthly: "СЃР±СЂРѕСЃ РµР¶РµРјРµСЃСЏС‡РЅРѕ",
  monthly_rolling: "СЃРєРѕР»СЊР·СЏС‰РёР№ РјРµСЃСЏС†",
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
    parts.push(limit == null ? "С‚СЂР°С„РёРє Р±РµР· Р»РёРјРёС‚Р°" : `С‚СЂР°С„РёРє ${bytesToGb(limit)} GB`);
  }
  if (fields.trafficResetMode) {
    const label = RESET_MODE_LABELS[tariff.trafficResetMode ?? "no_reset"];
    if (label) parts.push(label);
  }
  if (fields.deviceLimit) {
    const limit = tariff.deviceLimit;
    parts.push(limit == null ? "СѓСЃС‚СЂРѕР№СЃС‚РІР° Р±РµР· Р»РёРјРёС‚Р°" : `СѓСЃС‚СЂРѕР№СЃС‚РІР° ${limit}`);
  }
  if (!parts.length) return `вЂў ${tariff.name}`;
  return `вЂў ${parts.join(" вЂ” ")}`;
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
    ? `${discount.originalPrice} в†’ ${discount.discountedPrice}`
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

/** Р”Р»РёРЅР° РїРµСЂРІРѕРіРѕ СЃРёРјРІРѕР»Р° РІ UTF-16 (РґР»СЏ entity) */
function firstCharLengthUtf16(s: string): number {
  if (!s.length) return 0;
  const cp = s.codePointAt(0);
  return cp != null && cp > 0xffff ? 2 : 1;
}

const DEFAULT_EMOJI_UNICODE: Record<string, string> = {
  PACKAGE: "рџ“¦", TARIFFS: "рџ“¦", CARD: "рџ’і", LINK: "рџ”—", PUZZLE: "СЂСџРІР‚?В¤", PROFILE: "СЂСџРІР‚?В¤",
  TRIAL: "рџЋЃ", SERVERS: "рџЊђ", CONNECT: "рџЊђ",
  CHART: "рџ“Љ",
  STATUS_ACTIVE: "рџџЎ", STATUS_EXPIRED: "рџ”ґ", STATUS_INACTIVE: "рџ”ґ",
  STATUS_LIMITED: "рџџЎ", STATUS_DISABLED: "рџ”ґ",
};
const DEFAULT_CUSTOM_EMOJI_CHAR = "рџ™‚";

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

/** Р—Р°РіРѕР»РѕРІРѕРє СЃ СЌРјРѕРґР·Рё: РµСЃР»Рё РІ botEmojis РµСЃС‚СЊ tgEmojiId РґР»СЏ РєР»СЋС‡Р° вЂ” РґРѕР±Р°РІР»СЏРµРј entity (РїСЂРµРјРёСѓРј-СЌРјРѕРґР·Рё РІ С‚РµРєСЃС‚Рµ). */
function titleWithEmoji(
  emojiKey: string,
  rest: string,
  botEmojis?: Record<string, { unicode?: string; tgEmojiId?: string }> | null
): { text: string; entities: CustomEmojiEntity[] } {
  const entry = botEmojis?.[emojiKey];
  const unicode = entry?.unicode?.trim() || DEFAULT_EMOJI_UNICODE[emojiKey] || "вЂў";
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
  const unicode = entry?.unicode?.trim() || DEFAULT_EMOJI_UNICODE[emojiKey] || "вЂў";
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

/** РџРѕР»РЅС‹Р№ С‚РµРєСЃС‚ РіР»Р°РІРЅРѕРіРѕ РјРµРЅСЋ + entities РґР»СЏ РїСЂРµРјРёСѓРј-СЌРјРѕРґР·Рё РІ С‚РµРєСЃС‚Рµ (РІР»Р°РґРµР»РµС† Р±РѕС‚Р° РґРѕР»Р¶РµРЅ РёРјРµС‚СЊ Telegram Premium). */
function buildMainMenuText(opts: {
  serviceName: string;
  balance: number;
  currency: string;
  subscription: unknown;
  /** РћС‚РѕР±СЂР°Р¶Р°РµРјРѕРµ РёРјСЏ С‚Р°СЂРёС„Р° СЃ Р±СЌРєРµРЅРґР°: РўСЂРёР°Р», РЅР°Р·РІР°РЅРёРµ СЃ СЃР°Р№С‚Р° РёР»Рё В«РўР°СЂРёС„ РЅРµ РІС‹Р±СЂР°РЅВ» */
  tariffDisplayName?: string | null;
  menuTexts?: Record<string, string> | null;
  menuLineVisibility?: Record<string, boolean> | null;
  menuTextCustomEmojiIds?: Record<string, string> | null;
  botEmojis?: Record<string, { unicode?: string; tgEmojiId?: string }> | null;
}): { text: string; entities: CustomEmojiEntity[] } {
  const { serviceName, balance, currency, subscription, tariffDisplayName, menuTexts, menuLineVisibility, menuTextCustomEmojiIds, botEmojis } = opts;
  const name = serviceName.trim() || "РљР°Р±РёРЅРµС‚";
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
  const tariffName = (tariffDisplayName && tariffDisplayName.trim()) || "РўР°СЂРёС„ РЅРµ РІС‹Р±СЂР°РЅ";
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
      : `рџџЎ ${status}`;
    const expireStr = expireDate
      ? expireDate.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "вЂ”";
    const daysLeft =
      expireDate && expireDate > new Date()
        ? Math.max(0, Math.ceil((expireDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
        : null;

    pushLine("subscriptionPrefix", t(menuTexts, "subscriptionPrefix") + statusLabel);
    pushLine("expirePrefix", t(menuTexts, "expirePrefix") + expireStr);
    if (daysLeft != null) {
      pushLine("daysLeftPrefix", t(menuTexts, "daysLeftPrefix") + `${daysLeft} ${daysLeft === 1 ? "РґРµРЅСЊ" : daysLeft < 5 ? "РґРЅСЏ" : "РґРЅРµР№"}`);
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
      pushLine("trafficPrefix", t(menuTexts, "trafficPrefix") + `рџџў ${progressBar(pct, 14)} ${pctInt}% (${usedGb} / ${limitGb} GB)`);
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

/** Р›РѕРіРѕС‚РёРї РёР· РЅР°СЃС‚СЂРѕРµРє: data URL РёР»Рё URL в†’ РёСЃС‚РѕС‡РЅРёРє РґР»СЏ sendPhoto/sendAnimation Рё РїСЂРёР·РЅР°Рє GIF */
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

/** Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ СЃРѕРѕР±С‰РµРЅРёРµ: С‚РµРєСЃС‚ Рё РєР»Р°РІРёР°С‚СѓСЂР° (РµСЃР»Рё СЃ С„РѕС‚Рѕ/Р°РЅРёРјР°С†РёРµР№ вЂ” caption, РёРЅР°С‡Рµ text) */
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
  const sym = c === "RUB" ? "в‚Ѕ" : c === "USD" ? "$" : "в‚ґ";
  return `${amount} ${sym}`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Р Р°СЃСЃС‡РёС‚Р°С‚СЊ С†РµРЅСѓ СЃРѕ СЃРєРёРґРєРѕР№ */
function getDiscountedPrice(price: number, discount: DiscountInfo): number {
  let final = price;
  if (discount.discountPercent && discount.discountPercent > 0) final -= final * discount.discountPercent / 100;
  if (discount.discountFixed && discount.discountFixed > 0) final -= discount.discountFixed;
  return Math.max(0, Math.round(final * 100) / 100);
}

/**
 * РџР°СЂСЃРёРЅРі start-РїР°СЂР°РјРµС‚СЂР°.
 * РќРѕРІС‹Р№ С„РѕСЂРјР°С‚ (С‡РµСЂРµР· __): ref_CODE__s_SOURCE__m_MEDIUM__k_CAMPAIGN__n_CONTENT__t_TERM
 * РЎС‚Р°СЂС‹Р№ С„РѕСЂРјР°С‚ (С‡РµСЂРµР· _c_): ref_CODE_c_SOURCE_CAMPAIGN
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

// вЂ”вЂ”вЂ” /start СЃ СЂРµС„РµСЂР°Р»СЊРЅС‹Рј РєРѕРґРѕРј (РЅР°РїСЂРёРјРµСЂ /start ref_ABC123) РёР»Рё РїСЂРѕРјРѕ (/start promo_XXXX) РёР»Рё РєР°РјРїР°РЅРёСЏ (/start c_facebook_summer)
bot.command("start", async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  const telegramId = String(from.id);
  const telegramUsername = from.username ?? undefined;
  const payload = ctx.match?.trim() || "";

  // РЎР±СЂР°СЃС‹РІР°РµРј СЃРѕСЃС‚РѕСЏРЅРёРµ СЂР°СЃСЃС‹Р»РєРё, С‡С‚РѕР±С‹ Р±Р°РЅРЅРµСЂ/С„РѕС‚Рѕ РЅРµ В«Р·Р°Р»РёРїР°Р»РѕВ»
  lastBroadcastMessage.delete(from.id);
  awaitingBroadcastMessage.delete(from.id);

  // Deep-link Р°РІС‚РѕСЂРёР·Р°С†РёСЏ РЅР° СЃР°Р№С‚Рµ: /start auth_TOKEN
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

  // РћРїСЂРµРґРµР»СЏРµРј С‚РёРї deeplink
  const isPromo = /^promo_/i.test(payload);
  const promoCode = isPromo ? payload.replace(/^promo_/i, "") : undefined;
  const parsed = parseStartPayload(payload);
  const refCode = !isPromo ? (parsed.refCode ?? (payload.replace(/^ref_?/i, "").trim() || undefined)) : undefined;

  try {
    const config = await api.getPublicConfig();
    if (config?.translations) setTranslations(config.translations);
    const name = config?.serviceName?.trim() || "РљР°Р±РёРЅРµС‚";

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

    // Р•СЃР»Рё СЌС‚Рѕ РїСЂРѕРјРѕ-СЃСЃС‹Р»РєР° вЂ” Р°РєС‚РёРІРёСЂСѓРµРј РїСЂРѕРјРѕРєРѕРґ
    if (promoCode) {
      try {
        const result = await api.activatePromo(auth.token, promoCode);
        await ctx.reply(`вњ… ${result.message}\n\nРќР°Р¶РјРёС‚Рµ /start С‡С‚РѕР±С‹ РѕС‚РєСЂС‹С‚СЊ РјРµРЅСЋ.`);
        return;
      } catch (promoErr: unknown) {
        const promoMsg = promoErr instanceof Error ? promoErr.message : "РћС€РёР±РєР° Р°РєС‚РёРІР°С†РёРё РїСЂРѕРјРѕРєРѕРґР°";
        await ctx.reply(`вќЊ ${promoMsg}\n\nРќР°Р¶РјРёС‚Рµ /start С‡С‚РѕР±С‹ РѕС‚РєСЂС‹С‚СЊ РјРµРЅСЋ.`);
        return;
      }
    }

    // РџСЂРѕРІРµСЂРєР° РїРѕРґРїРёСЃРєРё РЅР° РєР°РЅР°Р»
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
      markup.inline_keyboard.push([{ text: "вљ™пёЏ РџР°РЅРµР»СЊ Р°РґРјРёРЅР°", callback_data: "admin:menu" }]);
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
    const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° РІС…РѕРґР°";
    await ctx.reply(`вќЊ ${msg}`);
  }
});

// вЂ”вЂ”вЂ” /link РљРћР” вЂ” РїСЂРёРІСЏР·РєР° Telegram Рє Р°РєРєР°СѓРЅС‚Сѓ (РєРѕРґ РёР· РєР°Р±РёРЅРµС‚Р° РЅР° СЃР°Р№С‚Рµ)
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
    await ctx.reply(`вќЊ ${msg}`);
  }
});

// вЂ”вЂ”вЂ” Callback: РјРµРЅСЋ Рё РґРµР№СЃС‚РІРёСЏ
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  if (!userId) return;
  await ctx.answerCallbackQuery().catch(() => {});

  // РђРґРјРёРЅ-РїР°РЅРµР»СЊ РІ Р±РѕС‚Рµ (РЅРµ С‚СЂРµР±СѓРµС‚ С‚РѕРєРµРЅР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ)
  if (data.startsWith("admin:")) {
    const config = await api.getPublicConfig();
    if (!config?.botAdminTelegramIds?.includes(String(userId))) {
      await ctx.answerCallbackQuery({ text: "Р”РѕСЃС‚СѓРї Р·Р°РїСЂРµС‰РЎРІР‚?РЅ", show_alert: true }).catch(() => {});
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
          [{ text: "рџ“Љ РЎС‚Р°С‚РёСЃС‚РёРєР°", callback_data: "admin:stats" }],
          [{ text: "рџ”” РЈРІРµРґРѕРјР»РµРЅРёСЏ", callback_data: "admin:notifications" }],
          [{ text: "СЂСџРІР‚?Тђ РљР»РёРµРЅС‚С‹", callback_data: "admin:clients:1" }],
          [{ text: "рџ”Ќ РџРѕРёСЃРє РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ", callback_data: "admin:search" }],
          [
            { text: "рџ’і РћР¶РёРґР°СЋС‚ РѕРїР»Р°С‚С‹", callback_data: "admin:payments:pending:1" },
            { text: "рџ’° РџРѕСЃР»РµРґРЅРёРµ РїР»Р°С‚РµР¶Рё", callback_data: "admin:payments:paid:1" },
          ],
          [{ text: "рџ“ў Р Р°СЃСЃС‹Р»РєР°", callback_data: "admin:broadcast" }],
          [{ text: "в—ЂпёЏ Р’ РјРµРЅСЋ", callback_data: "menu:main" }],
        ],
      };
      await editMessageContent(ctx, "вљ™пёЏ РџР°РЅРµР»СЊ Р°РґРјРёРЅР°\n\nР’С‹Р±РµСЂРёС‚Рµ СЂР°Р·РґРµР»:", markup);
      return;
    }
    if (data === "admin:notifications") {
      const settings = await api.getBotAdminNotificationSettings(userId);
      const s = settings;
      const yesNo = (v: boolean) => (v ? "Р’РєР»" : "Р’С‹РєР»");
      const text =
        "рџ”” РќР°СЃС‚СЂРѕР№РєРё СѓРІРµРґРѕРјР»РµРЅРёР№\n\n" +
        `РџРѕРїРѕР»РЅРµРЅРёРµ Р±Р°Р»Р°РЅСЃР°: ${yesNo(s.notifyBalanceTopup)}\n` +
        `РћРїР»Р°С‚Р° С‚Р°СЂРёС„РѕРІ: ${yesNo(s.notifyTariffPayment)}\n` +
        `РќРѕРІС‹Рµ РєР»РёРµРЅС‚С‹: ${yesNo(s.notifyNewClient)}\n` +
        `РќРѕРІС‹Рµ С‚РёРєРµС‚С‹: ${yesNo(s.notifyNewTicket)}\n\n` +
        "РќР°Р¶РјРёС‚Рµ РЅР° РїСѓРЅРєС‚ РЅРёР¶Рµ, С‡С‚РѕР±С‹ РїРµСЂРµРєР»СЋС‡РёС‚СЊ.";
      const markup: InlineMarkup = {
        inline_keyboard: [
          [{ text: `рџ’° РџРѕРїРѕР»РЅРµРЅРёРµ Р±Р°Р»Р°РЅСЃР°: ${yesNo(s.notifyBalanceTopup)}`, callback_data: "admin:notif:balance" }],
          [{ text: `рџ“¦ РћРїР»Р°С‚Р° С‚Р°СЂРёС„РѕРІ: ${yesNo(s.notifyTariffPayment)}`, callback_data: "admin:notif:tariff" }],
          [{ text: `СЂСџРІР‚?В¤ РќРѕРІС‹Рµ РєР»РёРµРЅС‚С‹: ${yesNo(s.notifyNewClient)}`, callback_data: "admin:notif:newclient" }],
          [{ text: `рџЋ« РќРѕРІС‹Рµ С‚РёРєРµС‚С‹: ${yesNo(s.notifyNewTicket)}`, callback_data: "admin:notif:newticket" }],
          [{ text: "в—ЂпёЏ Р’ Р°РґРјРёРЅРєСѓ", callback_data: "admin:menu" }],
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
      const yesNo = (v: boolean) => (v ? "Р’РєР»" : "Р’С‹РєР»");
      const text =
        "рџ”” РќР°СЃС‚СЂРѕР№РєРё СѓРІРµРґРѕРјР»РµРЅРёР№\n\n" +
        `РџРѕРїРѕР»РЅРµРЅРёРµ Р±Р°Р»Р°РЅСЃР°: ${yesNo(s.notifyBalanceTopup)}\n` +
        `РћРїР»Р°С‚Р° С‚Р°СЂРёС„РѕРІ: ${yesNo(s.notifyTariffPayment)}\n` +
        `РќРѕРІС‹Рµ РєР»РёРµРЅС‚С‹: ${yesNo(s.notifyNewClient)}\n` +
        `РќРѕРІС‹Рµ С‚РёРєРµС‚С‹: ${yesNo(s.notifyNewTicket)}\n\n` +
        "РќР°Р¶РјРёС‚Рµ РЅР° РїСѓРЅРєС‚ РЅРёР¶Рµ, С‡С‚РѕР±С‹ РїРµСЂРµРєР»СЋС‡РёС‚СЊ.";
      const markup: InlineMarkup = {
        inline_keyboard: [
          [{ text: `рџ’° РџРѕРїРѕР»РЅРµРЅРёРµ Р±Р°Р»Р°РЅСЃР°: ${yesNo(s.notifyBalanceTopup)}`, callback_data: "admin:notif:balance" }],
          [{ text: `рџ“¦ РћРїР»Р°С‚Р° С‚Р°СЂРёС„РѕРІ: ${yesNo(s.notifyTariffPayment)}`, callback_data: "admin:notif:tariff" }],
          [{ text: `СЂСџРІР‚?В¤ РќРѕРІС‹Рµ РєР»РёРµРЅС‚С‹: ${yesNo(s.notifyNewClient)}`, callback_data: "admin:notif:newclient" }],
          [{ text: `рџЋ« РќРѕРІС‹Рµ С‚РёРєРµС‚С‹: ${yesNo(s.notifyNewTicket)}`, callback_data: "admin:notif:newticket" }],
          [{ text: "в—ЂпёЏ Р’ Р°РґРјРёРЅРєСѓ", callback_data: "admin:menu" }],
        ],
      };
      await editMessageContent(ctx, text, markup);
      return;
    }
    if (data === "admin:search") {
      awaitingAdminSearch.add(userId);
      await editMessageContent(
        ctx,
        "рџ”Ќ РџРѕРёСЃРє РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ\n\nР’РІРµРґРёС‚Рµ Telegram ID, @username РёР»Рё email:",
        { inline_keyboard: [[{ text: "в—ЂпёЏ РћС‚РјРµРЅР°", callback_data: "admin:menu" }]] }
      );
      return;
    }
    if (data === "admin:stats") {
      const stats = await api.getBotAdminStats(userId);
      const u = stats.users;
      const s = stats.sales;
      const text =
        `рџ“Љ РЎС‚Р°С‚РёСЃС‚РёРєР°\n\nСЂСџРІР‚?Тђ РџРѕР»СЊР·РѕРІР°С‚РµР»Рё: ${u.total}\nРЎ Remna: ${u.withRemna}\nРќРѕРІС‹С… Р·Р° 7 РґРЅ.: ${u.newLast7Days}\nРќРѕРІС‹С… Р·Р° 30 РґРЅ.: ${u.newLast30Days}\n\n` +
        `рџ’° РџСЂРѕРґР°Р¶Рё (РІСЃРµРіРѕ): ${s.totalAmount} в‚Ѕ (${s.totalCount})\nР—Р° 7 РґРЅ.: ${s.last7DaysAmount} в‚Ѕ (${s.last7DaysCount})\nР—Р° 30 РґРЅ.: ${s.last30DaysAmount} в‚Ѕ (${s.last30DaysCount})`;
      const back: InlineMarkup = { inline_keyboard: [[{ text: "в—ЂпёЏ Р’ Р°РґРјРёРЅРєСѓ", callback_data: "admin:menu" }]] };
      await editMessageContent(ctx, text, back);
      return;
    }
    if (data.startsWith("admin:clients:")) {
      const suffix = data.slice("admin:clients:".length);
      if (suffix === "clear") {
        lastAdminSearch.delete(userId);
        // РџРѕРєР°Р·Р°С‚СЊ РїРµСЂРІСѓСЋ СЃС‚СЂР°РЅРёС†Сѓ Р±РµР· РїРѕРёСЃРєР°
        const { items, total, limit } = await api.getBotAdminClients(userId, 1);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        let msg = `СЂСџРІР‚?Тђ РљР»РёРµРЅС‚С‹ (${total})\n\n`;
        items.forEach((c, i) => {
          const label = c.email || c.telegramUsername || c.telegramId || c.id.slice(0, 8);
          msg += `${i + 1}. ${label} ${c.isBlocked ? "рџљ«" : ""}\n`;
        });
        msg += `\nРЎС‚СЂ. 1/${totalPages}`;
        const rows: InlineMarkup["inline_keyboard"] = [];
        items.forEach((c) => {
          rows.push([
            {
              text: `${c.email || c.telegramUsername || c.telegramId || c.id.slice(0, 8)} ${c.isBlocked ? "рџљ«" : ""}`,
              callback_data: `admin:client:${c.id}`,
            },
          ]);
        });
        const nav: InlineMarkup["inline_keyboard"][0] = [];
        nav.push({ text: "в—ЂпёЏ Р’ Р°РґРјРёРЅРєСѓ", callback_data: "admin:menu" });
        if (totalPages > 1) nav.push({ text: "Р’РїРµСЂРЎРІР‚?Рґ в–¶", callback_data: "admin:clients:2" });
        rows.push(nav);
        await editMessageContent(ctx, msg, { inline_keyboard: rows });
        return;
      }
      const page = parseInt(suffix, 10) || 1;
      const search = lastAdminSearch.get(userId);
      const { items, total, limit } = await api.getBotAdminClients(userId, page, search);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      let msg = search ? `СЂСџРІР‚?Тђ РџРѕРёСЃРє В«${search}В» (${total})\n\n` : `СЂСџРІР‚?Тђ РљР»РёРµРЅС‚С‹ (${total})\n\n`;
      items.forEach((c, i) => {
        const label = c.email || c.telegramUsername || c.telegramId || c.id.slice(0, 8);
        msg += `${(page - 1) * limit + i + 1}. ${label} ${c.isBlocked ? "рџљ«" : ""}\n`;
      });
      msg += `\nРЎС‚СЂ. ${page}/${totalPages}`;
      const rows: InlineMarkup["inline_keyboard"] = [];
      items.forEach((c) => {
        rows.push([
          {
            text: `${c.email || c.telegramUsername || c.telegramId || c.id.slice(0, 8)} ${c.isBlocked ? "рџљ«" : ""}`,
            callback_data: `admin:client:${c.id}`,
          },
        ]);
      });
      const nav: InlineMarkup["inline_keyboard"][0] = [];
      if (page > 1) nav.push({ text: "в—Ђ РќР°Р·Р°Рґ", callback_data: `admin:clients:${page - 1}` });
      nav.push({ text: "в—ЂпёЏ Р’ Р°РґРјРёРЅРєСѓ", callback_data: "admin:menu" });
      if (search) nav.push({ text: "вњ– РЎР±СЂРѕСЃРёС‚СЊ РїРѕРёСЃРє", callback_data: "admin:clients:clear" });
      if (page < totalPages) nav.push({ text: "Р’РїРµСЂРЎРІР‚?Рґ в–¶", callback_data: `admin:clients:${page + 1}` });
      rows.push(nav);
      await editMessageContent(ctx, msg, { inline_keyboard: rows });
      return;
    }
    if (data.startsWith("admin:client:")) {
      const clientId = data.slice("admin:client:".length);
      if (!clientId) return;
      const client = await api.getBotAdminClient(userId, clientId);
      const created = client.createdAt ? new Date(client.createdAt).toLocaleString("ru-RU") : "вЂ”";
      let text = `СЂСџРІР‚?В¤ ${client.email || client.telegramUsername || client.telegramId || client.id}\n\n`;
      text += `ID: ${client.id}\nР РІР‚?Р°Р»Р°РЅСЃ: ${client.balance}\nР РµС„РµСЂР°Р»РѕРІ: ${client._count?.referrals ?? 0}\nРЎРѕР·РґР°РЅ: ${created}\n`;
      if (client.isBlocked) text += `\nрџљ« Р—Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ${client.blockReason ? `: ${client.blockReason}` : ""}`;
      const kb: InlineMarkup["inline_keyboard"] = [];
      if (client.isBlocked) {
        kb.push([{ text: "вњ… Р Р°Р·Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ", callback_data: `admin:unblock:${client.id}` }]);
      } else {
        kb.push([{ text: "рџљ« Р—Р°Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ", callback_data: `admin:block:${client.id}` }]);
      }
      kb.push([{ text: "рџ’µ РџРѕРїРѕР»РЅРёС‚СЊ Р±Р°Р»Р°РЅСЃ", callback_data: `admin:balance:${client.id}` }]);
      if (client.remnawaveUuid) {
        kb.push(
          [
            { text: "рџ”„ РћС‚РѕР·РІР°С‚СЊ РїРѕРґРїРёСЃРєСѓ", callback_data: `admin:remna:revoke:${client.id}` },
            { text: "вЏё РћС‚РєР»СЋС‡РёС‚СЊ Remna", callback_data: `admin:remna:disable:${client.id}` },
          ],
          [
            { text: "в–¶ Р’РєР»СЋС‡РёС‚СЊ Remna", callback_data: `admin:remna:enable:${client.id}` },
            { text: "рџ“Љ РЎР±СЂРѕСЃРёС‚СЊ С‚СЂР°С„РёРє", callback_data: `admin:remna:reset:${client.id}` },
          ],
          [
            { text: "вћ• Р”РѕР±Р°РІРёС‚СЊ СЃРєРІР°Рґ", callback_data: `admin:squad:add:${client.id}` },
            { text: "вћ– РЈР±СЂР°С‚СЊ СЃРєРІР°Рґ", callback_data: `admin:squad:remove:${client.id}` },
          ]
        );
      }
      kb.push([{ text: "в—ЂпёЏ Рљ СЃРїРёСЃРєСѓ", callback_data: "admin:clients:1" }]);
      await editMessageContent(ctx, text, { inline_keyboard: kb });
      return;
    }
    if (data.startsWith("admin:balance:")) {
      const clientId = data.slice("admin:balance:".length);
      if (!clientId) return;
      awaitingAdminBalance.set(userId, clientId);
      await editMessageContent(
        ctx,
        "рџ’µ РџРѕРїРѕР»РЅРµРЅРёРµ Р±Р°Р»Р°РЅСЃР°\n\nР’РІРµРґРёС‚Рµ СЃСѓРјРјСѓ (С‡РёСЃР»Рѕ):",
        { inline_keyboard: [[{ text: "в—ЂпёЏ РћС‚РјРµРЅР°", callback_data: "admin:menu" }]] }
      );
      return;
    }
    if (data.startsWith("admin:remna:revoke:")) {
      const clientId = data.slice("admin:remna:revoke:".length);
      if (!clientId) return;
      try {
        await api.postBotAdminClientRemnaRevoke(userId, clientId);
        await editMessageContent(ctx, `вњ… РџРѕРґРїРёСЃРєР° Remna РѕС‚РѕР·РІР°РЅР° РґР»СЏ РєР»РёРµРЅС‚Р°.`, {
          inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]],
        });
      } catch (e: unknown) {
        await editMessageContent(ctx, `вќЊ ${e instanceof Error ? e.message : "РћС€РёР±РєР°"}`, {
          inline_keyboard: [[{ text: "в—ЂпёЏ РќР°Р·Р°Рґ", callback_data: `admin:client:${clientId}` }]],
        });
      }
      return;
    }
    if (data.startsWith("admin:remna:disable:")) {
      const clientId = data.slice("admin:remna:disable:".length);
      if (!clientId) return;
      try {
        await api.postBotAdminClientRemnaDisable(userId, clientId);
        await editMessageContent(ctx, "вњ… РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РѕС‚РєР»СЋС‡РЎРІР‚?РЅ РІ Remna.", {
          inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]],
        });
      } catch (e: unknown) {
        await editMessageContent(ctx, `вќЊ ${e instanceof Error ? e.message : "РћС€РёР±РєР°"}`, {
          inline_keyboard: [[{ text: "в—ЂпёЏ РќР°Р·Р°Рґ", callback_data: `admin:client:${clientId}` }]],
        });
      }
      return;
    }
    if (data.startsWith("admin:remna:enable:")) {
      const clientId = data.slice("admin:remna:enable:".length);
      if (!clientId) return;
      try {
        await api.postBotAdminClientRemnaEnable(userId, clientId);
        await editMessageContent(ctx, "вњ… РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РІРєР»СЋС‡РЎРІР‚?РЅ РІ Remna.", {
          inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]],
        });
      } catch (e: unknown) {
        await editMessageContent(ctx, `вќЊ ${e instanceof Error ? e.message : "РћС€РёР±РєР°"}`, {
          inline_keyboard: [[{ text: "в—ЂпёЏ РќР°Р·Р°Рґ", callback_data: `admin:client:${clientId}` }]],
        });
      }
      return;
    }
    if (data.startsWith("admin:remna:reset:")) {
      const clientId = data.slice("admin:remna:reset:".length);
      if (!clientId) return;
      try {
        await api.postBotAdminClientRemnaResetTraffic(userId, clientId);
        await editMessageContent(ctx, "вњ… РўСЂР°С„РёРє СЃР±СЂРѕС€РµРЅ.", {
          inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]],
        });
      } catch (e: unknown) {
        await editMessageContent(ctx, `вќЊ ${e instanceof Error ? e.message : "РћС€РёР±РєР°"}`, {
          inline_keyboard: [[{ text: "в—ЂпёЏ РќР°Р·Р°Рґ", callback_data: `admin:client:${clientId}` }]],
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
          await editMessageContent(ctx, "РЎРµСЃСЃРёСЏ РёСЃС‚РµРєР»Р° РёР»Рё СЃРєРІР°Рґ РЅРµ РЅР°Р№РґРµРЅ. Р’РµСЂРЅРёС‚РµСЃСЊ Рє РєР»РёРµРЅС‚Сѓ.", {
            inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]],
          });
          return;
        }
        const squadUuid = stored.items[index]!.uuid;
        try {
          await api.postBotAdminClientRemnaSquadAdd(userId, clientId, squadUuid);
          lastSquadsForAdd.delete(userId);
          await editMessageContent(ctx, `вњ… РЎРєРІР°Рґ В«${stored.items[index]!.name}В» РґРѕР±Р°РІР»РµРЅ.`, {
            inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]],
          });
        } catch (e: unknown) {
          await editMessageContent(ctx, `вќЊ ${e instanceof Error ? e.message : "РћС€РёР±РєР°"}`, {
            inline_keyboard: [[{ text: "в—ЂпёЏ РќР°Р·Р°Рґ", callback_data: `admin:squad:add:${clientId}` }]],
          });
        }
        return;
      }
      try {
        const { items } = await api.getBotAdminRemnaSquadsInternal(userId);
        if (!items.length) {
          await editMessageContent(ctx, "РќРµС‚ РґРѕСЃС‚СѓРїРЅС‹С… СЃРєРІР°РґРѕРІ РІ Remna.", {
            inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]],
          });
          return;
        }
        lastSquadsForAdd.set(userId, { clientId, items });
        const rows: InlineMarkup["inline_keyboard"] = items.slice(0, 15).map((s, i) => [
          { text: `вћ• ${s.name || s.uuid.slice(0, 8)}`, callback_data: `admin:squad:add:${clientId}:${i}` },
        ]);
        rows.push([{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]);
        await editMessageContent(ctx, "Р’С‹Р±РµСЂРёС‚Рµ СЃРєРІР°Рґ РґР»СЏ РґРѕР±Р°РІР»РµРЅРёСЏ:", { inline_keyboard: rows });
      } catch (e: unknown) {
        await editMessageContent(ctx, `вќЊ ${e instanceof Error ? e.message : "РћС€РёР±РєР°"}`, {
          inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]],
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
          await editMessageContent(ctx, "РЎРµСЃСЃРёСЏ РёСЃС‚РµРєР»Р° РёР»Рё СЃРєРІР°Рґ РЅРµ РЅР°Р№РґРµРЅ. Р’РµСЂРЅРёС‚РµСЃСЊ Рє РєР»РёРµРЅС‚Сѓ.", {
            inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]],
          });
          return;
        }
        const squadUuid = stored.items[index]!.uuid;
        try {
          await api.postBotAdminClientRemnaSquadRemove(userId, clientId, squadUuid);
          lastSquadsForRemove.delete(userId);
          await editMessageContent(ctx, `вњ… РЎРєРІР°Рґ В«${stored.items[index]!.name}В» СѓР±СЂР°РЅ.`, {
            inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]],
          });
        } catch (e: unknown) {
          await editMessageContent(ctx, `вќЊ ${e instanceof Error ? e.message : "РћС€РёР±РєР°"}`, {
            inline_keyboard: [[{ text: "в—ЂпёЏ РќР°Р·Р°Рґ", callback_data: `admin:squad:remove:${clientId}` }]],
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
          await editMessageContent(ctx, "РЈ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РЅРµС‚ СЃРєРІР°РґРѕРІ.", {
            inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]],
          });
          return;
        }
        lastSquadsForRemove.set(userId, { clientId, items: current });
        const rows: InlineMarkup["inline_keyboard"] = current.slice(0, 15).map((s, i) => [
          { text: `вћ– ${s.name}`, callback_data: `admin:squad:remove:${clientId}:${i}` },
        ]);
        rows.push([{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]);
        await editMessageContent(ctx, "Р’С‹Р±РµСЂРёС‚Рµ СЃРєРІР°Рґ РґР»СЏ СѓРґР°Р»РµРЅРёСЏ Сѓ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ:", { inline_keyboard: rows });
      } catch (e: unknown) {
        await editMessageContent(ctx, `вќЊ ${e instanceof Error ? e.message : "РћС€РёР±РєР°"}`, {
          inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РєР»РёРµРЅС‚Сѓ", callback_data: `admin:client:${clientId}` }]],
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
      const title = isPending ? `рџ’і РћР¶РёРґР°СЋС‚ РѕРїР»Р°С‚С‹ (${total})` : `рџ’° РџРѕСЃР»РµРґРЅРёРµ РїР»Р°С‚РµР¶Рё (${total})`;
      let msg = `${title}\n\n`;
      const rows: InlineMarkup["inline_keyboard"] = [];
      items.forEach((p, i) => {
        const label = `${p.amount} ${p.currency} вЂ” ${p.clientTelegramUsername || p.clientEmail || p.clientTelegramId || "вЂ”"}`;
        msg += `${(page - 1) * limit + i + 1}. ${label}\n`;
        if (isPending) {
          rows.push([{ text: `вњ… ${p.amount} ${p.currency} вЂ” РѕС‚РјРµС‚РёС‚СЊ РѕРїР»Р°С‡РµРЅРЅС‹Рј`, callback_data: `admin:pay:${p.id}` }]);
        }
      });
      msg += `\nРЎС‚СЂ. ${page}/${totalPages}`;
      const nav: InlineMarkup["inline_keyboard"][0] = [];
      if (page > 1) nav.push({ text: "в—Ђ РќР°Р·Р°Рґ", callback_data: `admin:payments:${status}:${page - 1}` });
      nav.push({ text: "в—ЂпёЏ Р’ Р°РґРјРёРЅРєСѓ", callback_data: "admin:menu" });
      if (page < totalPages) nav.push({ text: "Р’РїРµСЂРЎРІР‚?Рґ в–¶", callback_data: `admin:payments:${status}:${page + 1}` });
      rows.push(nav);
      await editMessageContent(ctx, msg, { inline_keyboard: rows });
      return;
    }
    if (data.startsWith("admin:pay:")) {
      const paymentId = data.slice("admin:pay:".length);
      if (!paymentId) return;
      try {
        await api.patchBotAdminPaymentMarkPaid(userId, paymentId);
        await editMessageContent(ctx, "вњ… РџР»Р°С‚С‘Р¶ РѕС‚РјРµС‡РµРЅ РєР°Рє РѕРїР»Р°С‡РµРЅРЅС‹Р№.", {
          inline_keyboard: [[{ text: "в—ЂпёЏ Рљ РїР»Р°С‚РµР¶Р°Рј", callback_data: "admin:payments:pending:1" }]],
        });
      } catch (e: unknown) {
        await editMessageContent(ctx, `вќЊ ${e instanceof Error ? e.message : "РћС€РёР±РєР°"}`, {
          inline_keyboard: [[{ text: "в—ЂпёЏ РќР°Р·Р°Рґ", callback_data: "admin:payments:pending:1" }]],
        });
      }
      return;
    }
    if (data === "admin:broadcast") {
      const counts = await api.getBotAdminBroadcastCount(userId);
      awaitingBroadcastMessage.add(userId);
      await editMessageContent(
        ctx,
        `рџ“ў Р Р°СЃСЃС‹Р»РєР°\n\nРЎРµР№С‡Р°СЃ: Telegram ${counts.withTelegram}, Email ${counts.withEmail}\n\nРћС‚РїСЂР°РІСЊС‚Рµ С‚РµРєСЃС‚ СЃРѕРѕР±С‰РµРЅРёСЏ РёР»Рё С„РѕС‚Рѕ СЃ РїРѕРґРїРёСЃСЊСЋ (caption):`,
        { inline_keyboard: [[{ text: "в—ЂпёЏ РћС‚РјРµРЅР°", callback_data: "admin:menu" }]] }
      );
      return;
    }
    if (data.startsWith("admin:bc:")) {
      const channel = data.slice("admin:bc:".length) as "tg" | "email" | "both";
      const raw = lastBroadcastMessage.get(userId);
      if (raw == null) {
        await editMessageContent(ctx, "РўРµРєСЃС‚ СЂР°СЃСЃС‹Р»РєРё РЅРµ РЅР°Р№РґРµРЅ. РќР°С‡РЅРёС‚Рµ Р·Р°РЅРѕРІРѕ.", {
          inline_keyboard: [[{ text: "в—ЂпёЏ Р’ Р°РґРјРёРЅРєСѓ", callback_data: "admin:menu" }]],
        });
        return;
      }
      const msg: BroadcastPayload = typeof raw === "string" ? { text: raw } : raw;
      const ch: "telegram" | "email" | "both" = channel === "tg" ? "telegram" : channel === "email" ? "email" : "both";
      const channelLabel = ch === "telegram" ? "Telegram" : ch === "email" ? "Email" : "Telegram Рё Email";
      // РЎСЂР°Р·Сѓ РїРѕРєР°Р·С‹РІР°РµРј, С‡С‚Рѕ СЂР°СЃСЃС‹Р»РєР° Р·Р°РїСѓС‰РµРЅР°, С‡С‚РѕР±С‹ Р±С‹Р»Рѕ РїРѕРЅСЏС‚РЅРѕ Рё РЅРµ РЅР°Р¶РёРјР°Р»Рё РїРѕРІС‚РѕСЂРЅРѕ
      await editMessageContent(ctx, `рџ“ў Р Р°СЃСЃС‹Р»РєР° РїРѕ РєР°РЅР°Р»Сѓ В«${channelLabel}В» Р·Р°РїСѓС‰РµРЅР°, РїРѕРґРѕР¶РґРёС‚РµвЂ¦`, {
        inline_keyboard: [[{ text: "в—ЂпёЏ Р’ Р°РґРјРёРЅРєСѓ", callback_data: "admin:menu" }]],
      });
      lastBroadcastMessage.delete(userId);
      try {
        const result = await api.postBotAdminBroadcast(userId, msg.text, ch, msg.photoFileId, msg.buttonText, msg.buttonUrl);
        const text = `вњ… Р Р°СЃСЃС‹Р»РєР° Р·Р°РІРµСЂС€РµРЅР°.\n\nTelegram: РѕС‚РїСЂР°РІР»РµРЅРѕ ${result.sentTelegram}, РѕС€РёР±РѕРє ${result.failedTelegram}\nEmail: РѕС‚РїСЂР°РІР»РµРЅРѕ ${result.sentEmail}, РѕС€РёР±РѕРє ${result.failedEmail}${result.errors?.length ? "\n\nРћС€РёР±РєРё: " + result.errors.slice(0, 3).join("; ") : ""}`;
        await editMessageContent(ctx, text, {
          inline_keyboard: [[{ text: "в—ЂпёЏ Р’ Р°РґРјРёРЅРєСѓ", callback_data: "admin:menu" }]],
        });
      } catch (e: unknown) {
        await editMessageContent(ctx, `вќЊ ${e instanceof Error ? e.message : "РћС€РёР±РєР°"}`, {
          inline_keyboard: [[{ text: "в—ЂпёЏ Р’ Р°РґРјРёРЅРєСѓ", callback_data: "admin:menu" }]],
        });
      }
      return;
    }
    if (data.startsWith("admin:block:")) {
      const clientId = data.slice("admin:block:".length);
      if (!clientId) return;
      await api.patchBotAdminClientBlock(userId, clientId, true);
      const client = await api.getBotAdminClient(userId, clientId);
      const created = client.createdAt ? new Date(client.createdAt).toLocaleString("ru-RU") : "вЂ”";
      let text = `СЂСџРІР‚?В¤ ${client.email || client.telegramUsername || client.telegramId || client.id}\n\nID: ${client.id}\nР РІР‚?Р°Р»Р°РЅСЃ: ${client.balance}\nР РµС„РµСЂР°Р»РѕРІ: ${client._count?.referrals ?? 0}\nРЎРѕР·РґР°РЅ: ${created}\n\nрџљ« Р—Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ`;
      const kb: InlineMarkup["inline_keyboard"] = [
        [{ text: "вњ… Р Р°Р·Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ", callback_data: `admin:unblock:${client.id}` }],
        [{ text: "в—ЂпёЏ Рљ СЃРїРёСЃРєСѓ", callback_data: "admin:clients:1" }],
      ];
      await editMessageContent(ctx, text, { inline_keyboard: kb });
      return;
    }
    if (data.startsWith("admin:unblock:")) {
      const clientId = data.slice("admin:unblock:".length);
      if (!clientId) return;
      await api.patchBotAdminClientBlock(userId, clientId, false);
      const client = await api.getBotAdminClient(userId, clientId);
      const created = client.createdAt ? new Date(client.createdAt).toLocaleString("ru-RU") : "вЂ”";
      let text = `СЂСџРІР‚?В¤ ${client.email || client.telegramUsername || client.telegramId || client.id}\n\nID: ${client.id}\nР РІР‚?Р°Р»Р°РЅСЃ: ${client.balance}\nР РµС„РµСЂР°Р»РѕРІ: ${client._count?.referrals ?? 0}\nРЎРѕР·РґР°РЅ: ${created}`;
      const kb: InlineMarkup["inline_keyboard"] = [
        [{ text: "рџљ« Р—Р°Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ", callback_data: `admin:block:${client.id}` }],
        [{ text: "в—ЂпёЏ Рљ СЃРїРёСЃРєСѓ", callback_data: "admin:clients:1" }],
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

    // РћР±СЂР°Р±РѕС‚РєР° РєРЅРѕРїРєРё В«РЇ РїРѕРґРїРёСЃР°Р»СЃСЏВ»
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
            `вљ пёЏ ${_t("subscribe.cannot_verify", lang)}`,
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

    // РџСЂРѕРІРµСЂРєР° РїРѕРґРїРёСЃРєРё РЅР° РєР°РЅР°Р» РґР»СЏ РІСЃРµС… РґРµР№СЃС‚РІРёР№
    if (config?.forceSubscribeEnabled && config.forceSubscribeChannelId?.trim()) {
      const lang = getUserLang(userId);
      const channelId = config.forceSubscribeChannelId.trim();
      const result = await checkUserSubscription(userId, channelId);
      if (result.state !== "subscribed") {
        const msg = config.forceSubscribeMessage?.trim() || _t("subscribe.default_message", lang);
        const details = result.state === "cannot_verify"
          ? `\n\n${_t("subscribe.cannot_verify", lang)}`
          : "";
        await editMessageContent(ctx, `вљ пёЏ ${msg}${details}`, subscribeKeyboard(channelId, lang));
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
      const name = config?.serviceName?.trim() || "РљР°Р±РёРЅРµС‚";
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
        backMarkup.inline_keyboard.push([{ text: "вљ™пёЏ РџР°РЅРµР»СЊ Р°РґРјРёРЅР°", callback_data: "admin:menu" }]);
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
        await editMessageContent(ctx, "РРЅСЃС‚СЂСѓРєС†РёРё РїРѕРєР° РЅРµ РґРѕР±Р°РІР»РµРЅС‹.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const backLabel = (config?.botBackLabel && config.botBackLabel.trim()) || "В« РќР°Р·Р°Рґ";
      const rows: { text: string; callback_data: string }[][] = vItems
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((v) => [{ text: `рџ“№ ${v.title}`, callback_data: `vinstr:${v.id}` }]);
      rows.push([{ text: backLabel, callback_data: "menu:support" }]);
      await editMessageContent(ctx, "рџ“№ Р’РёРґРµРѕ-РёРЅСЃС‚СЂСѓРєС†РёРё\n\nР’С‹Р±РµСЂРёС‚Рµ РёРЅСЃС‚СЂСѓРєС†РёСЋ:", { inline_keyboard: rows });
      return;
    }

    if (data.startsWith("vinstr:")) {
      const instrId = data.slice(7);
      const vItems = config?.videoInstructions ?? [];
      const instr = vItems.find((v) => v.id === instrId);
      if (!instr) {
        await editMessageContent(ctx, "РРЅСЃС‚СЂСѓРєС†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const backLabel = (config?.botBackLabel && config.botBackLabel.trim()) || "В« РќР°Р·Р°Рґ";
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      try {
        await ctx.deleteMessage().catch(() => {});
      } catch { /* ignore */ }
      try {
        await ctx.api.sendVideo(chatId, instr.telegramFileId, {
          caption: `рџ“№ ${instr.title}`,
          reply_markup: {
            inline_keyboard: [
              [{ text: "В« РќР°Р·Р°Рґ Рє РёРЅСЃС‚СЂСѓРєС†РёСЏРј", callback_data: "menu:video_instructions_fresh" }],
              [{ text: "рџЏ  Р“Р»Р°РІРЅРѕРµ РјРµРЅСЋ", callback_data: "menu:main" }],
            ],
          },
        });
      } catch (e) {
        await ctx.api.sendMessage(chatId, "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ РІРёРґРµРѕ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РїРѕР·Р¶Рµ.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "В« РќР°Р·Р°Рґ Рє РёРЅСЃС‚СЂСѓРєС†РёСЏРј", callback_data: "menu:video_instructions_fresh" }],
              [{ text: "рџЏ  Р“Р»Р°РІРЅРѕРµ РјРµРЅСЋ", callback_data: "menu:main" }],
            ],
          },
        });
      }
      return;
    }

    if (data === "menu:video_instructions_fresh") {
      const vItems = config?.videoInstructions ?? [];
      if (!vItems.length) {
        await ctx.api.sendMessage(ctx.chat!.id, "РРЅСЃС‚СЂСѓРєС†РёРё РїРѕРєР° РЅРµ РґРѕР±Р°РІР»РµРЅС‹.", {
          reply_markup: backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds),
        });
        return;
      }
      const backLabel = (config?.botBackLabel && config.botBackLabel.trim()) || "В« РќР°Р·Р°Рґ";
      const rows: { text: string; callback_data: string }[][] = vItems
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((v) => [{ text: `рџ“№ ${v.title}`, callback_data: `vinstr:${v.id}` }]);
      rows.push([{ text: backLabel, callback_data: "menu:support" }]);
      try {
        await ctx.deleteMessage().catch(() => {});
      } catch { /* ignore */ }
      await ctx.api.sendMessage(ctx.chat!.id, "рџ“№ Р’РёРґРµРѕ-РёРЅСЃС‚СЂСѓРєС†РёРё\n\nР’С‹Р±РµСЂРёС‚Рµ РёРЅСЃС‚СЂСѓРєС†РёСЋ:", {
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
        const { text, entities } = titleWithOptionalEmoji(tariffsEmojiKey, "РўР°СЂРёС„С‹\n\nР’С‹Р±РµСЂРёС‚Рµ РєР°С‚РµРіРѕСЂРёСЋ:", config?.botEmojis);
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
        await editMessageContent(ctx, "РљР°С‚РµРіРѕСЂРёСЏ РЅРµ РЅР°Р№РґРµРЅР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        await editMessageContent(ctx, "РўР°СЂРёС„С‹ РїСЂРѕРєСЃРё РїРѕРєР° РЅРµ РЅР°СЃС‚СЂРѕРµРЅС‹.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const cats = items.filter((c: { tariffs: unknown[] }) => c.tariffs?.length > 0);
      if (cats.length === 1 && cats[0]!.tariffs.length <= 5) {
        const head = cats[0]!.name;
        const lines = cats[0]!.tariffs.map((t: { name: string; price: number; currency: string }) => `вЂў ${t.name} вЂ” ${t.price} ${t.currency}`).join("\n");
        await editMessageContent(ctx, `рџЊђ РџСЂРѕРєСЃРё\n\n${head}\n${lines}\n\nР’С‹Р±РµСЂРёС‚Рµ С‚Р°СЂРёС„:`, proxyTariffPayButtons(cats, config?.botBackLabel ?? null, innerStyles, innerEmojiIds));
      } else {
        await editMessageContent(ctx, "рџЊђ РџСЂРѕРєСЃРё\n\nР’С‹Р±РµСЂРёС‚Рµ РєР°С‚РµРіРѕСЂРёСЋ:", proxyTariffPayButtons(cats, config?.botBackLabel ?? null, innerStyles, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("cat_proxy:")) {
      const categoryId = data.slice("cat_proxy:".length);
      const { items } = await api.getPublicProxyTariffs();
      const category = items?.find((c: { id: string }) => c.id === categoryId);
      if (!category?.tariffs?.length) {
        await editMessageContent(ctx, "РљР°С‚РµРіРѕСЂРёСЏ РЅРµ РЅР°Р№РґРµРЅР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const head = category.name;
      const lines = category.tariffs.map((t: { name: string; price: number; currency: string }) => `вЂў ${t.name} вЂ” ${t.price} ${t.currency}`).join("\n");
      await editMessageContent(ctx, `рџЊђ ${head}\n\n${lines}\n\nР’С‹Р±РµСЂРёС‚Рµ С‚Р°СЂРёС„:`, proxyTariffsOfCategoryButtons(category, config?.botBackLabel ?? null, innerStyles, "menu:proxy", innerEmojiIds));
      return;
    }

    if (data === "menu:singbox") {
      const { items } = await api.getPublicSingboxTariffs();
      if (!items?.length || items.every((c: { tariffs: unknown[] }) => !c.tariffs?.length)) {
        await editMessageContent(ctx, "РўР°СЂРёС„С‹ РґРѕСЃС‚СѓРїРѕРІ РїРѕРєР° РЅРµ РЅР°СЃС‚СЂРѕРµРЅС‹.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const cats = items.filter((c: { tariffs: unknown[] }) => c.tariffs?.length > 0);
      if (cats.length === 1 && cats[0]!.tariffs.length <= 5) {
        const head = cats[0]!.name;
        const lines = cats[0]!.tariffs.map((t: { name: string; price: number; currency: string }) => `вЂў ${t.name} вЂ” ${t.price} ${t.currency}`).join("\n");
        await editMessageContent(ctx, `СЂСџвЂќРІР‚? Р”РѕСЃС‚СѓРїС‹\n\n${head}\n${lines}\n\nР’С‹Р±РµСЂРёС‚Рµ С‚Р°СЂРёС„:`, singboxTariffPayButtons(cats, config?.botBackLabel ?? null, innerStyles, innerEmojiIds));
      } else {
        await editMessageContent(ctx, "СЂСџвЂќРІР‚? Р”РѕСЃС‚СѓРїС‹\n\nР’С‹Р±РµСЂРёС‚Рµ РєР°С‚РµРіРѕСЂРёСЋ:", singboxTariffPayButtons(cats, config?.botBackLabel ?? null, innerStyles, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("cat_singbox:")) {
      const categoryId = data.slice("cat_singbox:".length);
      const { items } = await api.getPublicSingboxTariffs();
      const category = items?.find((c: { id: string }) => c.id === categoryId);
      if (!category?.tariffs?.length) {
        await editMessageContent(ctx, "РљР°С‚РµРіРѕСЂРёСЏ РЅРµ РЅР°Р№РґРµРЅР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const head = category.name;
      const lines = category.tariffs.map((t: { name: string; price: number; currency: string }) => `вЂў ${t.name} вЂ” ${t.price} ${t.currency}`).join("\n");
      await editMessageContent(ctx, `СЂСџвЂќРІР‚? ${head}\n\n${lines}\n\nР’С‹Р±РµСЂРёС‚Рµ С‚Р°СЂРёС„:`, singboxTariffsOfCategoryButtons(category, config?.botBackLabel ?? null, innerStyles, "menu:singbox", innerEmojiIds));
      return;
    }

    if (data === "menu:my_singbox") {
      const slotsRes = await api.getSingboxSlots(token);
      const slots = slotsRes.slots ?? [];
      if (slots.length === 0) {
        await editMessageContent(ctx, "РЈ РІР°СЃ РїРѕРєР° РЅРµС‚ Р°РєС‚РёРІРЅС‹С… РґРѕСЃС‚СѓРїРѕРІ. РљСѓРїРёС‚Рµ С‚Р°СЂРёС„ РІ СЂР°Р·РґРµР»Рµ В«Р”РѕСЃС‚СѓРїС‹В».", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const lines = slots.map((s: { subscriptionLink: string; expiresAt: string; protocol: string }) => {
        const exp = new Date(s.expiresAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
        return `${s.protocol} вЂ” РґРѕ ${exp}\n${s.subscriptionLink}`;
      }).join("\n\n");
      const msg = `рџ“‹ РњРѕРё РґРѕСЃС‚СѓРїС‹ (${slots.length})\n\nРЎРєРѕРїРёСЂСѓР№С‚Рµ СЃСЃС‹Р»РєСѓ РІ РїСЂРёР»РѕР¶РµРЅРёРµ (v2rayN, Nekoray Рё РґСЂ.):\n\n${lines}`;
      await editMessageContent(ctx, msg.slice(0, 4096), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      return;
    }

    if (data === "menu:my_proxy") {
      const { slots } = await api.getProxySlots(token);
      if (!slots?.length) {
        await editMessageContent(ctx, "рџ“‹ РњРѕРё РїСЂРѕРєСЃРё\n\nРЈ РІР°СЃ РїРѕРєР° РЅРµС‚ Р°РєС‚РёРІРЅС‹С… РїСЂРѕРєСЃРё. РљСѓРїРёС‚Рµ С‚Р°СЂРёС„ РІ СЂР°Р·РґРµР»Рµ В«РџСЂРѕРєСЃРёВ».", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      let text = "рџ“‹ РњРѕРё РїСЂРѕРєСЃРё\n\n";
      for (const s of slots) {
        text += `вЂў SOCKS5: \`socks5://${s.login}:${s.password}@${s.host}:${s.socksPort}\`\n`;
        text += `вЂў HTTP: \`http://${s.login}:${s.password}@${s.host}:${s.httpPort}\`\n`;
        text += `  Р”Рѕ: ${new Date(s.expiresAt).toLocaleString("ru-RU")}\n\n`;
      }
      text += "РЎРєРѕРїРёСЂСѓР№С‚Рµ СЃС‚СЂРѕРєСѓ РІ РЅР°СЃС‚СЂРѕР№РєРё РїСЂРѕРєСЃРё РїСЂРёР»РѕР¶РµРЅРёСЏ.";
      await editMessageContent(ctx, text.slice(0, 4096), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      return;
    }

    if (data.startsWith("pay_proxy_balance:")) {
      const proxyTariffId = data.slice("pay_proxy_balance:".length);
      try {
        const result = await api.payByBalance(token, { proxyTariffId });
        await editMessageContent(ctx, `вњ… ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° РѕРїР»Р°С‚С‹";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_proxy_yoomoney:")) {
      const proxyTariffId = data.slice("pay_proxy_yoomoney:".length);
      const { items } = await api.getPublicProxyTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === proxyTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYoomoneyPayment(token, { amount: tariff.price, paymentType: "AC", proxyTariffId });
        const msg = buildPaymentMessage(config, {
          name: tariff.name,
          price: formatMoney(tariff.price, tariff.currency),
          amount: String(tariff.price),
          currency: tariff.currency,
          action: "РќР°Р¶РјРёС‚Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Money:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р°";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_proxy_yookassa:")) {
      const proxyTariffId = data.slice("pay_proxy_yookassa:".length);
      const { items } = await api.getPublicProxyTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === proxyTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (tariff.currency.toUpperCase() !== "RUB") {
        await editMessageContent(ctx, "Р®Kassa РїСЂРёРЅРёРјР°РµС‚ С‚РѕР»СЊРєРѕ СЂСѓР±Р»Рё (RUB).", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYookassaPayment(token, { amount: tariff.price, currency: "RUB", proxyTariffId });
        const msg = buildPaymentMessage(config, {
          name: tariff.name,
          price: formatMoney(tariff.price, tariff.currency),
          amount: String(tariff.price),
          currency: tariff.currency,
          action: "РќР°Р¶РјРёС‚Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Kassa:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р°";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_proxy_cryptopay:")) {
      const proxyTariffId = data.slice("pay_proxy_cryptopay:".length);
      const { items } = await api.getPublicProxyTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === proxyTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createCryptopayPayment(token, { amount: tariff.price, currency: tariff.currency, proxyTariffId });
        const msg = buildPaymentMessage(config, { name: tariff.name, price: formatMoney(tariff.price, tariff.currency), amount: String(tariff.price), currency: tariff.currency, action: "РќР°Р¶РјРёС‚Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Crypto Bot:" });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.payUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р°";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const methods = config?.plategaMethods ?? [];
      const client = await api.getMe(token);
      const balanceLabel = client && client.balance >= tariff.price ? `рџ’° РћРїР»Р°С‚РёС‚СЊ Р±Р°Р»Р°РЅСЃРѕРј (${formatMoney(client.balance, client.preferredCurrency ?? "RUB")})` : null;
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
            description: `РџСЂРѕРєСЃРё: ${tariff.name}`,
            proxyTariffId: tariff.id,
            promoCode: promoCodeProxy,
          });
          if (promoCodeProxy) activeDiscountCode.delete(userId);
          const msg = buildPaymentMessage(config, {
            name: tariff.name,
            price: formatMoney(tariff.price, tariff.currency),
            amount: String(tariff.price),
            currency: tariff.currency,
            action: "РќР°Р¶РјРёС‚Рµ РґР»СЏ РѕРїР»Р°С‚С‹:",
          }, discountArgProxy);
          await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "РћС€РёР±РєР°";
          await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        action: "Р’С‹Р±РµСЂРёС‚Рµ СЃРїРѕСЃРѕР± РѕРїР»Р°С‚С‹:",
      }, discountArgProxy);
      await editMessageContent(ctx, msg.text, markup, msg.entities);
      return;
    }

    if (data.startsWith("pay_singbox_balance:")) {
      const singboxTariffId = data.slice("pay_singbox_balance:".length);
      try {
        const result = await api.payByBalance(token, { singboxTariffId });
        await editMessageContent(ctx, `вњ… ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° РѕРїР»Р°С‚С‹";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_singbox_yoomoney:")) {
      const singboxTariffId = data.slice("pay_singbox_yoomoney:".length);
      const { items } = await api.getPublicSingboxTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === singboxTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYoomoneyPayment(token, { amount: tariff.price, paymentType: "AC", singboxTariffId });
        const msg = buildPaymentMessage(config, {
          name: tariff.name,
          price: formatMoney(tariff.price, tariff.currency),
          amount: String(tariff.price),
          currency: tariff.currency,
          action: "РќР°Р¶РјРёС‚Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Money:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р°";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_singbox_yookassa:")) {
      const singboxTariffId = data.slice("pay_singbox_yookassa:".length);
      const { items } = await api.getPublicSingboxTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === singboxTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (tariff.currency.toUpperCase() !== "RUB") {
        await editMessageContent(ctx, "Р®Kassa РїСЂРёРЅРёРјР°РµС‚ С‚РѕР»СЊРєРѕ СЂСѓР±Р»Рё (RUB).", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYookassaPayment(token, { amount: tariff.price, currency: "RUB", singboxTariffId });
        const msg = buildPaymentMessage(config, {
          name: tariff.name,
          price: formatMoney(tariff.price, tariff.currency),
          amount: String(tariff.price),
          currency: tariff.currency,
          action: "РќР°Р¶РјРёС‚Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Kassa:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р°";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_singbox_cryptopay:")) {
      const singboxTariffId = data.slice("pay_singbox_cryptopay:".length);
      const { items } = await api.getPublicSingboxTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === singboxTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createCryptopayPayment(token, { amount: tariff.price, currency: tariff.currency, singboxTariffId });
        const msg = buildPaymentMessage(config, { name: tariff.name, price: formatMoney(tariff.price, tariff.currency), amount: String(tariff.price), currency: tariff.currency, action: "РќР°Р¶РјРёС‚Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Crypto Bot:" });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.payUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р°";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const methods = config?.plategaMethods ?? [];
      const client = await api.getMe(token);
      const balanceLabel = client && client.balance >= tariff.price ? `рџ’° РћРїР»Р°С‚РёС‚СЊ Р±Р°Р»Р°РЅСЃРѕРј (${formatMoney(client.balance, client.preferredCurrency ?? "RUB")})` : null;
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
            description: `Р”РѕСЃС‚СѓРїС‹: ${tariff.name}`,
            singboxTariffId: tariff.id,
            promoCode: promoCodeSingbox,
          });
          if (promoCodeSingbox) activeDiscountCode.delete(userId);
          const msg = buildPaymentMessage(config, {
            name: tariff.name,
            price: formatMoney(tariff.price, tariff.currency),
            amount: String(tariff.price),
            currency: tariff.currency,
            action: "РќР°Р¶РјРёС‚Рµ РґР»СЏ РѕРїР»Р°С‚С‹:",
          }, discountArgSingbox);
          await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "РћС€РёР±РєР°";
          await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        action: "Р’С‹Р±РµСЂРёС‚Рµ СЃРїРѕСЃРѕР± РѕРїР»Р°С‚С‹:",
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
        await editMessageContent(ctx, `вњ… ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° РѕРїР»Р°С‚С‹";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_tariff_yoomoney:")) {
      const tariffId = data.slice("pay_tariff_yoomoney:".length);
      const { items } = await api.getPublicTariffs();
      const tariff = items?.flatMap((c: TariffCategory) => c.tariffs).find((t: TariffItem) => t.id === tariffId);
      if (!tariff) {
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
          action: "РќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Money:",
        }, discountArgYm);
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р° Р®Money";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_tariff_yookassa:")) {
      const tariffId = data.slice("pay_tariff_yookassa:".length);
      const { items } = await api.getPublicTariffs();
      const tariff = items?.flatMap((c: TariffCategory) => c.tariffs).find((t: TariffItem) => t.id === tariffId);
      if (!tariff) {
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (tariff.currency.toUpperCase() !== "RUB") {
        await editMessageContent(ctx, "Р®Kassa РїСЂРёРЅРёРјР°РµС‚ С‚РѕР»СЊРєРѕ СЂСѓР±Р»Рё (RUB).", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
          action: "РќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Kassa:",
        }, discountArgYk);
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р° Р®Kassa";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_tariff_cryptopay:")) {
      const tariffId = data.slice("pay_tariff_cryptopay:".length);
      const { items } = await api.getPublicTariffs();
      const tariff = items?.flatMap((c: TariffCategory) => c.tariffs).find((t: TariffItem) => t.id === tariffId);
      if (!tariff) {
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        const msg = buildPaymentMessage(config, { name: tariff.name, price: formatMoney(tariff.price, tariff.currency), amount: String(tariff.price), currency: tariff.currency, action: "РќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Crypto Bot:" }, discountArgCp);
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.payUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р°";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data === "menu:extra_options") {
      const options = config?.sellOptions ?? [];
      if (!options.length) {
        await editMessageContent(ctx, "Р”РѕРї. РѕРїС†РёРё РїРѕРєР° РЅРµ РґРѕСЃС‚СѓРїРЅС‹. РћС„РѕСЂРјРёС‚Рµ РїРѕРґРїРёСЃРєСѓ РІ СЂР°Р·РґРµР»Рµ В«РўР°СЂРёС„С‹В».", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const { text, entities } = titleWithEmoji("PACKAGE", "Р”РѕРї. РѕРїС†РёРё\n\nРўСЂР°С„РёРє, СѓСЃС‚СЂРѕР№СЃС‚РІР° РёР»Рё СЃРµСЂРІРµСЂС‹ вЂ” РґРѕРєСѓРїРєР° Рє РїРѕРґРїРёСЃРєРµ. Р’С‹Р±РµСЂРёС‚Рµ РѕРїС†РёСЋ:", config?.botEmojis);
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
        await editMessageContent(ctx, "РћРїС†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const result = await api.payOptionByBalance(token, { kind: option.kind, productId: option.id });
        await editMessageContent(ctx, `вњ… ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° РѕРїР»Р°С‚С‹";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        await editMessageContent(ctx, "РћРїС†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYookassaPayment(token, {
          extraOption: { kind: option.kind, productId: option.id },
        });
        const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} Р“Р РІР‚?` : option.kind === "devices" ? `+${option.deviceCount} СѓСЃС‚СЂ.` : "РЎРµСЂРІРµСЂ");
        const msg = buildPaymentMessage(config, {
          name: optName,
          price: formatMoney(option.price, option.currency),
          amount: String(option.price),
          currency: option.currency,
          action: "РќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Kassa:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р°";
        const isAuthError = /401|unauthorized|РёСЃС‚РµРє|Р°РІС‚РѕСЂРёР·|С‚РѕРєРµРЅ/i.test(msg);
        if (isAuthError) {
          tokenStore.delete(userId);
          const freshToken = await getOrRestoreToken(userId, ctx.from?.username);
          if (freshToken) {
            await editMessageContent(ctx, "рџ”„ РџРѕРІС‚РѕСЂРёС‚Рµ РґРµР№СЃС‚РІРёРµ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
          } else {
            await editMessageContent(ctx, "вќЊ РћС€РёР±РєР° Р°РІС‚РѕСЂРёР·Р°С†РёРё. РћС‚РїСЂР°РІСЊС‚Рµ /start", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
          }
        } else {
          await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        await editMessageContent(ctx, "РћРїС†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createCryptopayPayment(token, { extraOption: { kind: option.kind, productId: option.id } });
        const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} Р“Р РІР‚?` : option.kind === "devices" ? `+${option.deviceCount} СѓСЃС‚СЂ.` : "РЎРµСЂРІРµСЂ");
        const msg = buildPaymentMessage(config, { name: optName, price: formatMoney(option.price, option.currency), amount: String(option.price), currency: option.currency, action: "РќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Crypto Bot:" });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.payUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р°";
        const isAuthError = /401|unauthorized|РёСЃС‚РµРє|Р°РІС‚РѕСЂРёР·|С‚РѕРєРµРЅ/i.test(msg);
        if (isAuthError) {
          tokenStore.delete(userId);
          const freshToken = await getOrRestoreToken(userId, ctx.from?.username);
          if (freshToken) {
            await editMessageContent(ctx, "рџ”„ РџРѕРІС‚РѕСЂРёС‚Рµ РґРµР№СЃС‚РІРёРµ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
          } else {
            await editMessageContent(ctx, "вќЊ РћС€РёР±РєР° Р°РІС‚РѕСЂРёР·Р°С†РёРё. РћС‚РїСЂР°РІСЊС‚Рµ /start", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
          }
        } else {
          await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        await editMessageContent(ctx, "РћРїС†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYoomoneyPayment(token, {
          amount: option.price,
          paymentType: "AC",
          extraOption: { kind: option.kind, productId: option.id },
        });
        const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} Р“Р РІР‚?` : option.kind === "devices" ? `+${option.deviceCount} СѓСЃС‚СЂ.` : "РЎРµСЂРІРµСЂ");
        const msg = buildPaymentMessage(config, {
          name: optName,
          price: formatMoney(option.price, option.currency),
          amount: String(option.price),
          currency: option.currency,
          action: "РќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Money:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р° Р®Money";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        await editMessageContent(ctx, "РћРїС†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (!Number.isFinite(methodId)) {
        await editMessageContent(ctx, "РќРµРІРµСЂРЅС‹Р№ СЃРїРѕСЃРѕР± РѕРїР»Р°С‚С‹.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} Р“Р РІР‚?` : option.kind === "devices" ? `+${option.deviceCount} СѓСЃС‚СЂ.` : "РЎРµСЂРІРµСЂ");
        const msg = buildPaymentMessage(config, {
          name: optName,
          price: formatMoney(option.price, option.currency),
          amount: String(option.price),
          currency: option.currency,
          action: "РќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹:",
        });
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р°";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        await editMessageContent(ctx, "РћРїС†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°. РћР±РЅРѕРІРёС‚Рµ РјРµРЅСЋ (/start) Рё РїРѕРїСЂРѕР±СѓР№С‚Рµ СЃРЅРѕРІР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (option.currency.toUpperCase() !== "RUB") {
        await editMessageContent(ctx, "РћРїР»Р°С‚Р° РІ Р±РѕС‚Рµ РґРѕСЃС‚СѓРїРЅР° С‚РѕР»СЊРєРѕ РІ СЂСѓР±Р»СЏС… (RUB).", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} Р“Р РІР‚?` : option.kind === "devices" ? `+${option.deviceCount} СѓСЃС‚СЂ.` : "РЎРµСЂРІРµСЂ");
      const choiceText = buildPaymentMessage(config, {
        name: optName,
        price: formatMoney(option.price, option.currency),
        amount: String(option.price),
        currency: option.currency,
        action: "Р’С‹Р±РµСЂРёС‚Рµ СЃРїРѕСЃРѕР± РѕРїР»Р°С‚С‹:",
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
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const methods = config?.plategaMethods ?? [];
      const client = await api.getMe(token);
      const balanceLabel = client && client.balance >= tariff.price ? `рџ’° РћРїР»Р°С‚РёС‚СЊ Р±Р°Р»Р°РЅСЃРѕРј (${formatMoney(client.balance, client.preferredCurrency ?? "RUB")})` : null;

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
          description: `РўР°СЂРёС„: ${tariff.name}`,
          tariffId: tariff.id,
          promoCode,
        });
        if (promoCode) activeDiscountCode.delete(userId);
        const msg = buildPaymentMessage(config, {
          name: tariff.name,
          price: formatMoney(tariff.price, tariff.currency),
          amount: String(tariff.price),
          currency: tariff.currency,
          action: "РќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹:",
        }, discountArgTariff);
        await editMessageContent(ctx, msg.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), msg.entities);
        return;
      }
      // РџРѕРєР°Р·С‹РІР°РµРј СЃРїРѕСЃРѕР±С‹ РѕРїР»Р°С‚С‹ (РІСЃРµРіРґР°, С‡С‚РѕР±С‹ Р±С‹Р»Р° РєРЅРѕРїРєР° Р±Р°Р»Р°РЅСЃР°)
      const pay2 = buildPaymentMessage(config, {
        name: tariff.name,
        price: formatMoney(tariff.price, tariff.currency),
        amount: String(tariff.price),
        currency: tariff.currency,
        action: "Р’С‹Р±РµСЂРёС‚Рµ СЃРїРѕСЃРѕР± РѕРїР»Р°С‚С‹:",
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
          const label = [d.platform, d.deviceModel].filter(Boolean).join(" В· ") || d.hwid.slice(0, 12) + "вЂ¦";
          lines.push(`${i + 1}. ${label}`);
          rows.push([{ text: `СЂСџвЂ”РІР‚? РЈРґР°Р»РёС‚СЊ: ${label.slice(0, 25)}`, callback_data: `devices:delete:${i}` }]);
        });
        rows.push([{ text: config?.botBackLabel ?? "в—ЂпёЏ Р’ РјРµРЅСЋ", callback_data: "menu:main" }]);
        await editMessageContent(ctx, lines.join("\n"), { inline_keyboard: rows });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР°";
        await editMessageContent(ctx, `рџ“± РЈСЃС‚СЂРѕР№СЃС‚РІР°\n\nвќЊ ${msg}`, {
          inline_keyboard: [[{ text: config?.botBackLabel ?? "в—ЂпёЏ Р’ РјРµРЅСЋ", callback_data: "menu:main" }]],
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
            const label = [d.platform, d.deviceModel].filter(Boolean).join(" В· ") || d.hwid.slice(0, 12) + "вЂ¦";
            lines.push(`${i + 1}. ${label}`);
            rows.push([{ text: `СЂСџвЂ”РІР‚? РЈРґР°Р»РёС‚СЊ: ${label.slice(0, 25)}`, callback_data: `devices:delete:${i}` }]);
          });
          rows.push([{ text: config?.botBackLabel ?? "в—ЂпёЏ Р’ РјРµРЅСЋ", callback_data: "menu:main" }]);
          await editMessageContent(ctx, lines.join("\n"), { inline_keyboard: rows });
        }
      } catch (e: unknown) {
        await editMessageContent(ctx, `вќЊ ${e instanceof Error ? e.message : "РћС€РёР±РєР°"}`, {
          inline_keyboard: [[{ text: config?.botBackLabel ?? "в—ЂпёЏ Р’ РјРµРЅСЋ", callback_data: "menu:devices" }]],
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
        await ctx.answerCallbackQuery({ text: err.message || "РћС€РёР±РєР°", show_alert: true });
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
      const topupTitle = titleWithEmoji("CARD", "РџРѕРїРѕР»РЅРёС‚СЊ Р±Р°Р»Р°РЅСЃ\n\nР’С‹Р±РµСЂРёС‚Рµ СЃСѓРјРјСѓ РёР»Рё РІРІРµРґРёС‚Рµ СЃРІРѕСЋ (С‡РёСЃР»РѕРј):", config?.botEmojis);
      await editMessageContent(ctx, topupTitle.text, topUpPresets(client.preferredCurrency, config?.botBackLabel ?? null, innerStyles, innerEmojiIds), topupTitle.entities);
      return;
    }

    if (data.startsWith("topup_yoomoney:")) {
      const amountStr = data.slice("topup_yoomoney:".length);
      const amount = Number(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) {
        await editMessageContent(ctx, "РќРµРІРµСЂРЅР°СЏ СЃСѓРјРјР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      try {
        const payment = await api.createYoomoneyPayment(token, {
          amount,
          paymentType: "AC",
        });
        const yooTopup = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(amount, client.preferredCurrency)}\n\nРќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Money:`, config?.botEmojis);
        await editMessageContent(ctx, yooTopup.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTopup.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р° Р®Money";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("topup_yookassa:")) {
      const amountStr = data.slice("topup_yookassa:".length);
      const amount = Number(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) {
        await editMessageContent(ctx, "РќРµРІРµСЂРЅР°СЏ СЃСѓРјРјР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      try {
        const payment = await api.createYookassaPayment(token, { amount, currency: "RUB" });
        const yooTopup = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(amount, "RUB")}\n\nРќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Kassa:`, config?.botEmojis);
        await editMessageContent(ctx, yooTopup.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTopup.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р° Р®Kassa";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("topup_cryptopay:")) {
      const amountStr = data.slice("topup_cryptopay:".length);
      const amount = Number(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) {
        await editMessageContent(ctx, "РќРµРІРµСЂРЅР°СЏ СЃСѓРјРјР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      try {
        const payment = await api.createCryptopayPayment(token, { amount, currency: client.preferredCurrency ?? "RUB" });
        const cpTopup = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(amount, client.preferredCurrency ?? "RUB")}\n\nРќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Crypto Bot:`, config?.botEmojis);
        await editMessageContent(ctx, cpTopup.text, payUrlMarkup(payment.payUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), cpTopup.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р° Crypto Bot";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
        await editMessageContent(ctx, "РќРµРІРµСЂРЅР°СЏ СЃСѓРјРјР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      const methods = config?.plategaMethods ?? [];
      if (methodIdFromBtn != null && Number.isFinite(methodIdFromBtn)) {
        const payment = await api.createPlategaPayment(token, {
          amount,
          currency: client.preferredCurrency,
          paymentMethod: methodIdFromBtn,
          description: "РџРѕРїРѕР»РЅРµРЅРёРµ Р±Р°Р»Р°РЅСЃР°",
        });
        const topupPay1 = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(amount, client.preferredCurrency)}\n\nРќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹:`, config?.botEmojis);
        await editMessageContent(ctx, topupPay1.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), topupPay1.entities);
        return;
      }
      const yooEnabled = !!config?.yoomoneyEnabled;
      const yookassaEnabled = !!config?.yookassaEnabled;
      const cryptopayEnabled = !!config?.cryptopayEnabled;
      if (methods.length > 1 || (methods.length >= 1 && (yooEnabled || yookassaEnabled || cryptopayEnabled)) || (methods.length === 0 && ((yooEnabled && yookassaEnabled) || (yooEnabled && cryptopayEnabled) || (yookassaEnabled && cryptopayEnabled)))) {
        const topupPay2 = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(amount, client.preferredCurrency)}\n\nР’С‹Р±РµСЂРёС‚Рµ СЃРїРѕСЃРѕР± РѕРїР»Р°С‚С‹:`, config?.botEmojis);
        await editMessageContent(ctx, topupPay2.text, topupPaymentMethodButtons(amountStr, methods, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds, yooEnabled, yookassaEnabled, cryptopayEnabled), topupPay2.entities);
        return;
      }
      // Р•СЃР»Рё Р®Money РµРґРёРЅСЃС‚РІРµРЅРЅС‹Р№ СЃРїРѕСЃРѕР± (РЅРµС‚ platega, РЅРµС‚ Р®Kassa) вЂ” СЃСЂР°Р·Сѓ СЃРѕР·РґР°РЎРІР‚?Рј РїР»Р°С‚РЎРІР‚?Р¶ Р®Money
      if (methods.length === 0 && yooEnabled && !yookassaEnabled) {
        try {
          const payment = await api.createYoomoneyPayment(token, { amount, paymentType: "AC" });
          const yooTopup = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(amount, client.preferredCurrency)}\n\nРќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Money:`, config?.botEmojis);
          await editMessageContent(ctx, yooTopup.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTopup.entities);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р° Р®Money";
          await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        }
        return;
      }
      // Р•СЃР»Рё С‚РѕР»СЊРєРѕ Р®Kassa вЂ” СЃСЂР°Р·Сѓ СЃРѕР·РґР°РЎРІР‚?Рј РїР»Р°С‚РЎРІР‚?Р¶ Р®Kassa
      if (methods.length === 0 && yookassaEnabled) {
        try {
          const payment = await api.createYookassaPayment(token, { amount, currency: "RUB" });
          const yooTopup = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(amount, "RUB")}\n\nРќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Kassa:`, config?.botEmojis);
          await editMessageContent(ctx, yooTopup.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTopup.entities);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїР»Р°С‚РµР¶Р° Р®Kassa";
          await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        }
        return;
      }
      const methodId = methods[0]?.id ?? 2;
      const payment = await api.createPlategaPayment(token, {
        amount,
        currency: client.preferredCurrency,
        paymentMethod: methodId,
        description: "РџРѕРїРѕР»РЅРµРЅРёРµ Р±Р°Р»Р°РЅСЃР°",
      });
      const topupPay3 = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(amount, client.preferredCurrency)}\n\nРќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹:`, config?.botEmojis);
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
      // РџРѕРєР°Р·С‹РІР°РµРј С„Р°РєС‚РёС‡РµСЃРєРёР№ РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹Р№ РїСЂРѕС†РµРЅС‚ РєР»РёРµРЅС‚Р°.
      // Р¤РѕР»Р±СЌРє РЅР° РґРµС„РѕР»С‚ С‚РѕР»СЊРєРѕ РµСЃР»Рё РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹Р№ РЅРµ Р·Р°РґР°РЅ (null/undefined).
      const p1 = client.referralPercent ?? (config?.defaultReferralPercent ?? 0);
      const p2 = config?.referralPercentLevel2 ?? 0;
      const p3 = config?.referralPercentLevel3 ?? 0;
      let rest = `${_t("referral.title", lang)}\n\n${_t("referral.description", lang)}\n\n`;
      rest += `${_t("referral.how_it_works", lang)}\n`;
      rest += `вЂў ${_t("referral.level1", lang, { percent: String(p1) })}\n`;
      rest += `вЂў ${_t("referral.level2", lang, { percent: String(p2) })}\n`;
      rest += `вЂў ${_t("referral.level3", lang, { percent: String(p3) })}\n`;
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
        await editMessageContent(ctx, `вњ… ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° Р°РєС‚РёРІР°С†РёРё";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
      const vpnTitle = titleWithEmoji("SERVERS", "VPN СЃСЃС‹Р»РєР° РіРѕС‚РѕРІР°. РќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ, С‡С‚РѕР±С‹ СЃРєРѕРїРёСЂРѕРІР°С‚СЊ.", config?.botEmojis);
      await editMessageContent(ctx, vpnTitle.text, {
        inline_keyboard: [
          [{ text: "?? РЎРєРѕРїРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ", callback_data: "vpn:copy" }],
          [{ text: config?.botBackLabel ?? "?? Р’ РјРµРЅСЋ", callback_data: "menu:main" }],
        ],
      }, vpnTitle.entities);
      return;
    }

    // вЂ”вЂ”вЂ” Gift / Secondary Subscriptions handlers вЂ”вЂ”вЂ”

    if (data === "vpn:copy") {
      const lang = getUserLang(userId);
      const subRes = await api.getSubscription(token);
      const vpnUrl = getSubscriptionUrl(subRes.subscription);
      if (!vpnUrl) {
        await ctx.answerCallbackQuery({ text: _t("vpn.link_unavailable", lang), show_alert: true }).catch(() => {});
        return;
      }
      const sent = await ctx.reply(`<code>${escapeHtml(vpnUrl)}</code>`, { parse_mode: "HTML" });
      setTimeout(() => {
        bot.api.deleteMessage(sent.chat.id, sent.message_id).catch(() => {});
      }, 15000);
      await ctx.answerCallbackQuery({ text: "РЎСЃС‹Р»РєР° СЃРєРѕРїРёСЂРѕРІР°РЅР°", show_alert: false }).catch(() => {});
      return;
    }

    if (data === "menu:gift") {
      if (!config?.giftSubscriptionsEnabled) {
        await editMessageContent(ctx, "Р¤СѓРЅРєС†РёСЏ РїРѕРґР°СЂРєРѕРІ РЅРµРґРѕСЃС‚СѓРїРЅР°.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      await editMessageContent(
        ctx,
        "рџЋЃ РџРѕРґР°СЂРєРё Рё РїРѕРґРїРёСЃРєРё\n\nР—РґРµСЃСЊ РІС‹ РјРѕР¶РµС‚Рµ РєСѓРїРёС‚СЊ РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Рµ РїРѕРґРїРёСЃРєРё, РїРѕРґР°СЂРёС‚СЊ РёС… РёР»Рё Р°РєС‚РёРІРёСЂРѕРІР°С‚СЊ РїРѕРґР°СЂРѕРє.",
        giftMenuButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
      );
      return;
    }

    if (data === "gift:buy") {
      const { items } = await api.getPublicTariffs();
      if (!items?.length) {
        await editMessageContent(ctx, "РўР°СЂРёС„С‹ РЅРµ РЅР°СЃС‚СЂРѕРµРЅС‹.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      await editMessageContent(
        ctx,
        "рџ›’ РљСѓРїРёС‚СЊ РґРѕРї. РїРѕРґРїРёСЃРєСѓ\n\nР’С‹Р±РµСЂРёС‚Рµ С‚Р°СЂРёС„:",
        giftTariffButtons(items, config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
      );
      return;
    }

    if (data.startsWith("gift_tariff:")) {
      const tariffId = data.slice("gift_tariff:".length);
      const { items } = await api.getPublicTariffs();
      const tariff = items?.flatMap((c: TariffCategory) => c.tariffs).find((t: TariffItem) => t.id === tariffId);
      if (!tariff) {
        await editMessageContent(ctx, "РўР°СЂРёС„ РЅРµ РЅР°Р№РґРµРЅ.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      const balanceLabel = `рџ’° РћРїР»Р°С‚РёС‚СЊ Р±Р°Р»Р°РЅСЃРѕРј (${formatMoney(client?.balance ?? 0, client?.preferredCurrency ?? "RUB")})`;
      await editMessageContent(
        ctx,
        `рџ›’ ${tariff.name}\n\nРЎС‚РѕРёРјРѕСЃС‚СЊ: ${formatMoney(tariff.price, tariff.currency)}\n\nРџРѕРґС‚РІРµСЂРґРёС‚Рµ РѕРїР»Р°С‚Сѓ:`,
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
          `вњ… Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅР°СЏ РїРѕРґРїРёСЃРєР° СЃРѕР·РґР°РЅР°!\n\nРџРѕРґРїРёСЃРєР° #${result.subscriptionIndex}\n\nР’С‹ РјРѕР¶РµС‚Рµ Р°РєС‚РёРІРёСЂРѕРІР°С‚СЊ РµРЎРІР‚? РЅР° СЃРІРѕРЎРІР‚?Рј Р°РєРєР°СѓРЅС‚Рµ РёР»Рё РїРѕРґР°СЂРёС‚СЊ РґСЂСѓРіСѓ.`,
          giftPostPurchaseButtons(result.secondarySubscriptionId, result.subscriptionIndex, config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° РѕРїР»Р°С‚С‹";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
            "?? РњРѕРё РїРѕРґРїРёСЃРєРё\n\nРЈ РІР°СЃ РїРѕРєР° РЅРµС‚ РїРѕРґРїРёСЃРѕРє.",
            giftCodeResultButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
          );
          return;
        }
        const rows: InlineMarkup["inline_keyboard"] = [];
        for (const it of items) {
          const idx = it.subscriptionIndex ?? 0;
          const label = it.type === "root" ? `?? РћСЃРЅРѕРІРЅР°СЏ вЂ” ${it.tariffDisplayName || "РўР°СЂРёС„"}` : `?? #${idx} вЂ” ${it.tariffDisplayName || "РўР°СЂРёС„"}`;
          if (it.type === "root") {
            rows.push([{ text: label.slice(0, 64), callback_data: `sub:copy_uuid:${it.remnawaveUuid}` }]);
          } else {
            rows.push([
              { text: label.slice(0, 50), callback_data: `sub:copy_uuid:${it.remnawaveUuid}` },
              { text: "РџСЂРѕРґР»РёС‚СЊ", callback_data: `gift:renew:${it.id}` },
            ]);
          }
        }
        rows.push([{ text: config?.botBackLabel ?? "?? РќР°Р·Р°Рґ", callback_data: "menu:gift" }]);
        await editMessageContent(
          ctx,
          `?? РњРѕРё РїРѕРґРїРёСЃРєРё\n\nРќР°Р№РґРµРЅРѕ: ${items.length}\nР’С‹Р±РµСЂРёС‚Рµ РїРѕРґРїРёСЃРєСѓ РґР»СЏ РєРѕРїРёСЂРѕРІР°РЅРёСЏ СЃСЃС‹Р»РєРё:`,
          { inline_keyboard: rows },
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё";
        await editMessageContent(ctx, `? ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("sub:copy_uuid:")) {
      const uuid = data.slice("sub:copy_uuid:".length);
      try {
        const byUuid = await api.getSubscriptionByUuid(token, uuid);
        const link = getSubscriptionUrl(byUuid.subscription);
        if (!link) {
          await ctx.answerCallbackQuery({ text: "РЎСЃС‹Р»РєР° РЅРµ РЅР°Р№РґРµРЅР°", show_alert: true }).catch(() => {});
          return;
        }
        const sent = await ctx.reply(`<code>${escapeHtml(link)}</code>`, { parse_mode: "HTML" });
        setTimeout(() => {
          bot.api.deleteMessage(sent.chat.id, sent.message_id).catch(() => {});
        }, 15000);
        await ctx.answerCallbackQuery({ text: "РЎСЃС‹Р»РєР° СЃРєРѕРїРёСЂРѕРІР°РЅР°", show_alert: false }).catch(() => {});
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ СЃСЃС‹Р»РєРё";
        await ctx.answerCallbackQuery({ text: msg.slice(0, 180), show_alert: true }).catch(() => {});
      }
      return;
    }
    if (data.startsWith("gift:connect:")) {
      const subscriptionId = data.slice("gift:connect:".length);
      try {
        // РЎРЅР°С‡Р°Р»Р° Р°РєС‚РёРІРёСЂСѓРµРј РїРѕРґРїРёСЃРєСѓ (СЃРЅРёРјР°РµРј GIFT_RESERVED, РµСЃР»Рё РµСЃС‚СЊ)
        await api.activateGiftForSelf(token, subscriptionId).catch(() => {});
        // РџРѕС‚РѕРј РїРѕР»СѓС‡Р°РµРј URL
        const result = await api.getGiftSubscriptionUrl(token, subscriptionId);
        const appUrl2 = config?.publicAppUrl?.replace(/\/$/, "") ?? null;

        // Р•СЃР»Рё РІРєР»СЋС‡РµРЅР° Remna-СЃС‚СЂР°РЅРёС†Р° РїРѕРґРїРёСЃРєРё вЂ” РѕС‚РґР°РЎРІР‚?Рј remna subscriptionUrl.
        if (config?.useRemnaSubscriptionPage) {
          const byUuid = await api.getSubscriptionByUuid(token, result.uuid);
          const remnaUrl = getSubscriptionUrl(byUuid.subscription);
          if (!remnaUrl) {
            await editMessageContent(
              ctx,
              "вќЊ РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ СЃСЃС‹Р»РєСѓ Remna РґР»СЏ СЌС‚РѕР№ РїРѕРґРїРёСЃРєРё.",
              backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds),
            );
            return;
          }
          await editMessageContent(
            ctx,
            "РџРѕРґРєР»СЋС‡РµРЅРёРµ РіРѕС‚РѕРІРѕ. Р’С‹Р±РµСЂРёС‚Рµ РґРµР№СЃС‚РІРёРµ:",
            {
              inline_keyboard: [
                [{ text: "рџ“І РџРѕРґРєР»СЋС‡РёС‚СЊСЃСЏ Рє VPN", url: remnaUrl }],
                [{ text: "?? РЎРєРѕРїРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ", callback_data: `gift:copy:${subscriptionId}` }],
                [{ text: config?.botBackLabel ?? "в—ЂпёЏ РќР°Р·Р°Рґ", callback_data: "menu:gift" }],
              ],
            },
          );
          return;
        }

        // РРЅР°С‡Рµ РїРѕРєР°Р·С‹РІР°РµРј СЃСЃС‹Р»РєСѓ + РєРЅРѕРїРєСѓ "РџРѕРґРєР»СЋС‡РёС‚СЊСЃСЏ" РІ РјРёРЅРё-Р°РїРї РЅР° РЅР°С€Сѓ СЃС‚СЂР°РЅРёС†Сѓ
        // РїРѕРґРєР»СЋС‡РµРЅРёСЏ РґР»СЏ РєРѕРЅРєСЂРµС‚РЅРѕР№ secondary-РїРѕРґРїРёСЃРєРё.
        const webUrl = appUrl2 ? `${appUrl2}/cabinet/subscribe?uuid=${encodeURIComponent(result.uuid)}` : null;
        const buttons = webUrl
          ? {
              inline_keyboard: [
                [{ text: "рџ“І РџРѕРґРєР»СЋС‡РёС‚СЊСЃСЏ", web_app: { url: webUrl } }],
                [{ text: config?.botBackLabel ?? "в†ђ РќР°Р·Р°Рґ", callback_data: "menu:gift" }],
              ],
            }
          : giftCodeResultButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds);
        await editMessageContent(
          ctx,
          `рџ“І РЎСЃС‹Р»РєР° РЅР° РїРѕРґРїРёСЃРєСѓ:\n\n${webUrl ?? `РџРѕРґРїРёСЃРєР° UUID: ${result.uuid}`}`,
          buttons,
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ СЃСЃС‹Р»РєРё";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
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
          await ctx.answerCallbackQuery({ text: "РЎСЃС‹Р»РєР° РЅРµ РЅР°Р№РґРµРЅР°", show_alert: true }).catch(() => {});
          return;
        }
        const sent = await ctx.reply(`<code>${escapeHtml(remnaUrl)}</code>`, { parse_mode: "HTML" });
        setTimeout(() => {
          bot.api.deleteMessage(sent.chat.id, sent.message_id).catch(() => {});
        }, 15000);
        await ctx.answerCallbackQuery({ text: "РЎСЃС‹Р»РєР° СЃРєРѕРїРёСЂРѕРІР°РЅР°", show_alert: false }).catch(() => {});
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ СЃСЃС‹Р»РєРё";
        await ctx.answerCallbackQuery({ text: msg.slice(0, 180), show_alert: true }).catch(() => {});
      }
      return;
    }

    if (data.startsWith("gift:give:")) {
      const subscriptionId = data.slice("gift:give:".length);
      try {
        const result = await api.createGiftCode(token, { secondarySubscriptionId: subscriptionId });
        const expiresAt = new Date(result.expiresAt).toLocaleDateString("ru-RU");
        const tariffLabel = result.tariffName ? `\nРўР°СЂРёС„: ${result.tariffName}` : "";

        // Р¤РѕСЂРјРёСЂСѓРµРј СЃСЃС‹Р»РєСѓ РЅР° РїРѕРґР°СЂРѕРє Рё РєРЅРѕРїРєСѓ "РџРѕРґРµР»РёС‚СЊСЃСЏ"
        const appUrl = config?.publicAppUrl?.replace(/\/$/, "") ?? "";
        const giftUrl = appUrl ? `${appUrl}/gift/${result.code}` : "";
        const shareText = `рџЋЃ РЇ РґР°СЂСЋ С‚РµР±Рµ VPN-РїРѕРґРїРёСЃРєСѓ STEALTHNET${result.tariffName ? ` (${result.tariffName})` : ""}! РђРєС‚РёРІРёСЂСѓР№ РїРѕ СЃСЃС‹Р»РєРµ:`;
        const shareUrl = giftUrl
          ? `https://t.me/share/url?url=${encodeURIComponent(giftUrl)}&text=${encodeURIComponent(shareText)}`
          : "";

        const buttons: (({ text: string; callback_data: string } | { text: string; url: string })[])[] = [];
        if (shareUrl) {
          buttons.push([{ text: "рџ“¤ РџРѕРґРµР»РёС‚СЊСЃСЏ РІ Telegram", url: shareUrl }]);
        }
        if (giftUrl) {
          buttons.push([{ text: "рџ”— РЎСЃС‹Р»РєР° РЅР° РїРѕРґР°СЂРѕРє", url: giftUrl }]);
        }
        buttons.push([{ text: config?.botBackLabel ?? "в†ђ РќР°Р·Р°Рґ", callback_data: "menu:gift" }]);

        await editMessageContent(
          ctx,
          `рџЋЃ РџРѕРґР°СЂРѕС‡РЅС‹Р№ РєРѕРґ СЃРѕР·РґР°РЅ!\n\nРљРѕРґ: \`${result.code}\`${tariffLabel}\n\nРћС‚РїСЂР°РІСЊС‚Рµ СЌС‚РѕС‚ РєРѕРґ РїРѕР»СѓС‡Р°С‚РµР»СЋ РёР»Рё РїРѕРґРµР»РёС‚РµСЃСЊ СЃСЃС‹Р»РєРѕР№. РљРѕРґ РґРµР№СЃС‚РІРёС‚РµР»РµРЅ РґРѕ ${expiresAt}.`,
          { inline_keyboard: buttons },
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РєРѕРґР°";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("gift:delete:")) {
      const subscriptionId = data.slice("gift:delete:".length);
      try {
        const result = await api.deleteGiftSubscription(token, subscriptionId);
        await editMessageContent(
          ctx,
          `вњ… ${result.message || "РџРѕРґРїРёСЃРєР° СѓРґР°Р»РµРЅР°"}`,
          giftCodeResultButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("gift:renew:")) {
      const subscriptionId = data.slice("gift:renew:".length);
      try {
        const result = await api.renewGiftSubscription(token, subscriptionId);
        await editMessageContent(
          ctx,
          `вњ… ${result.message}`,
          { inline_keyboard: [[{ text: "рџ“‹ Рљ РјРѕРёРј РїРѕРґРїРёСЃРєР°Рј", callback_data: "gift:subscriptions" }], [{ text: config?.botBackLabel ?? "в—ЂпёЏ Р’ РјРµРЅСЋ", callback_data: "menu:gift" }]] },
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° РїСЂРѕРґР»РµРЅРёСЏ";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data === "gift:redeem") {
      awaitingGiftCode.add(userId);
      await editMessageContent(
        ctx,
        "рџЋЃ Р’РІРµРґРёС‚Рµ РїРѕРґР°СЂРѕС‡РЅС‹Р№ РєРѕРґ:",
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
            "рџЋџпёЏ РњРѕРё РїРѕРґР°СЂРєРё\n\nРЈ РІР°СЃ РїРѕРєР° РЅРµС‚ РїРѕРґР°СЂРѕС‡РЅС‹С… РєРѕРґРѕРІ.",
            giftCodeResultButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
          );
          return;
        }
        const lines = result.codes.map((c) => {
          const statusLabel = c.status === "ACTIVE" ? "вњ… РђРєС‚РёРІРµРЅ" : c.status === "REDEEMED" ? "рџЋЃ РСЃРїРѕР»СЊР·РѕРІР°РЅ" : "вќЊ РћС‚РјРµРЅРЎРІР‚?РЅ";
          return `${c.code} вЂ” ${statusLabel}`;
        }).join("\n");
        await editMessageContent(
          ctx,
          `рџЋџпёЏ РњРѕРё РїРѕРґР°СЂРєРё\n\n${lines}`,
          giftCodesListButtons(result.codes, config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("gift:cancel_code:")) {
      const codeOrId = data.slice("gift:cancel_code:".length);
      try {
        const result = await api.cancelGiftCode(token, codeOrId);
        await editMessageContent(
          ctx,
          `вњ… ${result.message}`,
          giftCodeResultButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds),
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° РѕС‚РјРµРЅС‹";
        await editMessageContent(ctx, `вќЊ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    await ctx.answerCallbackQuery({ text: "РќРµРёР·РІРµСЃС‚РЅРѕРµ РґРµР№СЃС‚РІРёРµ" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "РћС€РёР±РєР°";
    await ctx.reply(`вќЊ ${msg}`).catch(() => {});
  }
});

// Р’РёРґРµРѕ РѕС‚ Р°РґРјРёРЅР° в†’ РІРѕР·РІСЂР°С‰Р°РµРј file_id РґР»СЏ РІРёРґРµРѕ-РёРЅСЃС‚СЂСѓРєС†РёР№
bot.on("message:video", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const config = await api.getPublicConfig();
  const isAdmin = config?.botAdminTelegramIds?.includes(String(userId)) ?? false;
  if (!isAdmin) return;
  const fileId = ctx.message.video.file_id;
  await ctx.reply(
    `рџ“№ <b>file_id РІРёРґРµРѕ:</b>\n<code>${fileId}</code>\n\nРЎРєРѕРїРёСЂСѓР№С‚Рµ Рё РІСЃС‚Р°РІСЊС‚Рµ РІ Р°РґРјРёРЅРєСѓ РїСЂРё РґРѕР±Р°РІР»РµРЅРёРё РІРёРґРµРѕ-РёРЅСЃС‚СЂСѓРєС†РёРё.`,
    { parse_mode: "HTML" }
  );
});

// РЎРѕРѕР±С‰РµРЅРёСЏ СЃ С„РѕС‚Рѕ вЂ” Р°РґРјРёРЅ РјРѕР¶РµС‚ РѕС‚РїСЂР°РІРёС‚СЊ С„РѕС‚Рѕ СЃ РїРѕРґРїРёСЃСЊСЋ РґР»СЏ СЂР°СЃСЃС‹Р»РєРё
bot.on("message:photo", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  if (!awaitingBroadcastMessage.has(userId)) return;
  awaitingBroadcastMessage.delete(userId);
  const config = await api.getPublicConfig();
  if (!config?.botAdminTelegramIds?.includes(String(userId))) {
    await ctx.reply("Р”РѕСЃС‚СѓРї Р·Р°РїСЂРµС‰РЎРІР‚?РЅ.");
    return;
  }
  const photos = ctx.message.photo;
  if (!photos?.length) {
    await ctx.reply("Р¤РѕС‚Рѕ РЅРµ РїРѕР»СѓС‡РµРЅРѕ. РћС‚РїСЂР°РІСЊС‚Рµ С„РѕС‚Рѕ СЃ РїРѕРґРїРёСЃСЊСЋ РёР»Рё С‚РµРєСЃС‚.");
    return;
  }
  const largest = photos[photos.length - 1];
  const caption = ctx.message.caption?.trim() ?? "";
  // РџР°СЂСЃРёРј РєРЅРѕРїРєСѓ РІРёРґР° [РўРµРєСЃС‚ РєРЅРѕРїРєРё](URL) РёР· РїРѕРґРїРёСЃРё
  const btnMatch = caption.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
  const buttonText = btnMatch?.[1];
  const buttonUrl = btnMatch?.[2];
  const cleanCaption = btnMatch ? caption.replace(btnMatch[0], "").trim() : caption;
  lastBroadcastMessage.set(userId, { text: cleanCaption || caption, photoFileId: largest.file_id, buttonText, buttonUrl });
  await ctx.reply("РљРѕРјСѓ РѕС‚РїСЂР°РІРёС‚СЊ?", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "рџ“± РўРѕР»СЊРєРѕ Telegram", callback_data: "admin:bc:tg" },
          { text: "рџ“§ РўРѕР»СЊРєРѕ Email", callback_data: "admin:bc:email" },
        ],
        [{ text: "рџ“±+рџ“§ Telegram Рё Email", callback_data: "admin:bc:both" }],
        [{ text: "в—ЂпёЏ РћС‚РјРµРЅР°", callback_data: "admin:menu" }],
      ],
    },
  });
});

// РЎРѕРѕР±С‰РµРЅРёСЏ СЃ С‚РµРєСЃС‚РѕРј вЂ” РїСЂРѕРјРѕРєРѕРґ РёР»Рё С‡РёСЃР»Рѕ РґР»СЏ РїРѕРїРѕР»РЅРµРЅРёСЏ
bot.on("message:text", async (ctx) => {
  if (ctx.message.text?.startsWith("/")) return;
  const userId = ctx.from?.id;
  if (!userId) return;

  // РђРґРјРёРЅ: РІРІРѕРґ С‚РµРєСЃС‚Р° СЂР°СЃСЃС‹Р»РєРё
  if (awaitingBroadcastMessage.has(userId)) {
    awaitingBroadcastMessage.delete(userId);
    const config = await api.getPublicConfig();
    if (!config?.botAdminTelegramIds?.includes(String(userId))) {
      await ctx.reply("Р”РѕСЃС‚СѓРї Р·Р°РїСЂРµС‰РЎРІР‚?РЅ.");
      return;
    }
    const text = ctx.message.text?.trim() ?? "";
    if (!text) {
      await ctx.reply("Р’РІРµРґРёС‚Рµ РЅРµРїСѓСЃС‚РѕР№ С‚РµРєСЃС‚ СЃРѕРѕР±С‰РµРЅРёСЏ.");
      return;
    }
    // РџР°СЂСЃРёРј РєРЅРѕРїРєСѓ РІРёРґР° [РўРµРєСЃС‚ РєРЅРѕРїРєРё](URL) РёР· С‚РµРєСЃС‚Р°
    const btnMatch = text.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    const buttonText = btnMatch?.[1];
    const buttonUrl = btnMatch?.[2];
    const cleanText = btnMatch ? text.replace(btnMatch[0], "").trim() : text;
    lastBroadcastMessage.set(userId, { text: cleanText || text, buttonText, buttonUrl });
    await ctx.reply("РљРѕРјСѓ РѕС‚РїСЂР°РІРёС‚СЊ?", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "рџ“± РўРѕР»СЊРєРѕ Telegram", callback_data: "admin:bc:tg" },
            { text: "рџ“§ РўРѕР»СЊРєРѕ Email", callback_data: "admin:bc:email" },
          ],
          [{ text: "рџ“±+рџ“§ Telegram Рё Email", callback_data: "admin:bc:both" }],
          [{ text: "в—ЂпёЏ РћС‚РјРµРЅР°", callback_data: "admin:menu" }],
        ],
      },
    });
    return;
  }

  // РђРґРјРёРЅ: РІРІРѕРґ СЃСѓРјРјС‹ РїРѕРїРѕР»РЅРµРЅРёСЏ Р±Р°Р»Р°РЅСЃР°
  if (awaitingAdminBalance.has(userId)) {
    const clientId = awaitingAdminBalance.get(userId);
    awaitingAdminBalance.delete(userId);
    const config = await api.getPublicConfig();
    if (!config?.botAdminTelegramIds?.includes(String(userId)) || !clientId) {
      await ctx.reply("Р”РѕСЃС‚СѓРї Р·Р°РїСЂРµС‰РЎРІР‚?РЅ РёР»Рё СЃРµСЃСЃРёСЏ РёСЃС‚РµРєР»Р°.");
      return;
    }
    const num = Number(ctx.message.text?.replace(/,/, "."));
    if (!Number.isFinite(num) || num <= 0 || num > 1000000) {
      await ctx.reply("Р’РІРµРґРёС‚Рµ РїРѕР»РѕР¶РёС‚РµР»СЊРЅРѕРµ С‡РёСЃР»Рѕ (РґРѕ 1 000 000).");
      return;
    }
    try {
      const result = await api.patchBotAdminClientBalance(userId, clientId, num);
      await ctx.reply(`вњ… Р РІР‚?Р°Р»Р°РЅСЃ РїРѕРїРѕР»РЅРµРЅ. РќРѕРІС‹Р№ Р±Р°Р»Р°РЅСЃ: ${result.newBalance}`);
    } catch (e: unknown) {
      await ctx.reply(`вќЊ ${e instanceof Error ? e.message : "РћС€РёР±РєР°"}`);
    }
    return;
  }

  // РђРґРјРёРЅ: РІРІРѕРґ РїРѕРёСЃРєР° (Telegram ID, @username, email)
  if (awaitingAdminSearch.has(userId)) {
    awaitingAdminSearch.delete(userId);
    const config = await api.getPublicConfig();
    if (!config?.botAdminTelegramIds?.includes(String(userId))) {
      await ctx.reply("Р”РѕСЃС‚СѓРї Р·Р°РїСЂРµС‰РЎРІР‚?РЅ.");
      return;
    }
    const searchQuery = ctx.message.text?.trim() ?? "";
    lastAdminSearch.set(userId, searchQuery);
    try {
      const { items, total, limit } = await api.getBotAdminClients(userId, 1, searchQuery || undefined);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const msg =
        (searchQuery ? `СЂСџРІР‚?Тђ РџРѕРёСЃРє В«${searchQuery}В» (${total})\n\n` : `СЂСџРІР‚?Тђ РљР»РёРµРЅС‚С‹ (${total})\n\n`) +
        items
          .map(
            (c, i) =>
              `${i + 1}. ${c.email || c.telegramUsername || c.telegramId || c.id.slice(0, 8)} ${c.isBlocked ? "рџљ«" : ""}`
          )
          .join("\n") +
        `\n\nРЎС‚СЂ. 1/${totalPages}`;
      const rows: InlineMarkup["inline_keyboard"] = items.map((c) => [
        {
          text: `${c.email || c.telegramUsername || c.telegramId || c.id.slice(0, 8)} ${c.isBlocked ? "рџљ«" : ""}`,
          callback_data: `admin:client:${c.id}`,
        },
      ]);
      const nav: InlineMarkup["inline_keyboard"][0] = [
        { text: "в—ЂпёЏ Р’ Р°РґРјРёРЅРєСѓ", callback_data: "admin:menu" },
      ];
      if (searchQuery) nav.push({ text: "вњ– РЎР±СЂРѕСЃРёС‚СЊ РїРѕРёСЃРє", callback_data: "admin:clients:clear" });
      if (totalPages > 1) nav.push({ text: "Р’РїРµСЂРЎРІР‚?Рґ в–¶", callback_data: "admin:clients:2" });
      rows.push(nav);
      await ctx.reply(msg, { reply_markup: { inline_keyboard: rows } });
    } catch (e: unknown) {
      lastAdminSearch.delete(userId);
      const errMsg = e instanceof Error ? e.message : "РћС€РёР±РєР° РїРѕРёСЃРєР°";
      await ctx.reply(`вќЊ ${errMsg}`);
    }
    return;
  }

  const token = await getOrRestoreToken(userId, ctx.from?.username);
  if (!token) return;
  const publicConfig = await api.getPublicConfig().catch(() => null);
  if (await enforceSubscription(ctx, publicConfig)) return;

  // Р•СЃР»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РѕР¶РёРґР°РµС‚ РІРІРѕРґ РїРѕРґР°СЂРѕС‡РЅРѕРіРѕ РєРѕРґР°
  if (awaitingGiftCode.has(userId)) {
    awaitingGiftCode.delete(userId);
    const code = ctx.message.text.trim().toUpperCase();
    const menuKb = { reply_markup: { inline_keyboard: [[{ text: publicConfig?.botBackLabel ?? "в†ђ РќР°Р·Р°Рґ", callback_data: "menu:gift" }]] } };
    if (!code) {
      await ctx.reply("РљРѕРґ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїСѓСЃС‚С‹Рј.", menuKb);
      return;
    }
    try {
      const result = await api.redeemGiftCode(token, code);
      let text = `вњ… РџРѕРґР°СЂРѕРє Р°РєС‚РёРІРёСЂРѕРІР°РЅ!\n\nРџРѕРґРїРёСЃРєР° #${result.subscriptionIndex} РґРѕР±Р°РІР»РµРЅР° РІ РІР°С€ Р°РєРєР°СѓРЅС‚!`;
      if (result.tariffName) {
        text += `\nРўР°СЂРёС„: ${result.tariffName}`;
      }
      if (result.giftMessage) {
        text += `\n\nрџ’Њ РЎРѕРѕР±С‰РµРЅРёРµ РѕС‚ РґР°СЂРёС‚РµР»СЏ:\nВ«${result.giftMessage}В»`;
      }
      await ctx.reply(text, menuKb);

      // РЈРІРµРґРѕРјР»СЏРµРј РґР°СЂРёС‚РµР»СЏ Рѕ С‚РѕРј, С‡С‚Рѕ РїРѕРґР°СЂРѕРє Р°РєС‚РёРІРёСЂРѕРІР°РЅ
      if (result.creatorTelegramId) {
        const recipientName = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name ?? "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ";
        const notifyText = `рџЋЃ Р’Р°С€ РїРѕРґР°СЂРѕРє Р°РєС‚РёРІРёСЂРѕРІР°РЅ!\n\n${recipientName} РїСЂРёРЅСЏР»(Р°) РІР°С€ РїРѕРґР°СЂРѕРє${result.tariffName ? ` (${result.tariffName})` : ""}.`;
        bot.api.sendMessage(result.creatorTelegramId, notifyText).catch(() => {});
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "РћС€РёР±РєР° Р°РєС‚РёРІР°С†РёРё РїРѕРґР°СЂРєР°";
      await ctx.reply(`вќЊ ${msg}`, menuKb);
    }
    return;
  }

  // Р•СЃР»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РѕР¶РёРґР°РµС‚ РІРІРѕРґ РїСЂРѕРјРѕРєРѕРґР°
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
        await ctx.reply(`вњ… ${activateResult.message}`, menuKb);
      } else if (checkResult.type === "DISCOUNT") {
        const desc = checkResult.discountPercent
          ? `СЃРєРёРґРєР° ${checkResult.discountPercent}%`
          : checkResult.discountFixed
            ? `СЃРєРёРґРєР° ${checkResult.discountFixed}`
            : "СЃРєРёРґРєР°";
        activeDiscountCode.set(userId, { code, discountPercent: checkResult.discountPercent, discountFixed: checkResult.discountFixed });
        await ctx.reply(`вњ… РџСЂРѕРјРѕРєРѕРґ В«${checkResult.name}В» РїСЂРёРЅСЏС‚! ${desc}.\n\n${_t("promo.discount_applied", lang)}`, menuKb);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : _t("error_generic", lang);
      await ctx.reply(`вќЊ ${msg}`, menuKb);
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
      await ctx.reply("РџРѕРїРѕР»РЅРµРЅРёРµ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРЅРѕ.");
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
      const topupMsg1 = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(num, client.preferredCurrency)}\n\nР’С‹Р±РµСЂРёС‚Рµ СЃРїРѕСЃРѕР± РѕРїР»Р°С‚С‹:`, config?.botEmojis);
      await ctx.reply(topupMsg1.text, {
        entities: topupMsg1.entities.length ? topupMsg1.entities : undefined,
        reply_markup: topupPaymentMethodButtons(String(num), methods, config?.botBackLabel ?? null, backStyle, msgEmojiIds, yooEnabled, yookassaEnabledMsg, cryptopayEnabledMsg),
      });
      return;
    }
    // Р•СЃР»Рё С‚РѕР»СЊРєРѕ Р®Money (РЅРµС‚ platega, РЅРµС‚ Р®Kassa) вЂ” СЃСЂР°Р·Сѓ СЃРѕР·РґР°С‘Рј
    if (methods.length === 0 && yooEnabled) {
      const payment = await api.createYoomoneyPayment(token, { amount: num, paymentType: "AC" });
      const topupMsgYoo = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(num, client.preferredCurrency)}\n\nРќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Money:`, config?.botEmojis);
      await ctx.reply(topupMsgYoo.text, {
        entities: topupMsgYoo.entities.length ? topupMsgYoo.entities : undefined,
        reply_markup: payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, backStyle, msgEmojiIds),
      });
      return;
    }
    // Р•СЃР»Рё С‚РѕР»СЊРєРѕ Р®Kassa
    if (methods.length === 0 && yookassaEnabledMsg) {
      const payment = await api.createYookassaPayment(token, { amount: num, currency: "RUB" });
      const topupMsgYoo = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(num, "RUB")}\n\nРќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Р®Kassa:`, config?.botEmojis);
      await ctx.reply(topupMsgYoo.text, {
        entities: topupMsgYoo.entities.length ? topupMsgYoo.entities : undefined,
        reply_markup: payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, backStyle, msgEmojiIds),
      });
      return;
    }
    // Р•СЃР»Рё С‚РѕР»СЊРєРѕ Crypto Pay
    if (methods.length === 0 && cryptopayEnabledMsg) {
      const payment = await api.createCryptopayPayment(token, { amount: num, currency: client.preferredCurrency });
      const topupMsgCp = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(num, client.preferredCurrency)}\n\nРќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹ С‡РµСЂРµР· Crypto Bot:`, config?.botEmojis);
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
      description: "РџРѕРїРѕР»РЅРµРЅРёРµ Р±Р°Р»Р°РЅСЃР°",
    });
    const topupMsg2 = titleWithEmoji("CARD", `РџРѕРїРѕР»РЅРµРЅРёРµ РЅР° ${formatMoney(num, client.preferredCurrency)}\n\nРќР°Р¶РјРёС‚Рµ РєРЅРѕРїРєСѓ РЅРёР¶Рµ РґР»СЏ РѕРїР»Р°С‚С‹:`, config?.botEmojis);
    await ctx.reply(topupMsg2.text, {
      entities: topupMsg2.entities.length ? topupMsg2.entities : undefined,
      reply_markup: payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, backStyle, msgEmojiIds),
    });
  } catch {
    // РЅРµ С‡РёСЃР»Рѕ РёР»Рё РѕС€РёР±РєР° вЂ” РёРіРЅРѕСЂРёСЂСѓРµРј
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


