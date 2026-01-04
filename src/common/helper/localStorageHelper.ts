export interface IData {
    data: any
    expire?: number
}

export enum LocalStorageKey {
    TOKEN = 'token',
    USER_INFO = 'user_info',
    CATEGORY_LIST = 'category_list',
    CATEGORY_TREE = 'category_tree',
    SERIES_LIST = 'series_list',
    SERIES_TREE = 'series_tree',
}

/**
 * localStorage工具（适配 uni-app）
 */
const localStorageHelper = {
    /**
     * 设置数据到本地存储
     * @param key 存储键
     * @param data 存储数据
     * @param expireInSecond 过期时间（秒），不传则永久有效
     */
    set(key: string, data: any, expireInSecond?: number): void {
        let cache: IData = {data}
        if (expireInSecond) {
            cache.expire = new Date().getTime() + expireInSecond * 1000
        }
        try {
            uni.setStorageSync(key, JSON.stringify(cache))
        } catch (e) {
            console.error('存储数据失败:', e)
        }
    },

    /**
     * 从本地存储获取数据
     * @param key 存储键
     * @param defaultValue 默认值
     * @returns 存储的数据或默认值
     */
    get(key: string, defaultValue: any = null): any {
        try {
            const cacheStore = uni.getStorageSync(key)
            if (cacheStore) {
                const cache = JSON.parse(cacheStore)
                const expire = cache?.expire
                if (expire && expire < new Date().getTime()) {
                    uni.removeStorageSync(key)
                    return defaultValue
                }
                return cache.data
            }
        } catch (e) {
            console.error('获取数据失败:', e)
        }
        return defaultValue
    },

    /**
     * 从本地存储移除数据
     * @param key 存储键
     */
    remove(key: string): void {
        try {
            uni.removeStorageSync(key)
        } catch (e) {
            console.error('删除数据失败:', e)
        }
    },

    /**
     * 清空所有本地存储数据
     */
    clear(): void {
        try {
            uni.clearStorageSync()
        } catch (e) {
            console.error('清空数据失败:', e)
        }
    },

    /**
     * 检查 key 是否存在
     * @param key 存储键
     * @returns 是否存在
     */
    has(key: string): boolean {
        try {
            const value = uni.getStorageSync(key)
            return value !== null && value !== undefined && value !== ''
        } catch (e) {
            return false
        }
    },

    // Token 相关便捷方法
    /**
     * 保存 token
     * @param token token 字符串
     * @param expireInSecond 过期时间（秒），默认 7 天
     */
    setToken(token: string, expireInSecond: number = 7 * 24 * 60 * 60): void {
        this.set(LocalStorageKey.TOKEN, token, expireInSecond)
    },

    /**
     * 获取 token
     * @returns token 字符串或 null
     */
    getToken(): string | null {
        return this.get(LocalStorageKey.TOKEN, null)
    },

    /**
     * 移除 token（登出时使用）
     */
    removeToken(): void {
        this.remove(LocalStorageKey.TOKEN)
    },

    /**
     * 检查是否已登录（是否有 token）
     * @returns 是否已登录
     */
    isLoggedIn(): boolean {
        return this.getToken() !== null
    },

    // 用户信息相关便捷方法
    /**
     * 保存用户信息
     * @param userInfo 用户信息对象
     * @param expireInSecond 过期时间（秒），默认 7 天
     */
    setUserInfo(userInfo: any, expireInSecond: number = 7 * 24 * 60 * 60): void {
        this.set(LocalStorageKey.USER_INFO, userInfo, expireInSecond)
    },

    /**
     * 获取用户信息
     * @returns 用户信息对象或 null
     */
    getUserInfo(): any | null {
        return this.get(LocalStorageKey.USER_INFO, null)
    },

    /**
     * 移除用户信息（登出时使用）
     */
    removeUserInfo(): void {
        this.remove(LocalStorageKey.USER_INFO)
    },

    /**
     * 登出（清除 token 和用户信息）
     */
    logout(): void {
        this.removeToken()
        this.removeUserInfo()
    },

    // 分类和系列缓存相关便捷方法
    /**
     * 保存分类列表到本地缓存
     * @param categoryList 分类列表
     * @param expireInSecond 过期时间（秒），默认 1 天
     */
    setCategoryList(categoryList: any[], expireInSecond: number = 24 * 60 * 60): void {
        this.set(LocalStorageKey.CATEGORY_LIST, categoryList, expireInSecond)
    },

    /**
     * 获取分类列表缓存
     * @returns 分类列表或 null
     */
    getCategoryList(): any[] | null {
        return this.get(LocalStorageKey.CATEGORY_LIST, null)
    },

    /**
     * 移除分类列表缓存
     */
    removeCategoryList(): void {
        this.remove(LocalStorageKey.CATEGORY_LIST)
    },

    /**
     * 保存分类树到本地缓存
     * @param categoryTree 分类树
     * @param expireInSecond 过期时间（秒），默认 1 天
     */
    setCategoryTree(categoryTree: any[], expireInSecond: number = 24 * 60 * 60): void {
        this.set(LocalStorageKey.CATEGORY_TREE, categoryTree, expireInSecond)
    },

    /**
     * 获取分类树缓存
     * @returns 分类树或 null
     */
    getCategoryTree(): any[] | null {
        return this.get(LocalStorageKey.CATEGORY_TREE, null)
    },

    /**
     * 移除分类树缓存
     */
    removeCategoryTree(): void {
        this.remove(LocalStorageKey.CATEGORY_TREE)
    },

    /**
     * 保存系列列表到本地缓存
     * @param seriesList 系列列表
     * @param expireInSecond 过期时间（秒），默认 1 天
     */
    setSeriesList(seriesList: any[], expireInSecond: number = 24 * 60 * 60): void {
        this.set(LocalStorageKey.SERIES_LIST, seriesList, expireInSecond)
    },

    /**
     * 获取系列列表缓存
     * @returns 系列列表或 null
     */
    getSeriesList(): any[] | null {
        return this.get(LocalStorageKey.SERIES_LIST, null)
    },

    /**
     * 移除系列列表缓存
     */
    removeSeriesList(): void {
        this.remove(LocalStorageKey.SERIES_LIST)
    },

    /**
     * 保存系列树到本地缓存
     * @param seriesTree 系列树
     * @param expireInSecond 过期时间（秒），默认 1 天
     */
    setSeriesTree(seriesTree: any[], expireInSecond: number = 24 * 60 * 60): void {
        this.set(LocalStorageKey.SERIES_TREE, seriesTree, expireInSecond)
    },

    /**
     * 获取系列树缓存
     * @returns 系列树或 null
     */
    getSeriesTree(): any[] | null {
        return this.get(LocalStorageKey.SERIES_TREE, null)
    },

    /**
     * 移除系列树缓存
     */
    removeSeriesTree(): void {
        this.remove(LocalStorageKey.SERIES_TREE)
    },

    /**
     * 清除所有分类和系列缓存
     */
    clearCategoryCache(): void {
        this.removeCategoryList()
        this.removeCategoryTree()
        this.removeSeriesList()
        this.removeSeriesTree()
    },

    LocalStorageKey
}

export default localStorageHelper
