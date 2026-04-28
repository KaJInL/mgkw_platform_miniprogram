import localStorageHelper, { LocalStorageKey } from "@/common/helper/localStorageHelper";
import shopApi, { type IShopBindQrcodeItem, type IShopItem } from "@/common/apis/shopApi";

const SHOP_CACHE_EXPIRE_SECONDS = 30 * 24 * 60 * 60;
let currentLaunchSid = "";
let currentOrderShopCode = "";

const normalizeCode = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toUpperCase();
};

const extractSidFromText = (rawText: string): string => {
  // 扫码结果在微信里可能是完整 path、scene 或纯文本，这里统一抽取 SID。
  const text = (rawText || "").trim();
  if (!text) {
    return "";
  }

  const decodedText = decodeURIComponent(text);
  const sidMatch = decodedText.match(/(?:^|[?&]|scene=|sid=)(SID[A-Z0-9]+)/i);
  if (sidMatch?.[1]) {
    return normalizeCode(sidMatch[1]);
  }

  const params = new URLSearchParams(decodedText);
  return normalizeCode(params.get("sid") || params.get("qrcode_code") || "");
};

const parseLaunchSid = (options?: Record<string, unknown> | null): string => {
  // 小程序启动参数场景下，优先从 scene/path 里提取 sid。
  if (!options) {
    return "";
  }
  const sceneValue = typeof options.scene === "string" ? options.scene : "";
  const queryRecord = options.query && typeof options.query === "object" ? options.query as Record<string, unknown> : null;
  const querySceneValue = queryRecord && typeof queryRecord.scene === "string" ? queryRecord.scene : "";
  const querySid = typeof options.sid === "string" ? options.sid : typeof options.qrcode_code === "string" ? options.qrcode_code : "";
  return extractSidFromText(sceneValue) || extractSidFromText(querySceneValue) || extractSidFromText(querySid);
};

const setPendingBindQrcodeCode = (qrcodeCode: string): void => {
  // 绑定页与扫码入口之间通过本地缓存交接 sid，避免页面跳转丢上下文。
  const normalizedCode = normalizeCode(qrcodeCode);
  if (!normalizedCode) {
    localStorageHelper.remove(LocalStorageKey.PENDING_BIND_QRCODE_CODE);
    localStorageHelper.remove(LocalStorageKey.PENDING_BIND_QRCODE_CONTEXT);
    return;
  }
  const currentCode = getPendingBindQrcodeCode();
  localStorageHelper.set(LocalStorageKey.PENDING_BIND_QRCODE_CODE, normalizedCode, SHOP_CACHE_EXPIRE_SECONDS);
  if (currentCode !== normalizedCode) {
    localStorageHelper.remove(LocalStorageKey.PENDING_BIND_QRCODE_CONTEXT);
  }
};

const getPendingBindQrcodeCode = (): string => {
  return normalizeCode(localStorageHelper.get(LocalStorageKey.PENDING_BIND_QRCODE_CODE, ""));
};

const clearPendingBindQrcode = (): void => {
  localStorageHelper.remove(LocalStorageKey.PENDING_BIND_QRCODE_CODE);
  localStorageHelper.remove(LocalStorageKey.PENDING_BIND_QRCODE_CONTEXT);
};

const setPendingBindQrcodeContext = (context: IShopBindQrcodeItem | null): void => {
  if (!context) {
    localStorageHelper.remove(LocalStorageKey.PENDING_BIND_QRCODE_CONTEXT);
    return;
  }
  localStorageHelper.set(LocalStorageKey.PENDING_BIND_QRCODE_CONTEXT, context, SHOP_CACHE_EXPIRE_SECONDS);
  if (currentLaunchSid && normalizeCode(context.qrcode_code) === currentLaunchSid) {
    currentOrderShopCode = normalizeCode(context.bound_shop?.shop_code || "");
  }
};

const getPendingBindQrcodeContext = (): IShopBindQrcodeItem | null => {
  return localStorageHelper.get(LocalStorageKey.PENDING_BIND_QRCODE_CONTEXT, null);
};

const setBoundShopInfo = (shop: IShopItem | null): void => {
  if (!shop) {
    localStorageHelper.remove(LocalStorageKey.BOUND_SHOP_INFO);
    return;
  }
  localStorageHelper.set(LocalStorageKey.BOUND_SHOP_INFO, shop, SHOP_CACHE_EXPIRE_SECONDS);
};

const getBoundShopInfo = (): IShopItem | null => {
  return localStorageHelper.get(LocalStorageKey.BOUND_SHOP_INFO, null);
};

const fetchPendingBindQrcodeContext = async (qrcodeCode?: string): Promise<IShopBindQrcodeItem | null> => {
  // 进入绑定页前先拉二维码上下文，若二维码已被消费也能直接看到绑定结果。
  const normalizedCode = normalizeCode(qrcodeCode || getPendingBindQrcodeCode());
  if (!normalizedCode) {
    return null;
  }
  const response = await shopApi.getBindQrcodeContext(normalizedCode);
  const context = response?.data || null;
  if (context) {
    setPendingBindQrcodeCode(normalizedCode);
    setPendingBindQrcodeContext(context);
    if (context.bound_shop) {
      setBoundShopInfo(context.bound_shop);
      if (currentLaunchSid && normalizedCode === currentLaunchSid) {
        currentOrderShopCode = normalizeCode(context.bound_shop.shop_code);
      }
    }
  }
  return context;
};

const rememberLaunchSid = async (options?: Record<string, unknown> | null): Promise<string> => {
  // 扫码直达小程序时，在 onLaunch/onLoad 阶段先记住 sid，后续页面再消费。
  const sid = parseLaunchSid(options);
  if (sid) {
    currentLaunchSid = sid;
    currentOrderShopCode = "";
    setPendingBindQrcodeCode(sid);
    localStorageHelper.remove(LocalStorageKey.PENDING_BIND_QRCODE_CONTEXT);
  }
  return sid;
};

const rememberShowSid = async (options?: Record<string, unknown> | null): Promise<string> => {
  // onShow 只在真的带 sid 时刷新会话态，避免支付回跳等普通前后台切换误清空门店归因。
  const sid = parseLaunchSid(options);
  if (!sid) {
    return "";
  }
  currentLaunchSid = sid;
  currentOrderShopCode = "";
  setPendingBindQrcodeCode(sid);
  localStorageHelper.remove(LocalStorageKey.PENDING_BIND_QRCODE_CONTEXT);
  return sid;
};

const setCurrentOrderShopCode = (shopCode: string | null | undefined): void => {
  if (!currentLaunchSid) {
    currentOrderShopCode = "";
    return;
  }
  currentOrderShopCode = normalizeCode(shopCode || "");
};

const getCurrentOrderShopCode = (): string => {
  return currentOrderShopCode;
};

export default {
  normalizeCode,
  extractSidFromText,
  parseLaunchSid,
  rememberLaunchSid,
  rememberShowSid,
  setCurrentOrderShopCode,
  getCurrentOrderShopCode,
  setPendingBindQrcodeCode,
  getPendingBindQrcodeCode,
  clearPendingBindQrcode,
  setPendingBindQrcodeContext,
  getPendingBindQrcodeContext,
  fetchPendingBindQrcodeContext,
  setBoundShopInfo,
  getBoundShopInfo,
};
