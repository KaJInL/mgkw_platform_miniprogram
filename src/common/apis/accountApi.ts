import type { IBaseResponse } from "@/common/apis/base/res";
import EnvHelper from "@/common/helper/EnvHelper";
import { http } from "@/plugin/request";

enum AccountApiEnum {
    GET_USER_INFO = "/account/get-user-info",
    UPDATE_USER_INFO = "/account/update-user-info",
    UPLOAD_AVATAR = "/account/upload-avatar",
    WX_MINIPROGRAM_LOGIN_BY_CODE = "/account/miniprogram/wx-login-by-code",
    WX_MINIPROGRAM_REGISTER_BY_PHONE_NUMBER = "/account/miniprogram/register-by-phone-number",
}

export interface WxCode2SessionReq {
    code: string;
    deviceId?: string;
}

export interface WxCode2SessionRes {
    openid: string;
    sessionKey: string;
    token?: string;
}

export interface WxRegisterByPhoneReq {
    openid: string;
    encryptedData: string;
    iv: string;
    sessionKey: string;
    deviceId?: string;
}

export interface WxRegisterByPhoneRes {
    token: string;
}

export interface LoginUserInfo {
    id: number;
    username: string;
    nickname?: string | null;
    real_name?: string | null;
    email?: string | null;
    phone?: string | null;
    bio?: string | null;
    display_name: string;
    avatar_url?: string | null;
    avatar_full_url?: string | null;
    is_vip_active?: boolean;
    vip_plan_name?: string | null;
    vip_badge_text?: string | null;
    vip_expires_at?: string | null;
    single_generate_quota_remaining?: number;
    is_active: boolean;
    is_superuser: boolean;
    role_codes: string[];
    roles?: Array<{
        id: number;
        role_code: string;
        role_name: string;
    }>;
}

export interface GetUserInfoRes {
    user_info: LoginUserInfo;
}

export interface UpdateUserInfoReq {
    nickname?: string;
    avatar_url?: string;
    real_name?: string;
    email?: string;
    bio?: string;
}

export interface UploadAvatarRes {
    avatar_url: string;
    avatar_full_url: string;
    file_hash?: string;
    is_duplicate?: boolean;
}

const getUserInfo = async (autoHandleAuth: boolean = true): Promise<IBaseResponse<GetUserInfoRes>> => {
    return await http.get<GetUserInfoRes>(AccountApiEnum.GET_USER_INFO, {}, autoHandleAuth);
};

const updateUserInfo = async (req: UpdateUserInfoReq): Promise<IBaseResponse<GetUserInfoRes>> => {
    return await http.post<GetUserInfoRes>(AccountApiEnum.UPDATE_USER_INFO, req);
};

const uploadAvatar = async (filePath: string): Promise<IBaseResponse<UploadAvatarRes>> => {
    return await http.upload<UploadAvatarRes>(AccountApiEnum.UPLOAD_AVATAR, filePath, "file");
};

const resolveAssetUrl = (relativeUrl: string) => {
    const baseUrl = EnvHelper.env.VITE_API_BASE_URL || "";
    if (!relativeUrl || relativeUrl.startsWith("http")) {
        return relativeUrl;
    }
    const originMatch = baseUrl.match(/^(https?:\/\/[^/]+)/);
    const origin = originMatch ? originMatch[1] : "";
    if (relativeUrl.startsWith("/")) {
        return `${origin}${relativeUrl}`;
    }
    return `${baseUrl.replace(/\/$/, "")}/${relativeUrl.replace(/^\//, "")}`;
};

const canRenderImageUrl = (url?: string | null) => {
    if (!url) {
        return false;
    }
    return /^(https?:\/\/|wxfile:\/\/|data:image\/|blob:|file:\/\/|\/)/i.test(url);
};

const wxMiniprogramLoginByCode = async (
    req: WxCode2SessionReq,
): Promise<IBaseResponse<WxCode2SessionRes>> => {
    return await http.post<WxCode2SessionRes>(AccountApiEnum.WX_MINIPROGRAM_LOGIN_BY_CODE, req);
};

const wxMiniprogramRegisterByPhoneNumber = async (
    req: WxRegisterByPhoneReq,
): Promise<IBaseResponse<WxRegisterByPhoneRes>> => {
    return await http.post<WxRegisterByPhoneRes>(AccountApiEnum.WX_MINIPROGRAM_REGISTER_BY_PHONE_NUMBER, req);
};

export default {
    getUserInfo,
    updateUserInfo,
    uploadAvatar,
    resolveAssetUrl,
    canRenderImageUrl,
    wxMiniprogramLoginByCode,
    wxMiniprogramRegisterByPhoneNumber,
};
