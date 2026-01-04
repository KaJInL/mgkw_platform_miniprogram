/**
 * 账户相关 API 模块
 *
 * 提供用户账户管理相关的接口，包括：
 * - 超级管理员创建
 * - 用户登录
 * - 用户信息获取
 */

import type { IBaseResponse } from "@/common/apis/base/res";
import { http } from "@/plugin/request";

/**
 * 账户 API 路径枚举
 */
enum AccountApiEnum {
    /** 检查超级管理员是否已创建 */
    IS_SUPERUSER_CREATED = "/admin/account/is-superuser-created",
    /** 创建超级管理员 */
    CREATE_SUPERUSER = "/admin/account/create-superuser",
    /** 密码登录 */
    LOGIN_BY_PWD = "/account/login-by-pwd",
    /** 获取用户信息 */
    GET_USER_INFO = "/account/get-user-info",
    /** 微信小程序获取session */
    WX_MINIPROGRAM_LOGIN_BY_CODE = "/account/miniprogram/wx-login-by-code",
    /**手机号注册微信小程序 */
    WX_MINIPROGRAM_REGISTER_BY_PHONE_NUMBER = "/account/miniprogram/register-by-phone-number",
    /** 更新用户信息 */
    UPDATE_USER_INFO = "/account/update-user-info"
}

/**
 * 检查超级管理员是否已创建 - 响应
 */
export interface IsSuperUserCreatedRes {
    /** 超级管理员是否已创建 */
    isSuperuserCreated: boolean
}

/**
 * 创建超级管理员 - 请求
 */
export interface CreateSuperUserReq {
    /** 手机号 */
    phoneNumber: string
    /** 密码 */
    password: string
    /** 邮箱 */
    email: string
}

/**
 * 密码登录 - 请求
 */
export interface LoginByPwdReq {
    /** 手机号 */
    phoneNumber: string
    /** 密码 */
    password: string
}

/**
 * 密码登录 - 响应
 */
export interface LoginByPwdRes {
    /** JWT 令牌 */
    token: string
}

/**
 * 角色信息
 */
export interface RoleInfo {
    /** 角色ID */
    id: number
    /** 角色名称 */
    roleName: string
    /** 角色描述 */
    description?: string
    /** 是否为系统角色 */
    isSystem: boolean
}

/**
 * 用户基本信息
 */
export interface UserInfo {
    /** 用户ID */
    id: number
    /** 用户名 */
    username?: string
    /** 昵称 */
    nickname?: string
    /** 头像URL */
    avatar?: string
    /** 手机号 */
    phone: string
    /** 邮箱 */
    email?: string
    /** 状态：1=正常，0=禁用 */
    state: string
    /** 是否为超级管理员 */
    isSuperuser: boolean
}

/**
 * vip信息
 */
export interface VipInfo {
    totalDays: number,
    startTime: string,
    endTime: string
}

/**
 * 登录用户完整信息（用户信息 + 角色信息）
 */
export interface ILoginUserInfoRes {
    /** 用户基本信息 */
    user: UserInfo
    /** 用户角色列表 */
    roles: RoleInfo[],
    /** 会员vip信息  */
    vip?: VipInfo
}

/**
 * 检查超级管理员是否已创建
 *
 * 用于系统初始化时判断是否需要显示超级管理员创建页面
 *
 */
const isSuperUserCreated = async (): Promise<IBaseResponse<IsSuperUserCreatedRes>> => {
    return await http.get<IsSuperUserCreatedRes>(AccountApiEnum.IS_SUPERUSER_CREATED)
}

/**
 * 创建超级管理员
 *
 * 系统初始化时创建第一个超级管理员账户
 *
 * @param req - 创建超级管理员请求参数
 */
const createSuperUser = async (req: CreateSuperUserReq): Promise<IBaseResponse<boolean>> => {
    return await http.post<boolean>(AccountApiEnum.CREATE_SUPERUSER, req)
}

/**
 * 密码登录
 *
 * 使用手机号和密码进行登录认证
 *
 * @param req - 登录请求参数（手机号、密码）
 */
const loginByPwd = async (req: LoginByPwdReq): Promise<IBaseResponse<LoginByPwdRes>> => {
    return await http.post<LoginByPwdRes>(AccountApiEnum.LOGIN_BY_PWD, req)
}

/**
 * 获取当前登录用户信息
 *
 * 获取当前登录用户的完整信息，包括用户基本信息和角色列表
 * 需要在请求头中携带有效的 JWT 令牌
 *
 * @returns 返回用户信息和角色列表
 */
const getUserInfo = async (): Promise<IBaseResponse<ILoginUserInfoRes>> => {
    return await http.get<ILoginUserInfoRes>(AccountApiEnum.GET_USER_INFO)
}


/**
 * code2SessionResponse
 */
export interface Code2SessionRes {
    openid: string,
    sessionKey: string,
    token?: string
}

/**
 * 微信小程序获取session
 * @param code js_code
 */
const wxMiniprogramLoginByCode = async (code: string): Promise<IBaseResponse<Code2SessionRes>> => {
    return await http.post<Code2SessionRes>(AccountApiEnum.WX_MINIPROGRAM_LOGIN_BY_CODE, { code })
}

export interface WxMiniprogramRegisterByPhoneNumberRes {
    /** 登录成功返回token */
    token: string
}

/**
 * 手机号注册微信小程序
 */
const wxMiniprogramLoginByPhoneNumber = async (openid: string, encryptedData: string, iv: string, sessionKey: string): Promise<IBaseResponse<WxMiniprogramRegisterByPhoneNumberRes>> => {
    return await http.post<WxMiniprogramRegisterByPhoneNumberRes>(AccountApiEnum.WX_MINIPROGRAM_REGISTER_BY_PHONE_NUMBER, { openid, encryptedData, iv, sessionKey })
}


export interface UpdateUserInfoReq{
    avatar : string,
    nickname : string,
    email : string,
    username : string
}
const updateUserInfo = async (req: UpdateUserInfoReq): Promise<IBaseResponse<ILoginUserInfoRes>> => {
    return await http.post<ILoginUserInfoRes>(AccountApiEnum.UPDATE_USER_INFO, req)
}

/**
 * 账户 API 接口集合
 */
export default {
    /** 检查超级管理员是否已创建 */
    isSuperUserCreated,
    /** 创建超级管理员 */
    createSuperUser,
    /** 密码登录 */
    loginByPwd,
    /** 获取当前登录用户信息 */
    getUserInfo,
    /** 微信小程序获取session */
    wxMiniprogramLoginByCode,
    /**手机号注册微信小程序 */
    wxMiniprogramLoginByPhoneNumber,
    /** 更新用户信息 */
    updateUserInfo

}