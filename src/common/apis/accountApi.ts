import type { IBaseResponse } from "@/common/apis/base/res";
import { http } from "@/plugin/request";

enum AccountApiEnum {
    GET_USER_INFO = "/account/get-user-info",
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
    display_name: string;
    avatar_url?: string | null;
    is_active: boolean;
    is_superuser: boolean;
    role_codes: string[];
}

export interface GetUserInfoRes {
    user_info: LoginUserInfo;
}

const getUserInfo = async (autoHandleAuth: boolean = true): Promise<IBaseResponse<GetUserInfoRes>> => {
    return await http.get<GetUserInfoRes>(AccountApiEnum.GET_USER_INFO, {}, autoHandleAuth);
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
    wxMiniprogramLoginByCode,
    wxMiniprogramRegisterByPhoneNumber,
};
