import {computed, ref} from "vue";
import {defineStore} from "pinia";
import accountApi, {type LoginUserInfo} from "@/common/apis/accountApi";
import {isResponseSuccess} from "@/common/apis/base/res";
import {ErrorCode} from "@/common/constants/ErrorCodeEnum";
import {getOrCreateDeviceId} from "@/common/helper/deviceIdHelper";
import localStorageHelper from "@/common/helper/localStorageHelper";

const TOKEN_EXPIRE_SECONDS = 7 * 24 * 60 * 60;
const USER_CACHE_EXPIRE_SECONDS = 7 * 24 * 60 * 60;

const AUTH_ERROR_CODES = new Set<string>([
  ErrorCode.UNAUTHORIZED,
  ErrorCode.TOKEN_EXPIRED,
  ErrorCode.TOKEN_INVALID,
]);

interface FetchUserInfoOptions {
  force?: boolean;
  silentAuthError?: boolean;
}

interface LoginResult {
  success: boolean;
  message?: string;
}

const pickFirstText = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const normalized = value.trim();
    if (normalized) {
      return normalized;
    }
  }
  return "";
};

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "n"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
};

const normalizeUserInfo = (raw: unknown): LoginUserInfo | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Record<string, any>;
  const user = source.user && typeof source.user === "object" ? source.user : {};
  const profile = source.profile && typeof source.profile === "object" ? source.profile : {};

  const username = pickFirstText(
    source.username,
    source.user_name,
    source.userName,
    user.username,
  );
  const nickname = pickFirstText(
    source.nickname,
    source.nick_name,
    source.nickName,
    profile.nickname,
  );
  const displayName = pickFirstText(
    nickname,
    source.display_name,
    source.displayName,
    username,
  );
  const avatarUrl = pickFirstText(
    source.avatar_url,
    source.avatarUrl,
    source.avatar,
    profile.avatar_url,
    profile.avatarUrl,
  );
  const avatarFullUrl = pickFirstText(
    source.avatar_full_url,
    source.avatarFullUrl,
    profile.avatar_full_url,
    profile.avatarFullUrl,
  );
  const resolvedAvatarFullUrl = avatarFullUrl || (avatarUrl ? accountApi.resolveAssetUrl(avatarUrl) : "");
  const realName = pickFirstText(source.real_name, source.realName, profile.real_name, profile.realName);
  const email = pickFirstText(source.email, user.email);
  const phone = pickFirstText(source.phone, user.phone);
  const bio = pickFirstText(source.bio, profile.bio);
  const vipPlanName = pickFirstText(source.vip_plan_name, source.vipPlanName, profile.vip_plan_name, profile.vipPlanName);
  const vipBadgeText = pickFirstText(source.vip_badge_text, source.vipBadgeText, profile.vip_badge_text, profile.vipBadgeText);
  const vipExpiresAt = pickFirstText(source.vip_expires_at, source.vipExpiresAt, profile.vip_expires_at, profile.vipExpiresAt);
  const singleGenerateQuotaRemainingRaw = source.single_generate_quota_remaining ?? source.singleGenerateQuotaRemaining ?? 0;
  const singleGenerateQuotaRemaining = Number.isFinite(Number(singleGenerateQuotaRemainingRaw))
    ? Math.max(0, Number(singleGenerateQuotaRemainingRaw))
    : 0;

  const roleCodesRaw = source.role_codes ?? source.roleCodes;
  let roleCodes: string[] = [];
  if (Array.isArray(roleCodesRaw)) {
    roleCodes = roleCodesRaw
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  } else if (Array.isArray(source.roles)) {
    roleCodes = source.roles
      .map((item: any) => pickFirstText(item?.role_code, item?.roleCode))
      .filter(Boolean);
  }

  const idRaw = source.id ?? user.id ?? 0;
  const normalizedId = Number(idRaw);
  const id = Number.isFinite(normalizedId) ? normalizedId : 0;
  const roles = Array.isArray(source.roles)
    ? source.roles
        .map((item: any) => {
          const roleCode = pickFirstText(item?.role_code, item?.roleCode);
          const roleName = pickFirstText(item?.role_name, item?.roleName);
          const roleId = Number(item?.id ?? 0);
          return {
            id: Number.isFinite(roleId) ? roleId : 0,
            role_code: roleCode,
            role_name: roleName,
          };
        })
        .filter((item: { role_code: string; role_name: string }) => item.role_code || item.role_name)
    : [];

  const normalizedUsername = username || displayName || (id > 0 ? `user_${id}` : "微信用户");
  return {
    id,
    username: normalizedUsername,
    nickname: nickname || null,
    real_name: realName || null,
    email: email || null,
    phone: phone || null,
    bio: bio || null,
    display_name: displayName || normalizedUsername,
    avatar_url: avatarUrl || null,
    avatar_full_url: resolvedAvatarFullUrl || null,
    is_vip_active: toBoolean(source.is_vip_active ?? source.isVipActive, false),
    vip_plan_name: vipPlanName || null,
    vip_badge_text: vipBadgeText || null,
    vip_expires_at: vipExpiresAt || null,
    single_generate_quota_remaining: singleGenerateQuotaRemaining,
    is_active: toBoolean(source.is_active ?? source.isActive ?? user.is_active ?? user.isActive, true),
    is_superuser: toBoolean(source.is_superuser ?? source.isSuperuser ?? user.is_superuser ?? user.isSuperuser, false),
    role_codes: roleCodes,
    roles,
  };
};

