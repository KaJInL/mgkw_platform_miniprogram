import {defineStore} from "pinia";
import {ref, computed} from "vue";
import accountApi, {type Code2SessionRes, type ILoginUserInfoRes, type UpdateUserInfoReq} from "@/common/apis/accountApi";
import localStorageHelper from "@/common/helper/localStorageHelper";
import LocalStorageHelper from "@/common/helper/localStorageHelper";

/**
 * 账户状态管理 Store
 * 用于管理用户账户信息、登录状态等
 */
export const useAccountStore = defineStore("account", () => {

    // ==================== 状态 ====================

    /** 用户信息 */
    const userInfo = ref<ILoginUserInfoRes | null>(null);

    /** 是否正在加载用户信息 */
    const loading = ref(false);

    /** 用户信息加载错误 */
    const error = ref<string | null>(null);


    // ==================== 计算属性 ====================

    /** 是否已登录 */
    const isLoggedIn = computed(() => {
        return userInfo.value !== null;
    });

    /** 用户显示名称 */
    const displayName = computed(() => {
        if (!userInfo.value?.user) return '未登录';
        return userInfo.value.user.username ||
            userInfo.value.user.nickname ||
            '用户';
    });


    // ==================== 方法 ====================

    /**
     * 获取用户信息
     * @param forceRefresh 是否强制刷新（忽略缓存）
     * @returns 用户信息
     */
    const getUserInfo = async (forceRefresh: boolean = false): Promise<ILoginUserInfoRes | null> => {
        loading.value = true;
        error.value = null;

        try {
            // 如果不强制刷新，先尝试从缓存加载
            if (!forceRefresh && userInfo.value) {
                loading.value = false;
                return userInfo.value;
            }

            const response = await accountApi.getUserInfo();

            // 卫语句：提前处理失败情况
            if (!response.isSuccess || !response.data) {
                error.value = response.message || '获取用户信息失败';
                // 如果获取失败，清空用户信息
                userInfo.value = null;
                return null;
            }

            // 处理成功情况
            userInfo.value = response.data;

            // 保存到缓存
            localStorageHelper.setUserInfo(response.data);

            return response.data;
        } catch (error: any) {
            error.value = error.message || '获取用户信息失败';
            console.error('获取用户信息失败:', error);
            // 发生异常时清空用户信息
            userInfo.value = null;
            return null;
        } finally {
            loading.value = false;
        }
    };

    /**
     * 设置用户信息
     * @param info 用户信息对象
     */
    const setUserInfo = (info: ILoginUserInfoRes | null) => {
        userInfo.value = info;
        if (info) {
            localStorageHelper.setUserInfo(info);
        }
    };

    /**
     * 从 localStorage 加载缓存的用户信息
     */
    const loadCachedUserInfo = () => {
        const cached = localStorageHelper.getUserInfo();
        if (cached) {
            userInfo.value = cached;
        }
    };

    /**
     * 清除用户信息
     */
    const clearUserInfo = () => {
        userInfo.value = null;
        error.value = null;
        localStorageHelper.removeUserInfo();
    };

    /**
     * 登出
     * 清除用户信息和 token
     */
    const logout = () => {
        clearUserInfo();
        localStorageHelper.logout();
    };

    /**
     * 登出并跳转到登录页
     */
    const logoutAndRedirect = () => {
        // 先清除用户状态和本地存储
        logout();

        // 跳转到登录页
        uni.reLaunch({
            url: '/pages/login/index'
        });
    };

    /**
     * 初始化用户信息
     * 先从缓存加载，然后从服务器获取最新数据
     */
    const initUserInfo = async (): Promise<boolean> => {
        // 先加载缓存
        loadCachedUserInfo();

        // 如果有 token，从服务器获取最新用户信息
        if (localStorageHelper.isLoggedIn()) {
            const result = await getUserInfo(true);
            return result !== null;
        }

        return false;
    };

    /**
     * 更新用户信息
     * @param req 更新用户信息请求参数
     * @returns 是否更新成功
     */
    const updateUserInfo = async (req: UpdateUserInfoReq): Promise<boolean> => {
        loading.value = true;
        error.value = null;

        try {
            const response = await accountApi.updateUserInfo(req);

            // 卫语句：提前处理失败情况
            if (!response.isSuccess || !response.data) {
                error.value = response.message || '更新用户信息失败';
                return false;
            }

            // 处理成功情况：更新本地用户信息
            userInfo.value = response.data;

            // 保存到缓存
            localStorageHelper.setUserInfo(response.data);

            return true;
        } catch (error: any) {
            error.value = error.message || '更新用户信息失败';
            console.error('更新用户信息失败:', error);
            return false;
        } finally {
            loading.value = false;
        }
    };


    // ==================== 微信登录聚合对象 ====================

    /**
     * 微信登录相关方法聚合对象
     */
    const weixinLogin = async (code: string, encryptedData: string, iv: string): Promise<boolean> => {
        // 获取session_key
        const code2SessionRes = await accountApi.wxMiniprogramLoginByCode(code);
        if (!code2SessionRes.isSuccess) return false

        // 如果直接返回了token,证明用户已经注册过并且后端登录成功,保存token并且加载用户信息,然后返回true即可
        const {openid, sessionKey, token} = code2SessionRes.data
        if (token) {
            LocalStorageHelper.setToken(token)
            await getUserInfo(true)
            return true
        }
        if (!sessionKey || !openid) return false

        // 没有返回token证明用户没有登录过所以需要获取手机号登陆
        const getPhoneNumberRes = await accountApi.wxMiniprogramLoginByPhoneNumber(openid, encryptedData, iv, sessionKey)
        if (!getPhoneNumberRes.isSuccess) return false
        LocalStorageHelper.setToken(getPhoneNumberRes.data.token)
        await getUserInfo(true)
        return true
    };


    return {
        // 状态
        userInfo,

        // 计算属性
        isLoggedIn,
        displayName,

        // 方法
        getUserInfo,
        logout,
        logoutAndRedirect,
        initUserInfo,
        updateUserInfo,

        // 微信登录聚合对象
        weixinLogin,
    };
});

