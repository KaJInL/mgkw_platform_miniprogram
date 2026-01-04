import {defineStore} from "pinia";
import {computed, ref} from "vue";
import localStorageHelper from "@/common/helper/localStorageHelper";

/**
 * 用户状态管理 Store
 * 用于管理用户信息、登录状态等
 */
export const useUserStore = defineStore("user", () => {
    
    // ==================== 状态 ====================
    
    /** 用户信息 */
    const userInfo = ref<any | null>(null);
    
    /** 是否正在加载用户信息 */
    const loading = ref(false);
    
    /** 用户信息加载错误 */
    const error = ref<string | null>(null);
    
    
    // ==================== 计算属性 ====================
    
    /** 用户显示名称（优先显示昵称，其次用户名） */
    const displayName = computed(() => {
        if (!userInfo.value) return '用户';
        return userInfo.value.nickname || 
               userInfo.value.username || 
               '用户';
    });
    
    /** 是否已登录 */
    const isLoggedIn = computed(() => {
        return localStorageHelper.isLoggedIn() && userInfo.value !== null;
    });
    
    
    // ==================== 方法 ====================
    
    /**
     * 设置用户信息
     * @param info 用户信息对象
     */
    const setUserInfo = (info: any) => {
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
            url: '/pages/index/index' // 根据实际登录页路径修改
        });
    };
    
    /**
     * 初始化用户信息
     * 先从缓存加载，然后从服务器获取最新数据
     */
    const initUserInfo = async (): Promise<boolean> => {
        // 先加载缓存
        loadCachedUserInfo();
        
        // 如果有 token，可以在这里调用 API 获取最新用户信息
        // const response = await accountApi.getUserInfo();
        // if (response.isSuccess && response.data) {
        //     setUserInfo(response.data);
        //     return true;
        // }
        
        return true;
    };
    
    
    return {
        // 状态
        userInfo,
        loading,
        error,
        
        // 计算属性
        displayName,
        isLoggedIn,
        
        // 方法
        setUserInfo,
        loadCachedUserInfo,
        clearUserInfo,
        logout,
        logoutAndRedirect,
        initUserInfo,
    };
});