const getWxLoginCode = async (): Promise<string> => {
  return await new Promise<string>((resolve, reject) => {
    uni.login({
      provider: "weixin",
      success: (res) => {
        if (!res.code) {
          reject(new Error("未获取到微信登录凭证，请重试"));
          return;
        }
        resolve(res.code);
      },
      fail: () => {
        reject(new Error("调用微信登录失败，请稍后重试"));
      },
    });
  });
};

const isAuthCode = (code: number | string | undefined): boolean => {
  return AUTH_ERROR_CODES.has(String(code || ""));
};

export const useAccountStore = defineStore("account", () => {
  const token = ref<string | null>(localStorageHelper.getToken());
  const userInfo = ref<LoginUserInfo | null>(null);
  const loadingUserInfo = ref(false);
  const loggingIn = ref(false);
  let refreshingPromise: Promise<LoginUserInfo | null> | null = null;

  const syncTokenFromStorage = (): string | null => {
    token.value = localStorageHelper.getToken();
    return token.value;
  };

  const setAuthToken = (value: string | null): void => {
    token.value = value;
    if (value) {
      localStorageHelper.setToken(value, TOKEN_EXPIRE_SECONDS);
      return;
    }
    localStorageHelper.removeToken();
  };

  const isLoggedIn = computed(() => {
    return Boolean(token.value);
  });

  const setUserInfo = (value: LoginUserInfo | null): void => {
    userInfo.value = value;
    if (value) {
      localStorageHelper.setUserInfo(value, USER_CACHE_EXPIRE_SECONDS);
      return;
    }
    localStorageHelper.removeUserInfo();
  };

  const setUserInfoFromRaw = (raw: unknown): LoginUserInfo | null => {
    const normalized = normalizeUserInfo(raw);
    setUserInfo(normalized);
    return normalized;
  };

  const loadCachedUserInfo = (): void => {
    const cached = localStorageHelper.getUserInfo();
    setUserInfoFromRaw(cached);
  };

  const clearAuthState = (): void => {
    setAuthToken(null);
    setUserInfo(null);
  };

  const fetchUserInfo = async (options?: FetchUserInfoOptions): Promise<LoginUserInfo | null> => {
    const force = options?.force ?? false;
    const silentAuthError = options?.silentAuthError ?? false;

    if (!force && userInfo.value) {
      return userInfo.value;
    }

    if (!syncTokenFromStorage()) {
      setUserInfo(null);
      return null;
    }

    loadingUserInfo.value = true;
    try {
      const res = await accountApi.getUserInfo(false);
      if (isResponseSuccess(res) && res.data) {
        const normalized = setUserInfoFromRaw((res.data as any).user_info ?? (res.data as any).userInfo ?? res.data);
        if (normalized) {
          return normalized;
        }
        return null;
      }

      if (isAuthCode(res.code)) {
        clearAuthState();
        return null;
      }

      if (!silentAuthError) {
        console.warn("获取用户信息失败：", res.message);
      }
      return null;
    } catch (error) {
      if (!silentAuthError) {
        console.error("获取用户信息异常：", error);
      }
      return null;
    } finally {
      loadingUserInfo.value = false;
    }
  };

  const refreshCurrentUser = async (): Promise<LoginUserInfo | null> => {
    return await fetchUserInfo({
      force: true,
      silentAuthError: true,
    });
  };

  const refreshUserInfoOnAppOpen = async (): Promise<LoginUserInfo | null> => {
    if (refreshingPromise) {
      return await refreshingPromise;
    }

    refreshingPromise = (async () => {
      loadCachedUserInfo();
      if (!syncTokenFromStorage()) {
        setUserInfo(null);
        return null;
      }
      return await fetchUserInfo({force: true, silentAuthError: true});
    })();

    try {
      return await refreshingPromise;
    } finally {
      refreshingPromise = null;
    }
  };

  const loginByWechatPhone = async (payload: {
    encryptedData: string;
    iv: string;
  }): Promise<LoginResult> => {
    if (loggingIn.value) {
      return {success: false, message: "正在登录中，请稍候"};
    }

    loggingIn.value = true;
    try {
      const deviceId = getOrCreateDeviceId();
      const code = await getWxLoginCode();
      const code2SessionRes = await accountApi.wxMiniprogramLoginByCode({
        code,
        deviceId,
      });

      if (!isResponseSuccess(code2SessionRes) || !code2SessionRes.data) {
        return {
          success: false,
          message: code2SessionRes.message || "微信登录失败，请稍后重试",
        };
      }

      // 如果有用户的话直接登录
      const {openid, sessionKey} = code2SessionRes.data;
      let token = code2SessionRes.data.token;
      if (!token) {
        if (!openid || !sessionKey) {
          return {success: false, message: "微信登录凭证失效，请重新登录"};
        }

        const registerRes = await accountApi.wxMiniprogramRegisterByPhoneNumber({
          openid,
          encryptedData: payload.encryptedData,
          iv: payload.iv,
          sessionKey,
          deviceId,
        });
        if (!isResponseSuccess(registerRes) || !registerRes.data?.token) {
          return {
            success: false,
            message: registerRes.message || "手机号授权登录失败，请重试",
          };
        }
        token = registerRes.data.token;
      }

      setAuthToken(token);
      await fetchUserInfo({force: true, silentAuthError: true});
      if (!syncTokenFromStorage()) {
        return {success: false, message: "登录状态已失效，请重试"};
      }
      return {success: true};
    } catch (error: any) {
      console.error("微信登录异常：", error);
      return {
        success: false,
        message: error?.message || "登录失败，请稍后重试",
      };
    } finally {
      loggingIn.value = false;
    }
  };

  const updateUserInfo = async (payload: {
    nickname?: string;
    avatar_url?: string;
    real_name?: string;
    email?: string;
    bio?: string;
  }): Promise<LoginResult> => {
    try {
      const res = await accountApi.updateUserInfo(payload);
      if (isResponseSuccess(res) && res.data) {
        setUserInfoFromRaw((res.data as any).user_info ?? (res.data as any).userInfo ?? res.data);
        return { success: true };
      }
      return {
        success: false,
        message: res.message || "资料保存失败",
      };
    } catch (error: any) {
      console.error("保存用户资料异常：", error);
      return {
        success: false,
        message: error?.message || "资料保存失败，请稍后重试",
      };
    }
  };

  const uploadAvatar = async (
    filePath: string,
  ): Promise<{ success: boolean; avatarUrl?: string; avatarFullUrl?: string; message?: string }> => {
    try {
      const res = await accountApi.uploadAvatar(filePath);
      if (isResponseSuccess(res) && res.data?.avatar_url) {
        return {
          success: true,
          avatarUrl: res.data.avatar_url,
          avatarFullUrl: res.data.avatar_full_url || accountApi.resolveAssetUrl(res.data.avatar_url),
        };
      }
      return {
        success: false,
        message: res.message || "头像上传失败",
      };
    } catch (error: any) {
      console.error("头像上传异常：", error);
      return {
        success: false,
        message: error?.message || "头像上传失败，请稍后重试",
      };
    }
  };

  return {
    userInfo,
    loadingUserInfo,
    loggingIn,
    isLoggedIn,
    loadCachedUserInfo,
    fetchUserInfo,
    refreshCurrentUser,
    refreshUserInfoOnAppOpen,
    loginByWechatPhone,
    updateUserInfo,
    uploadAvatar,
    clearAuthState,
  };
});
