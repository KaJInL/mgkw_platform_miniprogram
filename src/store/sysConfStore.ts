import {defineStore} from "pinia";
import {ref} from "vue";
import commonApi from "@/common/apis/commonApi";

/**
 * 系统配置 Key 枚举
 */
export enum SysConfKeyEnum {
    /** 默认头像 */
    DEFAULT_AVATAR = "defaultAvatar",
    /** Logo */
    LOGO = "logo",
    /** 用户协议 */
    USER_AGREEMENT = "userAgreement",
    /** 隐私政策 */
    PRIVACY_POLICY = "privacyPolicy",
    /** 客服电话 */
    CUSTOMER_SERVICE_PHONE = "customerServicePhone"
}

/**
 * 小程序配置数据类型
 */
interface MiniprogramConf {
    defaultAvatar: string | null;
    logo: string | null;
    userAgreement: string | null;
    privacyPolicy: string | null;
    customerServicePhone: string | null;
}

/**
 * 系统配置状态管理 Store
 * 用于管理小程序配置数据的加载与缓存
 */
export const useSysConfStore = defineStore("sysConf", () => {

    // ==================== 状态 ====================

    /** 小程序配置数据 */
    const miniprogramConf = ref<MiniprogramConf | null>(null);

    /** 是否正在加载配置 */
    const loading = ref(false);

    /** 配置加载错误 */
    const error = ref<string | null>(null);


    // ==================== 方法 ====================

    /**
     * 加载小程序配置
     * @param forceRefresh 是否强制刷新（忽略缓存）
     * @returns 配置数据
     */
    const load = async (forceRefresh: boolean = false): Promise<MiniprogramConf | null> => {
        loading.value = true;
        error.value = null;

        try {
            // 如果不强制刷新，先尝试使用缓存
            if (!forceRefresh && miniprogramConf.value) {
                loading.value = false;
                return miniprogramConf.value;
            }

            const response = await commonApi.getMiniprogramConf();
            // 卫语句：提前处理失败情况
            if (!response.isSuccess || !response.data) {
                error.value = response.message || '获取小程序配置失败';
                miniprogramConf.value = null;
                return null;
            }

            // 处理成功情况
            const conf = response.data as MiniprogramConf;
            miniprogramConf.value = conf;
            return conf;
        } catch (err: any) {
            error.value = err.message || '获取小程序配置失败';
            console.error('获取小程序配置失败:', err);
            miniprogramConf.value = null;
            return null;
        } finally {
            loading.value = false;
        }
    };

    /**
     * 根据 key 获取配置值
     * @param key 配置 key 枚举
     * @returns 配置值，如果不存在返回 null
     */
    const getConf = (key: SysConfKeyEnum): string | null => {
        if (!miniprogramConf.value) {
            return null;
        }

        // 直接使用枚举值（已经是小驼峰格式）作为 key
        return miniprogramConf.value[key as keyof MiniprogramConf] || null;
    };

    /**
     * 清除配置数据
     */
    const clear = () => {
        miniprogramConf.value = null;
        error.value = null;
    };


    return {
        // 状态
        miniprogramConf,
        loading,
        error,

        // 方法
        load,
        getConf,
        clear,
    };
});



